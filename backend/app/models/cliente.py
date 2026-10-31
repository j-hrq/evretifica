from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.pessoa import Pessoa, utc_now


class Cliente(Base):
    __tablename__ = "cliente"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    pessoa_id: Mapped[int] = mapped_column(ForeignKey("pessoa.id"), nullable=False, unique=True)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    data_criacao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )
    data_alteracao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now
    )

    pessoa: Mapped[Pessoa] = relationship("Pessoa")
