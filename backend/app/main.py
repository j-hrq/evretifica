from fastapi import FastAPI

from app.routers.health import router as health_router

app = FastAPI(title="Oficina OS")
app.include_router(health_router)
