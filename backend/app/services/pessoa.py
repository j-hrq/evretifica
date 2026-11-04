from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.configuracao_sistema import ConfiguracaoSistema
from app.models.pessoa import Endereco, Pessoa, PessoaFisica, PessoaJuridica, Telefone
from app.models.usuario import Usuario
from app.schemas.pessoa import PessoaInput


def carregar_pessoa(db: Session, pessoa_id: int) -> Pessoa | None:
    stmt = (
        select(Pessoa)
        .where(Pessoa.id == pessoa_id)
        .options(
            joinedload(Pessoa.pessoa_fisica),
            joinedload(Pessoa.pessoa_juridica),
            joinedload(Pessoa.endereco),
            selectinload(Pessoa.telefones),
        )
    )
    return db.execute(stmt).scalar_one_or_none()


def criar_pessoa(db: Session, dados: PessoaInput, *, commit: bool = True) -> Pessoa:
    try:
        pessoa_fisica_id: int | None = None
        pessoa_juridica_id: int | None = None
        endereco_id: int | None = None

        if dados.cpf is not None:
            pf = PessoaFisica(cpf=dados.cpf)
            db.add(pf)
            db.flush()
            pessoa_fisica_id = pf.id
        elif dados.cnpj is not None:
            pj = PessoaJuridica(
                cnpj=dados.cnpj,
                nome_fantasia=dados.nome_fantasia,
                inscricao_estadual=dados.inscricao_estadual,
            )
            db.add(pj)
            db.flush()
            pessoa_juridica_id = pj.id

        if dados.endereco is not None and dados.endereco.possui_algum_campo():
            end = Endereco(
                logradouro=dados.endereco.logradouro,
                numero=dados.endereco.numero,
                complemento=dados.endereco.complemento,
                bairro=dados.endereco.bairro,
                cidade=dados.endereco.cidade,
                estado=dados.endereco.estado,
                cep=dados.endereco.cep,
            )
            db.add(end)
            db.flush()
            endereco_id = end.id

        telefones = [
            Telefone(ddd=t.ddd, telefone=t.telefone, tipo_id=int(t.tipo_id))
            for t in dados.telefones
        ]

        pessoa = Pessoa(
            nome=dados.nome,
            email=dados.email,
            pessoa_fisica_id=pessoa_fisica_id,
            pessoa_juridica_id=pessoa_juridica_id,
            endereco_id=endereco_id,
            telefones=telefones,
        )
        db.add(pessoa)
        db.flush()

        if commit:
            db.commit()
    except Exception:
        if commit:
            db.rollback()
        raise

    pessoa_carregada = carregar_pessoa(db, pessoa.id)
    assert pessoa_carregada is not None
    return pessoa_carregada


def atualizar_pessoa(
    db: Session, pessoa_id: int, dados: PessoaInput, *, commit: bool = True
) -> Pessoa:
    pessoa = carregar_pessoa(db, pessoa_id)
    if pessoa is None:
        raise LookupError("Pessoa não encontrada.")

    try:
        pessoa.nome = dados.nome
        pessoa.email = dados.email

        if dados.cpf is not None:
            if pessoa.pessoa_fisica is not None:
                pessoa.pessoa_fisica.cpf = dados.cpf
            else:
                pj_antiga = pessoa.pessoa_juridica
                pf = PessoaFisica(cpf=dados.cpf)
                db.add(pf)
                db.flush()
                pessoa.pessoa_fisica_id = pf.id
                pessoa.pessoa_juridica_id = None
                db.flush()
                if pj_antiga is not None:
                    db.delete(pj_antiga)
        elif dados.cnpj is not None:
            if pessoa.pessoa_juridica is not None:
                pessoa.pessoa_juridica.cnpj = dados.cnpj
                pessoa.pessoa_juridica.nome_fantasia = dados.nome_fantasia
                pessoa.pessoa_juridica.inscricao_estadual = dados.inscricao_estadual
            else:
                pf_antiga = pessoa.pessoa_fisica
                pj = PessoaJuridica(
                    cnpj=dados.cnpj,
                    nome_fantasia=dados.nome_fantasia,
                    inscricao_estadual=dados.inscricao_estadual,
                )
                db.add(pj)
                db.flush()
                pessoa.pessoa_juridica_id = pj.id
                pessoa.pessoa_fisica_id = None
                db.flush()
                if pf_antiga is not None:
                    db.delete(pf_antiga)

        if dados.endereco is not None and dados.endereco.possui_algum_campo():
            if pessoa.endereco is not None:
                pessoa.endereco.logradouro = dados.endereco.logradouro
                pessoa.endereco.numero = dados.endereco.numero
                pessoa.endereco.complemento = dados.endereco.complemento
                pessoa.endereco.bairro = dados.endereco.bairro
                pessoa.endereco.cidade = dados.endereco.cidade
                pessoa.endereco.estado = dados.endereco.estado
                pessoa.endereco.cep = dados.endereco.cep
            else:
                novo_end = Endereco(
                    logradouro=dados.endereco.logradouro,
                    numero=dados.endereco.numero,
                    complemento=dados.endereco.complemento,
                    bairro=dados.endereco.bairro,
                    cidade=dados.endereco.cidade,
                    estado=dados.endereco.estado,
                    cep=dados.endereco.cep,
                )
                db.add(novo_end)
                db.flush()
                pessoa.endereco_id = novo_end.id
        elif pessoa.endereco is not None:
            end_antigo = pessoa.endereco
            pessoa.endereco_id = None
            db.flush()
            db.delete(end_antigo)

        telefones_antigos = list(pessoa.telefones)
        pessoa.telefones = [
            Telefone(ddd=t.ddd, telefone=t.telefone, tipo_id=int(t.tipo_id))
            for t in dados.telefones
        ]
        db.flush()

        for tel in telefones_antigos:
            db.delete(tel)
        db.flush()

        if commit:
            db.commit()
            db.expire_all()
    except Exception:
        if commit:
            db.rollback()
        raise

    pessoa_atualizada = carregar_pessoa(db, pessoa_id)
    assert pessoa_atualizada is not None
    return pessoa_atualizada


def excluir_pessoa_se_sem_usuario(db: Session, pessoa_id: int, *, commit: bool = True) -> bool:
    tem_usuario = db.scalar(select(Usuario.id).where(Usuario.pessoa_id == pessoa_id)) is not None
    if tem_usuario:
        return False

    tem_config = (
        db.scalar(select(ConfiguracaoSistema.id).where(ConfiguracaoSistema.pessoa_id == pessoa_id))
        is not None
    )
    if tem_config:
        return False

    pessoa = carregar_pessoa(db, pessoa_id)
    if pessoa is None:
        return False

    try:
        pf = pessoa.pessoa_fisica
        pj = pessoa.pessoa_juridica
        end = pessoa.endereco
        telefones = list(pessoa.telefones)

        pessoa.telefones = []
        db.flush()

        for tel in telefones:
            db.delete(tel)
        db.flush()

        db.delete(pessoa)
        db.flush()

        if pf is not None:
            db.delete(pf)
        if pj is not None:
            db.delete(pj)
        if end is not None:
            db.delete(end)
        db.flush()

        if commit:
            db.commit()
    except Exception:
        if commit:
            db.rollback()
        raise

    return True
