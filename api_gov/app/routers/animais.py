from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AnimalGoverno, Operacao
from ..protocolo import gerar_protocolo
from ..schemas import (
    AnimalCreate,
    AnimalOut,
    AnimalUpdate,
    OperacaoAnimalOut,
    TrocaMicrochip,
)

router = APIRouter(prefix="/api/governo/animais", tags=["Animais"])


def buscar_por_microchip(db: Session, microchip: str):
    return db.scalar(
        select(AnimalGoverno).where(AnimalGoverno.microchip == microchip)
    )


@router.post("", response_model=OperacaoAnimalOut, status_code=status.HTTP_201_CREATED)
def cadastrar_animal(
    dados: AnimalCreate, response: Response, db: Session = Depends(get_db)
):
    anterior = db.scalar(
        select(Operacao).where(
            Operacao.chave_idempotencia == dados.chave_idempotencia
        )
    )
    if anterior:
        if anterior.tipo != "CADASTRO_ANIMAL":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A chave de idempotência já foi usada em outra operação.",
            )
        animal = buscar_por_microchip(db, dados.microchip)
        if not animal:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A chave já foi processada, mas o animal não foi encontrado.",
            )
        response.status_code = status.HTTP_200_OK
        return {
            "protocolo": anterior.protocolo,
            "situacao": anterior.situacao,
            "mensagem": "Solicitação já processada anteriormente; nenhuma sincronização foi feita nesta repetição.",
            "animal": animal,
            "repetida": True,
        }

    animal = buscar_por_microchip(db, dados.microchip)
    if animal:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Já existe um animal cadastrado com o microchip {dados.microchip}.",
        )

    animal = AnimalGoverno(
        **dados.model_dump(exclude={"chave_idempotencia"})
    )
    db.add(animal)
    operacao = Operacao(
        protocolo=gerar_protocolo(),
        chave_idempotencia=dados.chave_idempotencia,
        tipo="CADASTRO_ANIMAL",
        situacao="concluida",
        mensagem=f"Animal com microchip {dados.microchip} cadastrado.",
    )
    db.add(operacao)
    db.commit()
    db.refresh(animal)

    return {
        "protocolo": operacao.protocolo,
        "situacao": operacao.situacao,
        "mensagem": operacao.mensagem,
        "animal": animal,
        "repetida": False,
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
    microchip: str, dados: AnimalUpdate, response: Response, db: Session = Depends(get_db)
):
    anterior = db.scalar(
        select(Operacao).where(
            Operacao.chave_idempotencia == dados.chave_idempotencia
        )
    )
    if anterior:
        if anterior.tipo != "ATUALIZACAO_ANIMAL":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A chave de idempotência já foi usada em outra operação.",
            )
        animal = buscar_por_microchip(db, microchip)
        if not animal:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A chave já foi processada, mas o animal não foi encontrado.",
            )
        response.status_code = status.HTTP_200_OK
        return {
            "protocolo": anterior.protocolo,
            "situacao": anterior.situacao,
            "mensagem": anterior.mensagem,
            "animal": animal,
            "repetida": True,
        }

    animal = buscar_por_microchip(db, microchip)
    if not animal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nenhum animal encontrado com o microchip {microchip}.",
        )

    for campo, valor in dados.model_dump(exclude={"chave_idempotencia"}).items():
        setattr(animal, campo, valor)

    operacao = Operacao(
        protocolo=gerar_protocolo(),
        chave_idempotencia=dados.chave_idempotencia,
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
        "repetida": False,
    }


@router.put("/{microchip}/microchip", response_model=OperacaoAnimalOut)
def trocar_microchip(
    microchip: str,
    dados: TrocaMicrochip,
    response: Response,
    db: Session = Depends(get_db),
):
    anterior = db.scalar(
        select(Operacao).where(
            Operacao.chave_idempotencia == dados.chave_idempotencia
        )
    )
    if anterior:
        if anterior.tipo != "TROCA_MICROCHIP":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A chave de idempotência já foi usada em outra operação.",
            )
        animal = buscar_por_microchip(db, dados.novo_microchip)
        if not animal:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A chave já foi processada, mas o animal não foi encontrado.",
            )
        response.status_code = status.HTTP_200_OK
        return {
            "protocolo": anterior.protocolo,
            "situacao": anterior.situacao,
            "mensagem": anterior.mensagem,
            "animal": animal,
            "repetida": True,
        }

    animal = buscar_por_microchip(db, microchip)
    if not animal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nenhum animal encontrado com o microchip {microchip}.",
        )
    if dados.novo_microchip == microchip:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="O novo microchip deve ser diferente do microchip atual.",
        )
    if buscar_por_microchip(db, dados.novo_microchip):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Já existe um animal cadastrado com o microchip {dados.novo_microchip}.",
        )

    animal.microchip = dados.novo_microchip
    operacao = Operacao(
        protocolo=gerar_protocolo(),
        chave_idempotencia=dados.chave_idempotencia,
        tipo="TROCA_MICROCHIP",
        situacao="concluida",
        mensagem=f"Microchip do animal alterado de {microchip} para {dados.novo_microchip}.",
    )
    db.add(operacao)
    db.commit()
    db.refresh(animal)

    return {
        "protocolo": operacao.protocolo,
        "situacao": operacao.situacao,
        "mensagem": operacao.mensagem,
        "animal": animal,
        "repetida": False,
    }