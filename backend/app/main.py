from fastapi import Depends, FastAPI, Request, status
from fastapi.responses import JSONResponse

from app.auth import exigir_sessao_exceto_publicas
from app.exceptions import ConflitoError, NaoEncontradoError, RegraNegocioError
from app.routers.auth import router as auth_router
from app.routers.clientes import router as clientes_router
from app.routers.health import router as health_router
from app.routers.itens import router as itens_router
from app.routers.marcas_veiculo import router as marcas_veiculo_router
from app.routers.orcamentos import router as orcamentos_router
from app.routers.veiculos import router as veiculos_router

app = FastAPI(
    title="Oficina OS",
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


app.include_router(health_router)
app.include_router(auth_router)
app.include_router(clientes_router)
app.include_router(marcas_veiculo_router)
app.include_router(veiculos_router)
app.include_router(itens_router)
app.include_router(orcamentos_router)
