from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text

import app.db  # noqa: F401


def test_health_check(client: TestClient) -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_sqlite_foreign_keys_enabled() -> None:
    test_engine = create_engine("sqlite:///:memory:")
    with test_engine.connect() as conn:
        fk_enabled = conn.execute(text("PRAGMA foreign_keys")).scalar()
        assert fk_enabled == 1
