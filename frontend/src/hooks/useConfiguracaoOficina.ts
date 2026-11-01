import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch, extrairErro } from "@/lib/api"
import type {
  ConfiguracaoOficinaFormValues,
  ConfiguracaoOficinaOutput,
} from "@/lib/validacao"

export function useConfiguracaoOficina() {
  return useQuery<ConfiguracaoOficinaOutput>({
    queryKey: ["configuracao-oficina"],
    queryFn: async () => {
      const response = await apiFetch("/api/configuracao-oficina")
      if (!response.ok) {
        throw new Error(
          await extrairErro(response, "Erro ao carregar dados da oficina."),
        )
      }
      return response.json()
    },
  })
}

export function useAtualizarConfiguracaoOficina() {
  const queryClient = useQueryClient()

  return useMutation<
    ConfiguracaoOficinaOutput,
    Error,
    ConfiguracaoOficinaFormValues
  >({
    mutationFn: async (dados) => {
      const response = await apiFetch("/api/configuracao-oficina", {
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
      void queryClient.invalidateQueries({ queryKey: ["configuracao-oficina"] })
    },
  })
}
