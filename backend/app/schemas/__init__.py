from app.schemas.auth import LoginInput, UsuarioOutput
from app.schemas.cliente import ClienteInput, ClienteOutput
from app.schemas.comum import PaginacaoOutput
from app.schemas.item import ItemInput, ItemOutput
from app.schemas.marca_veiculo import MarcaVeiculoInput, MarcaVeiculoOutput
from app.schemas.orcamento import (
    ItemOrcamentoInput,
    ItemOrcamentoOutput,
    OrcamentoInput,
    OrcamentoOutput,
    calcular_total_item,
)
from app.schemas.ordem_servico import (
    ItemOrdemServicoInput,
    ItemOrdemServicoOutput,
    OrdemServicoInput,
    OrdemServicoOutput,
)
from app.schemas.pessoa import (
    PessoaInput,
    PessoaOutput,
    TelefoneInput,
    TelefoneOutput,
    validar_cnpj,
    validar_cpf,
)
from app.schemas.veiculo import (
    VeiculoInput,
    VeiculoOutput,
    normalizar_placa,
    validar_placa,
)

__all__ = [
    "ClienteInput",
    "ClienteOutput",
    "ItemInput",
    "ItemOrcamentoInput",
    "ItemOrcamentoOutput",
    "ItemOrdemServicoInput",
    "ItemOrdemServicoOutput",
    "ItemOutput",
    "LoginInput",
    "MarcaVeiculoInput",
    "MarcaVeiculoOutput",
    "OrcamentoInput",
    "OrcamentoOutput",
    "OrdemServicoInput",
    "OrdemServicoOutput",
    "PaginacaoOutput",
    "PessoaInput",
    "PessoaOutput",
    "TelefoneInput",
    "TelefoneOutput",
    "UsuarioOutput",
    "VeiculoInput",
    "VeiculoOutput",
    "calcular_total_item",
    "normalizar_placa",
    "validar_cnpj",
    "validar_cpf",
    "validar_placa",
]
