from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.cliente import Cliente
from app.models.enums import TipoTelefone
from app.models.pessoa import Pessoa, PessoaFisica, Telefone, pessoa_telefone
from app.models.usuario import Usuario


def test_clientes_exige_sessao(client: TestClient) -> None:
    assert client.get("/api/clientes").status_code == 401
    assert client.post("/api/clientes", json={}).status_code == 401


def test_criar_obter_editar_cliente(auth_client: TestClient) -> None:
    payload = {
        "ativo": True,
        "pessoa": {
            "nome": "João Mecânico",
            "email": "joao@exemplo.com",
            "cpf": "529.982.247-25",
            "telefones": [
                {"ddd": "11", "telefone": "98888-7777", "tipo_id": TipoTelefone.CELULAR},
                {"ddd": "11", "telefone": "33334444", "tipo_id": TipoTelefone.FIXO},
            ],
        },
    }

    res_criar = auth_client.post("/api/clientes", json=payload)
    assert res_criar.status_code == 201
    criado = res_criar.json()
    assert criado["ativo"] is True
    assert criado["pessoa"]["nome"] == "João Mecânico"
    assert criado["pessoa"]["cpf"] == "52998224725"
    assert criado["pessoa"]["cnpj"] is None
    assert len(criado["pessoa"]["telefones"]) == 2

    cliente_id = criado["id"]

    res_obter = auth_client.get(f"/api/clientes/{cliente_id}")
    assert res_obter.status_code == 200
    assert res_obter.json()["id"] == cliente_id

    payload_edicao = {
        "ativo": False,
        "pessoa": {
            "nome": "João Mecânico Ltda",
            "email": "contato@joao.com.br",
            "cnpj": "11.222.333/0001-81",
            "telefones": [
                {"ddd": "19", "telefone": "977776666", "tipo_id": TipoTelefone.WHATSAPP},
            ],
        },
    }

    res_editar = auth_client.put(f"/api/clientes/{cliente_id}", json=payload_edicao)
    assert res_editar.status_code == 200
    editado = res_editar.json()
    assert editado["ativo"] is False
    assert editado["pessoa"]["nome"] == "João Mecânico Ltda"
    assert editado["pessoa"]["cpf"] is None
    assert editado["pessoa"]["cnpj"] == "11222333000181"
    assert len(editado["pessoa"]["telefones"]) == 1
    assert editado["pessoa"]["telefones"][0]["ddd"] == "19"


def test_listar_buscar_e_paginar_clientes(auth_client: TestClient) -> None:
    auth_client.post(
        "/api/clientes",
        json={
            "ativo": True,
            "pessoa": {
                "nome": "Ana Paula",
                "email": "ana@exemplo.com",
                "cpf": "52998224725",
                "telefones": [],
            },
        },
    )
    auth_client.post(
        "/api/clientes",
        json={
            "ativo": True,
            "pessoa": {
                "nome": "Transportadora Brasil",
                "email": "contato@transbrasil.com",
                "cnpj": "11222333000181",
                "telefones": [],
            },
        },
    )
    auth_client.post(
        "/api/clientes",
        json={
            "ativo": False,
            "pessoa": {
                "nome": "Bruno Costa",
                "email": "bruno@exemplo.com",
                "cpf": "11144477735",
                "telefones": [],
            },
        },
    )

    res_pag1 = auth_client.get("/api/clientes?page=1&per_page=2")
    assert res_pag1.status_code == 200
    dados_pag1 = res_pag1.json()
    assert dados_pag1["total"] == 3
    assert dados_pag1["page"] == 1
    assert dados_pag1["per_page"] == 2
    assert dados_pag1["total_pages"] == 2
    assert len(dados_pag1["items"]) == 2

    res_busca_nome = auth_client.get("/api/clientes?q=Transportadora")
    assert res_busca_nome.status_code == 200
    assert res_busca_nome.json()["total"] == 1
    assert res_busca_nome.json()["items"][0]["pessoa"]["nome"] == "Transportadora Brasil"

    res_busca_cpf = auth_client.get("/api/clientes?q=529.982.247-25")
    assert res_busca_cpf.status_code == 200
    assert res_busca_cpf.json()["total"] == 1
    assert res_busca_cpf.json()["items"][0]["pessoa"]["nome"] == "Ana Paula"


def test_validacao_e_unicidade_cpf_cnpj(auth_client: TestClient, db_session: Session) -> None:
    res_invalido = auth_client.post(
        "/api/clientes",
        json={
            "ativo": True,
            "pessoa": {
                "nome": "Invalido",
                "cpf": "000.000.000-00",
                "telefones": [],
            },
        },
    )
    assert res_invalido.status_code == 422

    res_1 = auth_client.post(
        "/api/clientes",
        json={
            "ativo": True,
            "pessoa": {
                "nome": "Cliente 1",
                "cpf": "52998224725",
                "telefones": [],
            },
        },
    )
    assert res_1.status_code == 201

    pessoas_antes = db_session.scalar(select(func.count()).select_from(Pessoa))

    res_duplicado = auth_client.post(
        "/api/clientes",
        json={
            "ativo": True,
            "pessoa": {
                "nome": "Cliente Duplicado",
                "cpf": "529.982.247-25",
                "telefones": [
                    {"ddd": "11", "telefone": "999998888", "tipo_id": TipoTelefone.CELULAR}
                ],
            },
        },
    )
    assert res_duplicado.status_code == 409
    assert "CPF ou CNPJ" in res_duplicado.json()["detail"]

    pessoas_depois = db_session.scalar(select(func.count()).select_from(Pessoa))
    assert pessoas_depois == pessoas_antes


def test_excluir_cliente_sem_vinculos_remove_pessoa_pf_e_telefones(
    auth_client: TestClient, db_session: Session
) -> None:
    res = auth_client.post(
        "/api/clientes",
        json={
            "ativo": True,
            "pessoa": {
                "nome": "Cliente Temporário",
                "cpf": "52998224725",
                "telefones": [
                    {"ddd": "11", "telefone": "912345678", "tipo_id": TipoTelefone.CELULAR}
                ],
            },
        },
    )
    assert res.status_code == 201
    criado = res.json()
    cliente_id = criado["id"]
    pessoa_id = criado["pessoa_id"]

    res_del = auth_client.delete(f"/api/clientes/{cliente_id}")
    assert res_del.status_code == 204

    assert auth_client.get(f"/api/clientes/{cliente_id}").status_code == 404
    assert db_session.scalar(select(Pessoa).where(Pessoa.id == pessoa_id)) is None
    assert db_session.scalar(select(PessoaFisica).where(PessoaFisica.cpf == "52998224725")) is None
    assert db_session.scalar(select(func.count()).select_from(Telefone)) == 0
    assert db_session.scalar(select(func.count()).select_from(pessoa_telefone)) == 0


def test_excluir_cliente_preserva_pessoa_se_ligada_a_usuario(
    auth_client: TestClient, db_session: Session
) -> None:
    usuario = db_session.execute(select(Usuario).where(Usuario.login == "operador")).scalar_one()
    cliente = Cliente(pessoa_id=usuario.pessoa_id, ativo=True)
    db_session.add(cliente)
    db_session.commit()

    res_del = auth_client.delete(f"/api/clientes/{cliente.id}")
    assert res_del.status_code == 204

    assert db_session.scalar(select(Pessoa).where(Pessoa.id == usuario.pessoa_id)) is not None


def test_excluir_cliente_com_vinculos_retorna_409(
    auth_client: TestClient,
) -> None:
    res = auth_client.post(
        "/api/clientes",
        json={
            "ativo": True,
            "pessoa": {
                "nome": "Cliente Com Vínculo",
                "cpf": "52998224725",
                "telefones": [],
            },
        },
    )
    cliente_id = res.json()["id"]

    res_marca = auth_client.post(
        "/api/marcas-veiculo",
        json={"nome": "Fiat", "ativo": True},
    )
    marca_id = res_marca.json()["id"]

    res_veiculo = auth_client.post(
        "/api/veiculos",
        json={
            "cliente_id": cliente_id,
            "marca_id": marca_id,
            "modelo": "Uno",
            "placa": "ABC1234",
        },
    )
    assert res_veiculo.status_code == 201

    res_del = auth_client.delete(f"/api/clientes/{cliente_id}")
    assert res_del.status_code == 409
    assert "vínculos" in res_del.json()["detail"]


def test_excluir_cliente_com_orcamento_retorna_409_mesmo_apos_transferir_veiculo(
    auth_client: TestClient,
) -> None:
    res_c1 = auth_client.post(
        "/api/clientes",
        json={
            "ativo": True,
            "pessoa": {
                "nome": "Dono Original",
                "cpf": "52998224725",
                "telefones": [],
            },
        },
    )
    cliente_1_id = res_c1.json()["id"]

    res_c2 = auth_client.post(
        "/api/clientes",
        json={
            "ativo": True,
            "pessoa": {
                "nome": "Novo Dono",
                "cpf": "11144477735",
                "telefones": [],
            },
        },
    )
    cliente_2_id = res_c2.json()["id"]

    res_marca = auth_client.post(
        "/api/marcas-veiculo",
        json={"nome": "Ford", "ativo": True},
    )
    marca_id = res_marca.json()["id"]

    res_veiculo = auth_client.post(
        "/api/veiculos",
        json={
            "cliente_id": cliente_1_id,
            "marca_id": marca_id,
            "modelo": "Ka",
            "placa": "DEF5678",
        },
    )
    veiculo_id = res_veiculo.json()["id"]

    res_orc = auth_client.post(
        "/api/orcamentos",
        json={
            "veiculo_id": veiculo_id,
            "itens": [],
        },
    )
    assert res_orc.status_code == 201

    # Transfere o veículo para o cliente 2
    res_transf = auth_client.put(
        f"/api/veiculos/{veiculo_id}",
        json={
            "cliente_id": cliente_2_id,
            "marca_id": marca_id,
            "modelo": "Ka",
            "placa": "DEF5678",
        },
    )
    assert res_transf.status_code == 200

    # Cliente 1 não tem mais veículos, mas tem orçamento vinculado -> 409
    res_del = auth_client.delete(f"/api/clientes/{cliente_1_id}")
    assert res_del.status_code == 409
    assert "vínculos" in res_del.json()["detail"]


def test_excluir_cliente_com_ordem_servico_retorna_409_mesmo_apos_transferir_veiculo(
    auth_client: TestClient,
) -> None:
    res_c1 = auth_client.post(
        "/api/clientes",
        json={
            "ativo": True,
            "pessoa": {
                "nome": "Dono OS Original",
                "cpf": "52998224725",
                "telefones": [],
            },
        },
    )
    cliente_1_id = res_c1.json()["id"]

    res_c2 = auth_client.post(
        "/api/clientes",
        json={
            "ativo": True,
            "pessoa": {
                "nome": "Novo Dono OS",
                "cpf": "11144477735",
                "telefones": [],
            },
        },
    )
    cliente_2_id = res_c2.json()["id"]

    res_marca = auth_client.post(
        "/api/marcas-veiculo",
        json={"nome": "Honda", "ativo": True},
    )
    marca_id = res_marca.json()["id"]

    res_veiculo = auth_client.post(
        "/api/veiculos",
        json={
            "cliente_id": cliente_1_id,
            "marca_id": marca_id,
            "modelo": "Fit",
            "placa": "JKL1234",
        },
    )
    veiculo_id = res_veiculo.json()["id"]

    res_os = auth_client.post(
        "/api/ordens-servico",
        json={
            "veiculo_id": veiculo_id,
            "itens": [],
        },
    )
    assert res_os.status_code == 201

    auth_client.put(
        f"/api/veiculos/{veiculo_id}",
        json={
            "cliente_id": cliente_2_id,
            "marca_id": marca_id,
            "modelo": "Fit",
            "placa": "JKL1234",
        },
    )

    res_del = auth_client.delete(f"/api/clientes/{cliente_1_id}")
    assert res_del.status_code == 409
    assert "vínculos" in res_del.json()["detail"]
