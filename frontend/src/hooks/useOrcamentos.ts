import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Cliente, PaginacaoOutput } from "@/hooks/useClientes"
import type { Item } from "@/hooks/useItens"
import type { Veiculo } from "@/hooks/useVeiculos"
import { apiFetch } from "@/lib/api"

export interface ItemOrcamento {
  id: number
  orcamento_id: number
  item_id: number
  tipo_id: number
  valor_unitario: number
  quantidade: string
  total: number
  item: Item
  data_criacao: string
  data_alteracao: string
}

export interface Orcamento {
  id: number
  numero: string
  cliente_id: number
  veiculo_id: number
  status_id: number
  data_emissao: string
  validade_dias: number | null
  data_vencimento: string | null
  descricao: string | null
  total: number
  cliente: Cliente
  veiculo: Veiculo
  itens: ItemOrcamento[]
  data_criacao: string
  data_alteracao: string
}

export interface ItemOrcamentoPayload {
  item_id: number
  tipo_id: number
  quantidade: string
  valor_unitario: number
}

export interface OrcamentoPayload {
  veiculo_id: number
  status_id: number
  data_emissao: string
  validade_dias: number | null
  descricao: string | null
  itens: ItemOrcamentoPayload[]
}

async function extrairErro(res: Response, padrao: string): Promise<string> {
  try {
    const corpo = (await res.json()) as { detail?: string }
    if (typeof corpo.detail === "string") {
      return corpo.detail
    }
  } catch {
    // mantém mensagem padrão
  }
  return padrao
}

export function useOrcamentos(params: {
  q?: string
  status_id?: number
  page?: number
  per_page?: number
}) {
  const { q = "", status_id, page = 1, per_page = 10 } = params

  return useQuery<PaginacaoOutput<Orcamento>>({
    queryKey: ["orcamentos", { q, status_id, page, per_page }],
    queryFn: async () => {
      const search = new URLSearchParams()
      if (q.trim()) search.set("q", q.trim())
      if (status_id !== undefined) search.set("status_id", String(status_id))
      search.set("page", String(page))
      search.set("per_page", String(per_page))

      const res = await apiFetch(`/api/orcamentos?${search.toString()}`)
      if (!res.ok) {
        throw new Error(await extrairErro(res, "Erro ao carregar orçamentos."))
      }
      return (await res.json()) as PaginacaoOutput<Orcamento>
    },
  })
}

export function useCriarOrcamento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: OrcamentoPayload) => {
      const res = await apiFetch("/api/orcamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        throw new Error(await extrairErro(res, "Erro ao criar orçamento."))
      }
      return (await res.json()) as Orcamento
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["orcamentos"] })
    },
  })
}

export function useAtualizarOrcamento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number
      payload: OrcamentoPayload
    }) => {
      const res = await apiFetch(`/api/orcamentos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        throw new Error(await extrairErro(res, "Erro ao atualizar orçamento."))
      }
      return (await res.json()) as Orcamento
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["orcamentos"] })
    },
  })
}

export function useExcluirOrcamento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/orcamentos/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        throw new Error(await extrairErro(res, "Erro ao excluir orçamento."))
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["orcamentos"] })
    },
  })
}
