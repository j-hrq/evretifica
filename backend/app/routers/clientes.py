from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.auth import obter_usuario_atual
from app.db import get_db
from app.models.usuario import Usuario
from app.schemas.cliente import ClienteInput, ClienteOutput
from app.schemas.comum import PaginacaoOutput
from app.services.cliente import (
    atualizar_cliente,
    criar_cliente,
    excluir_cliente,
    listar_clientes,
    obter_cliente,
)

router = APIRouter(
    prefix="/api/clientes",
    tags=["clientes"],
    dependencies=[Depends(obter_usuario_atual)],
)


@router.get("", response_model=PaginacaoOutput[ClienteOutput])
def listar(
    q: str | None = Query(default=None),
    ativo: bool | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),  # noqa: B008
    _usuario: Usuario = Depends(obter_usuario_atual),  # noqa: B008
) -> PaginacaoOutput[ClienteOutput]:
    return listar_clientes(db, q=q, ativo=ativo, page=page, per_page=per_page)


@router.get("/{cliente_id}", response_model=ClienteOutput)
def obter(
    cliente_id: int,
    db: Session = Depends(get_db),  # noqa: B008
) -> ClienteOutput:
    cliente = obter_cliente(db, cliente_id)
    return ClienteOutput.model_validate(cliente)


@router.post("", response_model=ClienteOutput, status_code=status.HTTP_201_CREATED)
def criar(
    dados: ClienteInput,
    db: Session = Depends(get_db),  # noqa: B008
) -> ClienteOutput:
    cliente = criar_cliente(db, dados)
    return ClienteOutput.model_validate(cliente)


@router.put("/{cliente_id}", response_model=ClienteOutput)
def editar(
    cliente_id: int,
    dados: ClienteInput,
    db: Session = Depends(get_db),  # noqa: B008
) -> ClienteOutput:
    cliente = atualizar_cliente(db, cliente_id, dados)
    return ClienteOutput.model_validate(cliente)


@router.delete("/{cliente_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir(
    cliente_id: int,
    db: Session = Depends(get_db),  # noqa: B008
) -> Response:
    excluir_cliente(db, cliente_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
