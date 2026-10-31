from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./oficina.db"
    SECRET_KEY: str = "troque-esta-chave-secreta"

    model_config = SettingsConfigDict(
        env_file=(str(ROOT_ENV_PATH), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
