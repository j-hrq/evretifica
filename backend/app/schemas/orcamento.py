from datetime import date, datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator

from app.models.enums import SituacaoAvaliacao, TipoItem
from app.schemas.cliente import ClienteOutput
from app.schemas.item import ItemOutput
from app.schemas.veiculo import VeiculoOutput


def calcular_total_item(quantidade: Decimal, valor_unitario: int) -> int:
    total_decimal = (quantidade * Decimal(valor_unitario)).quantize(
        Decimal("1"), rounding=ROUND_HALF_UP
    )
    return int(total_decimal)


class ItemOrcamentoInput(BaseModel):
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


class OrcamentoInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    veiculo_id: int = Field(gt=0)
    status_id: SituacaoAvaliacao = SituacaoAvaliacao.PENDENTE
    data_emissao: date = Field(default_factory=date.today)
    validade_dias: int | None = None
    descricao: str | None = None
    itens: list[ItemOrcamentoInput] = Field(default_factory=list)

    @field_validator("validade_dias")
    @classmethod
    def _validar_validade_dias(cls, v: int | None) -> int | None:
        if v is None:
            return None
        if v < 1:
            raise ValueError("Validade em dias deve ser um inteiro positivo.")
        return v

    @field_validator("descricao")
    @classmethod
    def _normalizar_descricao(cls, v: str | None) -> str | None:
        if v is None:
            return None
        limpo = v.strip()
        return limpo if limpo else None


class ItemOrcamentoOutput(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    orcamento_id: int
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


class OrcamentoOutput(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    numero: str
    cliente_id: int
    veiculo_id: int
    status_id: SituacaoAvaliacao
    data_emissao: date
    validade_dias: int | None = None
    descricao: str | None = None
    cliente: ClienteOutput
    veiculo: VeiculoOutput
    itens: list[ItemOrcamentoOutput] = Field(default_factory=list)
    data_criacao: datetime
    data_alteracao: datetime

    @computed_field  # type: ignore[prop-decorator]
    @property
    def data_vencimento(self) -> date | None:
        if self.validade_dias is None:
            return None
        return self.data_emissao + timedelta(days=self.validade_dias)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def total(self) -> int:
        return sum(item.total for item in self.itens)
