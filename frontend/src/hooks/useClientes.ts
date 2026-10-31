import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"

export interface Telefone {
  id: number
  ddd: string
  telefone: string
  tipo_id: number
  data_criacao: string
  data_alteracao: string
}

export interface Pessoa {
  id: number
  nome: string
  email: string | null
  cpf: string | null
  cnpj: string | null
  telefones: Telefone[]
  data_criacao: string
  data_alteracao: string
}

export interface Cliente {
  id: number
  pessoa_id: number
  ativo: boolean
  pessoa: Pessoa
  data_criacao: string
  data_alteracao: string
}

export interface PaginacaoOutput<T> {
  items: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface TelefonePayload {
  ddd: string
  telefone: string
  tipo_id: number
}

export interface ClientePayload {
  ativo: boolean
  pessoa: {
    nome: string
    email: string | null
    cpf: string | null
    cnpj: string | null
    telefones: TelefonePayload[]
  }
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

export function useClientes(params: {
  q?: string
  ativo?: boolean
  page?: number
  per_page?: number
}) {
  const { q = "", ativo, page = 1, per_page = 10 } = params

  return useQuery<PaginacaoOutput<Cliente>>({
    queryKey: ["clientes", { q, ativo, page, per_page }],
    queryFn: async () => {
      const search = new URLSearchParams()
      if (q.trim()) search.set("q", q.trim())
      if (ativo !== undefined) search.set("ativo", String(ativo))
      search.set("page", String(page))
      search.set("per_page", String(per_page))

      const res = await apiFetch(`/api/clientes?${search.toString()}`)
      if (!res.ok) {
        throw new Error(await extrairErro(res, "Erro ao carregar clientes."))
      }
      return (await res.json()) as PaginacaoOutput<Cliente>
    },
  })
}

export function useCriarCliente() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: ClientePayload) => {
      const res = await apiFetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        throw new Error(await extrairErro(res, "Erro ao criar cliente."))
      }
      return (await res.json()) as Cliente
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["clientes"] })
    },
  })
}

export function useAtualizarCliente() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number
      payload: ClientePayload
    }) => {
      const res = await apiFetch(`/api/clientes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        throw new Error(await extrairErro(res, "Erro ao atualizar cliente."))
      }
      return (await res.json()) as Cliente
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["clientes"] })
    },
  })
}

export function useExcluirCliente() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/clientes/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        throw new Error(await extrairErro(res, "Erro ao excluir cliente."))
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["clientes"] })
    },
  })
}
