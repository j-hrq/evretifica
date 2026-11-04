import pytest
from pydantic import ValidationError
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.enums import TipoTelefone
from app.models.pessoa import (
    Endereco,
    Pessoa,
    PessoaFisica,
    PessoaJuridica,
    Telefone,
    pessoa_telefone,
)
from app.schemas.pessoa import EnderecoInput, PessoaInput, TelefoneInput
from app.services.pessoa import atualizar_pessoa, carregar_pessoa, criar_pessoa


def test_criar_e_carregar_pessoa_fisica_com_telefones_e_endereco(
    db_session: Session,
) -> None:
    dados = PessoaInput(
        nome="Maria da Silva",
        email="maria@exemplo.com",
        cpf="529.982.247-25",
        endereco=EnderecoInput(
            logradouro="Rua das Flores",
            numero="123",
            complemento="Apto 101",
            bairro="Centro",
            cidade="Feira de Santana",
            estado="BA",
            cep="44000-000",
        ),
        telefones=[
            TelefoneInput(ddd="11", telefone="98765-4321", tipo_id=TipoTelefone.CELULAR),
            TelefoneInput(ddd="11", telefone="34567890", tipo_id=TipoTelefone.FIXO),
        ],
    )

    criada = criar_pessoa(db_session, dados)
    carregada = carregar_pessoa(db_session, criada.id)

    assert carregada is not None
    assert carregada.nome == "Maria da Silva"
    assert carregada.email == "maria@exemplo.com"
    assert carregada.pessoa_fisica is not None
    assert carregada.pessoa_fisica.cpf == "52998224725"
    assert carregada.pessoa_juridica is None
    assert carregada.endereco is not None
    assert carregada.endereco.logradouro == "Rua das Flores"
    assert carregada.endereco.numero == "123"
    assert carregada.endereco.cidade == "Feira de Santana"
    assert len(carregada.telefones) == 2
    assert {(t.ddd, t.telefone, t.tipo_id) for t in carregada.telefones} == {
        ("11", "987654321", TipoTelefone.CELULAR),
        ("11", "34567890", TipoTelefone.FIXO),
    }


def test_criar_e_carregar_pessoa_juridica_com_telefones(db_session: Session) -> None:
    dados = PessoaInput(
        nome="Oficina Central Ltda",
        email="contato@oficina.com.br",
        cnpj="11.222.333/0001-81",
        nome_fantasia="Oficina Central",
        inscricao_estadual="123456789",
        telefones=[
            TelefoneInput(ddd="21", telefone="998877665", tipo_id=TipoTelefone.WHATSAPP),
        ],
    )

    criada = criar_pessoa(db_session, dados)
    carregada = carregar_pessoa(db_session, criada.id)

    assert carregada is not None
    assert carregada.nome == "Oficina Central Ltda"
    assert carregada.pessoa_juridica is not None
    assert carregada.pessoa_juridica.cnpj == "11222333000181"
    assert carregada.pessoa_juridica.nome_fantasia == "Oficina Central"
    assert carregada.pessoa_juridica.inscricao_estadual == "123456789"
    assert carregada.nome_fantasia == "Oficina Central"
    assert carregada.inscricao_estadual == "123456789"
    assert carregada.pessoa_fisica is None
    assert len(carregada.telefones) == 1
    assert carregada.telefones[0].tipo_id == TipoTelefone.WHATSAPP


def test_check_constraint_rejeita_ambos_documentos_no_banco(db_session: Session) -> None:
    pf = PessoaFisica(cpf="52998224725")
    pj = PessoaJuridica(cnpj="11222333000181")
    db_session.add_all([pf, pj])
    db_session.flush()

    pessoa_invalida = Pessoa(
        nome="Pessoa Invalida",
        pessoa_fisica_id=pf.id,
        pessoa_juridica_id=pj.id,
    )
    db_session.add(pessoa_invalida)

    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_check_constraint_rejeita_nenhum_documento_no_banco(db_session: Session) -> None:
    pessoa_sem_doc = Pessoa(
        nome="Sem Documento",
        pessoa_fisica_id=None,
        pessoa_juridica_id=None,
    )
    db_session.add(pessoa_sem_doc)

    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_schema_rejeita_ambos_ou_nenhum_documento() -> None:
    with pytest.raises(ValidationError):
        PessoaInput(
            nome="Ambos",
            cpf="52998224725",
            cnpj="11222333000181",
        )

    with pytest.raises(ValidationError):
        PessoaInput(nome="Nenhum")


def test_cpf_duplicado_levanta_erro_e_faz_rollback(db_session: Session) -> None:
    criar_pessoa(
        db_session,
        PessoaInput(nome="Pessoa 1", cpf="52998224725"),
    )

    with pytest.raises(IntegrityError):
        criar_pessoa(
            db_session,
            PessoaInput(
                nome="Pessoa 2",
                cpf="529.982.247-25",
                telefones=[
                    TelefoneInput(ddd="11", telefone="911112222", tipo_id=TipoTelefone.CELULAR)
                ],
            ),
        )

    total_pessoas = db_session.scalar(select(func.count()).select_from(Pessoa))
    total_telefones = db_session.scalar(select(func.count()).select_from(Telefone))
    assert total_pessoas == 1
    assert total_telefones == 0


def test_cnpj_duplicado_levanta_erro(db_session: Session) -> None:
    criar_pessoa(
        db_session,
        PessoaInput(nome="Empresa 1", cnpj="11222333000181"),
    )

    with pytest.raises(IntegrityError):
        criar_pessoa(
            db_session,
            PessoaInput(nome="Empresa 2", cnpj="11.222.333/0001-81"),
        )


def test_atualizar_pessoa_endereco_e_lista_de_telefones(db_session: Session) -> None:
    criada = criar_pessoa(
        db_session,
        PessoaInput(
            nome="Carlos Souza",
            email="carlos@antigo.com",
            cpf="52998224725",
            endereco=EnderecoInput(logradouro="Rua A", numero="10", cidade="Salvador", estado="BA"),
            telefones=[
                TelefoneInput(ddd="11", telefone="911111111", tipo_id=TipoTelefone.CELULAR),
                TelefoneInput(ddd="11", telefone="32222222", tipo_id=TipoTelefone.FIXO),
            ],
        ),
    )

    atualizada = atualizar_pessoa(
        db_session,
        criada.id,
        PessoaInput(
            nome="Carlos Alberto Souza",
            email="carlos@novo.com",
            cpf="111.444.777-35",
            endereco=EnderecoInput(
                logradouro="Rua B",
                numero="20",
                cidade="Feira de Santana",
                estado="BA",
            ),
            telefones=[
                TelefoneInput(ddd="19", telefone="988887777", tipo_id=TipoTelefone.WHATSAPP),
            ],
        ),
    )

    assert atualizada.nome == "Carlos Alberto Souza"
    assert atualizada.email == "carlos@novo.com"
    assert atualizada.pessoa_fisica is not None
    assert atualizada.pessoa_fisica.cpf == "11144477735"
    assert atualizada.endereco is not None
    assert atualizada.endereco.logradouro == "Rua B"
    assert atualizada.endereco.cidade == "Feira de Santana"
    assert len(atualizada.telefones) == 1
    assert atualizada.telefones[0].ddd == "19"
    assert atualizada.telefones[0].telefone == "988887777"
    assert atualizada.telefones[0].tipo_id == TipoTelefone.WHATSAPP

    # Garante que os telefones antigos foram removidos da tabela telefone e de pessoa_telefone
    total_telefones = db_session.scalar(select(func.count()).select_from(Telefone))
    total_vinculos = db_session.scalar(select(func.count()).select_from(pessoa_telefone))
    total_enderecos = db_session.scalar(select(func.count()).select_from(Endereco))
    assert total_telefones == 1
    assert total_vinculos == 1
    assert total_enderecos == 1
