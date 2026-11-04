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


class Endereco(Base):
    __tablename__ = "endereco"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    logradouro: Mapped[str | None] = mapped_column(String(150), nullable=True)
    numero: Mapped[str | None] = mapped_column(String(20), nullable=True)
    complemento: Mapped[str | None] = mapped_column(String(100), nullable=True)
    bairro: Mapped[str | None] = mapped_column(String(100), nullable=True)
    cidade: Mapped[str | None] = mapped_column(String(100), nullable=True)
    estado: Mapped[str | None] = mapped_column(String(2), nullable=True)
    cep: Mapped[str | None] = mapped_column(String(10), nullable=True)
    data_criacao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )
    data_alteracao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now
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
    nome_fantasia: Mapped[str | None] = mapped_column(String(100), nullable=True)
    inscricao_estadual: Mapped[str | None] = mapped_column(String(30), nullable=True)
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
    endereco_id: Mapped[int | None] = mapped_column(
        ForeignKey("endereco.id"), nullable=True, unique=True
    )
    data_criacao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )
    data_alteracao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now
    )

    pessoa_fisica: Mapped[PessoaFisica | None] = relationship("PessoaFisica")
    pessoa_juridica: Mapped[PessoaJuridica | None] = relationship("PessoaJuridica")
    endereco: Mapped[Endereco | None] = relationship("Endereco")
    telefones: Mapped[list[Telefone]] = relationship("Telefone", secondary=pessoa_telefone)

    @property
    def cpf(self) -> str | None:
        return self.pessoa_fisica.cpf if self.pessoa_fisica is not None else None

    @property
    def cnpj(self) -> str | None:
        return self.pessoa_juridica.cnpj if self.pessoa_juridica is not None else None

    @property
    def nome_fantasia(self) -> str | None:
        return self.pessoa_juridica.nome_fantasia if self.pessoa_juridica is not None else None

    @property
    def inscricao_estadual(self) -> str | None:
        return self.pessoa_juridica.inscricao_estadual if self.pessoa_juridica is not None else None
