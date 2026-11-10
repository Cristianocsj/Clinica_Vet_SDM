from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class AnimalCreate(BaseModel):
    microchip: str = Field(pattern=r"^\d{15}$", examples=["985112345678901"])
    nome: str = Field(min_length=1, max_length=100)
    especie: str = Field(min_length=1, max_length=50)
    raca: Optional[str] = Field(default=None, max_length=80)
    # AVISO (revisão 10/11): sexo passou a ser OPCIONAL (M, F ou vazio) porque a clínica
    # permite animal sem sexo (ex.: aves). Sem isso a vacina antirrábica desses animais
    # era recusada (422). Cristiano e João: decidam a regra final e ajustem aqui e no
    # cadastro de animal da clínica. Ver docs/GUIA_INTEGRACAO_CRISTIANO.md.
    sexo: Optional[str] = Field(default=None, pattern=r"^[MF]$", examples=["M"])
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

class AnimalUpdate(BaseModel):
    nome: str = Field(min_length=1, max_length=100)
    especie: str = Field(min_length=1, max_length=50)
    raca: Optional[str] = Field(default=None, max_length=80)
    sexo: Optional[str] = Field(default=None, pattern=r"^[MF]$")  # ver AVISO em AnimalCreate
    data_nascimento: Optional[date] = None
    tutor_nome: str = Field(min_length=1, max_length=150)
    tutor_cpf: str = Field(pattern=r"^\d{11}$")

class DadosAnimal(BaseModel):
    nome: str = Field(min_length=1, max_length=100)
    especie: str = Field(min_length=1, max_length=50)
    raca: Optional[str] = Field(default=None, max_length=80)
    sexo: Optional[str] = Field(default=None, pattern=r"^[MF]$")  # ver AVISO em AnimalCreate
    data_nascimento: Optional[date] = None
    tutor_nome: str = Field(min_length=1, max_length=150)
    tutor_cpf: str = Field(pattern=r"^\d{11}$")

class DadosVacina(BaseModel):
    nome_vacina: str = Field(min_length=1, max_length=100)
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

class VacinacaoCreate(BaseModel):
    microchip: str = Field(pattern=r"^\d{15}$")
    animal: DadosAnimal
    vacina: DadosVacina
    veterinario: DadosVeterinario

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