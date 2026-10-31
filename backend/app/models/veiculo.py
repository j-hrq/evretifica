from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.cliente import Cliente
from app.models.marca_veiculo import MarcaVeiculo
from app.models.pessoa import utc_now


class Veiculo(Base):
    __tablename__ = "veiculo"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cliente_id: Mapped[int] = mapped_column(ForeignKey("cliente.id"), nullable=False)
    marca_id: Mapped[int] = mapped_column(ForeignKey("marca_veiculo.id"), nullable=False)
    modelo: Mapped[str] = mapped_column(String, nullable=False)
    placa: Mapped[str] = mapped_column(String(7), nullable=False, unique=True)
    ano_fabricacao: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ano_modelo: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cor: Mapped[str | None] = mapped_column(String, nullable=True)
    km: Mapped[int | None] = mapped_column(Integer, nullable=True)
    observacao: Mapped[str | None] = mapped_column(Text, nullable=True)
    data_criacao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )
    data_alteracao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now
    )

    cliente: Mapped[Cliente] = relationship("Cliente")
    marca: Mapped[MarcaVeiculo] = relationship("MarcaVeiculo")
