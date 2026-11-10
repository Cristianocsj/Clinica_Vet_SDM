from datetime import datetime, date
from typing import Optional

from sqlalchemy import String, Date, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class AnimalGoverno(Base):
    __tablename__ = "animal_governo"

    id: Mapped[int] = mapped_column(primary_key=True)
    microchip: Mapped[str] = mapped_column(String(15), unique=True, index=True)
    nome: Mapped[str] = mapped_column(String(100))
    especie: Mapped[str] = mapped_column(String(50))
    raca: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    # AVISO (revisão 10/11): sexo opcional, ver o comentário em schemas.py (AnimalCreate).
    # Quem já tinha um governo.db antigo precisa apagar o arquivo para a coluna ser recriada.
    sexo: Mapped[Optional[str]] = mapped_column(String(1), nullable=True)
    data_nascimento: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    tutor_nome: Mapped[str] = mapped_column(String(150))
    tutor_cpf: Mapped[str] = mapped_column(String(11))
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, onupdate=datetime.now
    )


class Operacao(Base):
    __tablename__ = "operacao"

    id: Mapped[int] = mapped_column(primary_key=True)
    protocolo: Mapped[str] = mapped_column(String(30), unique=True, index=True)

    chave_idempotencia: Mapped[Optional[str]] = mapped_column(
        String(100), unique=True, nullable=True
    )
    tipo: Mapped[str] = mapped_column(String(30))
    situacao: Mapped[str] = mapped_column(String(20))
    mensagem: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


class VacinacaoAntirrabica(Base):
    __tablename__ = "vacinacao_antirrabica"

    id: Mapped[int] = mapped_column(primary_key=True)
    animal_id: Mapped[int] = mapped_column(ForeignKey("animal_governo.id"))
    operacao_id: Mapped[int] = mapped_column(ForeignKey("operacao.id"))
    nome_vacina: Mapped[str] = mapped_column(String(100))
    fabricante: Mapped[str] = mapped_column(String(100))
    lote: Mapped[str] = mapped_column(String(50))
    data_aplicacao: Mapped[date] = mapped_column(Date)
    veterinario_nome: Mapped[str] = mapped_column(String(150))
    veterinario_crmv: Mapped[str] = mapped_column(String(20))