import pytest
from fastapi.testclient import TestClient

from app.schemas.veiculo import validar_placa


@pytest.mark.parametrize(
    ("entrada", "esperada"),
    [
        ("ABC1234", "ABC1234"),
        ("abc-1234", "ABC1234"),
        ("  abc1234  ", "ABC1234"),
        ("BRA2E19", "BRA2E19"),
        ("bra-2e19", "BRA2E19"),
        ("  RIO-2A18 ", "RIO2A18"),
    ],
)
def test_validar_placa_valida(entrada: str, esperada: str) -> None:
    assert validar_placa(entrada) == esperada


@pytest.mark.parametrize(
    "entrada",
    [
        "",
        "   ",
        "AB1234",
        "ABCD123",
        "ABC12345",
        "123ABCD",
        "ABC12A3",
        "ABC1AA9",
        "A-BC1234",
        "ABC--1234",
        "ABC@123",
    ],
)
def test_validar_placa_invalida(entrada: str) -> None:
    with pytest.raises(ValueError, match="Placa inválida"):
        validar_placa(entrada)


def test_veiculos_exige_sessao(client: TestClient) -> None:
    assert client.get("/api/veiculos").status_code == 401
    assert client.post("/api/veiculos", json={}).status_code == 401


def _criar_cliente(auth_client: TestClient, nome: str, cpf: str) -> int:
    res = auth_client.post(
        "/api/clientes",
        json={
            "ativo": True,
            "pessoa": {
                "nome": nome,
                "cpf": cpf,
                "telefones": [],
            },
        },
    )
    assert res.status_code == 201
    return int(res.json()["id"])


def _criar_marca(auth_client: TestClient, nome: str) -> int:
    res = auth_client.post(
        "/api/marcas-veiculo",
        json={"nome": nome, "ativo": True},
    )
    assert res.status_code == 201
    return int(res.json()["id"])


def test_criar_obter_editar_trocar_dono_e_excluir_veiculo(auth_client: TestClient) -> None:
    cliente_1_id = _criar_cliente(auth_client, "Carlos Silva", "52998224725")
    cliente_2_id = _criar_cliente(auth_client, "Mariana Souza", "11144477735")
    marca_vw_id = _criar_marca(auth_client, "Volkswagen")
    marca_fiat_id = _criar_marca(auth_client, "Fiat")

    res_criar = auth_client.post(
        "/api/veiculos",
        json={
            "cliente_id": cliente_1_id,
            "marca_id": marca_vw_id,
            "modelo": "Gol 1.6",
            "placa": "abc-1234",
            "ano_fabricacao": 2019,
            "ano_modelo": 2020,
            "cor": "Prata",
            "km": 55000,
            "observacao": "Revisão em dia",
        },
    )
    assert res_criar.status_code == 201
    criado = res_criar.json()
    assert criado["placa"] == "ABC1234"
    assert criado["modelo"] == "Gol 1.6"
    assert criado["cliente_id"] == cliente_1_id
    assert criado["cliente"]["pessoa"]["nome"] == "Carlos Silva"
    assert criado["marca_id"] == marca_vw_id
    assert criado["marca"]["nome"] == "Volkswagen"
    assert criado["ano_fabricacao"] == 2019
    assert criado["ano_modelo"] == 2020
    assert criado["cor"] == "Prata"
    assert criado["km"] == 55000
    assert criado["observacao"] == "Revisão em dia"

    veiculo_id = criado["id"]

    res_obter = auth_client.get(f"/api/veiculos/{veiculo_id}")
    assert res_obter.status_code == 200
    assert res_obter.json()["id"] == veiculo_id

    # Edição trocando o dono (cliente_id), marca e placa para Mercosul
    res_editar = auth_client.put(
        f"/api/veiculos/{veiculo_id}",
        json={
            "cliente_id": cliente_2_id,
            "marca_id": marca_fiat_id,
            "modelo": "Argo Drive",
            "placa": "bra-2e19",
            "ano_fabricacao": 2021,
            "ano_modelo": 2022,
            "cor": "Branco",
            "km": 32000,
            "observacao": "Novo proprietário",
        },
    )
    assert res_editar.status_code == 200
    editado = res_editar.json()
    assert editado["cliente_id"] == cliente_2_id
    assert editado["cliente"]["pessoa"]["nome"] == "Mariana Souza"
    assert editado["marca_id"] == marca_fiat_id
    assert editado["marca"]["nome"] == "Fiat"
    assert editado["placa"] == "BRA2E19"
    assert editado["modelo"] == "Argo Drive"

    res_excluir = auth_client.delete(f"/api/veiculos/{veiculo_id}")
    assert res_excluir.status_code == 204
    assert auth_client.get(f"/api/veiculos/{veiculo_id}").status_code == 404


def test_listar_buscar_e_paginar_veiculos(auth_client: TestClient) -> None:
    cliente_1_id = _criar_cliente(auth_client, "Roberto Almeida", "52998224725")
    cliente_2_id = _criar_cliente(auth_client, "Fernanda Lima", "11144477735")
    marca_id = _criar_marca(auth_client, "Honda")

    auth_client.post(
        "/api/veiculos",
        json={
            "cliente_id": cliente_1_id,
            "marca_id": marca_id,
            "modelo": "Civic",
            "placa": "AAA1111",
        },
    )
    auth_client.post(
        "/api/veiculos",
        json={
            "cliente_id": cliente_1_id,
            "marca_id": marca_id,
            "modelo": "Fit",
            "placa": "BBB2B22",
        },
    )
    auth_client.post(
        "/api/veiculos",
        json={
            "cliente_id": cliente_2_id,
            "marca_id": marca_id,
            "modelo": "HR-V",
            "placa": "CCC3C33",
        },
    )

    res_pag = auth_client.get("/api/veiculos?page=1&per_page=2")
    assert res_pag.status_code == 200
    dados_pag = res_pag.json()
    assert dados_pag["total"] == 3
    assert dados_pag["total_pages"] == 2
    assert len(dados_pag["items"]) == 2

    # Busca por placa com hífen
    res_placa = auth_client.get("/api/veiculos?q=bbb-2b22")
    assert res_placa.status_code == 200
    assert res_placa.json()["total"] == 1
    assert res_placa.json()["items"][0]["modelo"] == "Fit"

    # Busca por modelo
    res_modelo = auth_client.get("/api/veiculos?q=Civic")
    assert res_modelo.status_code == 200
    assert res_modelo.json()["total"] == 1
    assert res_modelo.json()["items"][0]["placa"] == "AAA1111"

    # Busca por nome do cliente
    res_cliente = auth_client.get("/api/veiculos?q=Fernanda")
    assert res_cliente.status_code == 200
    assert res_cliente.json()["total"] == 1
    assert res_cliente.json()["items"][0]["placa"] == "CCC3C33"


def test_placa_unica_retorna_409(auth_client: TestClient) -> None:
    cliente_id = _criar_cliente(auth_client, "Paulo César", "52998224725")
    marca_id = _criar_marca(auth_client, "Toyota")

    res_1 = auth_client.post(
        "/api/veiculos",
        json={
            "cliente_id": cliente_id,
            "marca_id": marca_id,
            "modelo": "Corolla",
            "placa": "XYZ1234",
        },
    )
    assert res_1.status_code == 201

    res_dup = auth_client.post(
        "/api/veiculos",
        json={
            "cliente_id": cliente_id,
            "marca_id": marca_id,
            "modelo": "Hilux",
            "placa": "xyz-1234",
        },
    )
    assert res_dup.status_code == 409
    assert "Placa" in res_dup.json()["detail"]


def test_excluir_veiculo_com_vinculos_retorna_409(
    auth_client: TestClient,
) -> None:
    cliente_id = _criar_cliente(auth_client, "Cliente Veículo", "52998224725")
    marca_id = _criar_marca(auth_client, "Renault")

    res = auth_client.post(
        "/api/veiculos",
        json={
            "cliente_id": cliente_id,
            "marca_id": marca_id,
            "modelo": "Sandero",
            "placa": "KLM9N87",
        },
    )
    veiculo_id = res.json()["id"]

    res_orc = auth_client.post(
        "/api/orcamentos",
        json={
            "veiculo_id": veiculo_id,
            "itens": [],
        },
    )
    assert res_orc.status_code == 201

    res_del = auth_client.delete(f"/api/veiculos/{veiculo_id}")
    assert res_del.status_code == 409
    assert "vínculos" in res_del.json()["detail"]
