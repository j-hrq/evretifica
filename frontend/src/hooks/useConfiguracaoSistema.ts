import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch, extrairErro } from "@/lib/api"
import type {
  ConfiguracaoSistemaOutput,
  ConfiguracaoSistemaPayload,
} from "@/lib/validacao"

export function useConfiguracaoSistema() {
  return useQuery<ConfiguracaoSistemaOutput>({
    queryKey: ["configuracao-sistema"],
    queryFn: async () => {
      const response = await apiFetch("/api/configuracao-sistema")
      if (!response.ok) {
        throw new Error(
          await extrairErro(response, "Erro ao carregar dados da oficina."),
        )
      }
      return response.json()
    },
  })
}

export function useAtualizarConfiguracaoSistema() {
  const queryClient = useQueryClient()

  return useMutation<
    ConfiguracaoSistemaOutput,
    Error,
    ConfiguracaoSistemaPayload
  >({
    mutationFn: async (dados) => {
      const response = await apiFetch("/api/configuracao-sistema", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      })
      if (!response.ok) {
        throw new Error(
          await extrairErro(response, "Erro ao carregar dados da oficina."),
        )
      }
      return response.json()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["configuracao-sistema"] })
    },
  })
}
