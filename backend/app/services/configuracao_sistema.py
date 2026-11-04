from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.exceptions import ConflitoError
from app.models.configuracao_sistema import ConfiguracaoSistema
from app.models.enums import TipoTelefone
from app.models.pessoa import Pessoa, PessoaFisica, utc_now
from app.schemas.configuracao_sistema import ConfiguracaoSistemaUpdate
from app.schemas.pessoa import EnderecoInput, PessoaInput, TelefoneInput
from app.services.pessoa import atualizar_pessoa, criar_pessoa

CPF_PADRAO_OFICINA = "07712551529"


def _opcoes_carregamento_configuracao():
    return (
        joinedload(ConfiguracaoSistema.pessoa).joinedload(Pessoa.pessoa_fisica),
        joinedload(ConfiguracaoSistema.pessoa).joinedload(Pessoa.pessoa_juridica),
        joinedload(ConfiguracaoSistema.pessoa).joinedload(Pessoa.endereco),
        joinedload(ConfiguracaoSistema.pessoa).selectinload(Pessoa.telefones),
    )


def obter_ou_criar_configuracao_sistema(db: Session) -> ConfiguracaoSistema:
    stmt = select(ConfiguracaoSistema).options(*_opcoes_carregamento_configuracao()).limit(1)
    configuracao = db.execute(stmt).scalar_one_or_none()
    if configuracao is not None:
        return configuracao

    pessoa_existente = db.scalar(
        select(Pessoa)
        .join(Pessoa.pessoa_fisica)
        .where(PessoaFisica.cpf == CPF_PADRAO_OFICINA)
        .limit(1)
    )
    if pessoa_existente is not None:
        pessoa_id = pessoa_existente.id
    else:
        pessoa = criar_pessoa(
            db,
            PessoaInput(
                nome="EVR Retífica",
                email="evrretifica@gmail.com",
                cpf=CPF_PADRAO_OFICINA,
                telefones=[
                    TelefoneInput(
                        ddd="75",
                        telefone="991181598",
                        tipo_id=TipoTelefone.WHATSAPP,
                    )
                ],
                endereco=EnderecoInput(
                    logradouro="Rua São Salvador",
                    numero="1996",
                    bairro="35º BI",
                    cidade="Feira de Santana",
                    estado="BA",
                    cep="44094-060",
                ),
            ),
            commit=False,
        )
        pessoa_id = pessoa.id

    configuracao = ConfiguracaoSistema(pessoa_id=pessoa_id)
    db.add(configuracao)
    db.commit()

    configuracao_carregada = db.execute(stmt).scalar_one_or_none()
    assert configuracao_carregada is not None
    return configuracao_carregada


def atualizar_configuracao_sistema(
    db: Session, dados: ConfiguracaoSistemaUpdate
) -> ConfiguracaoSistema:
    configuracao = obter_ou_criar_configuracao_sistema(db)
    try:
        atualizar_pessoa(db, configuracao.pessoa_id, dados.pessoa, commit=False)
        configuracao.data_alteracao = utc_now()
        db.commit()
        db.expire_all()
    except IntegrityError as exc:
        db.rollback()
        raise ConflitoError("CPF ou CNPJ já cadastrado.") from exc
    except Exception:
        db.rollback()
        raise

    return obter_ou_criar_configuracao_sistema(db)
