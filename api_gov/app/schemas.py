from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class AnimalCreate(BaseModel):
    chave_idempotencia: str = Field(min_length=1, max_length=100)
    microchip: str = Field(pattern=r"^\d{15}$", examples=["985112345678901"])
    nome: str = Field(min_length=1, max_length=100)
    especie: str = Field(min_length=1, max_length=100)
    raca: Optional[str] = Field(default=None, max_length=100)
    # Sexo é opcional para acompanhar animais cujo sexo não foi informado na clínica.
    sexo: Optional[str] = Field(default=None, pattern=r"^[MF]$", examples=["M"])
    data_nascimento: Optional[date] = None
    tutor_nome: str = Field(min_length=1, max_length=150)
    tutor_cpf: str = Field(pattern=r"^\d{11}$", examples=["12345678909"])


class AnimalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    microchip: str
    nome: str
    especie: str
    raca: Optional[str]
    sexo: Optional[str]
    data_nascimento: Optional[date]
    tutor_nome: str
    tutor_cpf: str
    criado_em: datetime
    atualizado_em: datetime


class OperacaoAnimalOut(BaseModel):
    protocolo: str
    situacao: str
    mensagem: str
    animal: AnimalOut
    repetida: bool = False

class AnimalUpdate(BaseModel):
    chave_idempotencia: str = Field(min_length=1, max_length=100)
    novo_microchip: Optional[str] = Field(default=None, pattern=r"^\d{15}$")
    nome: str = Field(min_length=1, max_length=100)
    especie: str = Field(min_length=1, max_length=100)
    raca: Optional[str] = Field(default=None, max_length=100)
    sexo: Optional[str] = Field(default=None, pattern=r"^[MF]$")
    data_nascimento: Optional[date] = None
    tutor_nome: str = Field(min_length=1, max_length=150)
    tutor_cpf: str = Field(pattern=r"^\d{11}$")

class DadosAnimal(BaseModel):
    nome: str = Field(min_length=1, max_length=100)
    especie: str = Field(min_length=1, max_length=100)
    raca: Optional[str] = Field(default=None, max_length=100)
    sexo: Optional[str] = Field(default=None, pattern=r"^[MF]$")
    data_nascimento: Optional[date] = None
    tutor_nome: str = Field(min_length=1, max_length=150)
    tutor_cpf: str = Field(pattern=r"^\d{11}$")

class DadosVacina(BaseModel):
    nome_vacina: str = Field(min_length=1, max_length=150)
    fabricante: str = Field(min_length=1, max_length=100)
    lote: str = Field(min_length=1, max_length=50)
    data_aplicacao: date

    @field_validator("data_aplicacao")
    @classmethod
    def nao_pode_ser_futura(cls, valor: date) -> date:
        if valor > date.today():
            raise ValueError("A data de aplicação não pode estar no futuro.")
        return valor

class DadosVeterinario(BaseModel):
    nome: str = Field(min_length=1, max_length=150)
    crmv: str = Field(min_length=1, max_length=20)

class VacinacaoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    nome_vacina: str
    fabricante: str
    lote: str
    data_aplicacao: date
    veterinario_nome: str
    veterinario_crmv: str

class OperacaoVacinacaoOut(BaseModel):
    protocolo: str
    situacao: str
    mensagem: str
    microchip: str
    animal_criado: Optional[bool] = None
    repetida: bool = False
    vacinacao: VacinacaoOut

class OperacaoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    protocolo: str
    tipo: str
    situacao: str
    mensagem: Optional[str]
    criado_em: datetime

class VacinacaoCreate(BaseModel):
    chave_idempotencia: str = Field(min_length=1, max_length=100, examples=["VACINA-1"])
    microchip: str = Field(pattern=r"^\d{15}$")
    animal: DadosAnimal
    vacina: DadosVacina
    veterinario: DadosVeterinario