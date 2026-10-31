from datetime import UTC, datetime

from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, Integer, String, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def utc_now() -> datetime:
    return datetime.now(UTC)


pessoa_telefone = Table(
    "pessoa_telefone",
    Base.metadata,
    Column("pessoa_id", ForeignKey("pessoa.id"), primary_key=True),
    Column("telefone_id", ForeignKey("telefone.id"), primary_key=True),
)


class PessoaFisica(Base):
    __tablename__ = "pessoa_fisica"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cpf: Mapped[str] = mapped_column(String(11), nullable=False, unique=True)
    data_criacao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )
    data_alteracao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now
    )


class PessoaJuridica(Base):
    __tablename__ = "pessoa_juridica"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cnpj: Mapped[str] = mapped_column(String(14), nullable=False, unique=True)
    data_criacao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )
    data_alteracao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now
    )


class Telefone(Base):
    __tablename__ = "telefone"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ddd: Mapped[str] = mapped_column(String(2), nullable=False)
    telefone: Mapped[str] = mapped_column(String(9), nullable=False)
    tipo_id: Mapped[int] = mapped_column(Integer, nullable=False)
    data_criacao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )
    data_alteracao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now
    )


class Pessoa(Base):
    __tablename__ = "pessoa"
    __table_args__ = (
        CheckConstraint(
            "(pessoa_fisica_id IS NOT NULL AND pessoa_juridica_id IS NULL) OR "
            "(pessoa_fisica_id IS NULL AND pessoa_juridica_id IS NOT NULL)",
            name="ck_pessoa_exatamente_um_documento",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    pessoa_fisica_id: Mapped[int | None] = mapped_column(
        ForeignKey("pessoa_fisica.id"), nullable=True, unique=True
    )
    pessoa_juridica_id: Mapped[int | None] = mapped_column(
        ForeignKey("pessoa_juridica.id"), nullable=True, unique=True
    )
    data_criacao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )
    data_alteracao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now
    )

    pessoa_fisica: Mapped[PessoaFisica | None] = relationship("PessoaFisica")
    pessoa_juridica: Mapped[PessoaJuridica | None] = relationship("PessoaJuridica")
    telefones: Mapped[list[Telefone]] = relationship("Telefone", secondary=pessoa_telefone)
