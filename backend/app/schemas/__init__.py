from app.schemas.auth import LoginInput, UsuarioOutput
from app.schemas.cliente import ClienteInput, ClienteOutput
from app.schemas.comum import PaginacaoOutput
from app.schemas.item import ItemInput, ItemOutput
from app.schemas.marca_veiculo import MarcaVeiculoInput, MarcaVeiculoOutput
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
    "ItemOutput",
    "LoginInput",
    "MarcaVeiculoInput",
    "MarcaVeiculoOutput",
    "PaginacaoOutput",
    "PessoaInput",
    "PessoaOutput",
    "TelefoneInput",
    "TelefoneOutput",
    "UsuarioOutput",
    "VeiculoInput",
    "VeiculoOutput",
    "normalizar_placa",
    "validar_cnpj",
    "validar_cpf",
    "validar_placa",
]
