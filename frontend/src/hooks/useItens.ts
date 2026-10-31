import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { PaginacaoOutput } from "@/hooks/useClientes"
import { apiFetch } from "@/lib/api"

export interface Item {
  id: number
  nome: string
  ativo: boolean
  data_criacao: string
  data_alteracao: string
}

export interface ItemPayload {
  nome: string
  ativo: boolean
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

export function useItens(params: {
  q?: string
  ativo?: boolean
  page?: number
  per_page?: number
}) {
  const { q = "", ativo, page = 1, per_page = 10 } = params

  return useQuery<PaginacaoOutput<Item>>({
    queryKey: ["itens", { q, ativo, page, per_page }],
    queryFn: async () => {
      const search = new URLSearchParams()
      if (q.trim()) search.set("q", q.trim())
      if (ativo !== undefined) search.set("ativo", String(ativo))
      search.set("page", String(page))
      search.set("per_page", String(per_page))

      const res = await apiFetch(`/api/itens?${search.toString()}`)
      if (!res.ok) {
        throw new Error(await extrairErro(res, "Erro ao carregar itens."))
      }
      return (await res.json()) as PaginacaoOutput<Item>
    },
  })
}

export function useCriarItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: ItemPayload) => {
      const res = await apiFetch("/api/itens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        throw new Error(await extrairErro(res, "Erro ao criar item."))
      }
      return (await res.json()) as Item
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["itens"] })
    },
  })
}

export function useAtualizarItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number
      payload: ItemPayload
    }) => {
      const res = await apiFetch(`/api/itens/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        throw new Error(await extrairErro(res, "Erro ao atualizar item."))
      }
      return (await res.json()) as Item
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["itens"] })
    },
  })
}

export function useExcluirItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/itens/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        throw new Error(await extrairErro(res, "Erro ao excluir item."))
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["itens"] })
    },
  })
}
