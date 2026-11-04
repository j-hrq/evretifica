import math
import re

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.exceptions import ConflitoError, NaoEncontradoError
from app.models.cliente import Cliente
from app.models.marca_veiculo import MarcaVeiculo
from app.models.orcamento import Orcamento
from app.models.ordem_servico import OrdemServico
from app.models.pessoa import Pessoa, PessoaFisica, PessoaJuridica
from app.models.veiculo import Veiculo
from app.schemas.comum import PaginacaoOutput
from app.schemas.veiculo import VeiculoInput, VeiculoOutput, normalizar_placa
from app.services.cliente import obter_cliente
from app.services.marca_veiculo import obter_marca_veiculo


def _opcoes_carregamento_veiculo():
    return (
        joinedload(Veiculo.marca),
        joinedload(Veiculo.cliente).joinedload(Cliente.pessoa).joinedload(Pessoa.pessoa_fisica),
        joinedload(Veiculo.cliente).joinedload(Cliente.pessoa).joinedload(Pessoa.pessoa_juridica),
        joinedload(Veiculo.cliente).joinedload(Cliente.pessoa).joinedload(Pessoa.endereco),
        joinedload(Veiculo.cliente).joinedload(Cliente.pessoa).selectinload(Pessoa.telefones),
    )


def obter_veiculo(db: Session, veiculo_id: int) -> Veiculo:
    stmt = select(Veiculo).where(Veiculo.id == veiculo_id).options(*_opcoes_carregamento_veiculo())
    veiculo = db.execute(stmt).scalar_one_or_none()
    if veiculo is None:
        raise NaoEncontradoError("Veículo não encontrado.")
    return veiculo


def listar_veiculos(
    db: Session,
    *,
    q: str | None = None,
    cliente_id: int | None = None,
    page: int = 1,
    per_page: int = 10,
) -> PaginacaoOutput[VeiculoOutput]:
    stmt = (
        select(Veiculo)
        .join(Veiculo.cliente)
        .join(Cliente.pessoa)
        .outerjoin(Pessoa.pessoa_fisica)
        .outerjoin(Pessoa.pessoa_juridica)
        .join(Veiculo.marca)
    )

    if cliente_id is not None:
        stmt = stmt.where(Veiculo.cliente_id == cliente_id)

    if q and q.strip():
        termo = f"%{q.strip()}%"
        condicoes = [
            Veiculo.placa.ilike(termo),
            Veiculo.modelo.ilike(termo),
            MarcaVeiculo.nome.ilike(termo),
            Pessoa.nome.ilike(termo),
            PessoaFisica.cpf.ilike(termo),
            PessoaJuridica.cnpj.ilike(termo),
        ]
        placa_limpa = normalizar_placa(q.strip())
        if placa_limpa:
            condicoes.append(Veiculo.placa.ilike(f"%{placa_limpa}%"))

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
        stmt.options(*_opcoes_carregamento_veiculo())
        .order_by(Veiculo.modelo.asc(), Veiculo.placa.asc(), Veiculo.id.asc())
        .offset(offset)
        .limit(per_page)
    )
    veiculos = list(db.execute(items_stmt).scalars().all())

    return PaginacaoOutput[VeiculoOutput](
        items=[VeiculoOutput.model_validate(v) for v in veiculos],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


def criar_veiculo(db: Session, dados: VeiculoInput) -> Veiculo:
    obter_cliente(db, dados.cliente_id)
    obter_marca_veiculo(db, dados.marca_id)

    existente = db.scalar(select(Veiculo.id).where(Veiculo.placa == dados.placa))
    if existente is not None:
        raise ConflitoError("Placa já cadastrada.")

    try:
        veiculo = Veiculo(
            cliente_id=dados.cliente_id,
            marca_id=dados.marca_id,
            modelo=dados.modelo,
            placa=dados.placa,
            ano_fabricacao=dados.ano_fabricacao,
            ano_modelo=dados.ano_modelo,
            cor=dados.cor,
            km=dados.km,
            observacao=dados.observacao,
        )
        db.add(veiculo)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ConflitoError("Placa já cadastrada.") from exc
    except Exception:
        db.rollback()
        raise

    return obter_veiculo(db, veiculo.id)


def atualizar_veiculo(db: Session, veiculo_id: int, dados: VeiculoInput) -> Veiculo:
    veiculo = obter_veiculo(db, veiculo_id)
    obter_cliente(db, dados.cliente_id)
    obter_marca_veiculo(db, dados.marca_id)

    existente = db.scalar(
        select(Veiculo.id).where(
            Veiculo.placa == dados.placa,
            Veiculo.id != veiculo_id,
        )
    )
    if existente is not None:
        raise ConflitoError("Placa já cadastrada.")

    try:
        veiculo.cliente_id = dados.cliente_id
        veiculo.marca_id = dados.marca_id
        veiculo.modelo = dados.modelo
        veiculo.placa = dados.placa
        veiculo.ano_fabricacao = dados.ano_fabricacao
        veiculo.ano_modelo = dados.ano_modelo
        veiculo.cor = dados.cor
        veiculo.km = dados.km
        veiculo.observacao = dados.observacao
        db.commit()
        db.expire_all()
    except IntegrityError as exc:
        db.rollback()
        raise ConflitoError("Placa já cadastrada.") from exc
    except Exception:
        db.rollback()
        raise

    return obter_veiculo(db, veiculo_id)


def possui_vinculos_veiculo(db: Session, veiculo_id: int) -> bool:
    """Verifica vínculos do veículo com orçamentos ou OS."""
    tem_orcamento = db.scalar(
        select(Orcamento.id).where(Orcamento.veiculo_id == veiculo_id).limit(1)
    )
    if tem_orcamento is not None:
        return True
    tem_os = db.scalar(
        select(OrdemServico.id).where(OrdemServico.veiculo_id == veiculo_id).limit(1)
    )
    return tem_os is not None


def excluir_veiculo(db: Session, veiculo_id: int) -> None:
    veiculo = obter_veiculo(db, veiculo_id)
    if possui_vinculos_veiculo(db, veiculo_id):
        raise ConflitoError("Não é possível excluir veículo que possui vínculos.")

    try:
        db.delete(veiculo)
        db.commit()
    except Exception:
        db.rollback()
        raise
