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
