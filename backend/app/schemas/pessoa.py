import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.enums import TipoTelefone


def validar_cpf(valor: str) -> str:
    limpo = re.sub(r"[.\-\s]", "", valor)
    if not limpo.isdigit():
        raise ValueError("CPF deve conter apenas dígitos.")
    if len(limpo) != 11:
        raise ValueError("CPF deve ter 11 dígitos.")
    if len(set(limpo)) == 1:
        raise ValueError("CPF inválido.")

    soma_1 = sum(int(limpo[i]) * (10 - i) for i in range(9))
    resto_1 = soma_1 % 11
    digito_1 = 0 if resto_1 < 2 else 11 - resto_1

    soma_2 = sum(int(limpo[i]) * (11 - i) for i in range(10))
    resto_2 = soma_2 % 11
    digito_2 = 0 if resto_2 < 2 else 11 - resto_2

    if int(limpo[9]) != digito_1 or int(limpo[10]) != digito_2:
        raise ValueError("CPF inválido.")

    return limpo


def validar_cnpj(valor: str) -> str:
    limpo = re.sub(r"[.\-/\s]", "", valor)
    if not limpo.isdigit():
        raise ValueError("CNPJ deve conter apenas dígitos.")
    if len(limpo) != 14:
        raise ValueError("CNPJ deve ter 14 dígitos.")
    if len(set(limpo)) == 1:
        raise ValueError("CNPJ inválido.")

    pesos_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    soma_1 = sum(int(limpo[i]) * pesos_1[i] for i in range(12))
    resto_1 = soma_1 % 11
    digito_1 = 0 if resto_1 < 2 else 11 - resto_1

    pesos_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    soma_2 = sum(int(limpo[i]) * pesos_2[i] for i in range(13))
    resto_2 = soma_2 % 11
    digito_2 = 0 if resto_2 < 2 else 11 - resto_2

    if int(limpo[12]) != digito_1 or int(limpo[13]) != digito_2:
        raise ValueError("CNPJ inválido.")

    return limpo


class TelefoneInput(BaseModel):
    ddd: str
    telefone: str
    tipo_id: TipoTelefone

    @field_validator("ddd")
    @classmethod
    def _validar_ddd(cls, v: str) -> str:
        limpo = v.strip()
        if not limpo.isdigit() or len(limpo) != 2:
            raise ValueError("DDD deve conter exatamente 2 dígitos.")
        return limpo

    @field_validator("telefone")
    @classmethod
    def _validar_telefone(cls, v: str) -> str:
        limpo = re.sub(r"[\-\s]", "", v)
        if not limpo.isdigit() or len(limpo) not in (8, 9):
            raise ValueError("Telefone deve conter 8 ou 9 dígitos.")
        return limpo


class TelefoneOutput(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ddd: str
    telefone: str
    tipo_id: TipoTelefone
    data_criacao: datetime
    data_alteracao: datetime


class PessoaInput(BaseModel):
    nome: str
    email: str | None = None
    cpf: str | None = None
    cnpj: str | None = None
    telefones: list[TelefoneInput] = Field(default_factory=list)

    @field_validator("nome")
    @classmethod
    def _validar_nome(cls, v: str) -> str:
        limpo = v.strip()
        if not limpo:
            raise ValueError("Nome é obrigatório.")
        return limpo

    @field_validator("email")
    @classmethod
    def _normalizar_email(cls, v: str | None) -> str | None:
        if v is None:
            return None
        limpo = v.strip()
        return limpo if limpo else None

    @field_validator("cpf")
    @classmethod
    def _validar_cpf_campo(cls, v: str | None) -> str | None:
        if v is None:
            return None
        limpo = v.strip()
        if not limpo:
            return None
        return validar_cpf(limpo)

    @field_validator("cnpj")
    @classmethod
    def _validar_cnpj_campo(cls, v: str | None) -> str | None:
        if v is None:
            return None
        limpo = v.strip()
        if not limpo:
            return None
        return validar_cnpj(limpo)

    @model_validator(mode="after")
    def _validar_exatamente_um_documento(self) -> "PessoaInput":
        tem_cpf = self.cpf is not None
        tem_cnpj = self.cnpj is not None
        if tem_cpf == tem_cnpj:
            raise ValueError("Informe exatamente um documento: CPF ou CNPJ.")
        return self


class PessoaOutput(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    email: str | None = None
    cpf: str | None = None
    cnpj: str | None = None
    telefones: list[TelefoneOutput] = Field(default_factory=list)
    data_criacao: datetime
    data_alteracao: datetime
