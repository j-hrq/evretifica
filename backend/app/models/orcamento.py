from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.cliente import Cliente
from app.models.enums import SituacaoAvaliacao
from app.models.item import Item
from app.models.pessoa import utc_now
from app.models.veiculo import Veiculo


class Orcamento(Base):
    __tablename__ = "orcamento"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    numero: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    cliente_id: Mapped[int] = mapped_column(ForeignKey("cliente.id"), nullable=False)
    veiculo_id: Mapped[int] = mapped_column(ForeignKey("veiculo.id"), nullable=False)
    status_id: Mapped[int] = mapped_column(
        Integer, nullable=False, default=int(SituacaoAvaliacao.PENDENTE)
    )
    data_emissao: Mapped[date] = mapped_column(Date, nullable=False)
    validade_dias: Mapped[int | None] = mapped_column(Integer, nullable=True)
    descricao: Mapped[str | None] = mapped_column(Text, nullable=True)
    data_criacao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )
    data_alteracao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now
    )

    cliente: Mapped[Cliente] = relationship("Cliente")
    veiculo: Mapped[Veiculo] = relationship("Veiculo")
    itens: Mapped[list["ItemOrcamento"]] = relationship(
        "ItemOrcamento",
        back_populates="orcamento",
        cascade="all, delete-orphan",
        order_by="ItemOrcamento.id",
    )


class ItemOrcamento(Base):
    __tablename__ = "item_orcamento"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    orcamento_id: Mapped[int] = mapped_column(
        ForeignKey("orcamento.id", ondelete="CASCADE"), nullable=False
    )
    item_id: Mapped[int] = mapped_column(ForeignKey("item.id"), nullable=False)
    tipo_id: Mapped[int] = mapped_column(Integer, nullable=False)
    valor_unitario: Mapped[int] = mapped_column(Integer, nullable=False)
    quantidade: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    data_criacao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )
    data_alteracao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now
    )

    orcamento: Mapped[Orcamento] = relationship("Orcamento", back_populates="itens")
    item: Mapped[Item] = relationship("Item")
