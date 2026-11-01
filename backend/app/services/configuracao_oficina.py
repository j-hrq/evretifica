from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.configuracao_oficina import ConfiguracaoOficina
from app.schemas.configuracao_oficina import ConfiguracaoOficinaUpdate


def obter_ou_criar_configuracao_oficina(db: Session) -> ConfiguracaoOficina:
    configuracao = db.scalars(select(ConfiguracaoOficina).limit(1)).first()
    if configuracao is not None:
        return configuracao

    configuracao = ConfiguracaoOficina(
        nome_fantasia="EVR Retífica",
        razao_social="EVR Retífica",
        cnpj_cpf="077.125.515-29",
        telefone="(75) 99118-1598",
        whatsapp="(75) 99118-1598",
        email="evrretifica@gmail.com",
        logradouro="Rua São Salvador",
        numero="1996",
        bairro="35º BI",
        cidade="Feira de Santana",
        estado="BA",
        cep="44094-060",
        nome_responsavel="Evandro Ramos Rosado",
    )
    db.add(configuracao)
    db.commit()
    db.refresh(configuracao)
    return configuracao


def atualizar_configuracao_oficina(
    db: Session, dados: ConfiguracaoOficinaUpdate
) -> ConfiguracaoOficina:
    configuracao = obter_ou_criar_configuracao_oficina(db)
    for campo, valor in dados.model_dump().items():
        setattr(configuracao, campo, valor)

    db.commit()
    db.refresh(configuracao)
    return configuracao
