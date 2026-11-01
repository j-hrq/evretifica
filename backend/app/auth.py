import base64
import hashlib
import hmac
import json
import secrets
import time

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.db import get_db
from app.models.usuario import Usuario

NOME_COOKIE_SESSAO = "sessao"
DURACAO_SESSAO_SEGUNDOS = 60 * 60 * 24 * 7
ROTAS_PUBLICAS = {"/api/health", "/api/auth/login"}

_SCRYPT_N = 16384
_SCRYPT_R = 8
_SCRYPT_P = 1
_SCRYPT_DKLEN = 64


def gerar_hash_senha(senha: str) -> str:
    salt = secrets.token_hex(16)
    derivado = hashlib.scrypt(
        senha.encode("utf-8"),
        salt=bytes.fromhex(salt),
        n=_SCRYPT_N,
        r=_SCRYPT_R,
        p=_SCRYPT_P,
        dklen=_SCRYPT_DKLEN,
    )
    return f"scrypt${_SCRYPT_N}${_SCRYPT_R}${_SCRYPT_P}${salt}${derivado.hex()}"


def verificar_senha(senha: str, senha_hash: str) -> bool:
    try:
        algoritmo, n_str, r_str, p_str, salt, hash_esperado = senha_hash.split("$")
        if algoritmo != "scrypt":
            return False
        derivado = hashlib.scrypt(
            senha.encode("utf-8"),
            salt=bytes.fromhex(salt),
            n=int(n_str),
            r=int(r_str),
            p=int(p_str),
            dklen=_SCRYPT_DKLEN,
        )
    except (ValueError, TypeError):
        return False

    return hmac.compare_digest(derivado.hex(), hash_esperado)


def criar_token_sessao(usuario_id: int, duracao_segundos: int = DURACAO_SESSAO_SEGUNDOS) -> str:
    payload = {
        "uid": usuario_id,
        "exp": int(time.time()) + duracao_segundos,
    }
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    payload_b64 = base64.urlsafe_b64encode(payload_bytes).decode("ascii").rstrip("=")
    assinatura = hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        payload_b64.encode("ascii"),
        hashlib.sha256,
    ).hexdigest()
    return f"{payload_b64}.{assinatura}"


def ler_token_sessao(token: str) -> int | None:
    try:
        payload_b64, assinatura = token.split(".", maxsplit=1)
        assinatura_esperada = hmac.new(
            settings.SECRET_KEY.encode("utf-8"),
            payload_b64.encode("ascii"),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(assinatura, assinatura_esperada):
            return None

        padding = "=" * (-len(payload_b64) % 4)
        payload_bytes = base64.urlsafe_b64decode(payload_b64 + padding)
        dados = json.loads(payload_bytes.decode("utf-8"))
        exp = int(dados["exp"])
        uid = int(dados["uid"])
        if exp <= int(time.time()):
            return None
        return uid
    except (ValueError, KeyError, TypeError, json.JSONDecodeError):
        return None


def obter_usuario_atual(
    request: Request,
    db: Session = Depends(get_db),  # noqa: B008
) -> Usuario:
    token = request.cookies.get(NOME_COOKIE_SESSAO)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Não autenticado.",
        )

    usuario_id = ler_token_sessao(token)
    if usuario_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sessão inválida ou expirada.",
        )

    stmt = select(Usuario).where(Usuario.id == usuario_id).options(joinedload(Usuario.pessoa))
    usuario = db.execute(stmt).scalar_one_or_none()
    if usuario is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Não autenticado.",
        )

    return usuario


def exigir_sessao_exceto_publicas(
    request: Request,
    db: Session = Depends(get_db),  # noqa: B008
) -> None:
    if request.url.path in ROTAS_PUBLICAS or not request.url.path.startswith("/api"):
        return
    obter_usuario_atual(request, db)
