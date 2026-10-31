import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.cliente import ClienteOutput
from app.schemas.marca_veiculo import MarcaVeiculoOutput

_PADRAO_PLACA = re.compile(r"^[A-Z]{3}(?:\d{4}|\d[A-Z]\d{2})$")


def normalizar_placa(valor: str) -> str:
    return re.sub(r"[\s\-]", "", valor).upper()


def validar_placa(valor: str) -> str:
    limpa = valor.strip().upper()
    if limpa.count("-") > 1 or ("-" in limpa and limpa[3:4] != "-"):
        raise ValueError("Placa inválida. Use o padrão AAA9999 ou AAA9A99.")
    normalizada = normalizar_placa(limpa)
    if not _PADRAO_PLACA.fullmatch(normalizada):
        raise ValueError("Placa inválida. Use o padrão AAA9999 ou AAA9A99.")
    return normalizada


class VeiculoInput(BaseModel):
    cliente_id: int = Field(gt=0)
    marca_id: int = Field(gt=0)
    modelo: str
    placa: str
    ano_fabricacao: int | None = None
    ano_modelo: int | None = None
    cor: str | None = None
    km: int | None = None
    observacao: str | None = None

    @field_validator("modelo")
    @classmethod
    def _validar_modelo(cls, v: str) -> str:
        limpo = v.strip()
        if not limpo:
            raise ValueError("Modelo é obrigatório.")
        return limpo

    @field_validator("placa")
    @classmethod
    def _validar_placa_campo(cls, v: str) -> str:
        return validar_placa(v)

    @field_validator("ano_fabricacao", "ano_modelo")
    @classmethod
    def _validar_ano(cls, v: int | None) -> int | None:
        if v is None:
            return None
        if v < 1000 or v > 9999:
            raise ValueError("Ano deve conter 4 dígitos.")
        return v

    @field_validator("km")
    @classmethod
    def _validar_km(cls, v: int | None) -> int | None:
        if v is None:
            return None
        if v < 0:
            raise ValueError("Quilometragem não pode ser negativa.")
        return v

    @field_validator("cor", "observacao")
    @classmethod
    def _normalizar_texto_opcional(cls, v: str | None) -> str | None:
        if v is None:
            return None
        limpo = v.strip()
        return limpo if limpo else None


class VeiculoOutput(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    cliente_id: int
    marca_id: int
    modelo: str
    placa: str
    ano_fabricacao: int | None = None
    ano_modelo: int | None = None
    cor: str | None = None
    km: int | None = None
    observacao: str | None = None
    cliente: ClienteOutput
    marca: MarcaVeiculoOutput
    data_criacao: datetime
    data_alteracao: datetime
