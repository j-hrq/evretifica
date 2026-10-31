from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.auth import obter_usuario_atual
from app.db import get_db
from app.models.usuario import Usuario
from app.schemas.comum import PaginacaoOutput
from app.schemas.marca_veiculo import MarcaVeiculoInput, MarcaVeiculoOutput
from app.services.marca_veiculo import (
    atualizar_marca_veiculo,
    criar_marca_veiculo,
    excluir_marca_veiculo,
    listar_marcas_veiculo,
    obter_marca_veiculo,
)

router = APIRouter(
    prefix="/api/marcas-veiculo",
    tags=["marcas-veiculo"],
    dependencies=[Depends(obter_usuario_atual)],
)


@router.get("", response_model=PaginacaoOutput[MarcaVeiculoOutput])
def listar(
    q: str | None = Query(default=None),
    ativo: bool | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),  # noqa: B008
    _usuario: Usuario = Depends(obter_usuario_atual),  # noqa: B008
) -> PaginacaoOutput[MarcaVeiculoOutput]:
    return listar_marcas_veiculo(db, q=q, ativo=ativo, page=page, per_page=per_page)


@router.get("/{marca_id}", response_model=MarcaVeiculoOutput)
def obter(
    marca_id: int,
    db: Session = Depends(get_db),  # noqa: B008
) -> MarcaVeiculoOutput:
    marca = obter_marca_veiculo(db, marca_id)
    return MarcaVeiculoOutput.model_validate(marca)


@router.post("", response_model=MarcaVeiculoOutput, status_code=status.HTTP_201_CREATED)
def criar(
    dados: MarcaVeiculoInput,
    db: Session = Depends(get_db),  # noqa: B008
) -> MarcaVeiculoOutput:
    marca = criar_marca_veiculo(db, dados)
    return MarcaVeiculoOutput.model_validate(marca)


@router.put("/{marca_id}", response_model=MarcaVeiculoOutput)
def editar(
    marca_id: int,
    dados: MarcaVeiculoInput,
    db: Session = Depends(get_db),  # noqa: B008
) -> MarcaVeiculoOutput:
    marca = atualizar_marca_veiculo(db, marca_id, dados)
    return MarcaVeiculoOutput.model_validate(marca)


@router.delete("/{marca_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir(
    marca_id: int,
    db: Session = Depends(get_db),  # noqa: B008
) -> Response:
    excluir_marca_veiculo(db, marca_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
