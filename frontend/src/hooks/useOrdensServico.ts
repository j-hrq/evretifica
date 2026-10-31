import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Cliente, PaginacaoOutput } from "@/hooks/useClientes"
import type { Item } from "@/hooks/useItens"
import type { ItemOrcamentoPayload } from "@/hooks/useOrcamentos"
import type { Veiculo } from "@/hooks/useVeiculos"
import { apiFetch, extrairErro } from "@/lib/api"

export interface ItemOrdemServico {
  id: number
  ordem_servico_id: number
  item_id: number
  tipo_id: number
  valor_unitario: number
  quantidade: string
  total: number
  item: Item
  data_criacao: string
  data_alteracao: string
}

export interface OrdemServico {
  id: number
  numero: string
  cliente_id: number
  veiculo_id: number
  km_entrada: number | null
  status_id: number
  descricao: string | null
  total: number
  cliente: Cliente
  veiculo: Veiculo
  itens: ItemOrdemServico[]
  data_criacao: string
  data_alteracao: string
}

export interface OrdemServicoPayload {
  veiculo_id: number
  km_entrada: number | null
  status_id: number
  descricao: string | null
  itens: ItemOrcamentoPayload[]
}

export function useOrdensServico(params: {
  q?: string
  status_id?: number
  page?: number
  per_page?: number
}) {
  const { q = "", status_id, page = 1, per_page = 10 } = params

  return useQuery<PaginacaoOutput<OrdemServico>>({
    queryKey: ["ordens-servico", { q, status_id, page, per_page }],
    queryFn: async () => {
      const search = new URLSearchParams()
      if (q.trim()) search.set("q", q.trim())
      if (status_id !== undefined) search.set("status_id", String(status_id))
      search.set("page", String(page))
      search.set("per_page", String(per_page))

      const res = await apiFetch(`/api/ordens-servico?${search.toString()}`)
      if (!res.ok) {
        throw new Error(
          await extrairErro(res, "Erro ao carregar ordens de serviço."),
        )
      }
      return (await res.json()) as PaginacaoOutput<OrdemServico>
    },
  })
}

export function useCriarOrdemServico() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: OrdemServicoPayload) => {
      const res = await apiFetch("/api/ordens-servico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        throw new Error(
          await extrairErro(res, "Erro ao criar ordem de serviço."),
        )
      }
      return (await res.json()) as OrdemServico
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["ordens-servico"] })
    },
  })
}

export function useAtualizarOrdemServico() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number
      payload: OrdemServicoPayload
    }) => {
      const res = await apiFetch(`/api/ordens-servico/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        throw new Error(
          await extrairErro(res, "Erro ao atualizar ordem de serviço."),
        )
      }
      return (await res.json()) as OrdemServico
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["ordens-servico"] })
    },
  })
}

export function useExcluirOrdemServico() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/ordens-servico/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        throw new Error(
          await extrairErro(res, "Erro ao excluir ordem de serviço."),
        )
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["ordens-servico"] })
    },
  })
}
