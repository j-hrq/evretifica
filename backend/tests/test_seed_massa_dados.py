from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.cliente import Cliente
from app.models.item import Item
from app.models.marca_veiculo import MarcaVeiculo
from app.models.orcamento import Orcamento
from app.models.ordem_servico import OrdemServico
from app.models.veiculo import Veiculo
from app.seed_massa_dados import executar_seed_massa_dados


def test_executar_seed_massa_dados(db_session: Session) -> None:
    totais = executar_seed_massa_dados(db_session, quantidade_alvo=3)

    assert totais["marcas"] >= 3
    assert totais["clientes"] >= 3
    assert totais["veiculos"] >= 3
    assert totais["itens"] >= 3
    assert totais["orcamentos"] >= 3
    assert totais["ordens_servico"] >= 3

    assert db_session.scalar(select(func.count(Cliente.id))) >= 3
    assert db_session.scalar(select(func.count(MarcaVeiculo.id))) >= 3
    assert db_session.scalar(select(func.count(Veiculo.id))) >= 3
    assert db_session.scalar(select(func.count(Item.id))) >= 3
    assert db_session.scalar(select(func.count(Orcamento.id))) >= 3
    assert db_session.scalar(select(func.count(OrdemServico.id))) >= 3
