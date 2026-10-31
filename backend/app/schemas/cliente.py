from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.pessoa import PessoaInput, PessoaOutput


class ClienteInput(BaseModel):
    pessoa: PessoaInput
    ativo: bool = True


class ClienteOutput(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    pessoa_id: int
    ativo: bool
    pessoa: PessoaOutput
    data_criacao: datetime
    data_alteracao: datetime
