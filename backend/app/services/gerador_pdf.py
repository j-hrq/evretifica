import io
from datetime import date, datetime, timedelta

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.models.configuracao_sistema import ConfiguracaoSistema
from app.models.enums import SituacaoAvaliacao, TipoItem, TipoTelefone
from app.models.orcamento import Orcamento
from app.models.ordem_servico import OrdemServico

SITUACAO_AVALIACAO_LABELS: dict[int, str] = {
    SituacaoAvaliacao.PENDENTE: "Pendente",
    SituacaoAvaliacao.EM_ANDAMENTO: "Em andamento",
    SituacaoAvaliacao.CONCLUIDO: "Concluído",
    SituacaoAvaliacao.CANCELADO: "Cancelado",
    SituacaoAvaliacao.ACEITO: "Aceito",
    SituacaoAvaliacao.RECUSADO: "Recusado",
}

TIPO_ITEM_LABELS: dict[int, str] = {
    TipoItem.MAO_DE_OBRA: "Mão de obra",
    TipoItem.AQUISICAO: "Aquisição",
}

MESES_EXTENSO = [
    "",
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
]


class NumeracaoPaginasCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states: list[dict] = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        total_paginas = len(self._saved_page_states)
        for estado in self._saved_page_states:
            self.__dict__.update(estado)
            self.desenhar_rodape(total_paginas)
            super().showPage()
        super().save()

    def desenhar_rodape(self, total: int):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        texto = f"Página {self._pageNumber}/{total}"
        self.drawRightString(A4[0] - 36, 18, texto)
        self.restoreState()


def formatar_moeda(centavos: int) -> str:
    valor = centavos / 100
    formatado = f"{valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"R$ {formatado}"


def formatar_quantidade(valor: object) -> str:
    val_float = float(valor) if valor is not None else 0.0
    return f"{val_float:.2f}".replace(".", ",")


def formatar_data(data: date | datetime | None) -> str:
    if not data:
        return "-"
    return data.strftime("%d/%m/%Y")


def formatar_data_extenso(data: date | datetime, cidade: str) -> str:
    dia = data.day
    mes = MESES_EXTENSO[data.month]
    ano = data.year
    cidade_nome = cidade.strip() if cidade else "Feira de Santana"
    return f"{cidade_nome}, {dia} de {mes} de {ano}"


def _criar_estilos() -> dict[str, ParagraphStyle]:
    folha = getSampleStyleSheet()

    estilos: dict[str, ParagraphStyle] = {
        "EmpresaTitulo": ParagraphStyle(
            "EmpresaTitulo",
            parent=folha["Normal"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=15,
            textColor=colors.HexColor("#0F172A"),
        ),
        "EmpresaDetalhes": ParagraphStyle(
            "EmpresaDetalhes",
            parent=folha["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=10.5,
            textColor=colors.HexColor("#334155"),
        ),
        "EmpresaContato": ParagraphStyle(
            "EmpresaContato",
            parent=folha["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=10.5,
            alignment=2,  # Direita
            textColor=colors.HexColor("#334155"),
        ),
        "BannerTitulo": ParagraphStyle(
            "BannerTitulo",
            parent=folha["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=13,
            textColor=colors.HexColor("#0F172A"),
        ),
        "SecaoTitulo": ParagraphStyle(
            "SecaoTitulo",
            parent=folha["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9.5,
            leading=12,
            textColor=colors.HexColor("#0F172A"),
        ),
        "TextoNormal": ParagraphStyle(
            "TextoNormal",
            parent=folha["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#1E293B"),
        ),
        "TextoRotulo": ParagraphStyle(
            "TextoRotulo",
            parent=folha["Normal"],
            fontName="Helvetica",
            fontSize=7,
            leading=8.5,
            textColor=colors.HexColor("#64748B"),
        ),
        "TextoValorDestaque": ParagraphStyle(
            "TextoValorDestaque",
            parent=folha["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#0F172A"),
        ),
        "TabelaCabecalho": ParagraphStyle(
            "TabelaCabecalho",
            parent=folha["Normal"],
            fontName="Helvetica-Bold",
            fontSize=7.5,
            leading=9,
            textColor=colors.HexColor("#334155"),
        ),
        "TabelaCabecalhoDir": ParagraphStyle(
            "TabelaCabecalhoDir",
            parent=folha["Normal"],
            fontName="Helvetica-Bold",
            fontSize=7.5,
            leading=9,
            alignment=2,
            textColor=colors.HexColor("#334155"),
        ),
        "TabelaTexto": ParagraphStyle(
            "TabelaTexto",
            parent=folha["Normal"],
            fontName="Helvetica",
            fontSize=7.5,
            leading=9.5,
            textColor=colors.HexColor("#1E293B"),
        ),
        "TabelaTextoDir": ParagraphStyle(
            "TabelaTextoDir",
            parent=folha["Normal"],
            fontName="Helvetica",
            fontSize=7.5,
            leading=9.5,
            alignment=2,
            textColor=colors.HexColor("#1E293B"),
        ),
        "TabelaTotal": ParagraphStyle(
            "TabelaTotal",
            parent=folha["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=11,
            alignment=2,
            textColor=colors.HexColor("#0F172A"),
        ),
        "AssinaturaTexto": ParagraphStyle(
            "AssinaturaTexto",
            parent=folha["Normal"],
            fontName="Helvetica",
            fontSize=7.5,
            leading=9.5,
            alignment=1,  # Centro
            textColor=colors.HexColor("#1E293B"),
        ),
    }
    return estilos


def _montar_cabecalho_oficina(
    oficina: ConfiguracaoSistema,
    data_documento: date | datetime,
    estilos: dict[str, ParagraphStyle],
) -> Table:
    p = oficina.pessoa
    nome = (p.nome_fantasia or p.nome or "EVR RETÍFICA").upper()
    doc_val = p.cnpj or p.cpf
    doc = f"CPF/CNPJ: {doc_val}" if doc_val else ""

    end = p.endereco
    end_partes = []
    if end and end.logradouro:
        linha1 = f"{end.logradouro}, {end.numero or 'S/N'}"
        if end.complemento:
            linha1 += f" - {end.complemento}"
        end_partes.append(linha1)

    cidade_uf = []
    if end and end.bairro:
        cidade_uf.append(end.bairro)
    if end and end.cidade and end.estado:
        cidade_uf.append(f"{end.cidade}-{end.estado}")
    elif end and end.cidade:
        cidade_uf.append(end.cidade)
    if cidade_uf:
        end_partes.append(", ".join(cidade_uf))

    if end and end.cep:
        end_partes.append(f"CEP {end.cep}")

    col_esq_html = f"<b>{nome}</b><br/>"
    if doc:
        col_esq_html += f"{doc}<br/>"
    col_esq_html += "<br/>".join(end_partes)

    col_dir_html = f"<b>{formatar_data(data_documento)}</b><br/>"
    if p.email:
        col_dir_html += f"{p.email}<br/>"

    telefone_exibido = None
    if p.telefones:
        tel_wpp = next((t for t in p.telefones if t.tipo_id == TipoTelefone.WHATSAPP), None)
        t_sel = tel_wpp or p.telefones[0]
        telefone_exibido = f"({t_sel.ddd}) {t_sel.telefone}"
    if telefone_exibido:
        col_dir_html += f"{telefone_exibido}<br/>"

    tabela = Table(
        [
            [
                Paragraph(col_esq_html, estilos["EmpresaDetalhes"]),
                Paragraph(col_dir_html, estilos["EmpresaContato"]),
            ]
        ],
        colWidths=[330, 193],
    )
    tabela.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return tabela


def _montar_banner_titulo(titulo: str, estilos: dict[str, ParagraphStyle]) -> Table:
    tabela = Table([[Paragraph(f"<b>{titulo}</b>", estilos["BannerTitulo"])]], colWidths=[523])
    tabela.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#E2E8F0")),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return tabela


def _montar_dados_cliente(
    nome_cliente: str,
    cpf_cnpj: str | None,
    telefone: str | None,
    email: str | None,
    estilos: dict[str, ParagraphStyle],
) -> Table:
    col_esq_html = f"<b>Cliente:</b> {nome_cliente}"
    if cpf_cnpj:
        col_esq_html += f"<br/><b>Documento:</b> {cpf_cnpj}"
    if email:
        col_esq_html += f"<br/><b>E-mail:</b> {email}"

    col_dir_html = ""
    if telefone:
        col_dir_html = f"<b>Telefone:</b> {telefone}"

    tabela = Table(
        [
            [
                Paragraph(col_esq_html, estilos["TextoNormal"]),
                Paragraph(col_dir_html, estilos["TextoNormal"]),
            ]
        ],
        colWidths=[330, 193],
    )
    tabela.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return tabela


def _montar_informacoes_basicas(
    itens_grid: list[tuple[str, str]], estilos: dict[str, ParagraphStyle]
) -> Table:
    linhas = []
    # Quebra de 4 em 4 itens
    for i in range(0, len(itens_grid), 4):
        grupo = itens_grid[i : i + 4]
        celulas = []
        for rotulo, valor in grupo:
            conteudo = f"{rotulo}<br/><b>{valor}</b>"
            celulas.append(Paragraph(conteudo, estilos["TextoNormal"]))
        # Preenche com células vazias se menos de 4
        while len(celulas) < 4:
            celulas.append(Paragraph("", estilos["TextoNormal"]))
        linhas.append(celulas)

    tabela = Table(linhas, colWidths=[130, 130, 130, 133])
    tabela.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]
        )
    )
    return tabela


def _montar_tabela_servicos(
    itens: list[dict], total_centavos: int, estilos: dict[str, ParagraphStyle]
) -> Table:
    cabecalho = [
        Paragraph("Descrição", estilos["TabelaCabecalho"]),
        Paragraph("Tipo", estilos["TabelaCabecalho"]),
        Paragraph("Preço unitário", estilos["TabelaCabecalhoDir"]),
        Paragraph("Qtd.", estilos["TabelaCabecalhoDir"]),
        Paragraph("Subtotal", estilos["TabelaCabecalhoDir"]),
    ]

    linhas = [cabecalho]
    for item in itens:
        linhas.append(
            [
                Paragraph(item["descricao"], estilos["TabelaTexto"]),
                Paragraph(item["tipo"], estilos["TabelaTexto"]),
                Paragraph(item["valor_unitario"], estilos["TabelaTextoDir"]),
                Paragraph(item["quantidade"], estilos["TabelaTextoDir"]),
                Paragraph(item["subtotal"], estilos["TabelaTextoDir"]),
            ]
        )

    # Linha totalizadora
    linhas.append(
        [
            Paragraph("<b>Total</b>", estilos["TabelaTotal"]),
            Paragraph("", estilos["TextoNormal"]),
            Paragraph("", estilos["TextoNormal"]),
            Paragraph("", estilos["TextoNormal"]),
            Paragraph(f"<b>{formatar_moeda(total_centavos)}</b>", estilos["TabelaTotal"]),
        ]
    )

    tabela = Table(linhas, colWidths=[233, 90, 75, 45, 80])
    estilo_tabela = [
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LINEBELOW", (0, 0), (-1, 0), 0.75, colors.HexColor("#CBD5E1")),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
        # Linha totalizadora
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#F1F5F9")),
        ("LINEABOVE", (0, -1), (-1, -1), 0.75, colors.HexColor("#CBD5E1")),
    ]
    tabela.setStyle(TableStyle(estilo_tabela))
    return tabela


def _divisor() -> HRFlowable:
    return HRFlowable(
        width="100%",
        thickness=0.5,
        color=colors.HexColor("#CBD5E1"),
        spaceBefore=2,
        spaceAfter=4,
    )


def _montar_bloco_assinaturas(
    data_documento: date | datetime,
    cidade: str,
    oficina: ConfiguracaoSistema,
    nome_cliente: str,
    estilos: dict[str, ParagraphStyle],
) -> list:
    elementos = []
    data_extenso = formatar_data_extenso(data_documento, cidade)
    elementos.append(
        Paragraph(
            f"<b>{data_extenso}</b>",
            ParagraphStyle(
                "DataExtenso",
                parent=estilos["TextoNormal"],
                alignment=1,
                fontName="Helvetica-Bold",
                fontSize=8,
            ),
        )
    )
    elementos.append(Spacer(1, 24))

    p = oficina.pessoa
    nome_oficina = (p.nome_fantasia or p.nome or "EVR RETÍFICA").upper()
    linha_oficina = f"______________________________________<br/><b>{nome_oficina}</b>"
    if p.nome_fantasia and p.nome and p.nome.upper() != nome_oficina:
        linha_oficina += f"<br/>{p.nome}"

    linha_cliente = f"______________________________________<br/><b>{nome_cliente}</b><br/>Cliente"

    tabela = Table(
        [
            [
                Paragraph(linha_oficina, estilos["AssinaturaTexto"]),
                Paragraph(linha_cliente, estilos["AssinaturaTexto"]),
            ]
        ],
        colWidths=[261, 262],
    )
    tabela.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    elementos.append(tabela)
    return elementos


def gerar_pdf_ordem_servico(os: OrdemServico, oficina: ConfiguracaoSistema) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=32,
        bottomMargin=32,
    )
    estilos = _criar_estilos()
    story = []

    # 1. Cabeçalho da Oficina
    story.append(_montar_cabecalho_oficina(oficina, os.data_criacao, estilos))
    story.append(Spacer(1, 8))

    # 2. Banner Título
    story.append(_montar_banner_titulo(f"Ordem de serviço {os.numero}", estilos))
    story.append(Spacer(1, 8))

    # 3. Cliente
    cliente_pessoa = os.cliente.pessoa
    telefone_cliente = None
    if cliente_pessoa.telefones:
        t = cliente_pessoa.telefones[0]
        telefone_cliente = f"({t.ddd}) {t.telefone}"
    cpf_cnpj_cliente = cliente_pessoa.cpf or cliente_pessoa.cnpj

    story.append(
        _montar_dados_cliente(
            nome_cliente=cliente_pessoa.nome,
            cpf_cnpj=cpf_cnpj_cliente,
            telefone=telefone_cliente,
            email=cliente_pessoa.email,
            estilos=estilos,
        )
    )
    story.append(Spacer(1, 10))

    # 4. Informações Básicas
    story.append(Paragraph("<b>Informações básicas</b>", estilos["SecaoTitulo"]))
    story.append(_divisor())

    v = os.veiculo
    if v.ano_fabricacao and v.ano_modelo:
        ano_formatado = f"{v.ano_fabricacao}/{v.ano_modelo}"
    else:
        ano_formatado = str(v.ano_modelo or v.ano_fabricacao or "-")
    status_rotulo = SITUACAO_AVALIACAO_LABELS.get(os.status_id, str(os.status_id))
    km_formatado = f"{os.km_entrada:,}".replace(",", ".") if os.km_entrada is not None else "-"

    itens_veiculo = [
        ("Marca", v.marca.nome),
        ("Modelo", v.modelo),
        ("Placa do veículo", v.placa),
        ("Ano", ano_formatado),
        ("KM de entrada", km_formatado),
        ("Status", status_rotulo),
    ]
    story.append(_montar_informacoes_basicas(itens_veiculo, estilos))
    story.append(Spacer(1, 10))

    # 5. Serviços e Peças
    story.append(Paragraph("<b>Serviços e Peças</b>", estilos["SecaoTitulo"]))
    story.append(_divisor())

    itens_tabela = []
    total_geral = 0
    for item_os in os.itens:
        subtotal_item = int(round(float(item_os.quantidade) * item_os.valor_unitario))
        total_geral += subtotal_item
        itens_tabela.append(
            {
                "descricao": item_os.item.nome,
                "tipo": TIPO_ITEM_LABELS.get(item_os.tipo_id, "-"),
                "valor_unitario": formatar_moeda(item_os.valor_unitario),
                "quantidade": formatar_quantidade(item_os.quantidade),
                "subtotal": formatar_moeda(subtotal_item),
            }
        )
    story.append(_montar_tabela_servicos(itens_tabela, total_geral, estilos))
    story.append(Spacer(1, 10))

    # 6. Informações Adicionais / Descrição
    if os.descricao and os.descricao.strip():
        story.append(Paragraph("<b>Informações adicionais</b>", estilos["SecaoTitulo"]))
        story.append(_divisor())
        story.append(Paragraph(os.descricao.replace("\n", "<br/>"), estilos["TextoNormal"]))
        story.append(Spacer(1, 14))

    # 7. Assinaturas (KeepTogether para nunca quebrar)
    cidade_oficina = (
        oficina.pessoa.endereco.cidade
        if oficina.pessoa.endereco and oficina.pessoa.endereco.cidade
        else "Feira de Santana"
    )
    story.append(
        KeepTogether(
            _montar_bloco_assinaturas(
                data_documento=os.data_criacao,
                cidade=cidade_oficina,
                oficina=oficina,
                nome_cliente=cliente_pessoa.nome,
                estilos=estilos,
            )
        )
    )

    doc.build(story, canvasmaker=NumeracaoPaginasCanvas)
    buffer.seek(0)
    return buffer.getvalue()


def gerar_pdf_orcamento(orcamento: Orcamento, oficina: ConfiguracaoSistema) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=32,
        bottomMargin=32,
    )
    estilos = _criar_estilos()
    story = []

    # 1. Cabeçalho da Oficina
    story.append(_montar_cabecalho_oficina(oficina, orcamento.data_emissao, estilos))
    story.append(Spacer(1, 8))

    # 2. Banner Título
    story.append(_montar_banner_titulo(f"Orçamento {orcamento.numero}", estilos))
    story.append(Spacer(1, 8))

    # 3. Cliente
    cliente_pessoa = orcamento.cliente.pessoa
    telefone_cliente = None
    if cliente_pessoa.telefones:
        t = cliente_pessoa.telefones[0]
        telefone_cliente = f"({t.ddd}) {t.telefone}"
    cpf_cnpj_cliente = cliente_pessoa.cpf or cliente_pessoa.cnpj

    story.append(
        _montar_dados_cliente(
            nome_cliente=cliente_pessoa.nome,
            cpf_cnpj=cpf_cnpj_cliente,
            telefone=telefone_cliente,
            email=cliente_pessoa.email,
            estilos=estilos,
        )
    )
    story.append(Spacer(1, 10))

    # 4. Informações Básicas
    story.append(Paragraph("<b>Informações básicas</b>", estilos["SecaoTitulo"]))
    story.append(_divisor())

    v = orcamento.veiculo
    if v.ano_fabricacao and v.ano_modelo:
        ano_formatado = f"{v.ano_fabricacao}/{v.ano_modelo}"
    else:
        ano_formatado = str(v.ano_modelo or v.ano_fabricacao or "-")
    status_rotulo = SITUACAO_AVALIACAO_LABELS.get(orcamento.status_id, str(orcamento.status_id))

    data_vencimento = (
        orcamento.data_emissao + timedelta(days=orcamento.validade_dias)
        if orcamento.validade_dias is not None
        else None
    )
    validade_rotulo = f"{orcamento.validade_dias} dias" if orcamento.validade_dias else "-"

    itens_orc = [
        ("Marca", v.marca.nome),
        ("Modelo", v.modelo),
        ("Placa do veículo", v.placa),
        ("Ano", ano_formatado),
        ("Emissão", formatar_data(orcamento.data_emissao)),
        ("Validade", validade_rotulo),
        ("Vencimento", formatar_data(data_vencimento)),
        ("Status", status_rotulo),
    ]
    story.append(_montar_informacoes_basicas(itens_orc, estilos))
    story.append(Spacer(1, 10))

    # 5. Serviços e Peças
    story.append(Paragraph("<b>Serviços e Peças</b>", estilos["SecaoTitulo"]))
    story.append(_divisor())

    itens_tabela = []
    total_geral = 0
    for item_orc in orcamento.itens:
        subtotal_item = int(round(float(item_orc.quantidade) * item_orc.valor_unitario))
        total_geral += subtotal_item
        itens_tabela.append(
            {
                "descricao": item_orc.item.nome,
                "tipo": TIPO_ITEM_LABELS.get(item_orc.tipo_id, "-"),
                "valor_unitario": formatar_moeda(item_orc.valor_unitario),
                "quantidade": formatar_quantidade(item_orc.quantidade),
                "subtotal": formatar_moeda(subtotal_item),
            }
        )
    story.append(_montar_tabela_servicos(itens_tabela, total_geral, estilos))
    story.append(Spacer(1, 10))

    # 6. Informações Adicionais / Descrição
    if orcamento.descricao and orcamento.descricao.strip():
        story.append(Paragraph("<b>Informações adicionais</b>", estilos["SecaoTitulo"]))
        story.append(_divisor())
        story.append(Paragraph(orcamento.descricao.replace("\n", "<br/>"), estilos["TextoNormal"]))
        story.append(Spacer(1, 14))

    # 7. Assinaturas
    cidade_oficina = (
        oficina.pessoa.endereco.cidade
        if oficina.pessoa.endereco and oficina.pessoa.endereco.cidade
        else "Feira de Santana"
    )
    story.append(
        KeepTogether(
            _montar_bloco_assinaturas(
                data_documento=orcamento.data_emissao,
                cidade=cidade_oficina,
                oficina=oficina,
                nome_cliente=cliente_pessoa.nome,
                estilos=estilos,
            )
        )
    )

    doc.build(story, canvasmaker=NumeracaoPaginasCanvas)
    buffer.seek(0)
    return buffer.getvalue()
