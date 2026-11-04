import math
import re

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.exceptions import NaoEncontradoError
from app.models.cliente import Cliente
from app.models.enums import SituacaoAvaliacao
from app.models.orcamento import ItemOrcamento, Orcamento
from app.models.pessoa import Pessoa, PessoaFisica, PessoaJuridica
from app.models.veiculo import Veiculo
from app.schemas.comum import PaginacaoOutput
from app.schemas.orcamento import OrcamentoInput, OrcamentoOutput
from app.schemas.veiculo import normalizar_placa
from app.services.item import obter_item
from app.services.numeracao import gerar_proximo_numero
from app.services.veiculo import obter_veiculo


def _opcoes_carregamento_orcamento():
    return (
        joinedload(Orcamento.cliente).joinedload(Cliente.pessoa).joinedload(Pessoa.pessoa_fisica),
        joinedload(Orcamento.cliente).joinedload(Cliente.pessoa).joinedload(Pessoa.pessoa_juridica),
        joinedload(Orcamento.cliente).joinedload(Cliente.pessoa).joinedload(Pessoa.endereco),
        joinedload(Orcamento.cliente).joinedload(Cliente.pessoa).selectinload(Pessoa.telefones),
        joinedload(Orcamento.veiculo).joinedload(Veiculo.marca),
        joinedload(Orcamento.veiculo)
        .joinedload(Veiculo.cliente)
        .joinedload(Cliente.pessoa)
        .joinedload(Pessoa.pessoa_fisica),
        joinedload(Orcamento.veiculo)
        .joinedload(Veiculo.cliente)
        .joinedload(Cliente.pessoa)
        .joinedload(Pessoa.pessoa_juridica),
        joinedload(Orcamento.veiculo)
        .joinedload(Veiculo.cliente)
        .joinedload(Cliente.pessoa)
        .joinedload(Pessoa.endereco),
        joinedload(Orcamento.veiculo)
        .joinedload(Veiculo.cliente)
        .joinedload(Cliente.pessoa)
        .selectinload(Pessoa.telefones),
        selectinload(Orcamento.itens).joinedload(ItemOrcamento.item),
    )


def obter_orcamento(db: Session, orcamento_id: int) -> Orcamento:
    stmt = (
        select(Orcamento)
        .where(Orcamento.id == orcamento_id)
        .options(*_opcoes_carregamento_orcamento())
    )
    orcamento = db.execute(stmt).scalar_one_or_none()
    if orcamento is None:
        raise NaoEncontradoError("Orçamento não encontrado.")
    return orcamento


def listar_orcamentos(
    db: Session,
    *,
    q: str | None = None,
    status_id: SituacaoAvaliacao | None = None,
    page: int = 1,
    per_page: int = 10,
) -> PaginacaoOutput[OrcamentoOutput]:
    stmt = (
        select(Orcamento)
        .join(Orcamento.cliente)
        .join(Cliente.pessoa)
        .outerjoin(Pessoa.pessoa_fisica)
        .outerjoin(Pessoa.pessoa_juridica)
        .join(Orcamento.veiculo)
    )

    if status_id is not None:
        stmt = stmt.where(Orcamento.status_id == int(status_id))

    if q and q.strip():
        termo = f"%{q.strip()}%"
        condicoes = [
            Orcamento.numero.ilike(termo),
            Veiculo.placa.ilike(termo),
            Veiculo.modelo.ilike(termo),
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
        stmt.options(*_opcoes_carregamento_orcamento())
        .order_by(Orcamento.data_emissao.desc(), Orcamento.id.desc())
        .offset(offset)
        .limit(per_page)
    )
    orcamentos = list(db.execute(items_stmt).scalars().all())

    return PaginacaoOutput[OrcamentoOutput](
        items=[OrcamentoOutput.model_validate(o) for o in orcamentos],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


def criar_orcamento(db: Session, dados: OrcamentoInput) -> Orcamento:
    veiculo = obter_veiculo(db, dados.veiculo_id)
    for linha in dados.itens:
        obter_item(db, linha.item_id)

    try:
        numero = gerar_proximo_numero(db, "ORC", dados.data_emissao.year)
        orcamento = Orcamento(
            numero=numero,
            cliente_id=veiculo.cliente_id,
            veiculo_id=veiculo.id,
            status_id=int(dados.status_id),
            data_emissao=dados.data_emissao,
            validade_dias=dados.validade_dias,
            descricao=dados.descricao,
        )
        for linha in dados.itens:
            orcamento.itens.append(
                ItemOrcamento(
                    item_id=linha.item_id,
                    tipo_id=int(linha.tipo_id),
                    valor_unitario=linha.valor_unitario,
                    quantidade=linha.quantidade,
                )
            )
        db.add(orcamento)
        db.commit()
    except Exception:
        db.rollback()
        raise

    return obter_orcamento(db, orcamento.id)


def atualizar_orcamento(db: Session, orcamento_id: int, dados: OrcamentoInput) -> Orcamento:
    orcamento = obter_orcamento(db, orcamento_id)
    veiculo = obter_veiculo(db, dados.veiculo_id)
    for linha in dados.itens:
        obter_item(db, linha.item_id)

    try:
        if dados.veiculo_id != orcamento.veiculo_id:
            orcamento.veiculo_id = veiculo.id
            orcamento.cliente_id = veiculo.cliente_id

        orcamento.status_id = int(dados.status_id)
        orcamento.data_emissao = dados.data_emissao
        orcamento.validade_dias = dados.validade_dias
        orcamento.descricao = dados.descricao

        orcamento.itens.clear()
        db.flush()
        for linha in dados.itens:
            orcamento.itens.append(
                ItemOrcamento(
                    item_id=linha.item_id,
                    tipo_id=int(linha.tipo_id),
                    valor_unitario=linha.valor_unitario,
                    quantidade=linha.quantidade,
                )
            )

        db.commit()
        db.expire_all()
    except Exception:
        db.rollback()
        raise

    return obter_orcamento(db, orcamento_id)


def excluir_orcamento(db: Session, orcamento_id: int) -> None:
    orcamento = obter_orcamento(db, orcamento_id)
    try:
        db.delete(orcamento)
        db.commit()
    except Exception:
        db.rollback()
        raise
