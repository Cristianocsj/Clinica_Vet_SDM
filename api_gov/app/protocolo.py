import uuid
from datetime import datetime


def gerar_protocolo() -> str:
    return f"GOV-{datetime.now():%Y%m%d}-{uuid.uuid4().hex[:8].upper()}"