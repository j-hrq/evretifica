import math

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.exceptions import ConflitoError, NaoEncontradoError
from app.models.marca_veiculo import MarcaVeiculo
from app.schemas.comum import PaginacaoOutput
from app.schemas.marca_veiculo import MarcaVeiculoInput, MarcaVeiculoOutput


def obter_marca_veiculo(db: Session, marca_id: int) -> MarcaVeiculo:
    stmt = select(MarcaVeiculo).where(MarcaVeiculo.id == marca_id)
    marca = db.execute(stmt).scalar_one_or_none()
    if marca is None:
        raise NaoEncontradoError("Marca de veículo não encontrada.")
    return marca


def listar_marcas_veiculo(
    db: Session,
    *,
    q: str | None = None,
    ativo: bool | None = None,
    page: int = 1,
    per_page: int = 10,
) -> PaginacaoOutput[MarcaVeiculoOutput]:
    stmt = select(MarcaVeiculo)

    if ativo is not None:
        stmt = stmt.where(MarcaVeiculo.ativo == ativo)

    if q and q.strip():
        termo = f"%{q.strip()}%"
        stmt = stmt.where(MarcaVeiculo.nome.ilike(termo))

    total_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.scalar(total_stmt) or 0
    total_pages = max(1, math.ceil(total / per_page))

    offset = (page - 1) * per_page
    items_stmt = (
        stmt.order_by(MarcaVeiculo.nome.asc(), MarcaVeiculo.id.asc()).offset(offset).limit(per_page)
    )
    marcas = list(db.execute(items_stmt).scalars().all())

    return PaginacaoOutput[MarcaVeiculoOutput](
        items=[MarcaVeiculoOutput.model_validate(m) for m in marcas],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


def criar_marca_veiculo(db: Session, dados: MarcaVeiculoInput) -> MarcaVeiculo:
    existente = db.scalar(
        select(MarcaVeiculo.id).where(func.lower(MarcaVeiculo.nome) == dados.nome.lower())
    )
    if existente is not None:
        raise ConflitoError("Marca de veículo já cadastrada.")

    try:
        marca = MarcaVeiculo(nome=dados.nome, ativo=dados.ativo)
        db.add(marca)
        db.commit()
        db.refresh(marca)
    except IntegrityError as exc:
        db.rollback()
        raise ConflitoError("Marca de veículo já cadastrada.") from exc
    except Exception:
        db.rollback()
        raise

    return marca


def atualizar_marca_veiculo(db: Session, marca_id: int, dados: MarcaVeiculoInput) -> MarcaVeiculo:
    marca = obter_marca_veiculo(db, marca_id)

    existente = db.scalar(
        select(MarcaVeiculo.id).where(
            func.lower(MarcaVeiculo.nome) == dados.nome.lower(),
            MarcaVeiculo.id != marca_id,
        )
    )
    if existente is not None:
        raise ConflitoError("Marca de veículo já cadastrada.")

    try:
        marca.nome = dados.nome
        marca.ativo = dados.ativo
        db.commit()
        db.refresh(marca)
    except IntegrityError as exc:
        db.rollback()
        raise ConflitoError("Marca de veículo já cadastrada.") from exc
    except Exception:
        db.rollback()
        raise

    return marca


def possui_vinculos_marca_veiculo(db: Session, marca_id: int) -> bool:
    """Verifica vínculos da marca com veículos.

    Preparado para ser estendido na fatia 6 (Veículos).
    """
    _ = (db, marca_id)
    return False


def excluir_marca_veiculo(db: Session, marca_id: int) -> None:
    marca = obter_marca_veiculo(db, marca_id)
    if possui_vinculos_marca_veiculo(db, marca_id):
        raise ConflitoError(
            "Não é possível excluir marca de veículo que possui veículos vinculados."
        )

    try:
        db.delete(marca)
        db.commit()
    except Exception:
        db.rollback()
        raise
