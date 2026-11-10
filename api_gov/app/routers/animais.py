from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AnimalGoverno, Operacao
from ..protocolo import gerar_protocolo
from ..schemas import AnimalCreate, AnimalUpdate, AnimalOut, OperacaoAnimalOut

router = APIRouter(prefix="/api/governo/animais", tags=["Animais"])


def buscar_por_microchip(db: Session, microchip: str):
    return db.scalar(
        select(AnimalGoverno).where(AnimalGoverno.microchip == microchip)
    )


@router.post("", response_model=OperacaoAnimalOut, status_code=status.HTTP_201_CREATED)
def cadastrar_animal(dados: AnimalCreate, db: Session = Depends(get_db)):
    if buscar_por_microchip(db, dados.microchip):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Já existe um animal cadastrado com o microchip {dados.microchip}.",
        )

    animal = AnimalGoverno(**dados.model_dump())
    operacao = Operacao(
        protocolo=gerar_protocolo(),
        tipo="CADASTRO_ANIMAL",
        situacao="concluida",
        mensagem=f"Animal com microchip {dados.microchip} cadastrado.",

    )
    db.add_all([animal, operacao])
    db.commit()
    db.refresh(animal)

    return {
        "protocolo": operacao.protocolo,
        "situacao": operacao.situacao,
        "mensagem": operacao.mensagem,
        "animal": animal,
    }


@router.get("/{microchip}", response_model=AnimalOut)
def consultar_animal(microchip: str, db: Session = Depends(get_db)):
    animal = buscar_por_microchip(db, microchip)
    if not animal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nenhum animal encontrado com o microchip {microchip}.",
        )
    return animal

@router.put("/{microchip}", response_model=OperacaoAnimalOut)
def atualizar_animal(
    microchip: str, dados: AnimalUpdate, db: Session = Depends(get_db)
):
    animal = buscar_por_microchip(db, microchip)
    if not animal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nenhum animal encontrado com o microchip {microchip}.",
        )

    for campo, valor in dados.model_dump().items():
        setattr(animal, campo, valor)

    operacao = Operacao(
        protocolo=gerar_protocolo(),
        tipo="ATUALIZACAO_ANIMAL",
        situacao="concluida",
        mensagem=f"Dados do animal com microchip {microchip} atualizados.",
    )
    db.add(operacao)
    db.commit()
    db.refresh(animal)

    return {
        "protocolo": operacao.protocolo,
        "situacao": operacao.situacao,
        "mensagem": operacao.mensagem,
        "animal": animal,
    }