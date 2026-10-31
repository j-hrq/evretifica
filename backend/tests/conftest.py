from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.db import Base, get_db
from app.main import app
from app.schemas.pessoa import PessoaInput
from app.services.usuario import criar_usuario_com_pessoa


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=test_engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        test_engine.dispose()


@pytest.fixture
def client(db_session: Session) -> Generator[TestClient, None, None]:
    def _override_get_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def auth_client(client: TestClient, db_session: Session) -> TestClient:
    criar_usuario_com_pessoa(
        db_session,
        dados_pessoa=PessoaInput(nome="Operador Oficina", cpf="12345678909"),
        login="operador",
        senha="senha-operador",
    )
    res = client.post(
        "/api/auth/login",
        json={"login": "operador", "senha": "senha-operador"},
    )
    assert res.status_code == 200
    return client
