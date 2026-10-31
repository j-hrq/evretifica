import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api"

interface HealthResponse {
  status: string
}

export function Home() {
  const [status, setStatus] = useState<string>("carregando...")
  const [carregando, setCarregando] = useState<boolean>(true)

  const verificarSaude = useCallback(async () => {
    setCarregando(true)
    try {
      const response = await apiFetch("/api/health")
      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}`)
      }
      const data: HealthResponse = await response.json()
      setStatus(data.status)
    } catch {
      setStatus("indisponível")
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void verificarSaude()
  }, [verificarSaude])

  return (
    <main className="flex min-h-[calc(100vh-57px)] flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-bold">Oficina OS</h1>
      <p className="text-muted-foreground">
        Status da API: <span className="font-semibold text-foreground">{status}</span>
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild variant="secondary">
          <Link to="/clientes">Gerenciar clientes</Link>
        </Button>
        <Button onClick={() => void verificarSaude()} disabled={carregando}>
          Verificar novamente
        </Button>
      </div>
    </main>
  )
}
