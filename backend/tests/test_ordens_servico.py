from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

import app.services.ordem_servico as os_service
from app.models.enums import SituacaoAvaliacao, TipoItem


def test_ordens_servico_exige_sessao(client: TestClient) -> None:
    assert client.get("/api/ordens-servico").status_code == 401
    assert client.get("/api/ordens-servico/1/pdf").status_code == 401
    assert client.post("/api/ordens-servico", json={}).status_code == 401


def _criar_base(auth_client: TestClient) -> tuple[int, int, int, int, int]:
    res_c1 = auth_client.post(
        "/api/clientes",
        json={
            "ativo": True,
            "pessoa": {
                "nome": "Cliente OS Um",
                "cpf": "52998224725",
                "telefones": [],
            },
        },
    )
    c1_id = int(res_c1.json()["id"])

    res_c2 = auth_client.post(
        "/api/clientes",
        json={
            "ativo": True,
            "pessoa": {
                "nome": "Cliente OS Dois",
                "cpf": "11144477735",
                "telefones": [],
            },
        },
    )
    c2_id = int(res_c2.json()["id"])

    res_marca = auth_client.post(
        "/api/marcas-veiculo",
        json={"nome": "Volkswagen", "ativo": True},
    )
    marca_id = int(res_marca.json()["id"])

    res_v1 = auth_client.post(
        "/api/veiculos",
        json={
            "cliente_id": c1_id,
            "marca_id": marca_id,
            "modelo": "Fox",
            "placa": "AAA1111",
        },
    )
    v1_id = int(res_v1.json()["id"])

    res_item = auth_client.post(
        "/api/itens",
        json={"nome": "Retífica completa de motor", "ativo": True},
    )
    item_id = int(res_item.json()["id"])

    return c1_id, c2_id, marca_id, v1_id, item_id


def test_numeracao_independente_orc_os_virada_ano_e_sem_reutilizacao(
    auth_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    _, _, _, veiculo_id, item_id = _criar_base(auth_client)

    monkeypatch.setattr(
        os_service,
        "utc_now",
        lambda: datetime(2026, 6, 15, 12, 0, 0, tzinfo=UTC),
    )

    # Cria dois orçamentos em 2026 (001-2026-ORC e 002-2026-ORC)
    res_orc_1 = auth_client.post(
        "/api/orcamentos",
        json={"veiculo_id": veiculo_id, "data_emissao": "2026-06-15", "itens": []},
    )
    res_orc_2 = auth_client.post(
        "/api/orcamentos",
        json={"veiculo_id": veiculo_id, "data_emissao": "2026-06-15", "itens": []},
    )
    assert res_orc_1.json()["numero"] == "001-2026-ORC"
    assert res_orc_2.json()["numero"] == "002-2026-ORC"

    # Cria a primeira OS em 2026 -> deve ser 001-2026-OS (independente do contador de ORC)
    res_os_1 = auth_client.post(
        "/api/ordens-servico",
        json={
            "veiculo_id": veiculo_id,
            "km_entrada": 85400,
            "descricao": "Motor batendo pino",
            "itens": [
                {
                    "item_id": item_id,
                    "tipo_id": int(TipoItem.MAO_DE_OBRA),
                    "quantidade": "1.50",
                    "valor_unitario": 333,
                }
            ],
        },
    )
    assert res_os_1.status_code == 201
    os_1 = res_os_1.json()
    assert os_1["numero"] == "001-2026-OS"
    assert os_1["km_entrada"] == 85400
    assert os_1["total"] == 500  # 1.50 * 333 = 499.5 -> 500

    # Exclui a 001-2026-OS
    res_del = auth_client.delete(f"/api/ordens-servico/{os_1['id']}")
    assert res_del.status_code == 204

    # Próxima OS em 2026 não reutiliza o 001 -> recebe 002-2026-OS
    res_os_2 = auth_client.post(
        "/api/ordens-servico",
        json={"veiculo_id": veiculo_id, "itens": []},
    )
    assert res_os_2.status_code == 201
    assert res_os_2.json()["numero"] == "002-2026-OS"

    # Virada de ano em data_criacao reinicia a sequência de OS
    monkeypatch.setattr(
        os_service,
        "utc_now",
        lambda: datetime(2027, 1, 2, 9, 0, 0, tzinfo=UTC),
    )
    res_os_2027 = auth_client.post(
        "/api/ordens-servico",
        json={"veiculo_id": veiculo_id, "itens": []},
    )
    assert res_os_2027.status_code == 201
    assert res_os_2027.json()["numero"] == "001-2027-OS"


def test_cliente_da_os_preservado_quando_veiculo_muda_de_dono(
    auth_client: TestClient,
) -> None:
    c1_id, c2_id, marca_id, v1_id, item_id = _criar_base(auth_client)

    res_os = auth_client.post(
        "/api/ordens-servico",
        json={
            "veiculo_id": v1_id,
            "km_entrada": 40000,
            "itens": [
                {
                    "item_id": item_id,
                    "tipo_id": int(TipoItem.AMBOS),
                    "quantidade": "2.00",
                    "valor_unitario": 15000,
                }
            ],
        },
    )
    assert res_os.status_code == 201
    os_id = res_os.json()["id"]
    assert res_os.json()["cliente_id"] == c1_id

    # Troca o dono do veículo v1 para o Cliente OS Dois (c2_id)
    auth_client.put(
        f"/api/veiculos/{v1_id}",
        json={
            "cliente_id": c2_id,
            "marca_id": marca_id,
            "modelo": "Fox",
            "placa": "AAA1111",
        },
    )

    # A OS existente continua com o Cliente OS Um
    res_obter = auth_client.get(f"/api/ordens-servico/{os_id}")
    assert res_obter.status_code == 200
    assert res_obter.json()["cliente_id"] == c1_id
    assert res_obter.json()["cliente"]["pessoa"]["nome"] == "Cliente OS Um"

    # Editar mantendo o mesmo veiculo_id preserva o cliente_id original
    res_editar_mesmo = auth_client.put(
        f"/api/ordens-servico/{os_id}",
        json={
            "veiculo_id": v1_id,
            "km_entrada": 40100,
            "status_id": int(SituacaoAvaliacao.EM_ANDAMENTO),
            "descricao": "Em execução",
            "itens": [
                {
                    "item_id": item_id,
                    "tipo_id": int(TipoItem.AQUISICAO),
                    "quantidade": "1.00",
                    "valor_unitario": 80000,
                }
            ],
        },
    )
    assert res_editar_mesmo.status_code == 200
    assert res_editar_mesmo.json()["cliente_id"] == c1_id
    assert res_editar_mesmo.json()["km_entrada"] == 40100
    assert res_editar_mesmo.json()["total"] == 80000

    # Se trocar o veiculo_id da OS para um veículo do Cliente OS Dois, atualiza o cliente_id
    res_v2 = auth_client.post(
        "/api/veiculos",
        json={
            "cliente_id": c2_id,
            "marca_id": marca_id,
            "modelo": "Polo",
            "placa": "BBB2B22",
        },
    )
    v2_id = res_v2.json()["id"]

    res_trocar_veiculo = auth_client.put(
        f"/api/ordens-servico/{os_id}",
        json={
            "veiculo_id": v2_id,
            "status_id": int(SituacaoAvaliacao.CONCLUIDO),
            "itens": [],
        },
    )
    assert res_trocar_veiculo.status_code == 200
    assert res_trocar_veiculo.json()["cliente_id"] == c2_id
    assert res_trocar_veiculo.json()["cliente"]["pessoa"]["nome"] == "Cliente OS Dois"


def test_rejeita_cliente_id_ou_numero_no_envio_e_valida_campos(
    auth_client: TestClient,
) -> None:
    c1_id, _, _, v1_id, item_id = _criar_base(auth_client)

    assert (
        auth_client.post(
            "/api/ordens-servico",
            json={"veiculo_id": v1_id, "cliente_id": c1_id, "itens": []},
        ).status_code
        == 422
    )
    assert (
        auth_client.post(
            "/api/ordens-servico",
            json={"veiculo_id": v1_id, "numero": "999-2026-OS", "itens": []},
        ).status_code
        == 422
    )
    assert (
        auth_client.post(
            "/api/ordens-servico",
            json={"veiculo_id": v1_id, "km_entrada": -10, "itens": []},
        ).status_code
        == 422
    )
    assert (
        auth_client.post(
            "/api/ordens-servico",
            json={
                "veiculo_id": v1_id,
                "itens": [
                    {
                        "item_id": item_id,
                        "tipo_id": int(TipoItem.MAO_DE_OBRA),
                        "quantidade": "1.999",
                        "valor_unitario": 1000,
                    }
                ],
            },
        ).status_code
        == 422
    )


def test_listar_buscar_filtrar_status_e_paginar_ordens_servico(
    auth_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    _, _, _, v1_id, _ = _criar_base(auth_client)

    monkeypatch.setattr(
        os_service,
        "utc_now",
        lambda: datetime(2026, 7, 1, 10, 0, 0, tzinfo=UTC),
    )

    auth_client.post(
        "/api/ordens-servico",
        json={
            "veiculo_id": v1_id,
            "status_id": int(SituacaoAvaliacao.PENDENTE),
            "itens": [],
        },
    )
    auth_client.post(
        "/api/ordens-servico",
        json={
            "veiculo_id": v1_id,
            "status_id": int(SituacaoAvaliacao.CONCLUIDO),
            "itens": [],
        },
    )

    res_pag = auth_client.get("/api/ordens-servico?page=1&per_page=1")
    assert res_pag.status_code == 200
    assert res_pag.json()["total"] == 2
    assert res_pag.json()["total_pages"] == 2
    assert len(res_pag.json()["items"]) == 1

    res_status = auth_client.get(
        f"/api/ordens-servico?status_id={int(SituacaoAvaliacao.CONCLUIDO)}"
    )
    assert res_status.status_code == 200
    assert res_status.json()["total"] == 1
    assert res_status.json()["items"][0]["numero"] == "002-2026-OS"

    res_busca_num = auth_client.get("/api/ordens-servico?q=001-2026-OS")
    assert res_busca_num.status_code == 200
    assert res_busca_num.json()["total"] == 1
    assert res_busca_num.json()["items"][0]["numero"] == "001-2026-OS"

    res_busca_placa = auth_client.get("/api/ordens-servico?q=aaa-1111")
    assert res_busca_placa.status_code == 200
    assert res_busca_placa.json()["total"] == 2


def test_gerar_pdf_ordem_servico(auth_client: TestClient) -> None:
    _c1, _c2, _marca, v1_id, item_id = _criar_base(auth_client)
    res_criar = auth_client.post(
        "/api/ordens-servico",
        json={
            "veiculo_id": v1_id,
            "status_id": int(SituacaoAvaliacao.EM_ANDAMENTO),
            "km_entrada": 45000,
            "descricao": "Troca de correia dentada e revisão completa.",
            "itens": [
                {
                    "item_id": item_id,
                    "tipo_id": int(TipoItem.AQUISICAO),
                    "quantidade": 1.0,
                    "valor_unitario": 350.0,
                },
            ],
        },
    )
    assert res_criar.status_code == 201
    os_id = res_criar.json()["id"]

    # Autenticado deve retornar PDF válido
    res_pdf = auth_client.get(f"/api/ordens-servico/{os_id}/pdf")
    assert res_pdf.status_code == 200
    assert "application/pdf" in res_pdf.headers["content-type"]
    assert res_pdf.content.startswith(b"%PDF-")
    assert len(res_pdf.content) > 500

    # OS inexistente deve retornar 404
    assert auth_client.get("/api/ordens-servico/99999/pdf").status_code == 404
