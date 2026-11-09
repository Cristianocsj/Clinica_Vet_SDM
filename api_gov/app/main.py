from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from .database import Base, engine
from . import models  # noqa: F401  (registra as tabelas)
from . import simulacao
from .simulacao import estado
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
app.include_router(simulacao.router)

ROTAS_LIVRES = ("/docs", "/redoc", "/openapi.json", "/api/governo/simulacao")

@app.middleware("http")
async def simular_falhas(request: Request, call_next):
    caminho = request.url.path
    if caminho.startswith(ROTAS_LIVRES):
        return await call_next(request)

    if estado["indisponivel"]:
        return JSONResponse(
            status_code=503,
            content={"detail": "Serviço do governo temporariamente indisponível (simulado)."},
        )

    if estado["erro_validacao"] and request.method in ("POST", "PUT"):
        return JSONResponse(
            status_code=422,
            content={"detail": "Erro de validação simulado pelo governo."},
        )

    return await call_next(request)


@app.get("/api/governo/saude", tags=["Saúde"])
def saude():
    return {"status": "ok", "servico": "API do governo (simulada)"}