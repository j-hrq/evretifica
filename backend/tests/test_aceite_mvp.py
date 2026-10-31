from datetime import UTC, datetime
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

import app.services.ordem_servico as os_service
from app.main import configurar_frontend_estatico
from app.models.enums import SituacaoAvaliacao, TipoItem, TipoTelefone
from app.schemas.pessoa import PessoaInput
from app.services.usuario import criar_usuario_com_pessoa


def test_criterios_de_aceite_mvp_ponta_a_ponta(
    client: TestClient,
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        os_service,
        "utc_now",
        lambda: datetime(2026, 8, 10, 14, 0, 0, tzinfo=UTC),
    )

    # 1. Qualquer rota da API sem sessão é recusada (401), exceto login e health
    assert client.get("/api/health").status_code == 200
    for rota in [
        "/api/auth/me",
        "/api/clientes",
        "/api/marcas-veiculo",
        "/api/veiculos",
        "/api/itens",
        "/api/orcamentos",
        "/api/ordens-servico",
    ]:
        res_sem_sessao = client.get(rota)
        assert res_sem_sessao.status_code == 401
        assert isinstance(res_sem_sessao.json()["detail"], str)

    criar_usuario_com_pessoa(
        db_session,
        dados_pessoa=PessoaInput(nome="Operador Oficina", cpf="12345678909"),
        login="operador",
        senha="senha-operador",
    )
    res_login = client.post(
        "/api/auth/login",
        json={"login": "operador", "senha": "senha-operador"},
    )
    assert res_login.status_code == 200
    auth_client = client

    # 2. CPF, CNPJ ou placa inválidos são recusados e pessoa não pode ter CPF e CNPJ juntos
    res_cpf_invalido = auth_client.post(
        "/api/clientes",
        json={
            "ativo": True,
            "pessoa": {
                "nome": "CPF Inválido",
                "cpf": "111.111.111-11",
                "telefones": [],
            },
        },
    )
    assert res_cpf_invalido.status_code == 422
    assert "CPF" in res_cpf_invalido.json()["detail"]

    res_cnpj_invalido = auth_client.post(
        "/api/clientes",
        json={
            "ativo": True,
            "pessoa": {
                "nome": "CNPJ Inválido",
                "cnpj": "11.111.111/1111-11",
                "telefones": [],
            },
        },
    )
    assert res_cnpj_invalido.status_code == 422
    assert "CNPJ" in res_cnpj_invalido.json()["detail"]

    res_ambos_docs = auth_client.post(
        "/api/clientes",
        json={
            "ativo": True,
            "pessoa": {
                "nome": "Ambos Documentos",
                "cpf": "52998224725",
                "cnpj": "11222333000181",
                "telefones": [],
            },
        },
    )
    assert res_ambos_docs.status_code == 422
    assert "exatamente um documento" in res_ambos_docs.json()["detail"]

    # 3. Cadastra cliente 1 (com CPF e telefones), marca e dois veículos
    res_cliente_1 = auth_client.post(
        "/api/clientes",
        json={
            "ativo": True,
            "pessoa": {
                "nome": "José da Oficina",
                "email": "jose@exemplo.com",
                "cpf": "529.982.247-25",
                "telefones": [
                    {
                        "ddd": "11",
                        "telefone": "98888-7777",
                        "tipo_id": int(TipoTelefone.WHATSAPP),
                    },
                    {
                        "ddd": "11",
                        "telefone": "3222-1111",
                        "tipo_id": int(TipoTelefone.FIXO),
                    },
                ],
            },
        },
    )
    assert res_cliente_1.status_code == 201
    cliente_1_id = res_cliente_1.json()["id"]

    # CPF repetido é recusado (409)
    res_cpf_repetido = auth_client.post(
        "/api/clientes",
        json={
            "ativo": True,
            "pessoa": {
                "nome": "Outro José",
                "cpf": "52998224725",
                "telefones": [],
            },
        },
    )
    assert res_cpf_repetido.status_code == 409

    res_marca = auth_client.post(
        "/api/marcas-veiculo",
        json={"nome": "Volkswagen", "ativo": True},
    )
    assert res_marca.status_code == 201
    marca_id = res_marca.json()["id"]

    res_veiculo_1 = auth_client.post(
        "/api/veiculos",
        json={
            "cliente_id": cliente_1_id,
            "marca_id": marca_id,
            "modelo": "Gol 1.6",
            "placa": "abc-1234",
            "ano_fabricacao": 2018,
            "ano_modelo": 2019,
            "cor": "Prata",
            "km": 92000,
        },
    )
    assert res_veiculo_1.status_code == 201
    veiculo_1_id = res_veiculo_1.json()["id"]
    assert res_veiculo_1.json()["placa"] == "ABC1234"

    res_veiculo_2 = auth_client.post(
        "/api/veiculos",
        json={
            "cliente_id": cliente_1_id,
            "marca_id": marca_id,
            "modelo": "Saveiro",
            "placa": "bra-2e19",
            "ano_fabricacao": 2021,
            "ano_modelo": 2022,
        },
    )
    assert res_veiculo_2.status_code == 201
    veiculo_2_id = res_veiculo_2.json()["id"]
    assert res_veiculo_2.json()["placa"] == "BRA2E19"

    # Placa inválida (422) e placa repetida (409) são recusadas
    res_placa_invalida = auth_client.post(
        "/api/veiculos",
        json={
            "cliente_id": cliente_1_id,
            "marca_id": marca_id,
            "modelo": "Polo",
            "placa": "123-ABCD",
        },
    )
    assert res_placa_invalida.status_code == 422

    res_placa_repetida = auth_client.post(
        "/api/veiculos",
        json={
            "cliente_id": cliente_1_id,
            "marca_id": marca_id,
            "modelo": "Polo",
            "placa": "ABC1234",
        },
    )
    assert res_placa_repetida.status_code == 409

    # 4. Cadastra itens e cria orçamento (001-2026-ORC) e OS (001-2026-OS) com total correto
    res_item_1 = auth_client.post(
        "/api/itens",
        json={"nome": "Retífica de cabeçote", "ativo": True},
    )
    item_1_id = res_item_1.json()["id"]

    res_item_2 = auth_client.post(
        "/api/itens",
        json={"nome": "Jogo de juntas", "ativo": True},
    )
    item_2_id = res_item_2.json()["id"]

    res_orc = auth_client.post(
        "/api/orcamentos",
        json={
            "veiculo_id": veiculo_1_id,
            "status_id": int(SituacaoAvaliacao.PENDENTE),
            "data_emissao": "2026-08-10",
            "validade_dias": 15,
            "descricao": "Orçamento completo do cabeçote",
            "itens": [
                {
                    "item_id": item_1_id,
                    "tipo_id": int(TipoItem.MAO_DE_OBRA),
                    "quantidade": "1.50",
                    "valor_unitario": 40000,  # 1.50 * 40000 = 60000
                },
                {
                    "item_id": item_2_id,
                    "tipo_id": int(TipoItem.AQUISICAO),
                    "quantidade": "1.00",
                    "valor_unitario": 25000,  # 1.00 * 25000 = 25000
                },
            ],
        },
    )
    assert res_orc.status_code == 201
    orc = res_orc.json()
    assert orc["numero"] == "001-2026-ORC"
    assert orc["cliente_id"] == cliente_1_id
    assert orc["data_vencimento"] == "2026-08-25"
    assert orc["total"] == 85000

    res_os = auth_client.post(
        "/api/ordens-servico",
        json={
            "veiculo_id": veiculo_1_id,
            "km_entrada": 92150,
            "status_id": int(SituacaoAvaliacao.EM_ANDAMENTO),
            "descricao": "Execução da retífica",
            "itens": [
                {
                    "item_id": item_1_id,
                    "tipo_id": int(TipoItem.MAO_DE_OBRA),
                    "quantidade": "1.50",
                    "valor_unitario": 40000,
                },
                {
                    "item_id": item_2_id,
                    "tipo_id": int(TipoItem.AQUISICAO),
                    "quantidade": "1.00",
                    "valor_unitario": 25000,
                },
            ],
        },
    )
    assert res_os.status_code == 201
    os_criada = res_os.json()
    assert os_criada["numero"] == "001-2026-OS"
    assert os_criada["cliente_id"] == cliente_1_id
    assert os_criada["total"] == 85000

    # 5. Trocar o dono do veículo 1 não altera o cliente mostrado nos documentos antigos
    res_cliente_2 = auth_client.post(
        "/api/clientes",
        json={
            "ativo": True,
            "pessoa": {
                "nome": "Transportadora Nova Era",
                "cnpj": "11.222.333/0001-81",
                "telefones": [],
            },
        },
    )
    assert res_cliente_2.status_code == 201
    cliente_2_id = res_cliente_2.json()["id"]

    res_transf = auth_client.put(
        f"/api/veiculos/{veiculo_1_id}",
        json={
            "cliente_id": cliente_2_id,
            "marca_id": marca_id,
            "modelo": "Gol 1.6",
            "placa": "ABC1234",
            "ano_fabricacao": 2018,
            "ano_modelo": 2019,
            "cor": "Prata",
            "km": 95000,
        },
    )
    assert res_transf.status_code == 200
    assert res_transf.json()["cliente_id"] == cliente_2_id

    orc_apos_troca = auth_client.get(f"/api/orcamentos/{orc['id']}").json()
    os_apos_troca = auth_client.get(f"/api/ordens-servico/{os_criada['id']}").json()
    assert orc_apos_troca["cliente_id"] == cliente_1_id
    assert orc_apos_troca["cliente"]["pessoa"]["nome"] == "José da Oficina"
    assert os_apos_troca["cliente_id"] == cliente_1_id
    assert os_apos_troca["cliente"]["pessoa"]["nome"] == "José da Oficina"

    # 6. Não consigo excluir cliente, marca, veículo ou item que possuam vínculos (409)
    assert auth_client.delete(f"/api/clientes/{cliente_1_id}").status_code == 409
    assert auth_client.delete(f"/api/clientes/{cliente_2_id}").status_code == 409
    assert auth_client.delete(f"/api/marcas-veiculo/{marca_id}").status_code == 409
    assert auth_client.delete(f"/api/veiculos/{veiculo_1_id}").status_code == 409
    assert auth_client.delete(f"/api/itens/{item_1_id}").status_code == 409

    # Veículo 2 não tem orçamento nem OS -> pode ser excluído (204)
    assert auth_client.delete(f"/api/veiculos/{veiculo_2_id}").status_code == 204


def test_servir_build_frontend_em_producao(tmp_path: Path) -> None:
    dist_dir = tmp_path / "dist"
    assets_dir = dist_dir / "assets"
    assets_dir.mkdir(parents=True)
    (dist_dir / "index.html").write_text("<!doctype html><html><body>SPA</body></html>")
    (assets_dir / "app.js").write_text("console.log('ok')")

    app_prod = FastAPI()
    configurar_frontend_estatico(app_prod, dist_dir=dist_dir)
    test_client = TestClient(app_prod)

    res_raiz = test_client.get("/")
    assert res_raiz.status_code == 200
    assert "SPA" in res_raiz.text

    res_rota_spa = test_client.get("/orcamentos")
    assert res_rota_spa.status_code == 200
    assert "SPA" in res_rota_spa.text

    res_asset = test_client.get("/assets/app.js")
    assert res_asset.status_code == 200
    assert "console.log('ok')" in res_asset.text
