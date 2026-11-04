"""cria tabela endereco e reestrutura configuracao_sistema com pessoa_id

Revision ID: 8f3a1c9d4b2e
Revises: 5ce70beac4eb
Create Date: 2026-11-03 23:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "8f3a1c9d4b2e"
down_revision: str | Sequence[str] | None = "5ce70beac4eb"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "endereco",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("logradouro", sa.String(length=150), nullable=True),
        sa.Column("numero", sa.String(length=20), nullable=True),
        sa.Column("complemento", sa.String(length=100), nullable=True),
        sa.Column("bairro", sa.String(length=100), nullable=True),
        sa.Column("cidade", sa.String(length=100), nullable=True),
        sa.Column("estado", sa.String(length=2), nullable=True),
        sa.Column("cep", sa.String(length=10), nullable=True),
        sa.Column("data_criacao", sa.DateTime(timezone=True), nullable=False),
        sa.Column("data_alteracao", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    with op.batch_alter_table("pessoa_juridica") as batch_op:
        batch_op.add_column(sa.Column("nome_fantasia", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("inscricao_estadual", sa.String(length=30), nullable=True))

    with op.batch_alter_table("pessoa") as batch_op:
        batch_op.add_column(sa.Column("endereco_id", sa.Integer(), nullable=True))
        batch_op.create_unique_constraint("uq_pessoa_endereco_id", ["endereco_id"])
        batch_op.create_foreign_key("fk_pessoa_endereco_id", "endereco", ["endereco_id"], ["id"])

    op.drop_table("configuracao_oficina")
    op.create_table(
        "configuracao_sistema",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("pessoa_id", sa.Integer(), nullable=False),
        sa.Column("data_criacao", sa.DateTime(timezone=True), nullable=False),
        sa.Column("data_alteracao", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["pessoa_id"], ["pessoa.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("pessoa_id"),
    )


def downgrade() -> None:
    op.drop_table("configuracao_sistema")
    op.create_table(
        "configuracao_oficina",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nome_fantasia", sa.String(length=100), nullable=False),
        sa.Column("razao_social", sa.String(length=150), nullable=True),
        sa.Column("cnpj_cpf", sa.String(length=20), nullable=True),
        sa.Column("inscricao_estadual", sa.String(length=30), nullable=True),
        sa.Column("telefone", sa.String(length=20), nullable=True),
        sa.Column("whatsapp", sa.String(length=20), nullable=True),
        sa.Column("email", sa.String(length=100), nullable=True),
        sa.Column("logradouro", sa.String(length=150), nullable=True),
        sa.Column("numero", sa.String(length=20), nullable=True),
        sa.Column("complemento", sa.String(length=100), nullable=True),
        sa.Column("bairro", sa.String(length=100), nullable=True),
        sa.Column("cidade", sa.String(length=100), nullable=True),
        sa.Column("estado", sa.String(length=2), nullable=True),
        sa.Column("cep", sa.String(length=10), nullable=True),
        sa.Column("nome_responsavel", sa.String(length=100), nullable=True),
        sa.Column("data_criacao", sa.DateTime(timezone=True), nullable=False),
        sa.Column("data_alteracao", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    with op.batch_alter_table("pessoa") as batch_op:
        batch_op.drop_constraint("fk_pessoa_endereco_id", type_="foreignkey")
        batch_op.drop_constraint("uq_pessoa_endereco_id", type_="unique")
        batch_op.drop_column("endereco_id")

    with op.batch_alter_table("pessoa_juridica") as batch_op:
        batch_op.drop_column("inscricao_estadual")
        batch_op.drop_column("nome_fantasia")

    op.drop_table("endereco")
