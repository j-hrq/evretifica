from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.auth import NOME_COOKIE_SESSAO, verificar_senha
from app.schemas.pessoa import PessoaInput
from app.seed import executar_seed, executar_seed_se_vazio, possui_usuario_cadastrado
from app.services.usuario import criar_usuario_com_pessoa


def _criar_usuario_padrao(db_session: Session) -> None:
    criar_usuario_com_pessoa(
        db_session,
        dados_pessoa=PessoaInput(nome="Administrador", cpf="52998224725"),
        login="admin",
        senha="senha-segura-123",
    )


def test_rota_protegida_sem_sessao_retorna_401(client: TestClient) -> None:
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert response.json() == {"detail": "Não autenticado."}


def test_rota_protegida_com_cookie_invalido_retorna_401(client: TestClient) -> None:
    client.cookies.set(NOME_COOKIE_SESSAO, "token.adulterado")
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_login_correto_cria_sessao_e_acessa_me(client: TestClient, db_session: Session) -> None:
    _criar_usuario_padrao(db_session)

    res_login = client.post(
        "/api/auth/login",
        json={"login": "admin", "senha": "senha-segura-123"},
    )
    assert res_login.status_code == 200
    assert res_login.json()["login"] == "admin"
    assert res_login.json()["nome"] == "Administrador"
    assert NOME_COOKIE_SESSAO in res_login.cookies
    set_cookie_header = res_login.headers.get("set-cookie", "").lower()
    assert "httponly" in set_cookie_header

    res_me = client.get("/api/auth/me")
    assert res_me.status_code == 200
    assert res_me.json()["login"] == "admin"


def test_login_incorreto_retorna_401(client: TestClient, db_session: Session) -> None:
    _criar_usuario_padrao(db_session)

    res_senha_errada = client.post(
        "/api/auth/login",
        json={"login": "admin", "senha": "senha-errada"},
    )
    assert res_senha_errada.status_code == 401
    assert res_senha_errada.json() == {"detail": "Login ou senha inválidos."}

    res_usuario_inexistente = client.post(
        "/api/auth/login",
        json={"login": "inexistente", "senha": "senha-segura-123"},
    )
    assert res_usuario_inexistente.status_code == 401


def test_logout_encerra_sessao(client: TestClient, db_session: Session) -> None:
    _criar_usuario_padrao(db_session)

    client.post(
        "/api/auth/login",
        json={"login": "admin", "senha": "senha-segura-123"},
    )
    assert client.get("/api/auth/me").status_code == 200

    res_logout = client.post("/api/auth/logout")
    assert res_logout.status_code == 200
    assert res_logout.json() == {"status": "ok"}

    assert client.get("/api/auth/me").status_code == 401


def test_script_seed_cria_pessoa_e_usuario_com_hash(db_session: Session) -> None:
    respostas = iter(["Oficina EV Retifica", "11.222.333/0001-81", "oficina"])

    usuario = executar_seed(
        db_session,
        input_fn=lambda _prompt: next(respostas),
        getpass_fn=lambda _prompt: "minha-senha-secreta",
    )

    assert usuario.id is not None
    assert usuario.login == "oficina"
    assert usuario.senha != "minha-senha-secreta"
    assert usuario.senha.startswith("scrypt$")
    assert verificar_senha("minha-senha-secreta", usuario.senha)
    assert usuario.pessoa.nome == "Oficina EV Retifica"
    assert usuario.pessoa.pessoa_juridica is not None
    assert usuario.pessoa.pessoa_juridica.cnpj == "11222333000181"


def test_script_seed_se_vazio_pula_quando_ja_existe_usuario(db_session: Session) -> None:
    assert possui_usuario_cadastrado(db_session) is False

    respostas = iter(["Oficina EV Retifica", "11.222.333/0001-81", "oficina"])
    criado = executar_seed_se_vazio(
        db_session,
        input_fn=lambda _prompt: next(respostas),
        getpass_fn=lambda _prompt: "minha-senha-secreta",
    )
    assert criado is not None
    assert possui_usuario_cadastrado(db_session) is True

    segundo = executar_seed_se_vazio(
        db_session,
        input_fn=lambda _prompt: (_ for _ in ()).throw(AssertionError("Não deveria pedir input")),
        getpass_fn=lambda _prompt: (_ for _ in ()).throw(AssertionError("Não deveria pedir senha")),
    )
    assert segundo is None
