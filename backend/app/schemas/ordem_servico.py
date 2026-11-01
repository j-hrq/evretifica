from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator

from app.models.enums import SituacaoAvaliacao, TipoItem
from app.schemas.cliente import ClienteOutput
from app.schemas.item import ItemOutput
from app.schemas.orcamento import calcular_total_item
from app.schemas.veiculo import VeiculoOutput


class ItemOrdemServicoInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    item_id: int = Field(gt=0)
    tipo_id: TipoItem
    quantidade: Decimal = Field(gt=Decimal("0"))
    valor_unitario: int = Field(ge=0)

    @field_validator("quantidade")
    @classmethod
    def _validar_casas_decimais(cls, v: Decimal) -> Decimal:
        expoente = v.as_tuple().exponent
        if isinstance(expoente, int) and expoente < -2:
            raise ValueError("Quantidade deve ter no máximo 2 casas decimais.")
        return v


class OrdemServicoInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    veiculo_id: int = Field(gt=0)
    km_entrada: int | None = None
    status_id: SituacaoAvaliacao = SituacaoAvaliacao.PENDENTE
    descricao: str | None = None
    itens: list[ItemOrdemServicoInput] = Field(default_factory=list)

    @field_validator("km_entrada")
    @classmethod
    def _validar_km_entrada(cls, v: int | None) -> int | None:
        if v is None:
            return None
        if v < 0:
            raise ValueError("Quilometragem de entrada não pode ser negativa.")
        return v

    @field_validator("descricao")
    @classmethod
    def _normalizar_descricao(cls, v: str | None) -> str | None:
        if v is None:
            return None
        limpo = v.strip()
        return limpo if limpo else None


class ItemOrdemServicoOutput(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ordem_servico_id: int
    item_id: int
    tipo_id: TipoItem
    valor_unitario: int
    quantidade: Decimal
    item: ItemOutput
    data_criacao: datetime
    data_alteracao: datetime

    @computed_field  # type: ignore[prop-decorator]
    @property
    def total(self) -> int:
        return calcular_total_item(self.quantidade, self.valor_unitario)


class OrdemServicoOutput(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    numero: str
    cliente_id: int
    veiculo_id: int
    km_entrada: int | None = None
    status_id: SituacaoAvaliacao
    descricao: str | None = None
    cliente: ClienteOutput
    veiculo: VeiculoOutput
    itens: list[ItemOrdemServicoOutput] = Field(default_factory=list)
    data_criacao: datetime
    data_alteracao: datetime

    @computed_field  # type: ignore[prop-decorator]
    @property
    def total(self) -> int:
        return sum(item.total for item in self.itens)
