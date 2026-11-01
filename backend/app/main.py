from pathlib import Path

from fastapi import Depends, FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.auth import exigir_sessao_exceto_publicas
from app.exceptions import ConflitoError, NaoEncontradoError, RegraNegocioError
from app.routers.auth import router as auth_router
from app.routers.clientes import router as clientes_router
from app.routers.health import router as health_router
from app.routers.itens import router as itens_router
from app.routers.marcas_veiculo import router as marcas_veiculo_router
from app.routers.orcamentos import router as orcamentos_router
from app.routers.ordens_servico import router as ordens_servico_router
from app.routers.veiculos import router as veiculos_router

FRONTEND_DIST_PADRAO = Path(__file__).resolve().parents[2] / "frontend" / "dist"


def _traduzir_erro_validacao(erro: dict[str, object]) -> str:
    msg = str(erro.get("msg", "Dados inválidos."))
    tipo = str(erro.get("type", ""))
    loc = erro.get("loc", ())
    partes_loc = [
        str(p) for p in (loc if isinstance(loc, (list, tuple)) else ()) if str(p) != "body"
    ]
    campo = ".".join(partes_loc)

    if msg.startswith("Value error, "):
        return msg.removeprefix("Value error, ")

    traducoes_por_tipo: dict[str, str] = {
        "missing": "Campo obrigatório.",
        "extra_forbidden": "Campo não permitido no envio.",
        "int_parsing": "Deve ser um número inteiro válido.",
        "decimal_parsing": "Deve ser um número decimal válido.",
        "bool_parsing": "Deve ser um valor booleano válido.",
        "date_from_datetime_parsing": "Data inválida.",
        "date_parsing": "Data inválida.",
        "greater_than": "O valor deve ser maior que o mínimo permitido.",
        "greater_than_equal": "O valor não pode ser negativo.",
        "less_than_equal": "O valor excede o limite máximo permitido.",
        "enum": "Valor inválido para a opção selecionada.",
        "string_type": "Deve ser um texto válido.",
    }
    mensagem_pt = traducoes_por_tipo.get(tipo, "Valor inválido.")
    if campo:
        return f"{campo}: {mensagem_pt}"
    return mensagem_pt


def configurar_frontend_estatico(aplicacao: FastAPI, dist_dir: Path | None = None) -> None:
    diretorio = (dist_dir or FRONTEND_DIST_PADRAO).resolve()
    index_file = diretorio / "index.html"
    if not index_file.is_file():
        return

    assets_dir = diretorio / "assets"
    if assets_dir.is_dir():
        aplicacao.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @aplicacao.get("/{caminho:path}", include_in_schema=False)
    def _servir_spa(caminho: str) -> FileResponse:
        if caminho == "api" or caminho.startswith("api/"):
            raise NaoEncontradoError("Rota não encontrada.")
        if caminho:
            candidato = (diretorio / caminho).resolve()
            if candidato.is_relative_to(diretorio) and candidato.is_file():
                return FileResponse(candidato)
        return FileResponse(index_file)


app = FastAPI(
    title="EVR Retifica",
    dependencies=[Depends(exigir_sessao_exceto_publicas)],
)


@app.exception_handler(NaoEncontradoError)
def _tratar_nao_encontrado(_request: Request, exc: NaoEncontradoError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": exc.detail},
    )


@app.exception_handler(ConflitoError)
def _tratar_conflito(_request: Request, exc: ConflitoError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"detail": exc.detail},
    )


@app.exception_handler(RegraNegocioError)
def _tratar_regra_negocio(_request: Request, exc: RegraNegocioError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": exc.detail},
    )


@app.exception_handler(RequestValidationError)
def _tratar_erro_validacao(_request: Request, exc: RequestValidationError) -> JSONResponse:
    mensagens = [_traduzir_erro_validacao(dict(e)) for e in exc.errors()]
    detalhe = "; ".join(mensagens) if mensagens else "Dados inválidos."
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={"detail": detalhe},
    )


app.include_router(health_router)
app.include_router(auth_router)
app.include_router(clientes_router)
app.include_router(marcas_veiculo_router)
app.include_router(veiculos_router)
app.include_router(itens_router)
app.include_router(orcamentos_router)
app.include_router(ordens_servico_router)
configurar_frontend_estatico(app)
