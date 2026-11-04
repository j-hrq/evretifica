from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import obter_usuario_atual
from app.db import get_db
from app.schemas.configuracao_sistema import (
    ConfiguracaoSistemaResponse,
    ConfiguracaoSistemaUpdate,
)
from app.services.configuracao_sistema import (
    atualizar_configuracao_sistema,
    obter_ou_criar_configuracao_sistema,
)

router = APIRouter(
    prefix="/api/configuracao-sistema",
    tags=["configuracao-sistema"],
    dependencies=[Depends(obter_usuario_atual)],
)


@router.get("", response_model=ConfiguracaoSistemaResponse)
def obter(
    db: Session = Depends(get_db),  # noqa: B008
) -> ConfiguracaoSistemaResponse:
    configuracao = obter_ou_criar_configuracao_sistema(db)
    return ConfiguracaoSistemaResponse.model_validate(configuracao)


@router.put("", response_model=ConfiguracaoSistemaResponse)
def atualizar(
    dados: ConfiguracaoSistemaUpdate,
    db: Session = Depends(get_db),  # noqa: B008
) -> ConfiguracaoSistemaResponse:
    configuracao = atualizar_configuracao_sistema(db, dados)
    return ConfiguracaoSistemaResponse.model_validate(configuracao)
