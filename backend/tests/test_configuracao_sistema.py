from fastapi.testclient import TestClient


def test_configuracao_sistema_exige_sessao(client: TestClient) -> None:
    assert client.get("/api/configuracao-sistema").status_code == 401
    assert (
        client.put(
            "/api/configuracao-sistema",
            json={
                "pessoa": {
                    "nome": "Oficina Teste",
                    "cpf": "07712551529",
                    "telefones": [],
                }
            },
        ).status_code
        == 401
    )


def test_obter_configuracao_sistema_padrao(auth_client: TestClient) -> None:
    res = auth_client.get("/api/configuracao-sistema")
    assert res.status_code == 200
    dados = res.json()
    assert "pessoa_id" in dados
    pessoa = dados["pessoa"]
    assert pessoa["nome"] == "EVR Retífica"
    assert pessoa["cpf"] == "07712551529"
    assert pessoa["email"] == "evrretifica@gmail.com"
    assert pessoa["endereco"]["cidade"] == "Feira de Santana"
    assert pessoa["endereco"]["estado"] == "BA"
    assert pessoa["endereco"]["cep"] == "44094-060"
    assert len(pessoa["telefones"]) == 1
    assert pessoa["telefones"][0]["ddd"] == "75"
    assert pessoa["telefones"][0]["telefone"] == "991181598"


def test_atualizar_configuracao_sistema(auth_client: TestClient) -> None:
    payload = {
        "pessoa": {
            "nome": "Evandro Ramos Rosado ME",
            "cnpj": "11.222.333/0001-81",
            "nome_fantasia": "EVR Retífica & Serviços",
            "inscricao_estadual": "ISENTO",
            "email": "contato@evrretifica.com.br",
            "telefones": [
                {"ddd": "75", "telefone": "991181598", "tipo_id": 3},
                {"ddd": "75", "telefone": "32210000", "tipo_id": 2},
            ],
            "endereco": {
                "logradouro": "Avenida Presidente Dutra",
                "numero": "2500",
                "complemento": "Galpão 3",
                "bairro": "Centro",
                "cidade": "Feira de Santana",
                "estado": "BA",
                "cep": "44000-000",
            },
        }
    }
    res_put = auth_client.put("/api/configuracao-sistema", json=payload)
    assert res_put.status_code == 200
    atualizado = res_put.json()
    pessoa = atualizado["pessoa"]
    assert pessoa["nome"] == "Evandro Ramos Rosado ME"
    assert pessoa["cnpj"] == "11222333000181"
    assert pessoa["cpf"] is None
    assert pessoa["nome_fantasia"] == "EVR Retífica & Serviços"
    assert pessoa["inscricao_estadual"] == "ISENTO"
    assert pessoa["email"] == "contato@evrretifica.com.br"
    assert pessoa["endereco"]["numero"] == "2500"
    assert pessoa["endereco"]["complemento"] == "Galpão 3"
    assert len(pessoa["telefones"]) == 2

    # Confirma que GET retorna os novos valores salvos
    res_get = auth_client.get("/api/configuracao-sistema")
    assert res_get.status_code == 200
    pessoa_get = res_get.json()["pessoa"]
    assert pessoa_get["nome_fantasia"] == "EVR Retífica & Serviços"
    assert pessoa_get["endereco"]["complemento"] == "Galpão 3"


def test_atualizar_configuracao_sistema_validacao(auth_client: TestClient) -> None:
    res = auth_client.put(
        "/api/configuracao-sistema",
        json={"pessoa": {"nome": "", "cpf": "07712551529"}},
    )
    assert res.status_code == 422
