from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models.marca_veiculo import MarcaVeiculo

MARCAS_COMUNS_BRASIL: tuple[str, ...] = (
    "BYD",
    "Caoa Chery",
    "Chevrolet",
    "Citroën",
    "Fiat",
    "Ford",
    "Honda",
    "Hyundai",
    "Jeep",
    "Mitsubishi",
    "Nissan",
    "Peugeot",
    "Renault",
    "Toyota",
    "Volkswagen",
)


def executar_seed_marcas(db: Session) -> list[MarcaVeiculo]:
    existentes = {
        nome.lower() for nome in db.execute(select(func.lower(MarcaVeiculo.nome))).scalars().all()
    }
    novas: list[MarcaVeiculo] = []
    for nome in MARCAS_COMUNS_BRASIL:
        if nome.lower() not in existentes:
            marca = MarcaVeiculo(nome=nome, ativo=True)
            db.add(marca)
            novas.append(marca)
            existentes.add(nome.lower())

    if novas:
        db.commit()
        for marca in novas:
            db.refresh(marca)

    return novas


def main() -> None:
    with SessionLocal() as db:
        criadas = executar_seed_marcas(db)
        print(f"{len(criadas)} marca(s) de veículo adicionada(s).")


if __name__ == "__main__":
    main()
