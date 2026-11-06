from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class AnimalCreate(BaseModel):
    microchip: str = Field(pattern=r"^\d{15}$", examples=["985112345678901"])
    nome: str = Field(min_length=1, max_length=100)
    especie: str = Field(min_length=1, max_length=50)
    raca: Optional[str] = Field(default=None, max_length=80)
    sexo: str = Field(pattern=r"^[MF]$", examples=["M"])
    data_nascimento: Optional[date] = None
    tutor_nome: str = Field(min_length=1, max_length=150)
    tutor_cpf: str = Field(pattern=r"^\d{11}$", examples=["12345678909"])


class AnimalOut(AnimalCreate):
    model_config = ConfigDict(from_attributes=True)

    criado_em: datetime
    atualizado_em: datetime


class OperacaoAnimalOut(BaseModel):
    protocolo: str
    situacao: str
    mensagem: str
    animal: AnimalOut