import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

interface HealthResponse {
  status: string
}

export function Home() {
  const [status, setStatus] = useState<string>("carregando...")
  const [carregando, setCarregando] = useState<boolean>(true)

  const verificarSaude = useCallback(async () => {
    setCarregando(true)
    try {
      const response = await fetch("/api/health")
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
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-bold">Oficina OS</h1>
      <p className="text-muted-foreground">
        Status da API: <span className="font-semibold text-foreground">{status}</span>
      </p>
      <Button onClick={() => void verificarSaude()} disabled={carregando}>
        Verificar novamente
      </Button>
    </main>
  )
}
