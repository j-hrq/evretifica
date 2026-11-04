from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import obter_usuario_atual
from app.db import get_db
from app.schemas.configuracao_oficina import (
    ConfiguracaoOficinaResponse,
    ConfiguracaoOficinaUpdate,
)
from app.services.configuracao_oficina import (
    atualizar_configuracao_oficina,
    obter_ou_criar_configuracao_oficina,
)

router = APIRouter(
    prefix="/api/configuracao-oficina",
    tags=["configuracao-oficina"],
    dependencies=[Depends(obter_usuario_atual)],
)


@router.get("", response_model=ConfiguracaoOficinaResponse)
def obter(
    db: Session = Depends(get_db),  # noqa: B008
) -> ConfiguracaoOficinaResponse:
    configuracao = obter_ou_criar_configuracao_oficina(db)
    return ConfiguracaoOficinaResponse.model_validate(configuracao)


@router.put("", response_model=ConfiguracaoOficinaResponse)
def atualizar(
    dados: ConfiguracaoOficinaUpdate,
    db: Session = Depends(get_db),  # noqa: B008
) -> ConfiguracaoOficinaResponse:
    configuracao = atualizar_configuracao_oficina(db, dados)
    return ConfiguracaoOficinaResponse.model_validate(configuracao)
