from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.auth import (
    DURACAO_SESSAO_SEGUNDOS,
    NOME_COOKIE_SESSAO,
    criar_token_sessao,
    obter_usuario_atual,
)
from app.db import get_db
from app.models.usuario import Usuario
from app.schemas.auth import LoginInput, UsuarioOutput
from app.services.usuario import autenticar_usuario

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=UsuarioOutput)
def login(
    dados: LoginInput,
    response: Response,
    db: Session = Depends(get_db),  # noqa: B008
) -> UsuarioOutput:
    usuario = autenticar_usuario(db, dados.login, dados.senha)
    if usuario is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Login ou senha inválidos.",
        )

    token = criar_token_sessao(usuario.id)
    response.set_cookie(
        key=NOME_COOKIE_SESSAO,
        value=token,
        httponly=True,
        samesite="lax",
        max_age=DURACAO_SESSAO_SEGUNDOS,
        path="/",
    )
    return UsuarioOutput(
        id=usuario.id,
        login=usuario.login,
        pessoa_id=usuario.pessoa_id,
        nome=usuario.pessoa.nome,
    )


@router.post("/logout")
def logout(
    response: Response,
    _usuario: Usuario = Depends(obter_usuario_atual),  # noqa: B008
) -> dict[str, str]:
    response.delete_cookie(key=NOME_COOKIE_SESSAO, path="/")
    return {"status": "ok"}


@router.get("/me", response_model=UsuarioOutput)
def me(
    usuario: Usuario = Depends(obter_usuario_atual),  # noqa: B008
) -> UsuarioOutput:
    return UsuarioOutput(
        id=usuario.id,
        login=usuario.login,
        pessoa_id=usuario.pessoa_id,
        nome=usuario.pessoa.nome,
    )
