from fastapi import FastAPI

from .database import Base, engine
from . import models  # noqa: F401  (registra as tabelas)
from .routers import animais, operacoes, vacinacoes

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="API do Governo (Simulada)",
    description="Serviço simulado de registro de animais por microchip. "
                "Não é uma integração oficial com sistemas governamentais.",
    version="1.0.0",
)

app.include_router(animais.router)
app.include_router(vacinacoes.router)
app.include_router(operacoes.router)


@app.get("/api/governo/saude", tags=["Saúde"])
def saude():
    return {"status": "ok", "servico": "API do governo (simulada)"}