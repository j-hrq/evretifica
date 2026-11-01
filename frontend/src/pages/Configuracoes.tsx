import { useCallback, useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Activity,
  Building2,
  Check,
  Eye,
  Mail,
  MapPin,
  Monitor,
  Moon,
  Palette,
  Phone,
  RefreshCw,
  Save,
  Server,
  ShieldCheck,
  Sun,
  User,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/useAuth"
import {
  useAtualizarConfiguracaoOficina,
  useConfiguracaoOficina,
} from "@/hooks/useConfiguracaoOficina"
import { useTema, type PreferenciaTema } from "@/hooks/useTema"
import { apiFetch } from "@/lib/api"
import {
  configuracaoOficinaFormSchema,
  type ConfiguracaoOficinaFormValues,
} from "@/lib/validacao"

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
  const [carregandoHealth, setCarregandoHealth] = useState<boolean>(true)

  const { data: dadosOficina, isLoading: carregandoOficina } =
    useConfiguracaoOficina()
  const atualizarMutation = useAtualizarConfiguracaoOficina()
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null)
  const [mensagemErro, setMensagemErro] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ConfiguracaoOficinaFormValues>({
    resolver: zodResolver(configuracaoOficinaFormSchema),
    defaultValues: {
      nome_fantasia: "EVR Retífica",
      razao_social: "",
      cnpj_cpf: "",
      inscricao_estadual: "",
      telefone: "",
      whatsapp: "",
      email: "",
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
      cep: "",
      nome_responsavel: "",
    },
  })

  useEffect(() => {
    if (dadosOficina) {
      reset({
        nome_fantasia: dadosOficina.nome_fantasia ?? "",
        razao_social: dadosOficina.razao_social ?? "",
        cnpj_cpf: dadosOficina.cnpj_cpf ?? "",
        inscricao_estadual: dadosOficina.inscricao_estadual ?? "",
        telefone: dadosOficina.telefone ?? "",
        whatsapp: dadosOficina.whatsapp ?? "",
        email: dadosOficina.email ?? "",
        logradouro: dadosOficina.logradouro ?? "",
        numero: dadosOficina.numero ?? "",
        complemento: dadosOficina.complemento ?? "",
        bairro: dadosOficina.bairro ?? "",
        cidade: dadosOficina.cidade ?? "",
        estado: dadosOficina.estado ?? "",
        cep: dadosOficina.cep ?? "",
        nome_responsavel: dadosOficina.nome_responsavel ?? "",
      })
    }
  }, [dadosOficina, reset])

  const valoresAtuais = watch()

  async function onSalvarOficina(valores: ConfiguracaoOficinaFormValues) {
    setMensagemSucesso(null)
    setMensagemErro(null)
    try {
      await atualizarMutation.mutateAsync(valores)
      setMensagemSucesso("Dados da oficina salvos com sucesso!")
      setTimeout(() => setMensagemSucesso(null), 4000)
    } catch (err) {
      setMensagemErro(
        err instanceof Error ? err.message : "Erro ao salvar dados da oficina.",
      )
    }
  }

  const verificarSaude = useCallback(async () => {
    setCarregandoHealth(true)
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
      setCarregandoHealth(false)
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
          Dados da empresa para cabeçalho de documentos, preferências visuais e
          diagnóstico da API.
        </p>
      </div>

      {/* Dados da Oficina para Documentos e PDFs */}
      <section className="flex flex-col gap-6 rounded-xl border bg-card p-6 text-card-foreground shadow-xs">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="size-5" />
            </div>
            <div>
              <h2 className="font-semibold">Dados da Empresa / Oficina</h2>
              <p className="text-xs text-muted-foreground">
                Informações impressas no cabeçalho e rodapé dos orçamentos e
                ordens de serviço (PDF).
              </p>
            </div>
          </div>
          {carregandoOficina && (
            <span className="text-xs text-muted-foreground">Carregando...</span>
          )}
        </div>

        {/* Pré-visualização do cabeçalho da OS */}
        <div className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Eye className="size-3.5" />
            Pré-visualização do cabeçalho (estilo exemplo.pdf)
          </div>
          <div className="rounded-md border bg-background p-4 shadow-2xs">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div className="flex flex-col gap-0.5 text-xs">
                <span className="text-sm font-bold tracking-tight text-foreground uppercase">
                  {valoresAtuais.nome_fantasia || "EVR RETÍFICA"}
                </span>
                {valoresAtuais.cnpj_cpf && (
                  <span className="text-muted-foreground">
                    CPF/CNPJ: {valoresAtuais.cnpj_cpf}
                  </span>
                )}
                <span className="text-muted-foreground">
                  {valoresAtuais.logradouro || "Rua São Salvador"}
                  {valoresAtuais.numero ? `, ${valoresAtuais.numero}` : ", 1996"}
                  {valoresAtuais.complemento
                    ? ` - ${valoresAtuais.complemento}`
                    : ""}
                </span>
                <span className="text-muted-foreground">
                  {valoresAtuais.bairro || "35º BI"},{" "}
                  {valoresAtuais.cidade || "Feira de Santana"}-
                  {valoresAtuais.estado || "BA"}
                </span>
                <span className="text-muted-foreground">
                  CEP {valoresAtuais.cep || "44094-060"}
                </span>
              </div>

              <div className="flex flex-col gap-0.5 text-xs sm:text-right">
                {valoresAtuais.email && (
                  <span className="flex items-center gap-1.5 text-muted-foreground sm:justify-end">
                    <Mail className="size-3" />
                    {valoresAtuais.email}
                  </span>
                )}
                {(valoresAtuais.whatsapp || valoresAtuais.telefone) && (
                  <span className="flex items-center gap-1.5 font-medium text-foreground sm:justify-end">
                    <Phone className="size-3" />
                    {valoresAtuais.whatsapp || valoresAtuais.telefone}
                  </span>
                )}
                {valoresAtuais.nome_responsavel && (
                  <span className="mt-1 text-2xs text-muted-foreground">
                    Responsável: {valoresAtuais.nome_responsavel}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Formulário de edição */}
        <form
          onSubmit={handleSubmit(onSalvarOficina)}
          className="flex flex-col gap-5"
          noValidate
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="nome_fantasia">
                Nome Fantasia <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nome_fantasia"
                placeholder="Ex: EVR Retífica"
                {...register("nome_fantasia")}
              />
              {errors.nome_fantasia && (
                <p className="text-xs text-destructive">
                  {errors.nome_fantasia.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="razao_social">Razão Social</Label>
              <Input
                id="razao_social"
                placeholder="Ex: EVR Retífica Ltda"
                {...register("razao_social")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cnpj_cpf">CPF ou CNPJ</Label>
              <Input
                id="cnpj_cpf"
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                {...register("cnpj_cpf")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inscricao_estadual">Inscrição Estadual</Label>
              <Input
                id="inscricao_estadual"
                placeholder="Ex: ISENTO ou 123456789"
                {...register("inscricao_estadual")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nome_responsavel">
                Nome do Responsável (Assinatura)
              </Label>
              <Input
                id="nome_responsavel"
                placeholder="Ex: Evandro Ramos Rosado"
                {...register("nome_responsavel")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="whatsapp">WhatsApp / Celular</Label>
              <Input
                id="whatsapp"
                placeholder="(75) 99118-1598"
                {...register("whatsapp")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="telefone">Telefone Fixo</Label>
              <Input
                id="telefone"
                placeholder="(75) 3221-0000"
                {...register("telefone")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-mail de Contato</Label>
              <Input
                id="email"
                type="email"
                placeholder="evrretifica@gmail.com"
                {...register("email")}
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <MapPin className="size-3.5" />
              Endereço do Estabelecimento
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
              <div className="flex flex-col gap-1.5 sm:col-span-3">
                <Label htmlFor="cep">CEP</Label>
                <Input id="cep" placeholder="44094-060" {...register("cep")} />
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-6">
                <Label htmlFor="logradouro">Logradouro / Rua</Label>
                <Input
                  id="logradouro"
                  placeholder="Rua São Salvador"
                  {...register("logradouro")}
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-3">
                <Label htmlFor="numero">Número</Label>
                <Input id="numero" placeholder="1996" {...register("numero")} />
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-4">
                <Label htmlFor="complemento">Complemento</Label>
                <Input
                  id="complemento"
                  placeholder="Galpão / Sala"
                  {...register("complemento")}
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-4">
                <Label htmlFor="bairro">Bairro</Label>
                <Input
                  id="bairro"
                  placeholder="35º BI"
                  {...register("bairro")}
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-3">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  placeholder="Feira de Santana"
                  {...register("cidade")}
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-1">
                <Label htmlFor="estado">UF</Label>
                <Input
                  id="estado"
                  placeholder="BA"
                  maxLength={2}
                  {...register("estado")}
                />
              </div>
            </div>
          </div>

          {mensagemSucesso && (
            <div className="flex items-center gap-2 rounded-md bg-emerald-500/15 p-3 text-sm text-emerald-600 dark:text-emerald-400">
              <Check className="size-4 shrink-0" />
              <span>{mensagemSucesso}</span>
            </div>
          )}

          {mensagemErro && (
            <p role="alert" className="text-sm text-destructive">
              {mensagemErro}
            </p>
          )}

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isSubmitting}>
              <Save className="size-4" />
              {isSubmitting ? "Salvando..." : "Salvar dados da oficina"}
            </Button>
          </div>
        </form>
      </section>

      {/* Tema da interface */}
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

      {/* Diagnóstico da API e Conta */}
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
                    carregandoHealth
                      ? "bg-amber-400"
                      : online
                        ? "bg-emerald-400"
                        : "bg-red-400"
                  }`}
                />
                {online ? "Online" : carregandoHealth ? "Verificando" : "Offline"}
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
              disabled={carregandoHealth}
            >
              <RefreshCw
                className={`size-4 ${carregandoHealth ? "animate-spin" : ""}`}
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
