from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.auth import obter_usuario_atual
from app.db import get_db
from app.models.enums import SituacaoAvaliacao
from app.models.usuario import Usuario
from app.schemas.comum import PaginacaoOutput
from app.schemas.ordem_servico import OrdemServicoInput, OrdemServicoOutput
from app.services.configuracao_sistema import obter_ou_criar_configuracao_sistema
from app.services.gerador_pdf import gerar_pdf_ordem_servico
from app.services.ordem_servico import (
    atualizar_ordem_servico,
    criar_ordem_servico,
    excluir_ordem_servico,
    listar_ordens_servico,
    obter_ordem_servico,
)

router = APIRouter(
    prefix="/api/ordens-servico",
    tags=["ordens-servico"],
    dependencies=[Depends(obter_usuario_atual)],
)


@router.get("", response_model=PaginacaoOutput[OrdemServicoOutput])
def listar(
    q: str | None = Query(default=None),
    status_id: SituacaoAvaliacao | None = Query(default=None),  # noqa: B008
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),  # noqa: B008
    _usuario: Usuario = Depends(obter_usuario_atual),  # noqa: B008
) -> PaginacaoOutput[OrdemServicoOutput]:
    return listar_ordens_servico(db, q=q, status_id=status_id, page=page, per_page=per_page)


@router.get("/{ordem_servico_id}", response_model=OrdemServicoOutput)
def obter(
    ordem_servico_id: int,
    db: Session = Depends(get_db),  # noqa: B008
) -> OrdemServicoOutput:
    os_obj = obter_ordem_servico(db, ordem_servico_id)
    return OrdemServicoOutput.model_validate(os_obj)


@router.get("/{ordem_servico_id}/pdf")
def baixar_pdf(
    ordem_servico_id: int,
    db: Session = Depends(get_db),  # noqa: B008
) -> Response:
    os_obj = obter_ordem_servico(db, ordem_servico_id)
    oficina = obter_ou_criar_configuracao_sistema(db)
    pdf_bytes = gerar_pdf_ordem_servico(os_obj, oficina)
    nome_arquivo = f"OS-{os_obj.numero}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{nome_arquivo}"'},
    )


@router.post("", response_model=OrdemServicoOutput, status_code=status.HTTP_201_CREATED)
def criar(
    dados: OrdemServicoInput,
    db: Session = Depends(get_db),  # noqa: B008
) -> OrdemServicoOutput:
    os_obj = criar_ordem_servico(db, dados)
    return OrdemServicoOutput.model_validate(os_obj)


@router.put("/{ordem_servico_id}", response_model=OrdemServicoOutput)
def editar(
    ordem_servico_id: int,
    dados: OrdemServicoInput,
    db: Session = Depends(get_db),  # noqa: B008
) -> OrdemServicoOutput:
    os_obj = atualizar_ordem_servico(db, ordem_servico_id, dados)
    return OrdemServicoOutput.model_validate(os_obj)


@router.delete("/{ordem_servico_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir(
    ordem_servico_id: int,
    db: Session = Depends(get_db),  # noqa: B008
) -> Response:
    excluir_ordem_servico(db, ordem_servico_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
