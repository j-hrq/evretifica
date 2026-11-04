from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.auth import obter_usuario_atual
from app.db import get_db
from app.models.enums import SituacaoAvaliacao
from app.models.usuario import Usuario
from app.schemas.comum import PaginacaoOutput
from app.schemas.orcamento import OrcamentoInput, OrcamentoOutput
from app.services.configuracao_sistema import obter_ou_criar_configuracao_sistema
from app.services.gerador_pdf import gerar_pdf_orcamento
from app.services.orcamento import (
    atualizar_orcamento,
    criar_orcamento,
    excluir_orcamento,
    listar_orcamentos,
    obter_orcamento,
)

router = APIRouter(
    prefix="/api/orcamentos",
    tags=["orcamentos"],
    dependencies=[Depends(obter_usuario_atual)],
)


@router.get("", response_model=PaginacaoOutput[OrcamentoOutput])
def listar(
    q: str | None = Query(default=None),
    status_id: SituacaoAvaliacao | None = Query(default=None),  # noqa: B008
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),  # noqa: B008
    _usuario: Usuario = Depends(obter_usuario_atual),  # noqa: B008
) -> PaginacaoOutput[OrcamentoOutput]:
    return listar_orcamentos(db, q=q, status_id=status_id, page=page, per_page=per_page)


@router.get("/{orcamento_id}", response_model=OrcamentoOutput)
def obter(
    orcamento_id: int,
    db: Session = Depends(get_db),  # noqa: B008
) -> OrcamentoOutput:
    orcamento = obter_orcamento(db, orcamento_id)
    return OrcamentoOutput.model_validate(orcamento)


@router.get("/{orcamento_id}/pdf")
def baixar_pdf(
    orcamento_id: int,
    db: Session = Depends(get_db),  # noqa: B008
) -> Response:
    orcamento = obter_orcamento(db, orcamento_id)
    oficina = obter_ou_criar_configuracao_sistema(db)
    pdf_bytes = gerar_pdf_orcamento(orcamento, oficina)
    nome_arquivo = f"Orcamento-{orcamento.numero}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{nome_arquivo}"'},
    )


@router.post("", response_model=OrcamentoOutput, status_code=status.HTTP_201_CREATED)
def criar(
    dados: OrcamentoInput,
    db: Session = Depends(get_db),  # noqa: B008
) -> OrcamentoOutput:
    orcamento = criar_orcamento(db, dados)
    return OrcamentoOutput.model_validate(orcamento)


@router.put("/{orcamento_id}", response_model=OrcamentoOutput)
def editar(
    orcamento_id: int,
    dados: OrcamentoInput,
    db: Session = Depends(get_db),  # noqa: B008
) -> OrcamentoOutput:
    orcamento = atualizar_orcamento(db, orcamento_id, dados)
    return OrcamentoOutput.model_validate(orcamento)


@router.delete("/{orcamento_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir(
    orcamento_id: int,
    db: Session = Depends(get_db),  # noqa: B008
) -> Response:
    excluir_orcamento(db, orcamento_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
