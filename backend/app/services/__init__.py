from app.services.cliente import (
    atualizar_cliente,
    criar_cliente,
    excluir_cliente,
    listar_clientes,
    obter_cliente,
    possui_vinculos_cliente,
)
from app.services.item import (
    atualizar_item,
    criar_item,
    excluir_item,
    listar_itens,
    obter_item,
    possui_vinculos_item,
)
from app.services.marca_veiculo import (
    atualizar_marca_veiculo,
    criar_marca_veiculo,
    excluir_marca_veiculo,
    listar_marcas_veiculo,
    obter_marca_veiculo,
    possui_vinculos_marca_veiculo,
)
from app.services.numeracao import gerar_proximo_numero
from app.services.orcamento import (
    atualizar_orcamento,
    criar_orcamento,
    excluir_orcamento,
    listar_orcamentos,
    obter_orcamento,
)
from app.services.pessoa import (
    atualizar_pessoa,
    carregar_pessoa,
    criar_pessoa,
    excluir_pessoa_se_sem_usuario,
)
from app.services.usuario import autenticar_usuario, criar_usuario_com_pessoa
from app.services.veiculo import (
    atualizar_veiculo,
    criar_veiculo,
    excluir_veiculo,
    listar_veiculos,
    obter_veiculo,
    possui_vinculos_veiculo,
)

__all__ = [
    "atualizar_cliente",
    "atualizar_item",
    "atualizar_marca_veiculo",
    "atualizar_orcamento",
    "atualizar_pessoa",
    "atualizar_veiculo",
    "autenticar_usuario",
    "carregar_pessoa",
    "criar_cliente",
    "criar_item",
    "criar_marca_veiculo",
    "criar_orcamento",
    "criar_pessoa",
    "criar_usuario_com_pessoa",
    "criar_veiculo",
    "excluir_cliente",
    "excluir_item",
    "excluir_marca_veiculo",
    "excluir_orcamento",
    "excluir_pessoa_se_sem_usuario",
    "excluir_veiculo",
    "gerar_proximo_numero",
    "listar_clientes",
    "listar_itens",
    "listar_marcas_veiculo",
    "listar_orcamentos",
    "listar_veiculos",
    "obter_cliente",
    "obter_item",
    "obter_marca_veiculo",
    "obter_orcamento",
    "obter_veiculo",
    "possui_vinculos_cliente",
    "possui_vinculos_item",
    "possui_vinculos_marca_veiculo",
    "possui_vinculos_veiculo",
]
