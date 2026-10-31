from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


class ItemInput(BaseModel):
    nome: str
    ativo: bool = True

    @field_validator("nome")
    @classmethod
    def _validar_nome(cls, v: str) -> str:
        limpo = v.strip()
        if not limpo:
            raise ValueError("Nome é obrigatório.")
        return limpo


class ItemOutput(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    ativo: bool
    data_criacao: datetime
    data_alteracao: datetime
