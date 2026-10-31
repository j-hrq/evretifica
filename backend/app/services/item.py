import math

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.exceptions import ConflitoError, NaoEncontradoError
from app.models.item import Item
from app.schemas.comum import PaginacaoOutput
from app.schemas.item import ItemInput, ItemOutput


def obter_item(db: Session, item_id: int) -> Item:
    stmt = select(Item).where(Item.id == item_id)
    item = db.execute(stmt).scalar_one_or_none()
    if item is None:
        raise NaoEncontradoError("Item não encontrado.")
    return item


def listar_itens(
    db: Session,
    *,
    q: str | None = None,
    ativo: bool | None = None,
    page: int = 1,
    per_page: int = 10,
) -> PaginacaoOutput[ItemOutput]:
    stmt = select(Item)

    if ativo is not None:
        stmt = stmt.where(Item.ativo == ativo)

    if q and q.strip():
        termo = f"%{q.strip()}%"
        stmt = stmt.where(Item.nome.ilike(termo))

    total_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.scalar(total_stmt) or 0
    total_pages = max(1, math.ceil(total / per_page))

    offset = (page - 1) * per_page
    items_stmt = stmt.order_by(Item.nome.asc(), Item.id.asc()).offset(offset).limit(per_page)
    itens = list(db.execute(items_stmt).scalars().all())

    return PaginacaoOutput[ItemOutput](
        items=[ItemOutput.model_validate(i) for i in itens],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


def criar_item(db: Session, dados: ItemInput) -> Item:
    try:
        item = Item(nome=dados.nome, ativo=dados.ativo)
        db.add(item)
        db.commit()
        db.refresh(item)
    except Exception:
        db.rollback()
        raise

    return item


def atualizar_item(db: Session, item_id: int, dados: ItemInput) -> Item:
    item = obter_item(db, item_id)
    try:
        item.nome = dados.nome
        item.ativo = dados.ativo
        db.commit()
        db.refresh(item)
    except Exception:
        db.rollback()
        raise

    return item


def possui_vinculos_item(db: Session, item_id: int) -> bool:
    """Verifica vínculos do item com linhas de orçamento ou OS.

    Preparado para ser estendido nas fatias 8 (Orçamentos) e 9 (OS).
    """
    _ = (db, item_id)
    return False


def excluir_item(db: Session, item_id: int) -> None:
    item = obter_item(db, item_id)
    if possui_vinculos_item(db, item_id):
        raise ConflitoError(
            "Não é possível excluir item que está em uso em orçamento ou ordem de serviço."
        )

    try:
        db.delete(item)
        db.commit()
    except Exception:
        db.rollback()
        raise
