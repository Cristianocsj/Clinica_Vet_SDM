from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/governo/simulacao", tags=["Simulação de falhas"])

# Guarda o estado da simulação na memória do servidor
estado = {"indisponivel": False, "erro_validacao": False}


class SimulacaoIn(BaseModel):
    indisponivel: bool = False
    erro_validacao: bool = False


@router.get("")
def ver_simulacao():
    return estado


@router.put("")
def definir_simulacao(dados: SimulacaoIn):
    estado["indisponivel"] = dados.indisponivel
    estado["erro_validacao"] = dados.erro_validacao
    return estado