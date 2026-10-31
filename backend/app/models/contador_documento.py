from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class ContadorDocumento(Base):
    __tablename__ = "contador_documento"

    tipo: Mapped[str] = mapped_column(String(10), primary_key=True)
    ano: Mapped[int] = mapped_column(Integer, primary_key=True)
    ultimo_numero: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
