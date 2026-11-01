from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ConfiguracaoOficinaUpdate(BaseModel):
    nome_fantasia: str = Field(..., min_length=1, max_length=100)
    razao_social: str | None = Field(default=None, max_length=150)
    cnpj_cpf: str | None = Field(default=None, max_length=20)
    inscricao_estadual: str | None = Field(default=None, max_length=30)
    telefone: str | None = Field(default=None, max_length=20)
    whatsapp: str | None = Field(default=None, max_length=20)
    email: str | None = Field(default=None, max_length=100)
    logradouro: str | None = Field(default=None, max_length=150)
    numero: str | None = Field(default=None, max_length=20)
    complemento: str | None = Field(default=None, max_length=100)
    bairro: str | None = Field(default=None, max_length=100)
    cidade: str | None = Field(default=None, max_length=100)
    estado: str | None = Field(default=None, max_length=2)
    cep: str | None = Field(default=None, max_length=10)
    nome_responsavel: str | None = Field(default=None, max_length=100)


class ConfiguracaoOficinaResponse(BaseModel):
    id: int
    nome_fantasia: str
    razao_social: str | None
    cnpj_cpf: str | None
    inscricao_estadual: str | None
    telefone: str | None
    whatsapp: str | None
    email: str | None
    logradouro: str | None
    numero: str | None
    complemento: str | None
    bairro: str | None
    cidade: str | None
    estado: str | None
    cep: str | None
    nome_responsavel: str | None
    data_criacao: datetime
    data_alteracao: datetime

    model_config = ConfigDict(from_attributes=True)
