import { Link } from "react-router-dom"
import {
  ArrowRight,
  Car,
  ClipboardList,
  FileText,
  Users,
  Wrench,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { useClientes } from "@/hooks/useClientes"
import { useOrcamentos } from "@/hooks/useOrcamentos"
import { useOrdensServico } from "@/hooks/useOrdensServico"
import { useVeiculos } from "@/hooks/useVeiculos"
import {
  formatarMoedaCentavos,
  SITUACAO_AVALIACAO_LABELS,
  SituacaoAvaliacao,
} from "@/lib/validacao"

function varianteStatus(statusId: number): "default" | "secondary" | "outline" {
  if (
    statusId === SituacaoAvaliacao.CONCLUIDO ||
    statusId === SituacaoAvaliacao.ACEITO
  ) {
    return "default"
  }
  if (
    statusId === SituacaoAvaliacao.EM_ANDAMENTO ||
    statusId === SituacaoAvaliacao.PENDENTE
  ) {
    return "secondary"
  }
  return "outline"
}

export function Home() {
  const { usuario } = useAuth()

  const ordensQuery = useOrdensServico({ page: 1, per_page: 5 })
  const ordensPendentesQuery = useOrdensServico({
    status_id: SituacaoAvaliacao.PENDENTE,
    page: 1,
    per_page: 1,
  })
  const orcamentosQuery = useOrcamentos({ page: 1, per_page: 5 })
  const orcamentosPendentesQuery = useOrcamentos({
    status_id: SituacaoAvaliacao.PENDENTE,
    page: 1,
    per_page: 1,
  })
  const clientesQuery = useClientes({ page: 1, per_page: 1 })
  const veiculosQuery = useVeiculos({ page: 1, per_page: 1 })

  const totalOrdens = ordensQuery.data?.total ?? 0
  const ordensPendentes = ordensPendentesQuery.data?.total ?? 0
  const totalOrcamentos = orcamentosQuery.data?.total ?? 0
  const orcamentosPendentes = orcamentosPendentesQuery.data?.total ?? 0
  const totalClientes = clientesQuery.data?.total ?? 0
  const totalVeiculos = veiculosQuery.data?.total ?? 0

  const ultimasOrdens = ordensQuery.data?.items ?? []
  const ultimosOrcamentos = orcamentosQuery.data?.items ?? []

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <section className="flex flex-col justify-between gap-4 rounded-xl border bg-gradient-to-br from-card to-muted/40 p-6 shadow-xs sm:flex-row sm:items-center">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Painel de Controle
          </p>
          <h1 className="text-2xl font-bold tracking-tight">EVR Retifica</h1>
          <p className="text-sm text-muted-foreground">
            {usuario?.nome
              ? `Olá, ${usuario.nome}. Acompanhe o resumo de atendimentos e movimentações da oficina.`
              : "Acompanhe o resumo de atendimentos e movimentações da oficina."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/orcamentos">
              <FileText className="size-4" />
              Orçamentos
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/ordens-servico">
              <ClipboardList className="size-4" />
              Ordens de serviço
            </Link>
          </Button>
        </div>
      </section>

      <section
        aria-label="Indicadores da oficina"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="flex flex-col justify-between gap-3 rounded-xl border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Ordens de Serviço
            </span>
            <div className="flex size-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <Wrench className="size-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold tracking-tight">{totalOrdens}</p>
            <p className="text-xs text-muted-foreground">
              {ordensPendentes}{" "}
              {ordensPendentes === 1 ? "pendente" : "pendentes"} de avaliação
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 rounded-xl border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Orçamentos
            </span>
            <div className="flex size-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <FileText className="size-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold tracking-tight">
              {totalOrcamentos}
            </p>
            <p className="text-xs text-muted-foreground">
              {orcamentosPendentes}{" "}
              {orcamentosPendentes === 1 ? "pendente" : "pendentes"} de
              aprovação
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 rounded-xl border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Clientes
            </span>
            <div className="flex size-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <Users className="size-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold tracking-tight">{totalClientes}</p>
            <p className="text-xs text-muted-foreground">
              Clientes cadastrados na base
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 rounded-xl border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Veículos
            </span>
            <div className="flex size-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <Car className="size-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold tracking-tight">{totalVeiculos}</p>
            <p className="text-xs text-muted-foreground">
              Veículos registrados na oficina
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col rounded-xl border bg-card shadow-xs">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 className="font-semibold">Últimas Ordens de Serviço</h2>
              <p className="text-xs text-muted-foreground">
                Atendimentos registrados recentemente
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/ordens-servico">
                Ver todas
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          <div className="divide-y">
            {ordensQuery.isLoading ? (
              <p className="p-5 text-sm text-muted-foreground">Carregando...</p>
            ) : ultimasOrdens.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">
                Nenhuma ordem de serviço registrada ainda.
              </p>
            ) : (
              ultimasOrdens.map((os) => (
                <div
                  key={os.id}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 text-sm"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold">
                        {os.numero}
                      </span>
                      <Badge variant={varianteStatus(os.status_id)}>
                        {SITUACAO_AVALIACAO_LABELS[os.status_id] ??
                          os.status_id}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {os.veiculo.placa} ({os.veiculo.modelo}) •{" "}
                      {os.cliente.pessoa.nome}
                    </p>
                  </div>
                  <span className="shrink-0 font-medium">
                    {formatarMoedaCentavos(os.total)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col rounded-xl border bg-card shadow-xs">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 className="font-semibold">Últimos Orçamentos</h2>
              <p className="text-xs text-muted-foreground">
                Propostas emitidas recentemente
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/orcamentos">
                Ver todos
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          <div className="divide-y">
            {orcamentosQuery.isLoading ? (
              <p className="p-5 text-sm text-muted-foreground">Carregando...</p>
            ) : ultimosOrcamentos.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">
                Nenhum orçamento emitido ainda.
              </p>
            ) : (
              ultimosOrcamentos.map((orc) => (
                <div
                  key={orc.id}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 text-sm"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold">
                        {orc.numero}
                      </span>
                      <Badge variant={varianteStatus(orc.status_id)}>
                        {SITUACAO_AVALIACAO_LABELS[orc.status_id] ??
                          orc.status_id}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {orc.veiculo.placa} ({orc.veiculo.modelo}) •{" "}
                      {orc.cliente.pessoa.nome}
                    </p>
                  </div>
                  <span className="shrink-0 font-medium">
                    {formatarMoedaCentavos(orc.total)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
