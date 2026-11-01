import { useCallback, useEffect, useState } from "react"
import {
  Activity,
  Monitor,
  Moon,
  Palette,
  RefreshCw,
  Server,
  ShieldCheck,
  Sun,
  User,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { useTema, type PreferenciaTema } from "@/hooks/useTema"
import { apiFetch } from "@/lib/api"

interface HealthResponse {
  status: string
}

const OPCOES_TEMA: {
  valor: PreferenciaTema
  titulo: string
  descricao: string
  icone: typeof Sun
}[] = [
  {
    valor: "claro",
    titulo: "Claro",
    descricao: "Interface sempre com cores claras.",
    icone: Sun,
  },
  {
    valor: "escuro",
    titulo: "Escuro",
    descricao: "Interface sempre com cores escuras.",
    icone: Moon,
  },
  {
    valor: "sistema",
    titulo: "Sistema",
    descricao: "Segue a configuração do dispositivo.",
    icone: Monitor,
  },
]

export function Configuracoes() {
  const { usuario } = useAuth()
  const { tema, definirTema } = useTema()
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

  const online = status === "ok"

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">
          Configuração do sistema
        </h1>
        <p className="text-sm text-muted-foreground">
          Preferências de aparência, diagnóstico da API e informações da sessão
          ativa.
        </p>
      </div>

      <section className="flex flex-col gap-4 rounded-xl border bg-card p-6 text-card-foreground shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
            <Palette className="size-5" />
          </div>
          <div>
            <h2 className="font-semibold">Aparência</h2>
            <p className="text-xs text-muted-foreground">
              Escolha entre o tema claro, escuro ou seguir a configuração do
              sistema utilizado.
            </p>
          </div>
        </div>

        <div
          role="radiogroup"
          aria-label="Tema da interface"
          className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          {OPCOES_TEMA.map((opcao) => {
            const Icone = opcao.icone
            const selecionado = tema === opcao.valor
            return (
              <button
                key={opcao.valor}
                type="button"
                role="radio"
                aria-checked={selecionado}
                onClick={() => definirTema(opcao.valor)}
                className={`flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 ${
                  selecionado
                    ? "border-primary bg-secondary/60 text-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Icone className="size-4" />
                    {opcao.titulo}
                  </span>
                  {selecionado && <Badge variant="default">Ativo</Badge>}
                </div>
                <span className="text-xs text-muted-foreground">
                  {opcao.descricao}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="flex flex-col justify-between gap-6 rounded-xl border bg-card p-6 text-card-foreground shadow-xs">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <Server className="size-5" />
                </div>
                <div>
                  <h2 className="font-semibold">Status da API</h2>
                  <p className="text-xs text-muted-foreground">
                    Monitoramento do serviço backend (/api/health)
                  </p>
                </div>
              </div>
              <Badge variant={online ? "default" : "secondary"}>
                <span
                  className={`mr-1.5 inline-block size-2 rounded-full ${
                    carregando
                      ? "bg-amber-400"
                      : online
                        ? "bg-emerald-400"
                        : "bg-red-400"
                  }`}
                />
                {online ? "Online" : carregando ? "Verificando" : "Offline"}
              </Badge>
            </div>

            <div className="rounded-lg border bg-muted/40 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Activity className="size-4" />
                  Status da API:
                </span>
                <span className="font-semibold text-foreground">{status}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => void verificarSaude()}
              disabled={carregando}
            >
              <RefreshCw
                className={`size-4 ${carregando ? "animate-spin" : ""}`}
              />
              Verificar novamente
            </Button>
          </div>
        </section>

        <section className="flex flex-col justify-between gap-6 rounded-xl border bg-card p-6 text-card-foreground shadow-xs">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <h2 className="font-semibold">Conta e Sessão</h2>
                <p className="text-xs text-muted-foreground">
                  Credencial autenticada da oficina
                </p>
              </div>
            </div>

            <dl className="divide-y rounded-lg border bg-muted/40 text-sm">
              <div className="flex items-center justify-between px-4 py-2.5">
                <dt className="flex items-center gap-2 text-muted-foreground">
                  <User className="size-4" />
                  Responsável
                </dt>
                <dd className="font-medium text-foreground">
                  {usuario?.nome ?? "-"}
                </dd>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5">
                <dt className="text-muted-foreground">Login</dt>
                <dd className="font-mono text-xs font-medium text-foreground">
                  {usuario?.login ?? "-"}
                </dd>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5">
                <dt className="text-muted-foreground">Autenticação</dt>
                <dd className="text-xs text-muted-foreground">
                  Cookie de sessão HTTP-only
                </dd>
              </div>
            </dl>
          </div>
        </section>
      </div>
    </main>
  )
}
