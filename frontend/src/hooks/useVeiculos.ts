import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Cliente, PaginacaoOutput } from "@/hooks/useClientes"
import type { MarcaVeiculo } from "@/hooks/useMarcasVeiculo"
import { apiFetch } from "@/lib/api"

export interface Veiculo {
  id: number
  cliente_id: number
  marca_id: number
  modelo: string
  placa: string
  ano_fabricacao: number | null
  ano_modelo: number | null
  cor: string | null
  km: number | null
  observacao: string | null
  cliente: Cliente
  marca: MarcaVeiculo
  data_criacao: string
  data_alteracao: string
}

export interface VeiculoPayload {
  cliente_id: number
  marca_id: number
  modelo: string
  placa: string
  ano_fabricacao: number | null
  ano_modelo: number | null
  cor: string | null
  km: number | null
  observacao: string | null
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

export function useVeiculos(params: {
  q?: string
  cliente_id?: number
  page?: number
  per_page?: number
}) {
  const { q = "", cliente_id, page = 1, per_page = 10 } = params

  return useQuery<PaginacaoOutput<Veiculo>>({
    queryKey: ["veiculos", { q, cliente_id, page, per_page }],
    queryFn: async () => {
      const search = new URLSearchParams()
      if (q.trim()) search.set("q", q.trim())
      if (cliente_id !== undefined) search.set("cliente_id", String(cliente_id))
      search.set("page", String(page))
      search.set("per_page", String(per_page))

      const res = await apiFetch(`/api/veiculos?${search.toString()}`)
      if (!res.ok) {
        throw new Error(await extrairErro(res, "Erro ao carregar veículos."))
      }
      return (await res.json()) as PaginacaoOutput<Veiculo>
    },
  })
}

export function useCriarVeiculo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: VeiculoPayload) => {
      const res = await apiFetch("/api/veiculos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        throw new Error(await extrairErro(res, "Erro ao criar veículo."))
      }
      return (await res.json()) as Veiculo
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["veiculos"] })
    },
  })
}

export function useAtualizarVeiculo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number
      payload: VeiculoPayload
    }) => {
      const res = await apiFetch(`/api/veiculos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        throw new Error(await extrairErro(res, "Erro ao atualizar veículo."))
      }
      return (await res.json()) as Veiculo
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["veiculos"] })
    },
  })
}

export function useExcluirVeiculo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/veiculos/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        throw new Error(await extrairErro(res, "Erro ao excluir veículo."))
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["veiculos"] })
    },
  })
}
