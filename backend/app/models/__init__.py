from app.models.cliente import Cliente
from app.models.enums import TipoTelefone
from app.models.marca_veiculo import MarcaVeiculo
from app.models.pessoa import Pessoa, PessoaFisica, PessoaJuridica, Telefone, pessoa_telefone
from app.models.usuario import Usuario

__all__ = [
    "Cliente",
    "MarcaVeiculo",
    "Pessoa",
    "PessoaFisica",
    "PessoaJuridica",
    "Telefone",
    "TipoTelefone",
    "Usuario",
    "pessoa_telefone",
]
