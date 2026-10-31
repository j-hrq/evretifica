from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.marca_veiculo import MarcaVeiculo
from app.seed_marcas import MARCAS_COMUNS_BRASIL, executar_seed_marcas


def test_marcas_veiculo_exige_sessao(client: TestClient) -> None:
    assert client.get("/api/marcas-veiculo").status_code == 401
    assert client.post("/api/marcas-veiculo", json={"nome": "Fiat"}).status_code == 401


def test_criar_obter_editar_excluir_marca_veiculo(auth_client: TestClient) -> None:
    res_criar = auth_client.post(
        "/api/marcas-veiculo",
        json={"nome": "Volkswagen", "ativo": True},
    )
    assert res_criar.status_code == 201
    criada = res_criar.json()
    assert criada["nome"] == "Volkswagen"
    assert criada["ativo"] is True
    marca_id = criada["id"]

    res_obter = auth_client.get(f"/api/marcas-veiculo/{marca_id}")
    assert res_obter.status_code == 200
    assert res_obter.json()["nome"] == "Volkswagen"

    res_editar = auth_client.put(
        f"/api/marcas-veiculo/{marca_id}",
        json={"nome": "VW", "ativo": False},
    )
    assert res_editar.status_code == 200
    editada = res_editar.json()
    assert editada["nome"] == "VW"
    assert editada["ativo"] is False

    res_excluir = auth_client.delete(f"/api/marcas-veiculo/{marca_id}")
    assert res_excluir.status_code == 204
    assert auth_client.get(f"/api/marcas-veiculo/{marca_id}").status_code == 404


def test_listar_buscar_e_paginar_marcas_veiculo(auth_client: TestClient) -> None:
    for nome in ["Fiat", "Ford", "Honda"]:
        auth_client.post(
            "/api/marcas-veiculo",
            json={"nome": nome, "ativo": True},
        )

    res_pag = auth_client.get("/api/marcas-veiculo?page=1&per_page=2")
    assert res_pag.status_code == 200
    dados_pag = res_pag.json()
    assert dados_pag["total"] == 3
    assert dados_pag["total_pages"] == 2
    assert len(dados_pag["items"]) == 2

    res_busca = auth_client.get("/api/marcas-veiculo?q=hon")
    assert res_busca.status_code == 200
    assert res_busca.json()["total"] == 1
    assert res_busca.json()["items"][0]["nome"] == "Honda"


def test_nome_marca_unico_retorna_409(auth_client: TestClient) -> None:
    res1 = auth_client.post(
        "/api/marcas-veiculo",
        json={"nome": "Toyota", "ativo": True},
    )
    assert res1.status_code == 201

    res_dup = auth_client.post(
        "/api/marcas-veiculo",
        json={"nome": "toyota", "ativo": True},
    )
    assert res_dup.status_code == 409


def test_excluir_marca_com_vinculos_retorna_409(
    auth_client: TestClient,
) -> None:
    res = auth_client.post(
        "/api/marcas-veiculo",
        json={"nome": "Chevrolet", "ativo": True},
    )
    marca_id = res.json()["id"]

    res_cliente = auth_client.post(
        "/api/clientes",
        json={
            "ativo": True,
            "pessoa": {
                "nome": "Dono Chevrolet",
                "cpf": "52998224725",
                "telefones": [],
            },
        },
    )
    cliente_id = res_cliente.json()["id"]

    res_veiculo = auth_client.post(
        "/api/veiculos",
        json={
            "cliente_id": cliente_id,
            "marca_id": marca_id,
            "modelo": "Onix",
            "placa": "DEF1G23",
        },
    )
    assert res_veiculo.status_code == 201

    res_del = auth_client.delete(f"/api/marcas-veiculo/{marca_id}")
    assert res_del.status_code == 409
    assert "vínculos" in res_del.json()["detail"] or "vinculados" in res_del.json()["detail"]


def test_seed_marcas_idempotente(db_session: Session) -> None:
    criadas_1 = executar_seed_marcas(db_session)
    assert len(criadas_1) == len(MARCAS_COMUNS_BRASIL)

    criadas_2 = executar_seed_marcas(db_session)
    assert len(criadas_2) == 0

    total = db_session.scalar(select(func.count()).select_from(MarcaVeiculo))
    assert total == len(MARCAS_COMUNS_BRASIL)
