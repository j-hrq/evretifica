from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.enums import SituacaoAvaliacao, TipoItem
from app.schemas.orcamento import calcular_total_item
from app.services.numeracao import gerar_proximo_numero


@pytest.mark.parametrize(
    ("quantidade", "valor_unitario", "esperado"),
    [
        (Decimal("1.00"), 10000, 10000),
        (Decimal("2.50"), 10000, 25000),
        (Decimal("0.33"), 100, 33),
        (Decimal("0.33"), 10, 3),
        (Decimal("1.25"), 333, 416),  # 416.25 -> 416
        (Decimal("1.50"), 333, 500),  # 499.5 -> 500 (ROUND_HALF_UP)
    ],
)
def test_calcular_total_item_arredondamento(
    quantidade: Decimal, valor_unitario: int, esperado: int
) -> None:
    assert calcular_total_item(quantidade, valor_unitario) == esperado


def test_servico_numeracao_sequencia_virada_ano_e_tipos(db_session: Session) -> None:
    assert gerar_proximo_numero(db_session, "ORC", 2026) == "001-2026-ORC"
    assert gerar_proximo_numero(db_session, "ORC", 2026) == "002-2026-ORC"
    # Outro tipo no mesmo ano tem contador separado
    assert gerar_proximo_numero(db_session, "OS", 2026) == "001-2026-OS"
    # Virada de ano reinicia a sequência
    assert gerar_proximo_numero(db_session, "ORC", 2027) == "001-2027-ORC"
    assert gerar_proximo_numero(db_session, "ORC", 2026) == "003-2026-ORC"


def test_orcamentos_exige_sessao(client: TestClient) -> None:
    assert client.get("/api/orcamentos").status_code == 401
    assert client.post("/api/orcamentos", json={}).status_code == 401


def _criar_base(auth_client: TestClient) -> tuple[int, int, int, int, int]:
    res_c1 = auth_client.post(
        "/api/clientes",
        json={
            "ativo": True,
            "pessoa": {
                "nome": "Cliente Um",
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
                "nome": "Cliente Dois",
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
            "modelo": "Gol",
            "placa": "AAA1111",
        },
    )
    v1_id = int(res_v1.json()["id"])

    res_item = auth_client.post(
        "/api/itens",
        json={"nome": "Retífica de cabeçote", "ativo": True},
    )
    item_id = int(res_item.json()["id"])

    return c1_id, c2_id, marca_id, v1_id, item_id


def test_numeracao_orcamento_nao_reutiliza_apos_exclusao(auth_client: TestClient) -> None:
    _, _, _, veiculo_id, item_id = _criar_base(auth_client)

    res1 = auth_client.post(
        "/api/orcamentos",
        json={
            "veiculo_id": veiculo_id,
            "data_emissao": "2026-05-10",
            "validade_dias": 15,
            "descricao": "Primeiro orçamento",
            "itens": [
                {
                    "item_id": item_id,
                    "tipo_id": int(TipoItem.MAO_DE_OBRA),
                    "quantidade": "1.50",
                    "valor_unitario": 20000,
                }
            ],
        },
    )
    assert res1.status_code == 201
    orc1 = res1.json()
    assert orc1["numero"] == "001-2026-ORC"
    assert orc1["data_vencimento"] == "2026-05-25"
    assert orc1["total"] == 30000
    assert orc1["itens"][0]["total"] == 30000

    # Exclui o 001-2026-ORC
    res_del = auth_client.delete(f"/api/orcamentos/{orc1['id']}")
    assert res_del.status_code == 204

    # Próximo orçamento no mesmo ano recebe 002-2026-ORC (nunca reutiliza o 001)
    res2 = auth_client.post(
        "/api/orcamentos",
        json={
            "veiculo_id": veiculo_id,
            "data_emissao": "2026-06-01",
            "itens": [],
        },
    )
    assert res2.status_code == 201
    assert res2.json()["numero"] == "002-2026-ORC"

    # Orçamento em 2027 reinicia a contagem
    res3 = auth_client.post(
        "/api/orcamentos",
        json={
            "veiculo_id": veiculo_id,
            "data_emissao": "2027-01-05",
            "itens": [],
        },
    )
    assert res3.status_code == 201
    assert res3.json()["numero"] == "001-2027-ORC"


def test_cliente_do_documento_preservado_quando_veiculo_muda_de_dono(
    auth_client: TestClient,
) -> None:
    c1_id, c2_id, marca_id, v1_id, item_id = _criar_base(auth_client)

    res_orc = auth_client.post(
        "/api/orcamentos",
        json={
            "veiculo_id": v1_id,
            "data_emissao": "2026-03-10",
            "itens": [
                {
                    "item_id": item_id,
                    "tipo_id": int(TipoItem.AMBOS),
                    "quantidade": "2.00",
                    "valor_unitario": 12500,
                }
            ],
        },
    )
    assert res_orc.status_code == 201
    orc_id = res_orc.json()["id"]
    assert res_orc.json()["cliente_id"] == c1_id

    # Troca o dono do veículo v1 para o Cliente Dois (c2_id)
    res_veiculo = auth_client.put(
        f"/api/veiculos/{v1_id}",
        json={
            "cliente_id": c2_id,
            "marca_id": marca_id,
            "modelo": "Gol",
            "placa": "AAA1111",
        },
    )
    assert res_veiculo.status_code == 200

    # O orçamento antigo continua apontando para o Cliente Um (c1_id)
    res_obter = auth_client.get(f"/api/orcamentos/{orc_id}")
    assert res_obter.status_code == 200
    assert res_obter.json()["cliente_id"] == c1_id
    assert res_obter.json()["cliente"]["pessoa"]["nome"] == "Cliente Um"

    # Editar o orçamento mantendo o mesmo veiculo_id também preserva o cliente_id do orçamento
    res_editar_mesmo_veiculo = auth_client.put(
        f"/api/orcamentos/{orc_id}",
        json={
            "veiculo_id": v1_id,
            "status_id": int(SituacaoAvaliacao.ACEITO),
            "data_emissao": "2026-03-10",
            "validade_dias": 10,
            "descricao": "Aprovado pelo cliente original",
            "itens": [
                {
                    "item_id": item_id,
                    "tipo_id": int(TipoItem.AQUISICAO),
                    "quantidade": "1.00",
                    "valor_unitario": 50000,
                }
            ],
        },
    )
    assert res_editar_mesmo_veiculo.status_code == 200
    assert res_editar_mesmo_veiculo.json()["cliente_id"] == c1_id
    assert res_editar_mesmo_veiculo.json()["total"] == 50000
    assert res_editar_mesmo_veiculo.json()["status_id"] == int(SituacaoAvaliacao.ACEITO)

    # Se trocar o veiculo_id do orçamento para outro veículo (do Cliente Dois), atualiza cliente_id
    res_v2 = auth_client.post(
        "/api/veiculos",
        json={
            "cliente_id": c2_id,
            "marca_id": marca_id,
            "modelo": "Saveiro",
            "placa": "BBB2B22",
        },
    )
    v2_id = res_v2.json()["id"]

    res_trocar_veiculo = auth_client.put(
        f"/api/orcamentos/{orc_id}",
        json={
            "veiculo_id": v2_id,
            "status_id": int(SituacaoAvaliacao.ACEITO),
            "data_emissao": "2026-03-10",
            "itens": [],
        },
    )
    assert res_trocar_veiculo.status_code == 200
    assert res_trocar_veiculo.json()["cliente_id"] == c2_id
    assert res_trocar_veiculo.json()["cliente"]["pessoa"]["nome"] == "Cliente Dois"


def test_rejeita_cliente_id_ou_numero_no_envio_e_valida_itens(
    auth_client: TestClient,
) -> None:
    c1_id, _, _, v1_id, item_id = _criar_base(auth_client)

    res_com_cliente = auth_client.post(
        "/api/orcamentos",
        json={
            "veiculo_id": v1_id,
            "cliente_id": c1_id,
            "itens": [],
        },
    )
    assert res_com_cliente.status_code == 422

    res_com_numero = auth_client.post(
        "/api/orcamentos",
        json={
            "veiculo_id": v1_id,
            "numero": "999-2026-ORC",
            "itens": [],
        },
    )
    assert res_com_numero.status_code == 422

    res_qtd_invalida = auth_client.post(
        "/api/orcamentos",
        json={
            "veiculo_id": v1_id,
            "itens": [
                {
                    "item_id": item_id,
                    "tipo_id": int(TipoItem.MAO_DE_OBRA),
                    "quantidade": "1.234",
                    "valor_unitario": 1000,
                }
            ],
        },
    )
    assert res_qtd_invalida.status_code == 422


def test_listar_buscar_filtrar_status_e_paginar_orcamentos(
    auth_client: TestClient,
) -> None:
    _, _, _, v1_id, _ = _criar_base(auth_client)

    auth_client.post(
        "/api/orcamentos",
        json={
            "veiculo_id": v1_id,
            "status_id": int(SituacaoAvaliacao.PENDENTE),
            "data_emissao": "2026-04-01",
            "itens": [],
        },
    )
    auth_client.post(
        "/api/orcamentos",
        json={
            "veiculo_id": v1_id,
            "status_id": int(SituacaoAvaliacao.ACEITO),
            "data_emissao": "2026-04-02",
            "itens": [],
        },
    )

    res_pag = auth_client.get("/api/orcamentos?page=1&per_page=1")
    assert res_pag.status_code == 200
    assert res_pag.json()["total"] == 2
    assert res_pag.json()["total_pages"] == 2
    assert len(res_pag.json()["items"]) == 1

    res_status = auth_client.get(f"/api/orcamentos?status_id={int(SituacaoAvaliacao.ACEITO)}")
    assert res_status.status_code == 200
    assert res_status.json()["total"] == 1
    assert res_status.json()["items"][0]["numero"] == "002-2026-ORC"

    res_busca_num = auth_client.get("/api/orcamentos?q=001-2026-ORC")
    assert res_busca_num.status_code == 200
    assert res_busca_num.json()["total"] == 1
    assert res_busca_num.json()["items"][0]["numero"] == "001-2026-ORC"

    res_busca_placa = auth_client.get("/api/orcamentos?q=aaa-1111")
    assert res_busca_placa.status_code == 200
    assert res_busca_placa.json()["total"] == 2
