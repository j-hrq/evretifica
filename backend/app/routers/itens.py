from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.auth import obter_usuario_atual
from app.db import get_db
from app.models.usuario import Usuario
from app.schemas.comum import PaginacaoOutput
from app.schemas.item import ItemInput, ItemOutput
from app.services.item import (
    atualizar_item,
    criar_item,
    excluir_item,
    listar_itens,
    obter_item,
)

router = APIRouter(
    prefix="/api/itens",
    tags=["itens"],
    dependencies=[Depends(obter_usuario_atual)],
)


@router.get("", response_model=PaginacaoOutput[ItemOutput])
def listar(
    q: str | None = Query(default=None),
    ativo: bool | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),  # noqa: B008
    _usuario: Usuario = Depends(obter_usuario_atual),  # noqa: B008
) -> PaginacaoOutput[ItemOutput]:
    return listar_itens(db, q=q, ativo=ativo, page=page, per_page=per_page)


@router.get("/{item_id}", response_model=ItemOutput)
def obter(
    item_id: int,
    db: Session = Depends(get_db),  # noqa: B008
) -> ItemOutput:
    item = obter_item(db, item_id)
    return ItemOutput.model_validate(item)


@router.post("", response_model=ItemOutput, status_code=status.HTTP_201_CREATED)
def criar(
    dados: ItemInput,
    db: Session = Depends(get_db),  # noqa: B008
) -> ItemOutput:
    item = criar_item(db, dados)
    return ItemOutput.model_validate(item)


@router.put("/{item_id}", response_model=ItemOutput)
def editar(
    item_id: int,
    dados: ItemInput,
    db: Session = Depends(get_db),  # noqa: B008
) -> ItemOutput:
    item = atualizar_item(db, item_id, dados)
    return ItemOutput.model_validate(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir(
    item_id: int,
    db: Session = Depends(get_db),  # noqa: B008
) -> Response:
    excluir_item(db, item_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
