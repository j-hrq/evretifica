import getpass
import re
import sys
from collections.abc import Callable, Sequence

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models.usuario import Usuario
from app.schemas.pessoa import PessoaInput
from app.services.usuario import criar_usuario_com_pessoa


def possui_usuario_cadastrado(db: Session) -> bool:
    total = db.scalar(select(func.count(Usuario.id))) or 0
    return total > 0


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


def executar_seed_se_vazio(
    db: Session,
    *,
    input_fn: Callable[[str], str] = input,
    getpass_fn: Callable[[str], str] = getpass.getpass,
) -> Usuario | None:
    if possui_usuario_cadastrado(db):
        return None
    return executar_seed(db, input_fn=input_fn, getpass_fn=getpass_fn)


def main(argv: Sequence[str] | None = None) -> None:
    argumentos = list(sys.argv[1:] if argv is None else argv)
    apenas_se_vazio = "--se-vazio" in argumentos

    with SessionLocal() as db:
        if apenas_se_vazio:
            usuario = executar_seed_se_vazio(db)
            if usuario is None:
                print("Usuário já cadastrado no banco; pulando criação inicial.")
                return
        else:
            usuario = executar_seed(db)
        print(f"Usuário '{usuario.login}' criado com sucesso.")


if __name__ == "__main__":
    main()
