import math
import re

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.exceptions import ConflitoError, NaoEncontradoError
from app.models.cliente import Cliente
from app.models.orcamento import Orcamento
from app.models.ordem_servico import OrdemServico
from app.models.pessoa import Pessoa, PessoaFisica, PessoaJuridica
from app.models.veiculo import Veiculo
from app.schemas.cliente import ClienteInput, ClienteOutput
from app.schemas.comum import PaginacaoOutput
from app.services.pessoa import (
    atualizar_pessoa,
    criar_pessoa,
    excluir_pessoa_se_sem_usuario,
)


def _opcoes_carregamento_cliente():
    return (
        joinedload(Cliente.pessoa).joinedload(Pessoa.pessoa_fisica),
        joinedload(Cliente.pessoa).joinedload(Pessoa.pessoa_juridica),
        joinedload(Cliente.pessoa).joinedload(Pessoa.endereco),
        joinedload(Cliente.pessoa).selectinload(Pessoa.telefones),
    )


def obter_cliente(db: Session, cliente_id: int) -> Cliente:
    stmt = select(Cliente).where(Cliente.id == cliente_id).options(*_opcoes_carregamento_cliente())
    cliente = db.execute(stmt).scalar_one_or_none()
    if cliente is None:
        raise NaoEncontradoError("Cliente não encontrado.")
    return cliente


def listar_clientes(
    db: Session,
    *,
    q: str | None = None,
    ativo: bool | None = None,
    page: int = 1,
    per_page: int = 10,
) -> PaginacaoOutput[ClienteOutput]:
    stmt = (
        select(Cliente)
        .join(Cliente.pessoa)
        .outerjoin(Pessoa.pessoa_fisica)
        .outerjoin(Pessoa.pessoa_juridica)
    )

    if ativo is not None:
        stmt = stmt.where(Cliente.ativo == ativo)

    if q and q.strip():
        termo = f"%{q.strip()}%"
        condicoes = [
            Pessoa.nome.ilike(termo),
            Pessoa.email.ilike(termo),
            PessoaFisica.cpf.ilike(termo),
            PessoaJuridica.cnpj.ilike(termo),
        ]
        apenas_digitos = re.sub(r"\D", "", q)
        if apenas_digitos:
            termo_digitos = f"%{apenas_digitos}%"
            condicoes.append(PessoaFisica.cpf.ilike(termo_digitos))
            condicoes.append(PessoaJuridica.cnpj.ilike(termo_digitos))

        stmt = stmt.where(or_(*condicoes))

    total_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.scalar(total_stmt) or 0
    total_pages = max(1, math.ceil(total / per_page))

    offset = (page - 1) * per_page
    items_stmt = (
        stmt.options(*_opcoes_carregamento_cliente())
        .order_by(Pessoa.nome.asc(), Cliente.id.asc())
        .offset(offset)
        .limit(per_page)
    )
    clientes = list(db.execute(items_stmt).scalars().all())

    return PaginacaoOutput[ClienteOutput](
        items=[ClienteOutput.model_validate(c) for c in clientes],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


def criar_cliente(db: Session, dados: ClienteInput) -> Cliente:
    try:
        pessoa = criar_pessoa(db, dados.pessoa, commit=False)
        cliente = Cliente(pessoa_id=pessoa.id, ativo=dados.ativo)
        db.add(cliente)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ConflitoError("CPF ou CNPJ já cadastrado.") from exc
    except Exception:
        db.rollback()
        raise

    return obter_cliente(db, cliente.id)


def atualizar_cliente(db: Session, cliente_id: int, dados: ClienteInput) -> Cliente:
    cliente = obter_cliente(db, cliente_id)
    try:
        atualizar_pessoa(db, cliente.pessoa_id, dados.pessoa, commit=False)
        cliente.ativo = dados.ativo
        db.commit()
        db.expire_all()
    except IntegrityError as exc:
        db.rollback()
        raise ConflitoError("CPF ou CNPJ já cadastrado.") from exc
    except Exception:
        db.rollback()
        raise

    return obter_cliente(db, cliente_id)


def possui_vinculos_cliente(db: Session, cliente_id: int) -> bool:
    """Verifica vínculos do cliente com veículos, orçamentos ou OS."""
    tem_veiculo = db.scalar(select(Veiculo.id).where(Veiculo.cliente_id == cliente_id).limit(1))
    if tem_veiculo is not None:
        return True
    tem_orcamento = db.scalar(
        select(Orcamento.id).where(Orcamento.cliente_id == cliente_id).limit(1)
    )
    if tem_orcamento is not None:
        return True
    tem_os = db.scalar(
        select(OrdemServico.id).where(OrdemServico.cliente_id == cliente_id).limit(1)
    )
    return tem_os is not None


def excluir_cliente(db: Session, cliente_id: int) -> None:
    cliente = obter_cliente(db, cliente_id)
    if possui_vinculos_cliente(db, cliente_id):
        raise ConflitoError("Não é possível excluir cliente que possui vínculos.")

    pessoa_id = cliente.pessoa_id
    try:
        db.delete(cliente)
        db.flush()
        excluir_pessoa_se_sem_usuario(db, pessoa_id, commit=False)
        db.commit()
    except Exception:
        db.rollback()
        raise
