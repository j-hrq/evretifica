from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.cliente import Cliente
from app.models.enums import SituacaoAvaliacao
from app.models.item import Item
from app.models.pessoa import utc_now
from app.models.veiculo import Veiculo


class OrdemServico(Base):
    __tablename__ = "ordem_servico"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    numero: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    cliente_id: Mapped[int] = mapped_column(ForeignKey("cliente.id"), nullable=False)
    veiculo_id: Mapped[int] = mapped_column(ForeignKey("veiculo.id"), nullable=False)
    km_entrada: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status_id: Mapped[int] = mapped_column(
        Integer, nullable=False, default=int(SituacaoAvaliacao.PENDENTE)
    )
    descricao: Mapped[str | None] = mapped_column(Text, nullable=True)
    data_criacao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )
    data_alteracao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now
    )

    cliente: Mapped[Cliente] = relationship("Cliente")
    veiculo: Mapped[Veiculo] = relationship("Veiculo")
    itens: Mapped[list["ItemOrdemServico"]] = relationship(
        "ItemOrdemServico",
        back_populates="ordem_servico",
        cascade="all, delete-orphan",
        order_by="ItemOrdemServico.id",
    )


class ItemOrdemServico(Base):
    __tablename__ = "item_ordem_servico"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ordem_servico_id: Mapped[int] = mapped_column(
        ForeignKey("ordem_servico.id", ondelete="CASCADE"), nullable=False
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

    ordem_servico: Mapped[OrdemServico] = relationship("OrdemServico", back_populates="itens")
    item: Mapped[Item] = relationship("Item")
