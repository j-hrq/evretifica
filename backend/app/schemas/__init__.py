from app.schemas.auth import LoginInput, UsuarioOutput
from app.schemas.cliente import ClienteInput, ClienteOutput
from app.schemas.comum import PaginacaoOutput
from app.schemas.marca_veiculo import MarcaVeiculoInput, MarcaVeiculoOutput
from app.schemas.pessoa import (
    PessoaInput,
    PessoaOutput,
    TelefoneInput,
    TelefoneOutput,
    validar_cnpj,
    validar_cpf,
)

__all__ = [
    "ClienteInput",
    "ClienteOutput",
    "LoginInput",
    "MarcaVeiculoInput",
    "MarcaVeiculoOutput",
    "PaginacaoOutput",
    "PessoaInput",
    "PessoaOutput",
    "TelefoneInput",
    "TelefoneOutput",
    "UsuarioOutput",
    "validar_cnpj",
    "validar_cpf",
]
