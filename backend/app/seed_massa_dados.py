import random
from datetime import UTC, date, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models.cliente import Cliente
from app.models.enums import SituacaoAvaliacao, TipoItem, TipoTelefone
from app.models.item import Item
from app.models.marca_veiculo import MarcaVeiculo
from app.models.orcamento import ItemOrcamento, Orcamento
from app.models.ordem_servico import ItemOrdemServico, OrdemServico
from app.models.veiculo import Veiculo
from app.schemas.pessoa import PessoaInput, TelefoneInput
from app.services.numeracao import gerar_proximo_numero
from app.services.pessoa import criar_pessoa

MARCAS_LISTA: tuple[str, ...] = (
    "Acura",
    "Agrale",
    "Alfa Romeo",
    "Aston Martin",
    "Audi",
    "Bentley",
    "BMW",
    "BMW Motorrad",
    "Bugatti",
    "Buick",
    "Busscar",
    "BYD",
    "Cadillac",
    "Caio",
    "Caoa Chery",
    "Chamonix",
    "Changan",
    "Chevrolet",
    "Chrysler",
    "Citroën",
    "Comil",
    "DAF",
    "Dafra",
    "Dodge",
    "Dongfeng",
    "Ducati",
    "Ferrari",
    "Fiat",
    "Ford",
    "Foton",
    "Genesis",
    "GMC",
    "Great Wall",
    "Gurgel",
    "Harley-Davidson",
    "Haval",
    "Honda",
    "Honda Motos",
    "Hyundai",
    "Infiniti",
    "Iveco",
    "JAC Motors",
    "Jaguar",
    "Jeep",
    "Kawasaki",
    "Kia",
    "Koenigsegg",
    "KTM",
    "Lamborghini",
    "Land Rover",
    "Lexus",
    "Lifan",
    "Lincoln",
    "Lobini",
    "Lotus",
    "Lucid",
    "MAN",
    "Marcopolo",
    "Maserati",
    "Mazda",
    "McLaren",
    "Mercedes-Benz",
    "Mercedes-Benz Caminhões",
    "Mini",
    "Mitsubishi",
    "Miura",
    "Moto Guzzi",
    "MV Agusta",
    "Nissan",
    "Peugeot",
    "Piaggio",
    "Polestar",
    "Porsche",
    "Puma",
    "Ram",
    "Renault",
    "Rivian",
    "Rolls-Royce",
    "Royal Enfield",
    "Saab",
    "Scania",
    "Seat",
    "Shineray",
    "Sinotruk",
    "Smart",
    "SsangYong",
    "Subaru",
    "Suzuki",
    "Suzuki Motos",
    "TAC Motors",
    "Tesla",
    "Toyota",
    "Triumph",
    "Troller",
    "Vespa",
    "Volkswagen",
    "Volkswagen Caminhões",
    "Volvo",
    "Volvo Caminhões",
    "Yamaha",
)

NOMES_PESSOAS: tuple[str, ...] = (
    "Lucas Silva",
    "Gabriel Santos",
    "Matheus Oliveira",
    "Leonardo Souza",
    "Guilherme Rodrigues",
    "Rodrigo Ferreira",
    "Rafael Alves",
    "Bruno Pereira",
    "Felipe Lima",
    "Thiago Gomes",
    "Vinícius Costa",
    "Gustavo Ribeiro",
    "Daniel Martins",
    "Eduardo Carvalho",
    "Henrique Almeida",
    "Marcelo Lopes",
    "Fernando Soares",
    "André Fernandes",
    "Caio Vieira",
    "Diego Barbosa",
    "Fábio Rocha",
    "Renan Dias",
    "Danilo Nascimento",
    "Samuel Andrade",
    "Vitor Moreira",
    "Bernardo Nunes",
    "Arthur Marques",
    "Davi Machado",
    "Pedro Mendes",
    "Ana Silva",
    "Maria Santos",
    "Juliana Oliveira",
    "Camila Souza",
    "Larissa Rodrigues",
    "Beatriz Ferreira",
    "Fernanda Alves",
    "Amanda Pereira",
    "Mariana Lima",
    "Letícia Gomes",
    "Aline Costa",
    "Jéssica Ribeiro",
    "Carolina Martins",
    "Vanessa Carvalho",
    "Bruna Almeida",
    "Gabriela Lopes",
    "Priscila Soares",
    "Natália Fernandes",
    "Thais Vieira",
    "Luana Barbosa",
    "Isabela Rocha",
    "Laura Dias",
    "Sophia Nascimento",
    "Manuela Andrade",
    "Heloísa Moreira",
    "Bianca Nunes",
    "Eduarda Marques",
    "Giovanna Machado",
    "Renata Mendes",
    "Patrícia Freitas",
    "Cláudio Ramos",
    "Rogério Cardoso",
    "César Teixeira",
    "Wagner Guimarães",
    "Alexandre Barros",
    "Otávio Moura",
    "Murilo Cavalcanti",
    "Hugo Dias",
    "Enzo Castro",
    "Icaro Nogueira",
    "Tatiane Farias",
    "Mônica Pires",
    "Sabrina Campos",
    "Rebeca Viana",
    "Luciana Borges",
    "Helena Ramos",
    "Clara Antunes",
    "Lorena Miranda",
    "Alice Peixoto",
    "Milena Dantas",
    "Renato Silveira",
    "Maurício Correia",
    "Danielle Aguiar",
    "Monique Siqueira",
    "Valéria Prado",
    "Roberta Assis",
    "Carla Brandão",
    "Viviane Teles",
    "Suelen Franco",
    "Flávia Meireles",
    "Gisele Portela",
    "Douglas Couto",
    "Everton Gusmão",
    "Cristiano Chaves",
    "Wesley Pacheco",
    "Jonas Brito",
    "Sandro Muniz",
    "Edson Lacerda",
    "Leandro Fagundes",
    "Gilberto Resende",
    "Moacir Queiroz",
)

EMPRESAS_CLIENTES: tuple[str, ...] = (
    "Transportes Rápidos Ltda",
    "Auto Peças Progresso ME",
    "Logística Transbrasil S/A",
    "Comercial Alvorada Eireli",
    "Mecânica Estrela do Sul",
    "Frotas Unidas Logística",
    "Distribuidora Central de Cargas",
    "Locadora Horizonte Veículos",
    "Express Entregas Rápidas",
    "Soluções Automotivas do Brasil",
)

MODELOS_VEICULOS: tuple[tuple[str, str], ...] = (
    ("Volkswagen", "Gol 1.6 MSI"),
    ("Volkswagen", "Polo Comfortline 200 TSI"),
    ("Volkswagen", "T-Cross Highline"),
    ("Volkswagen", "Nivus Comfortline"),
    ("Volkswagen", "Saveiro Cross 1.6"),
    ("Volkswagen", "Amarok V6 Extreme"),
    ("Chevrolet", "Onix Plus Premier"),
    ("Chevrolet", "Tracker Premier 1.2 Turbo"),
    ("Chevrolet", "S10 High Country 2.8 Diesel"),
    ("Chevrolet", "Spin Premier 1.8"),
    ("Chevrolet", "Cruze Sedan LTZ"),
    ("Chevrolet", "Montana Premier 1.2 Turbo"),
    ("Fiat", "Strada Freedom 1.3"),
    ("Fiat", "Toro Volcano 2.0 Diesel"),
    ("Fiat", "Mobi Like 1.0"),
    ("Fiat", "Argo Trekking 1.3"),
    ("Fiat", "Pulse Audace Turbo 200"),
    ("Fiat", "Fastback Impetus Turbo"),
    ("Toyota", "Corolla XEi 2.0"),
    ("Toyota", "Corolla Cross XRX Hybrid"),
    ("Toyota", "Hilux SRX 2.8 Diesel"),
    ("Toyota", "Yaris Hatch XLS"),
    ("Toyota", "SW4 Diamond 4x4"),
    ("Honda", "Civic Touring 1.5 Turbo"),
    ("Honda", "HR-V Advance Turbo"),
    ("Honda", "City Sedan Touring"),
    ("Honda", "WR-V EXL 1.5"),
    ("Hyundai", "HB20 Platinum Plus 1.0 Turbo"),
    ("Hyundai", "Creta Ultimate 2.0"),
    ("Hyundai", "Tucson GLS 1.6 Turbo"),
    ("Jeep", "Compass Longitude T270"),
    ("Jeep", "Renegade Sport T270"),
    ("Jeep", "Commander Overland Diesel"),
    ("Renault", "Duster Iconic 1.3 Turbo"),
    ("Renault", "Kwid Outsider 1.0"),
    ("Renault", "Oroch Outsider 1.3 Turbo"),
    ("Nissan", "Kicks Advance 1.6"),
    ("Nissan", "Frontier Pro-4X 2.3 Diesel"),
    ("Nissan", "Versa Exclusive 1.6"),
    ("Ford", "Ranger Limited V6 Diesel"),
    ("Ford", "Maverick Lariat FX4"),
    ("Ford", "Territory Titanium"),
    ("Peugeot", "208 Griffe 1.0 Turbo"),
    ("Peugeot", "2008 Griffe 1.6 THP"),
    ("Citroën", "C3 Feel 1.0"),
    ("Citroën", "C4 Cactus Shine 1.6 THP"),
    ("Mitsubishi", "L200 Triton Sport HPE-S"),
    ("Mitsubishi", "Eclipse Cross HPE-S"),
    ("BMW", "320i M Sport"),
    ("BMW", "X1 sDrive20i M Sport"),
    ("Mercedes-Benz", "C 200 AMG Line"),
    ("Mercedes-Benz", "GLA 200 Progressive"),
    ("Audi", "A3 Sedan Performance"),
    ("Audi", "Q3 Prestige Plus"),
    ("Volvo", "XC60 Recharge Ultimate"),
    ("Volvo", "XC40 Recharge Pure Electric"),
    ("BYD", "Song Plus DM-i"),
    ("BYD", "Dolphin EV Plus"),
    ("Haval", "H6 HEV Premium"),
)

CORES_VEICULOS: tuple[str, ...] = (
    "Branco",
    "Preto",
    "Prata",
    "Cinza",
    "Vermelho",
    "Azul",
    "Verde",
    "Bordô",
    "Bege",
    "Marrom",
)

ITENS_LISTA: tuple[str, ...] = (
    "Retífica completa de cabeçote",
    "Plainamento de superfície de cabeçote",
    "Brunimento de camisas de cilindro",
    "Mandrilhamento de mancais de bloco",
    "Retífica de virabrequim (munhões e moentes)",
    "Teste de trinca por partículas magnéticas (magnaflux)",
    "Banho químico e descarbonização ultra-sônica",
    "Troca e alargamento de guias de válvulas",
    "Retífica e assentamento de sedes de válvulas",
    "Regulagem de pastilhas e tuchos mecânicos",
    "Substituição de retentores de haste de válvulas",
    "Balanceamento dinâmico de conjunto virabrequim",
    "Teste hidrostático de pressão e estanqueidade",
    "Recuperação de rosca de vela / bloco (helicoil)",
    "Solda TIG em alumínio de cabeçote danificado",
    "Alinhamento e conferência de bielas",
    "Mandrilhamento de buchas de biela",
    "Encamisamento de bloco de motor",
    "Faceamento de topo de bloco de motor",
    "Usinagem de alojamento de retentor",
    "Alívio e polimento de virabrequim",
    "Limpeza e jateamento com microesferas de vidro",
    "Montagem parcial de motor (bloco fechado)",
    "Montagem completa de motor e sincronismo",
    "Diagnóstico e escaneamento eletrônico de injeção",
    "Teste de vazão de cilindros e compressão",
    "Teste e limpeza de bicos injetores por ultrassom",
    "Substituição de correia dentada e tensores",
    "Troca de óleo de motor e filtros",
    "Sangria e troca de fluido de arrefecimento",
    "Troca de junta de cabeçote",
    "Substituição de bomba d'água",
    "Substituição de bomba de óleo",
    "Revisão de sistema de arrefecimento",
    "Regulagem de folga de válvulas de admissão e escape",
    "Desmontagem e peritagem técnica de motor",
    "Lavagem de peças e componentes internos",
    "Substituição de retentores dianteiro e traseiro",
    "Troca de jogo de velas e cabos de ignição",
    "Equalização de peso de pistões e bielas",
    "Jogo de pistões e anéis (STD)",
    "Jogo de pistões e anéis (0.50mm)",
    "Jogo de pistões e anéis (1.00mm)",
    "Bronzinas de biela (STD)",
    "Bronzinas de biela (0.25mm)",
    "Bronzinas de biela (0.50mm)",
    "Bronzinas de mancal (STD)",
    "Bronzinas de mancal (0.25mm)",
    "Bronzinas de mancal (0.50mm)",
    "Bronzinas de comando de válvulas",
    "Arruelas de encosto axial do virabrequim",
    "Válvula de admissão padrão",
    "Válvula de escape padrão",
    "Válvula de admissão sobremedida",
    "Válvula de escape sobremedida",
    "Jogo de guias de válvulas em bronze",
    "Jogo de sedes de válvulas temperadas",
    "Retentores de válvulas em Viton",
    "Bomba de óleo de alto fluxo",
    "Bomba d'água reforçada",
    "Válvula termostática com carcaça",
    "Kit correia dentada e tensor",
    "Kit corrente de comando e guias",
    "Jogo de juntas completo do motor com retentores",
    "Junta de cabeçote de aço multilâminas (MLS)",
    "Junta da tampa de válvulas em silicone",
    "Junta do cárter de óleo",
    "Retentor dianteiro do virabrequim",
    "Retentor traseiro do volante do motor",
    "Retentor do eixo comando de válvulas",
    "Jogo de parafusos de cabeçote (torque angular)",
    "Jogo de velas de ignição Iridium",
    "Jogo de cabos de vela de silicone",
    "Bobina de ignição individual",
    "Sensor de fase do comando",
    "Sensor de rotação e PMS",
    "Sensor de temperatura do arrefecimento",
    "Sensor de pressão de óleo",
    "Tucho hidráulico de válvulas",
    "Balancim roletado do comando",
    "Eixo de comando de válvulas",
    "Polia regulável de comando",
    "Engrenagem motora do virabrequim",
    "Volante de motor bimassa",
    "Kit embreagem (platô, disco e rolamento)",
    "Filtro de óleo lubrificante",
    "Filtro de ar de alta eficiência",
    "Filtro de combustível injetado",
    "Óleo de motor 5W30 100% sintético (litro)",
    "Óleo de motor 0W20 100% sintético (litro)",
    "Óleo de motor 10W40 semi-sintético (litro)",
    "Aditivo de radiador concentrado orgânico",
    "Tampa do reservatório de expansão",
    "Mangueira superior do radiador",
    "Mangueira inferior do radiador",
    "Reservatório de expansão de arrefecimento",
    "Bujão de cárter com anel magnético",
    "Silicone vedante de alta temperatura",
    "Trava química de roscas de alto torque",
    "Spray descarbonizante de corpo de borboleta",
)


def _gerar_cpf_valido(semente: int) -> str:
    corpo = f"{semente:09d}"
    s1 = sum(int(corpo[i]) * (10 - i) for i in range(9))
    r1 = s1 % 11
    d1 = 0 if r1 < 2 else 11 - r1
    s2 = sum(int(corpo[i]) * (11 - i) for i in range(9)) + d1 * 2
    r2 = s2 % 11
    d2 = 0 if r2 < 2 else 11 - r2
    return f"{corpo}{d1}{d2}"


def _gerar_cnpj_valido(semente: int) -> str:
    corpo = f"{semente:08d}0001"
    p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    s1 = sum(int(corpo[i]) * p1[i] for i in range(12))
    r1 = s1 % 11
    d1 = 0 if r1 < 2 else 11 - r1
    p2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    s2 = sum(int(corpo[i]) * p2[i] for i in range(12)) + d1 * 2
    r2 = s2 % 11
    d2 = 0 if r2 < 2 else 11 - r2
    return f"{corpo}{d1}{d2}"


def executar_seed_massa_dados(db: Session, *, quantidade_alvo: int = 100) -> dict[str, int]:
    random.seed(42)

    # 1. Marcas de Veículo
    existentes_marcas = {m.lower(): m for m in db.scalars(select(MarcaVeiculo.nome)).all()}
    marcas_adicionadas = 0
    for nome_marca in MARCAS_LISTA:
        if len(existentes_marcas) >= quantidade_alvo:
            break
        if nome_marca.lower() not in existentes_marcas:
            nova_marca = MarcaVeiculo(nome=nome_marca, ativo=True)
            db.add(nova_marca)
            existentes_marcas[nome_marca.lower()] = nome_marca
            marcas_adicionadas += 1

    if marcas_adicionadas > 0:
        db.commit()

    todas_marcas = list(db.scalars(select(MarcaVeiculo).order_by(MarcaVeiculo.id)).all())

    # 2. Clientes
    clientes_atuais = db.scalar(select(func.count(Cliente.id))) or 0
    clientes_para_criar = max(0, quantidade_alvo - clientes_atuais)

    for i in range(clientes_para_criar):
        idx = clientes_atuais + i + 1
        ddd = random.choice(["11", "19", "21", "31", "41", "47", "51", "61", "71"])
        num_tel = f"9{random.randint(1000, 9999)}{random.randint(1000, 9999)}"
        telefones = [TelefoneInput(ddd=ddd, telefone=num_tel, tipo_id=TipoTelefone.CELULAR)]

        if idx % 10 == 0:
            nome = EMPRESAS_CLIENTES[(idx // 10 - 1) % len(EMPRESAS_CLIENTES)]
            cnpj = _gerar_cnpj_valido(30000000 + idx * 7)
            email = f"contato{idx}@empresa.com.br"
            dados_pessoa = PessoaInput(nome=nome, cnpj=cnpj, email=email, telefones=telefones)
        else:
            nome = NOMES_PESSOAS[(idx - 1) % len(NOMES_PESSOAS)]
            cpf = _gerar_cpf_valido(100000000 + idx * 13)
            email = f"cliente{idx}@exemplo.com.br"
            dados_pessoa = PessoaInput(nome=nome, cpf=cpf, email=email, telefones=telefones)

        pessoa = criar_pessoa(db, dados_pessoa, commit=False)
        cliente = Cliente(pessoa_id=pessoa.id, ativo=(idx % 15 != 0))
        db.add(cliente)

    if clientes_para_criar > 0:
        db.commit()

    todos_clientes = list(db.scalars(select(Cliente).order_by(Cliente.id)).all())

    # 3. Veículos
    veiculos_atuais = db.scalar(select(func.count(Veiculo.id))) or 0
    veiculos_para_criar = max(0, quantidade_alvo - veiculos_atuais)

    marca_por_nome = {m.nome.lower(): m for m in todas_marcas}

    for i in range(veiculos_para_criar):
        idx = veiculos_atuais + i + 1
        marca_nome_pref, modelo_nome = MODELOS_VEICULOS[(idx - 1) % len(MODELOS_VEICULOS)]
        marca_escolhida = marca_por_nome.get(
            marca_nome_pref.lower(), todas_marcas[idx % len(todas_marcas)]
        )
        cliente_escolhido = todos_clientes[(idx - 1) % len(todos_clientes)]

        letra_meio = chr(65 + (idx % 26))
        placa = f"EVR{idx % 10}{letra_meio}{(idx // 10) % 100:02d}"

        ano_fab = 2017 + (idx % 8)
        ano_mod = ano_fab if (idx % 3 != 0) else ano_fab + 1
        km = 18000 + (idx * 1350) % 150000
        cor = CORES_VEICULOS[idx % len(CORES_VEICULOS)]

        veiculo = Veiculo(
            cliente_id=cliente_escolhido.id,
            marca_id=marca_escolhida.id,
            modelo=modelo_nome,
            placa=placa,
            ano_fabricacao=ano_fab,
            ano_modelo=ano_mod,
            cor=cor,
            km=km,
            observacao=f"Veículo de teste #{idx}",
        )
        db.add(veiculo)

    if veiculos_para_criar > 0:
        db.commit()

    todos_veiculos = list(db.scalars(select(Veiculo).order_by(Veiculo.id)).all())

    # 4. Itens (Peças e Serviços)
    itens_atuais = db.scalar(select(func.count(Item.id))) or 0
    itens_para_criar = max(0, quantidade_alvo - itens_atuais)

    for i in range(itens_para_criar):
        idx = itens_atuais + i + 1
        nome_item = ITENS_LISTA[(idx - 1) % len(ITENS_LISTA)]
        item = Item(nome=nome_item, ativo=(idx % 20 != 0))
        db.add(item)

    if itens_para_criar > 0:
        db.commit()

    todos_itens = list(db.scalars(select(Item).order_by(Item.id)).all())

    # 5. Orçamentos
    orcamentos_atuais = db.scalar(select(func.count(Orcamento.id))) or 0
    orcamentos_para_criar = max(0, quantidade_alvo - orcamentos_atuais)

    status_orcamentos_dist = [
        SituacaoAvaliacao.PENDENTE,
        SituacaoAvaliacao.EM_ANDAMENTO,
        SituacaoAvaliacao.CONCLUIDO,
        SituacaoAvaliacao.ACEITO,
        SituacaoAvaliacao.RECUSADO,
        SituacaoAvaliacao.CANCELADO,
    ]

    for i in range(orcamentos_para_criar):
        idx = orcamentos_atuais + i + 1
        veiculo_escolhido = todos_veiculos[(idx - 1) % len(todos_veiculos)]
        status = status_orcamentos_dist[idx % len(status_orcamentos_dist)]
        numero = gerar_proximo_numero(db, "ORC", 2026)

        dia = 1 + (idx % 28)
        mes = 1 + (idx % 10)
        data_emissao = date(2026, mes, dia)
        validade = random.choice([7, 10, 15, 30])

        orcamento = Orcamento(
            numero=numero,
            cliente_id=veiculo_escolhido.cliente_id,
            veiculo_id=veiculo_escolhido.id,
            status_id=int(status),
            data_emissao=data_emissao,
            validade_dias=validade,
            descricao=f"Orçamento para manutenção preventiva/corretiva #{idx}",
        )

        qtd_linhas = 1 + (idx % 4)
        for linha_idx in range(qtd_linhas):
            item_escolhido = todos_itens[(idx * 3 + linha_idx) % len(todos_itens)]
            tipo = TipoItem.MAO_DE_OBRA if linha_idx % 2 == 0 else TipoItem.AQUISICAO
            valor = 15000 + (idx * 2500 + linha_idx * 1500) % 95000
            quantidade = f"{(1 + (linha_idx % 3)):.2f}"
            orcamento.itens.append(
                ItemOrcamento(
                    item_id=item_escolhido.id,
                    tipo_id=int(tipo),
                    valor_unitario=valor,
                    quantidade=quantidade,
                )
            )

        db.add(orcamento)

    if orcamentos_para_criar > 0:
        db.commit()

    # 6. Ordens de Serviço
    ordens_atuais = db.scalar(select(func.count(OrdemServico.id))) or 0
    ordens_para_criar = max(0, quantidade_alvo - ordens_atuais)

    agora = datetime.now(UTC)

    for i in range(ordens_para_criar):
        idx = ordens_atuais + i + 1
        veiculo_escolhido = todos_veiculos[(idx * 2) % len(todos_veiculos)]
        status = status_orcamentos_dist[(idx + 1) % len(status_orcamentos_dist)]
        numero = gerar_proximo_numero(db, "OS", 2026)

        os_obj = OrdemServico(
            numero=numero,
            cliente_id=veiculo_escolhido.cliente_id,
            veiculo_id=veiculo_escolhido.id,
            km_entrada=veiculo_escolhido.km or (30000 + idx * 500),
            status_id=int(status),
            descricao=f"Execução de serviços e retífica de motor #{idx}",
            data_criacao=agora,
            data_alteracao=agora,
        )

        qtd_linhas = 1 + ((idx + 1) % 4)
        for linha_idx in range(qtd_linhas):
            item_escolhido = todos_itens[(idx * 5 + linha_idx) % len(todos_itens)]
            tipo = TipoItem.MAO_DE_OBRA if linha_idx % 2 == 0 else TipoItem.AQUISICAO
            valor = 20000 + (idx * 3200 + linha_idx * 2100) % 120000
            quantidade = f"{(1 + (linha_idx % 2)):.2f}"
            os_obj.itens.append(
                ItemOrdemServico(
                    item_id=item_escolhido.id,
                    tipo_id=int(tipo),
                    valor_unitario=valor,
                    quantidade=quantidade,
                )
            )

        db.add(os_obj)

    if ordens_para_criar > 0:
        db.commit()

    return {
        "marcas": db.scalar(select(func.count(MarcaVeiculo.id))) or 0,
        "clientes": db.scalar(select(func.count(Cliente.id))) or 0,
        "veiculos": db.scalar(select(func.count(Veiculo.id))) or 0,
        "itens": db.scalar(select(func.count(Item.id))) or 0,
        "orcamentos": db.scalar(select(func.count(Orcamento.id))) or 0,
        "ordens_servico": db.scalar(select(func.count(OrdemServico.id))) or 0,
    }


def main() -> None:
    with SessionLocal() as db:
        totais = executar_seed_massa_dados(db, quantidade_alvo=100)
        print("Massa de dados gerada com sucesso:")
        for entidade, total in totais.items():
            print(f" - {entidade}: {total} registros")


if __name__ == "__main__":
    main()
