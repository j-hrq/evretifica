from fastapi import Depends, FastAPI

from app.auth import exigir_sessao_exceto_publicas
from app.routers.auth import router as auth_router
from app.routers.health import router as health_router

app = FastAPI(
    title="Oficina OS",
    dependencies=[Depends(exigir_sessao_exceto_publicas)],
)
app.include_router(health_router)
app.include_router(auth_router)
