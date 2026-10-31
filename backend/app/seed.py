import getpass
import re
from collections.abc import Callable

from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models.usuario import Usuario
from app.schemas.pessoa import PessoaInput
from app.services.usuario import criar_usuario_com_pessoa


def executar_seed(
    db: Session,
    *,
    input_fn: Callable[[str], str] = input,
    getpass_fn: Callable[[str], str] = getpass.getpass,
) -> Usuario:
    nome = input_fn("Nome: ").strip()
    documento = input_fn("CPF ou CNPJ: ").strip()
    login = input_fn("Login: ").strip()
    senha = getpass_fn("Senha: ")

    apenas_digitos = re.sub(r"\D", "", documento)
    if len(apenas_digitos) <= 11:
        dados_pessoa = PessoaInput(nome=nome, cpf=documento)
    else:
        dados_pessoa = PessoaInput(nome=nome, cnpj=documento)

    return criar_usuario_com_pessoa(
        db,
        dados_pessoa=dados_pessoa,
        login=login,
        senha=senha,
    )


def main() -> None:
    with SessionLocal() as db:
        usuario = executar_seed(db)
        print(f"Usuário '{usuario.login}' criado com sucesso.")


if __name__ == "__main__":
    main()
