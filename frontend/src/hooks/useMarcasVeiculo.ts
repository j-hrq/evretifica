import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { PaginacaoOutput } from "@/hooks/useClientes"
import { apiFetch } from "@/lib/api"

export interface MarcaVeiculo {
  id: number
  nome: string
  ativo: boolean
  data_criacao: string
  data_alteracao: string
}

export interface MarcaVeiculoPayload {
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

export function useMarcasVeiculo(params: {
  q?: string
  ativo?: boolean
  page?: number
  per_page?: number
}) {
  const { q = "", ativo, page = 1, per_page = 10 } = params

  return useQuery<PaginacaoOutput<MarcaVeiculo>>({
    queryKey: ["marcas-veiculo", { q, ativo, page, per_page }],
    queryFn: async () => {
      const search = new URLSearchParams()
      if (q.trim()) search.set("q", q.trim())
      if (ativo !== undefined) search.set("ativo", String(ativo))
      search.set("page", String(page))
      search.set("per_page", String(per_page))

      const res = await apiFetch(`/api/marcas-veiculo?${search.toString()}`)
      if (!res.ok) {
        throw new Error(
          await extrairErro(res, "Erro ao carregar marcas de veículo."),
        )
      }
      return (await res.json()) as PaginacaoOutput<MarcaVeiculo>
    },
  })
}

export function useCriarMarcaVeiculo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: MarcaVeiculoPayload) => {
      const res = await apiFetch("/api/marcas-veiculo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        throw new Error(
          await extrairErro(res, "Erro ao criar marca de veículo."),
        )
      }
      return (await res.json()) as MarcaVeiculo
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["marcas-veiculo"] })
    },
  })
}

export function useAtualizarMarcaVeiculo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number
      payload: MarcaVeiculoPayload
    }) => {
      const res = await apiFetch(`/api/marcas-veiculo/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        throw new Error(
          await extrairErro(res, "Erro ao atualizar marca de veículo."),
        )
      }
      return (await res.json()) as MarcaVeiculo
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["marcas-veiculo"] })
    },
  })
}

export function useExcluirMarcaVeiculo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/marcas-veiculo/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        throw new Error(
          await extrairErro(res, "Erro ao excluir marca de veículo."),
        )
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["marcas-veiculo"] })
    },
  })
}
