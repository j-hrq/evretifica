import math
import re

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.exceptions import NaoEncontradoError
from app.models.cliente import Cliente
from app.models.enums import SituacaoAvaliacao
from app.models.ordem_servico import ItemOrdemServico, OrdemServico
from app.models.pessoa import Pessoa, PessoaFisica, PessoaJuridica, utc_now
from app.models.veiculo import Veiculo
from app.schemas.comum import PaginacaoOutput
from app.schemas.ordem_servico import OrdemServicoInput, OrdemServicoOutput
from app.schemas.veiculo import normalizar_placa
from app.services.item import obter_item
from app.services.numeracao import gerar_proximo_numero
from app.services.veiculo import obter_veiculo


def _opcoes_carregamento_ordem_servico():
    return (
        joinedload(OrdemServico.cliente)
        .joinedload(Cliente.pessoa)
        .joinedload(Pessoa.pessoa_fisica),
        joinedload(OrdemServico.cliente)
        .joinedload(Cliente.pessoa)
        .joinedload(Pessoa.pessoa_juridica),
        joinedload(OrdemServico.cliente).joinedload(Cliente.pessoa).joinedload(Pessoa.endereco),
        joinedload(OrdemServico.cliente).joinedload(Cliente.pessoa).selectinload(Pessoa.telefones),
        joinedload(OrdemServico.veiculo).joinedload(Veiculo.marca),
        joinedload(OrdemServico.veiculo)
        .joinedload(Veiculo.cliente)
        .joinedload(Cliente.pessoa)
        .joinedload(Pessoa.pessoa_fisica),
        joinedload(OrdemServico.veiculo)
        .joinedload(Veiculo.cliente)
        .joinedload(Cliente.pessoa)
        .joinedload(Pessoa.pessoa_juridica),
        joinedload(OrdemServico.veiculo)
        .joinedload(Veiculo.cliente)
        .joinedload(Cliente.pessoa)
        .joinedload(Pessoa.endereco),
        joinedload(OrdemServico.veiculo)
        .joinedload(Veiculo.cliente)
        .joinedload(Cliente.pessoa)
        .selectinload(Pessoa.telefones),
        selectinload(OrdemServico.itens).joinedload(ItemOrdemServico.item),
    )


def obter_ordem_servico(db: Session, ordem_servico_id: int) -> OrdemServico:
    stmt = (
        select(OrdemServico)
        .where(OrdemServico.id == ordem_servico_id)
        .options(*_opcoes_carregamento_ordem_servico())
    )
    os_obj = db.execute(stmt).scalar_one_or_none()
    if os_obj is None:
        raise NaoEncontradoError("Ordem de serviço não encontrada.")
    return os_obj


def listar_ordens_servico(
    db: Session,
    *,
    q: str | None = None,
    status_id: SituacaoAvaliacao | None = None,
    page: int = 1,
    per_page: int = 10,
) -> PaginacaoOutput[OrdemServicoOutput]:
    stmt = (
        select(OrdemServico)
        .join(OrdemServico.cliente)
        .join(Cliente.pessoa)
        .outerjoin(Pessoa.pessoa_fisica)
        .outerjoin(Pessoa.pessoa_juridica)
        .join(OrdemServico.veiculo)
    )

    if status_id is not None:
        stmt = stmt.where(OrdemServico.status_id == int(status_id))

    if q and q.strip():
        termo = f"%{q.strip()}%"
        condicoes = [
            OrdemServico.numero.ilike(termo),
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
        stmt.options(*_opcoes_carregamento_ordem_servico())
        .order_by(OrdemServico.data_criacao.desc(), OrdemServico.id.desc())
        .offset(offset)
        .limit(per_page)
    )
    ordens = list(db.execute(items_stmt).scalars().all())

    return PaginacaoOutput[OrdemServicoOutput](
        items=[OrdemServicoOutput.model_validate(o) for o in ordens],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


def criar_ordem_servico(db: Session, dados: OrdemServicoInput) -> OrdemServico:
    veiculo = obter_veiculo(db, dados.veiculo_id)
    for linha in dados.itens:
        obter_item(db, linha.item_id)

    try:
        agora = utc_now()
        numero = gerar_proximo_numero(db, "OS", agora.year)
        os_obj = OrdemServico(
            numero=numero,
            cliente_id=veiculo.cliente_id,
            veiculo_id=veiculo.id,
            km_entrada=dados.km_entrada,
            status_id=int(dados.status_id),
            descricao=dados.descricao,
            data_criacao=agora,
            data_alteracao=agora,
        )
        for linha in dados.itens:
            os_obj.itens.append(
                ItemOrdemServico(
                    item_id=linha.item_id,
                    tipo_id=int(linha.tipo_id),
                    valor_unitario=linha.valor_unitario,
                    quantidade=linha.quantidade,
                )
            )
        db.add(os_obj)
        db.commit()
    except Exception:
        db.rollback()
        raise

    return obter_ordem_servico(db, os_obj.id)


def atualizar_ordem_servico(
    db: Session, ordem_servico_id: int, dados: OrdemServicoInput
) -> OrdemServico:
    os_obj = obter_ordem_servico(db, ordem_servico_id)
    veiculo = obter_veiculo(db, dados.veiculo_id)
    for linha in dados.itens:
        obter_item(db, linha.item_id)

    try:
        if dados.veiculo_id != os_obj.veiculo_id:
            os_obj.veiculo_id = veiculo.id
            os_obj.cliente_id = veiculo.cliente_id

        os_obj.km_entrada = dados.km_entrada
        os_obj.status_id = int(dados.status_id)
        os_obj.descricao = dados.descricao

        os_obj.itens.clear()
        db.flush()
        for linha in dados.itens:
            os_obj.itens.append(
                ItemOrdemServico(
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

    return obter_ordem_servico(db, ordem_servico_id)


def excluir_ordem_servico(db: Session, ordem_servico_id: int) -> None:
    os_obj = obter_ordem_servico(db, ordem_servico_id)
    try:
        db.delete(os_obj)
        db.commit()
    except Exception:
        db.rollback()
        raise
