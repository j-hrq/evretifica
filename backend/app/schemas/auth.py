from pydantic import BaseModel, field_validator


class LoginInput(BaseModel):
    login: str
    senha: str

    @field_validator("login")
    @classmethod
    def _validar_login(cls, v: str) -> str:
        limpo = v.strip()
        if not limpo:
            raise ValueError("Login é obrigatório.")
        return limpo

    @field_validator("senha")
    @classmethod
    def _validar_senha(cls, v: str) -> str:
        if not v:
            raise ValueError("Senha é obrigatória.")
        return v


class UsuarioOutput(BaseModel):
    id: int
    login: str
    pessoa_id: int
    nome: str
