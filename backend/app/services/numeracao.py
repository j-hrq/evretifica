from sqlalchemy.dialects.sqlite import insert
from sqlalchemy.orm import Session

from app.models.contador_documento import ContadorDocumento


def gerar_proximo_numero(db: Session, tipo: str, ano: int) -> str:
    stmt = (
        insert(ContadorDocumento)
        .values(tipo=tipo, ano=ano, ultimo_numero=1)
        .on_conflict_do_update(
            index_elements=[ContadorDocumento.tipo, ContadorDocumento.ano],
            set_={"ultimo_numero": ContadorDocumento.ultimo_numero + 1},
        )
        .returning(ContadorDocumento.ultimo_numero)
    )
    sequencial = int(db.scalar(stmt) or 1)
    return f"{sequencial:03d}-{ano}-{tipo}"
