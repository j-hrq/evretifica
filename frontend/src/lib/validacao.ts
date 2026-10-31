import { z } from "zod"

export const TipoTelefone = {
  CELULAR: 1,
  FIXO: 2,
  WHATSAPP: 3,
  COMERCIAL: 4,
} as const

export type TipoTelefoneValor = (typeof TipoTelefone)[keyof typeof TipoTelefone]

export const TIPO_TELEFONE_LABELS: Record<number, string> = {
  [TipoTelefone.CELULAR]: "Celular",
  [TipoTelefone.FIXO]: "Fixo",
  [TipoTelefone.WHATSAPP]: "WhatsApp",
  [TipoTelefone.COMERCIAL]: "Comercial",
}

export function validarCpf(valor: string): boolean {
  const limpo = valor.replace(/[.\-\s]/g, "")
  if (!/^\d{11}$/.test(limpo)) {
    return false
  }
  if (new Set(limpo.split("")).size === 1) {
    return false
  }

  let soma1 = 0
  for (let i = 0; i < 9; i++) {
    soma1 += Number(limpo[i]) * (10 - i)
  }
  const resto1 = soma1 % 11
  const digito1 = resto1 < 2 ? 0 : 11 - resto1

  let soma2 = 0
  for (let i = 0; i < 10; i++) {
    soma2 += Number(limpo[i]) * (11 - i)
  }
  const resto2 = soma2 % 11
  const digito2 = resto2 < 2 ? 0 : 11 - resto2

  return Number(limpo[9]) === digito1 && Number(limpo[10]) === digito2
}

export function validarCnpj(valor: string): boolean {
  const limpo = valor.replace(/[.\-/\s]/g, "")
  if (!/^\d{14}$/.test(limpo)) {
    return false
  }
  if (new Set(limpo.split("")).size === 1) {
    return false
  }

  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  let soma1 = 0
  for (let i = 0; i < 12; i++) {
    soma1 += Number(limpo[i]) * pesos1[i]
  }
  const resto1 = soma1 % 11
  const digito1 = resto1 < 2 ? 0 : 11 - resto1

  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  let soma2 = 0
  for (let i = 0; i < 13; i++) {
    soma2 += Number(limpo[i]) * pesos2[i]
  }
  const resto2 = soma2 % 11
  const digito2 = resto2 < 2 ? 0 : 11 - resto2

  return Number(limpo[12]) === digito1 && Number(limpo[13]) === digito2
}

export const telefoneFormSchema = z.object({
  ddd: z
    .string()
    .trim()
    .regex(/^\d{2}$/, "DDD deve conter exatamente 2 dígitos."),
  telefone: z
    .string()
    .trim()
    .refine(
      (v) => /^\d{8,9}$/.test(v.replace(/[-\s]/g, "")),
      "Telefone deve conter 8 ou 9 dígitos.",
    ),
  tipo_id: z.coerce.number().int().min(1).max(4),
})

export const clienteFormSchema = z
  .object({
    nome: z.string().trim().min(1, "Nome é obrigatório."),
    email: z.string().trim().optional(),
    tipo_documento: z.enum(["cpf", "cnpj"]),
    documento: z.string().trim().min(1, "Documento é obrigatório."),
    ativo: z.boolean(),
    telefones: z.array(telefoneFormSchema),
  })
  .superRefine((dados, ctx) => {
    if (dados.tipo_documento === "cpf") {
      if (!validarCpf(dados.documento)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["documento"],
          message: "CPF inválido.",
        })
      }
    } else {
      if (!validarCnpj(dados.documento)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["documento"],
          message: "CNPJ inválido.",
        })
      }
    }
  })

export type ClienteFormValues = z.infer<typeof clienteFormSchema>

export const marcaVeiculoFormSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório."),
  ativo: z.boolean(),
})

export type MarcaVeiculoFormValues = z.infer<typeof marcaVeiculoFormSchema>

export function normalizarPlaca(valor: string): string {
  return valor.replace(/[\s-]/g, "").toUpperCase()
}

export function validarPlaca(valor: string): boolean {
  const limpa = valor.trim().toUpperCase()
  if ((limpa.match(/-/g) ?? []).length > 1) {
    return false
  }
  if (limpa.includes("-") && limpa[3] !== "-") {
    return false
  }
  const normalizada = normalizarPlaca(limpa)
  return /^[A-Z]{3}(?:\d{4}|\d[A-Z]\d{2})$/.test(normalizada)
}

function validarAnoOpcional(valor: string): boolean {
  const limpo = valor.trim()
  if (!limpo) return true
  if (!/^\d{4}$/.test(limpo)) return false
  const num = Number(limpo)
  return num >= 1000 && num <= 9999
}

function validarKmOpcional(valor: string): boolean {
  const limpo = valor.trim()
  if (!limpo) return true
  if (!/^\d+$/.test(limpo)) return false
  return Number(limpo) >= 0
}

export const veiculoFormSchema = z.object({
  cliente_id: z
    .number({ message: "Cliente é obrigatório." })
    .int()
    .min(1, "Cliente é obrigatório."),
  marca_id: z
    .number({ message: "Marca é obrigatória." })
    .int()
    .min(1, "Marca é obrigatória."),
  modelo: z.string().trim().min(1, "Modelo é obrigatório."),
  placa: z
    .string()
    .trim()
    .min(1, "Placa é obrigatória.")
    .refine(
      (v) => validarPlaca(v),
      "Placa inválida. Use o padrão AAA9999 ou AAA9A99.",
    ),
  ano_fabricacao: z
    .string()
    .refine(validarAnoOpcional, "Ano deve conter 4 dígitos."),
  ano_modelo: z
    .string()
    .refine(validarAnoOpcional, "Ano deve conter 4 dígitos."),
  cor: z.string(),
  km: z
    .string()
    .refine(validarKmOpcional, "Quilometragem deve ser um inteiro positivo."),
  observacao: z.string(),
})

export type VeiculoFormValues = z.infer<typeof veiculoFormSchema>

export const itemFormSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório."),
  ativo: z.boolean(),
})

export type ItemFormValues = z.infer<typeof itemFormSchema>

export const SituacaoAvaliacao = {
  PENDENTE: 1,
  EM_ANDAMENTO: 2,
  CONCLUIDO: 3,
  ACEITO: 4,
  RECUSADO: 5,
  CANCELADO: 6,
} as const

export type SituacaoAvaliacaoValor =
  (typeof SituacaoAvaliacao)[keyof typeof SituacaoAvaliacao]

export const SITUACAO_AVALIACAO_LABELS: Record<number, string> = {
  [SituacaoAvaliacao.PENDENTE]: "Pendente",
  [SituacaoAvaliacao.EM_ANDAMENTO]: "Em andamento",
  [SituacaoAvaliacao.CONCLUIDO]: "Concluído",
  [SituacaoAvaliacao.ACEITO]: "Aceito",
  [SituacaoAvaliacao.RECUSADO]: "Recusado",
  [SituacaoAvaliacao.CANCELADO]: "Cancelado",
}

export const TipoItem = {
  MAO_DE_OBRA: 1,
  AQUISICAO: 2,
  AMBOS: 3,
} as const

export type TipoItemValor = (typeof TipoItem)[keyof typeof TipoItem]

export const TIPO_ITEM_LABELS: Record<number, string> = {
  [TipoItem.MAO_DE_OBRA]: "Mão de obra",
  [TipoItem.AQUISICAO]: "Aquisição",
  [TipoItem.AMBOS]: "Ambos",
}

export function formatarMoedaCentavos(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}

export function formatarCentavosParaInput(centavos: number): string {
  const inteiro = Math.trunc(centavos / 100)
  const fracao = Math.abs(centavos % 100)
  return `${inteiro}.${String(fracao).padStart(2, "0")}`
}

export function converterReaisParaCentavos(valor: string): number | null {
  const limpo = valor.trim().replace(",", ".")
  if (!/^\d+(?:\.\d{1,2})?$/.test(limpo)) {
    return null
  }
  const [parteInteira, parteDecimal = ""] = limpo.split(".")
  const centavos =
    Number(parteInteira) * 100 + Number(parteDecimal.padEnd(2, "0"))
  return centavos >= 0 ? centavos : null
}

export function normalizarQuantidadeDecimal(valor: string): string | null {
  const limpo = valor.trim().replace(",", ".")
  if (!/^\d+(?:\.\d{1,2})?$/.test(limpo)) {
    return null
  }
  const [parteInteira, parteDecimal = ""] = limpo.split(".")
  const centesimos =
    Number(parteInteira) * 100 + Number(parteDecimal.padEnd(2, "0"))
  if (centesimos <= 0) {
    return null
  }
  return `${ Number(parteInteira)}.${parteDecimal.padEnd(2, "0")}`
}

export function calcularTotalLinhaCentavos(
  quantidadeStr: string,
  valorUnitarioStr: string,
): number {
  const qtdNormalizada = normalizarQuantidadeDecimal(quantidadeStr)
  const valorCentavos = converterReaisParaCentavos(valorUnitarioStr)
  if (!qtdNormalizada || valorCentavos === null) {
    return 0
  }
  const [parteInteira, parteDecimal = "00"] = qtdNormalizada.split(".")
  const qtdCentesimos = Number(parteInteira) * 100 + Number(parteDecimal)
  return Math.floor((qtdCentesimos * valorCentavos + 50) / 100)
}

export function calcularDataVencimento(
  dataEmissao: string,
  validadeDiasStr: string,
): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataEmissao.trim())) {
    return null
  }
  const diasLimpo = validadeDiasStr.trim()
  if (!/^\d+$/.test(diasLimpo)) {
    return null
  }
  const dias = Number(diasLimpo)
  if (dias < 1) {
    return null
  }
  const [ano, mes, dia] = dataEmissao.trim().split("-").map(Number)
  const dt = new Date(Date.UTC(ano, mes - 1, dia + dias))
  const a = dt.getUTCFullYear()
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0")
  const d = String(dt.getUTCDate()).padStart(2, "0")
  return `${a}-${m}-${d}`
}

export function formatarDataIsoParaBr(dataIso: string | null): string {
  if (!dataIso || !/^\d{4}-\d{2}-\d{2}$/.test(dataIso)) {
    return "-"
  }
  const [ano, mes, dia] = dataIso.split("-")
  return `${dia}/${mes}/${ano}`
}

function validarValidadeDiasOpcional(valor: string): boolean {
  const limpo = valor.trim()
  if (!limpo) return true
  if (!/^\d+$/.test(limpo)) return false
  return Number(limpo) >= 1
}

export const itemOrcamentoFormSchema = z.object({
  item_id: z
    .number({ message: "Item é obrigatório." })
    .int()
    .min(1, "Item é obrigatório."),
  tipo_id: z.number().int().min(1).max(3),
  quantidade: z
    .string()
    .trim()
    .refine(
      (v) => normalizarQuantidadeDecimal(v) !== null,
      "Quantidade deve ser maior que zero (até 2 casas).",
    ),
  valor_unitario: z
    .string()
    .trim()
    .refine(
      (v) => converterReaisParaCentavos(v) !== null,
      "Valor unitário inválido.",
    ),
})

export const orcamentoFormSchema = z.object({
  veiculo_id: z
    .number({ message: "Veículo é obrigatório." })
    .int()
    .min(1, "Veículo é obrigatório."),
  status_id: z.number().int().min(1).max(6),
  data_emissao: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data de emissão é obrigatória."),
  validade_dias: z
    .string()
    .refine(
      validarValidadeDiasOpcional,
      "Validade em dias deve ser um inteiro positivo.",
    ),
  descricao: z.string(),
  itens: z.array(itemOrcamentoFormSchema),
})

export type OrcamentoFormValues = z.infer<typeof orcamentoFormSchema>

export const ordemServicoFormSchema = z.object({
  veiculo_id: z
    .number({ message: "Veículo é obrigatório." })
    .int()
    .min(1, "Veículo é obrigatório."),
  km_entrada: z
    .string()
    .refine(validarKmOpcional, "Quilometragem deve ser um inteiro positivo."),
  status_id: z.number().int().min(1).max(6),
  descricao: z.string(),
  itens: z.array(itemOrcamentoFormSchema),
})

export type OrdemServicoFormValues = z.infer<typeof ordemServicoFormSchema>
