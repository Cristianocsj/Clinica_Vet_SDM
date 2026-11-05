from fastapi import FastAPI

from .database import Base, engine
from . import models  # noqa: F401  (registra as tabelas)

#uvicorn app.main:app --reload --port 8001 == comando para rodar no a aplicação com o venv ativado

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="API do Governo (Simulada)",
    description="Serviço simulado de registro de animais por microchip. "
                "Não é uma integração oficial com sistemas governamentais.",
    version="1.0.0",
)


@app.get("/api/governo/saude")
def saude():
    return {"status": "ok", "servico": "API do governo (simulada)"}