from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.pessoa import Pessoa, PessoaFisica, PessoaJuridica, Telefone
from app.schemas.pessoa import PessoaInput


def carregar_pessoa(db: Session, pessoa_id: int) -> Pessoa | None:
    stmt = (
        select(Pessoa)
        .where(Pessoa.id == pessoa_id)
        .options(
            joinedload(Pessoa.pessoa_fisica),
            joinedload(Pessoa.pessoa_juridica),
            selectinload(Pessoa.telefones),
        )
    )
    return db.execute(stmt).scalar_one_or_none()


def criar_pessoa(db: Session, dados: PessoaInput, *, commit: bool = True) -> Pessoa:
    try:
        pessoa_fisica_id: int | None = None
        pessoa_juridica_id: int | None = None

        if dados.cpf is not None:
            pf = PessoaFisica(cpf=dados.cpf)
            db.add(pf)
            db.flush()
            pessoa_fisica_id = pf.id
        elif dados.cnpj is not None:
            pj = PessoaJuridica(cnpj=dados.cnpj)
            db.add(pj)
            db.flush()
            pessoa_juridica_id = pj.id

        telefones = [
            Telefone(ddd=t.ddd, telefone=t.telefone, tipo_id=int(t.tipo_id))
            for t in dados.telefones
        ]

        pessoa = Pessoa(
            nome=dados.nome,
            email=dados.email,
            pessoa_fisica_id=pessoa_fisica_id,
            pessoa_juridica_id=pessoa_juridica_id,
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
            else:
                pf_antiga = pessoa.pessoa_fisica
                pj = PessoaJuridica(cnpj=dados.cnpj)
                db.add(pj)
                db.flush()
                pessoa.pessoa_juridica_id = pj.id
                pessoa.pessoa_fisica_id = None
                db.flush()
                if pf_antiga is not None:
                    db.delete(pf_antiga)

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
