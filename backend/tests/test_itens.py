import pytest
from fastapi.testclient import TestClient

import app.services.item as item_service


def test_itens_exige_sessao(client: TestClient) -> None:
    assert client.get("/api/itens").status_code == 401
    assert client.post("/api/itens", json={"nome": "Retífica de cabeçote"}).status_code == 401


def test_criar_obter_editar_excluir_item(auth_client: TestClient) -> None:
    res_criar = auth_client.post(
        "/api/itens",
        json={"nome": "Retífica de bloco", "ativo": True},
    )
    assert res_criar.status_code == 201
    criado = res_criar.json()
    assert criado["nome"] == "Retífica de bloco"
    assert criado["ativo"] is True
    item_id = criado["id"]

    res_obter = auth_client.get(f"/api/itens/{item_id}")
    assert res_obter.status_code == 200
    assert res_obter.json()["nome"] == "Retífica de bloco"

    res_editar = auth_client.put(
        f"/api/itens/{item_id}",
        json={"nome": "Retífica completa de bloco", "ativo": False},
    )
    assert res_editar.status_code == 200
    editado = res_editar.json()
    assert editado["nome"] == "Retífica completa de bloco"
    assert editado["ativo"] is False

    res_excluir = auth_client.delete(f"/api/itens/{item_id}")
    assert res_excluir.status_code == 204
    assert auth_client.get(f"/api/itens/{item_id}").status_code == 404


def test_listar_buscar_filtrar_ativo_e_paginar_itens(auth_client: TestClient) -> None:
    auth_client.post(
        "/api/itens",
        json={"nome": "Alinhamento de bielas", "ativo": True},
    )
    auth_client.post(
        "/api/itens",
        json={"nome": "Brunimento de cilindros", "ativo": True},
    )
    auth_client.post(
        "/api/itens",
        json={"nome": "Serviço descontinuado", "ativo": False},
    )

    res_pag = auth_client.get("/api/itens?page=1&per_page=2")
    assert res_pag.status_code == 200
    dados_pag = res_pag.json()
    assert dados_pag["total"] == 3
    assert dados_pag["total_pages"] == 2
    assert len(dados_pag["items"]) == 2

    res_busca = auth_client.get("/api/itens?q=brunimento")
    assert res_busca.status_code == 200
    assert res_busca.json()["total"] == 1
    assert res_busca.json()["items"][0]["nome"] == "Brunimento de cilindros"

    # Filtro ativo=true para seletores de novos lançamentos
    res_ativos = auth_client.get("/api/itens?ativo=true")
    assert res_ativos.status_code == 200
    assert res_ativos.json()["total"] == 2
    nomes_ativos = [i["nome"] for i in res_ativos.json()["items"]]
    assert "Serviço descontinuado" not in nomes_ativos


def test_excluir_item_com_vinculos_retorna_409(
    auth_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    res = auth_client.post(
        "/api/itens",
        json={"nome": "Plainar cabeçote", "ativo": True},
    )
    item_id = res.json()["id"]

    monkeypatch.setattr(item_service, "possui_vinculos_item", lambda _db, _id: True)

    res_del = auth_client.delete(f"/api/itens/{item_id}")
    assert res_del.status_code == 409
    assert "em uso" in res_del.json()["detail"] or "vínculos" in res_del.json()["detail"]
