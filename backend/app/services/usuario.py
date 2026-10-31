from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.auth import gerar_hash_senha, verificar_senha
from app.models.usuario import Usuario
from app.schemas.pessoa import PessoaInput
from app.services.pessoa import criar_pessoa


def criar_usuario_com_pessoa(
    db: Session,
    dados_pessoa: PessoaInput,
    login: str,
    senha: str,
) -> Usuario:
    login_limpo = login.strip()
    if not login_limpo:
        raise ValueError("Login é obrigatório.")
    if not senha:
        raise ValueError("Senha é obrigatória.")

    try:
        pessoa = criar_pessoa(db, dados_pessoa, commit=False)
        usuario = Usuario(
            pessoa_id=pessoa.id,
            login=login_limpo,
            senha=gerar_hash_senha(senha),
        )
        db.add(usuario)
        db.commit()
    except Exception:
        db.rollback()
        raise

    stmt = select(Usuario).where(Usuario.id == usuario.id).options(joinedload(Usuario.pessoa))
    criado = db.execute(stmt).scalar_one()
    return criado


def autenticar_usuario(db: Session, login: str, senha: str) -> Usuario | None:
    stmt = select(Usuario).where(Usuario.login == login.strip()).options(joinedload(Usuario.pessoa))
    usuario = db.execute(stmt).scalar_one_or_none()
    if usuario is None:
        return None
    if not verificar_senha(senha, usuario.senha):
        return None
    return usuario
