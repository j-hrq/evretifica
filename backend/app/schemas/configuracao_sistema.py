from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.pessoa import PessoaInput, PessoaOutput


class ConfiguracaoSistemaUpdate(BaseModel):
    pessoa: PessoaInput


class ConfiguracaoSistemaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    pessoa_id: int
    pessoa: PessoaOutput
    data_criacao: datetime
    data_alteracao: datetime
