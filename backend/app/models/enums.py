from enum import IntEnum


class SituacaoAvaliacao(IntEnum):
    PENDENTE = 1
    EM_ANDAMENTO = 2
    CONCLUIDO = 3
    ACEITO = 4
    RECUSADO = 5
    CANCELADO = 6


class TipoItem(IntEnum):
    MAO_DE_OBRA = 1
    AQUISICAO = 2
    AMBOS = 3


class TipoTelefone(IntEnum):
    CELULAR = 1
    FIXO = 2
    WHATSAPP = 3
    COMERCIAL = 4
