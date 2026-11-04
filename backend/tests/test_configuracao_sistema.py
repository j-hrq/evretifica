from fastapi.testclient import TestClient


def test_configuracao_oficina_exige_sessao(client: TestClient) -> None:
    assert client.get("/api/configuracao-oficina").status_code == 401
    assert (
        client.put(
            "/api/configuracao-oficina",
            json={"nome_fantasia": "Oficina Teste"},
        ).status_code
        == 401
    )


def test_obter_configuracao_oficina_padrao(auth_client: TestClient) -> None:
    res = auth_client.get("/api/configuracao-oficina")
    assert res.status_code == 200
    dados = res.json()
    assert dados["nome_fantasia"] == "EVR Retífica"
    assert dados["cidade"] == "Feira de Santana"
    assert dados["estado"] == "BA"
    assert dados["cep"] == "44094-060"
    assert dados["nome_responsavel"] == "Evandro Ramos Rosado"


def test_atualizar_configuracao_oficina(auth_client: TestClient) -> None:
    payload = {
        "nome_fantasia": "EVR Retífica & Serviços",
        "razao_social": "Evandro Ramos Rosado ME",
        "cnpj_cpf": "077.125.515-29",
        "inscricao_estadual": "ISENTO",
        "telefone": "(75) 3221-0000",
        "whatsapp": "(75) 99118-1598",
        "email": "contato@evrretifica.com.br",
        "logradouro": "Avenida Presidente Dutra",
        "numero": "2500",
        "complemento": "Galpão 3",
        "bairro": "Centro",
        "cidade": "Feira de Santana",
        "estado": "BA",
        "cep": "44000-000",
        "nome_responsavel": "Evandro Ramos",
    }
    res_put = auth_client.put("/api/configuracao-oficina", json=payload)
    assert res_put.status_code == 200
    atualizado = res_put.json()
    assert atualizado["nome_fantasia"] == "EVR Retífica & Serviços"
    assert atualizado["numero"] == "2500"
    assert atualizado["complemento"] == "Galpão 3"
    assert atualizado["email"] == "contato@evrretifica.com.br"

    # Confirma que GET retorna os novos valores salvos
    res_get = auth_client.get("/api/configuracao-oficina")
    assert res_get.status_code == 200
    assert res_get.json()["nome_fantasia"] == "EVR Retífica & Serviços"
    assert res_get.json()["complemento"] == "Galpão 3"


def test_atualizar_configuracao_oficina_validacao(auth_client: TestClient) -> None:
    res = auth_client.put("/api/configuracao-oficina", json={"nome_fantasia": ""})
    assert res.status_code == 422
