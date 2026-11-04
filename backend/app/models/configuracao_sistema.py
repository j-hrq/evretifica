from datetime import datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.pessoa import utc_now


class ConfiguracaoOficina(Base):
    __tablename__ = "configuracao_oficina"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome_fantasia: Mapped[str] = mapped_column(String(100), nullable=False, default="EVR Retífica")
    razao_social: Mapped[str | None] = mapped_column(String(150), nullable=True)
    cnpj_cpf: Mapped[str | None] = mapped_column(String(20), nullable=True)
    inscricao_estadual: Mapped[str | None] = mapped_column(String(30), nullable=True)
    telefone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    whatsapp: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(100), nullable=True)
    logradouro: Mapped[str | None] = mapped_column(String(150), nullable=True)
    numero: Mapped[str | None] = mapped_column(String(20), nullable=True)
    complemento: Mapped[str | None] = mapped_column(String(100), nullable=True)
    bairro: Mapped[str | None] = mapped_column(String(100), nullable=True)
    cidade: Mapped[str | None] = mapped_column(String(100), nullable=True)
    estado: Mapped[str | None] = mapped_column(String(2), nullable=True)
    cep: Mapped[str | None] = mapped_column(String(10), nullable=True)
    nome_responsavel: Mapped[str | None] = mapped_column(String(100), nullable=True)
    data_criacao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )
    data_alteracao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now
    )
