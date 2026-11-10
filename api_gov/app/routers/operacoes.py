from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Operacao
from ..schemas import OperacaoOut

router = APIRouter(prefix="/api/governo/operacoes", tags=["Operações"])


@router.get("/{protocolo}", response_model=OperacaoOut)
def consultar_operacao(protocolo: str, db: Session = Depends(get_db)):
    operacao = db.scalar(select(Operacao).where(Operacao.protocolo == protocolo))
    if not operacao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nenhuma operação encontrada com o protocolo {protocolo}.",
        )
    return operacao