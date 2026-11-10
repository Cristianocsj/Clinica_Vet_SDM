from fastapi import APIRouter, Depends, status, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AnimalGoverno, Operacao, VacinacaoAntirrabica
from ..protocolo import gerar_protocolo
from ..schemas import OperacaoVacinacaoOut, VacinacaoCreate

router = APIRouter(
    prefix="/api/governo/vacinacoes-antirrabicas",
    tags=["Vacinações antirrábicas"],
)


@router.post("", response_model=OperacaoVacinacaoOut, status_code=status.HTTP_201_CREATED)
def receber_vacinacao(dados: VacinacaoCreate, response: Response, db: Session = Depends(get_db)):
    # Idempotência: se essa chave já foi processada, devolve o resultado de antes
    anterior = db.scalar(
        select(Operacao).where(Operacao.chave_idempotencia == dados.chave_idempotencia)
    )
    if anterior:
        vacinacao_anterior = db.scalar(
            select(VacinacaoAntirrabica).where(
                VacinacaoAntirrabica.operacao_id == anterior.id
            )
        )
        response.status_code = status.HTTP_200_OK
        return {
            "protocolo": anterior.protocolo,
            "situacao": anterior.situacao,
            "mensagem": "Solicitação já processada anteriormente. "
                        "Nenhum registro novo foi criado.",
            "microchip": dados.microchip,
            "animal_criado": None,
            "repetida": True,
            "vacinacao": vacinacao_anterior,
        }

    animal = db.scalar(
        select(AnimalGoverno).where(AnimalGoverno.microchip == dados.microchip)
    )
    animal_criado = animal is None

    # Regra do PDF: a comunicação vale mesmo que o animal ainda não esteja cadastrado
    if animal_criado:
        animal = AnimalGoverno(microchip=dados.microchip, **dados.animal.model_dump())
        db.add(animal)
        db.flush()

    if animal_criado:
        mensagem = (
            "Vacinação antirrábica registrada. O animal não estava cadastrado "
            "e foi criado automaticamente."
        )
    else:
        mensagem = "Vacinação antirrábica registrada para animal já cadastrado."

    operacao = Operacao(
        protocolo=gerar_protocolo(),
        chave_idempotencia=dados.chave_idempotencia,
        tipo="VACINACAO_ANTIRRABICA",
        situacao="concluida",
        mensagem=mensagem,
    )
    db.add(operacao)
    db.flush()

    vacinacao = VacinacaoAntirrabica(
        animal_id=animal.id,
        operacao_id=operacao.id,
        nome_vacina=dados.vacina.nome_vacina,
        fabricante=dados.vacina.fabricante,
        lote=dados.vacina.lote,
        data_aplicacao=dados.vacina.data_aplicacao,
        veterinario_nome=dados.veterinario.nome,
        veterinario_crmv=dados.veterinario.crmv,
    )
    db.add(vacinacao)
    db.commit()
    db.refresh(vacinacao)

    return {
        "protocolo": operacao.protocolo,
        "situacao": operacao.situacao,
        "mensagem": operacao.mensagem,
        "microchip": dados.microchip,
        "animal_criado": animal_criado,
        "repetida": False,
        "vacinacao": vacinacao,
    }