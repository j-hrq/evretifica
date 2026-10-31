from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.auth import obter_usuario_atual
from app.db import get_db
from app.models.usuario import Usuario
from app.schemas.comum import PaginacaoOutput
from app.schemas.veiculo import VeiculoInput, VeiculoOutput
from app.services.veiculo import (
    atualizar_veiculo,
    criar_veiculo,
    excluir_veiculo,
    listar_veiculos,
    obter_veiculo,
)

router = APIRouter(
    prefix="/api/veiculos",
    tags=["veiculos"],
    dependencies=[Depends(obter_usuario_atual)],
)


@router.get("", response_model=PaginacaoOutput[VeiculoOutput])
def listar(
    q: str | None = Query(default=None),
    cliente_id: int | None = Query(default=None, ge=1),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),  # noqa: B008
    _usuario: Usuario = Depends(obter_usuario_atual),  # noqa: B008
) -> PaginacaoOutput[VeiculoOutput]:
    return listar_veiculos(db, q=q, cliente_id=cliente_id, page=page, per_page=per_page)


@router.get("/{veiculo_id}", response_model=VeiculoOutput)
def obter(
    veiculo_id: int,
    db: Session = Depends(get_db),  # noqa: B008
) -> VeiculoOutput:
    veiculo = obter_veiculo(db, veiculo_id)
    return VeiculoOutput.model_validate(veiculo)


@router.post("", response_model=VeiculoOutput, status_code=status.HTTP_201_CREATED)
def criar(
    dados: VeiculoInput,
    db: Session = Depends(get_db),  # noqa: B008
) -> VeiculoOutput:
    veiculo = criar_veiculo(db, dados)
    return VeiculoOutput.model_validate(veiculo)


@router.put("/{veiculo_id}", response_model=VeiculoOutput)
def editar(
    veiculo_id: int,
    dados: VeiculoInput,
    db: Session = Depends(get_db),  # noqa: B008
) -> VeiculoOutput:
    veiculo = atualizar_veiculo(db, veiculo_id, dados)
    return VeiculoOutput.model_validate(veiculo)


@router.delete("/{veiculo_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir(
    veiculo_id: int,
    db: Session = Depends(get_db),  # noqa: B008
) -> Response:
    excluir_veiculo(db, veiculo_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
