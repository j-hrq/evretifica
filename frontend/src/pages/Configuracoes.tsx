import { useCallback, useEffect, useState } from "react"
import { useFieldArray, useForm } from "react-hook-form"
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
  useAtualizarConfiguracaoSistema,
  useConfiguracaoSistema,
} from "@/hooks/useConfiguracaoSistema"
import { useTema, type PreferenciaTema } from "@/hooks/useTema"
import { apiFetch } from "@/lib/api"
import {
  configuracaoSistemaFormSchema,
  TipoTelefone,
  type ConfiguracaoSistemaFormValues,
  type ConfiguracaoSistemaPayload,
  type EnderecoPayload,
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

function normalizarEndereco(
  endereco: ConfiguracaoSistemaFormValues["endereco"],
): EnderecoPayload | null {
  const logradouro = endereco.logradouro.trim() || null
  const numero = endereco.numero.trim() || null
  const complemento = endereco.complemento.trim() || null
  const bairro = endereco.bairro.trim() || null
  const cidade = endereco.cidade.trim() || null
  const estado = endereco.estado.trim().toUpperCase() || null
  const cep = endereco.cep.trim() || null
  if (
    !logradouro &&
    !numero &&
    !complemento &&
    !bairro &&
    !cidade &&
    !estado &&
    !cep
  ) {
    return null
  }
  return { logradouro, numero, complemento, bairro, cidade, estado, cep }
}

export function Configuracoes() {
  const { usuario } = useAuth()
  const { tema, definirTema } = useTema()
  const [status, setStatus] = useState<string>("carregando...")
  const [carregandoHealth, setCarregandoHealth] = useState<boolean>(true)

  const { data: dadosConfiguracao, isLoading: carregandoOficina } =
    useConfiguracaoSistema()
  const atualizarMutation = useAtualizarConfiguracaoSistema()
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null)
  const [mensagemErro, setMensagemErro] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ConfiguracaoSistemaFormValues>({
    resolver: zodResolver(configuracaoSistemaFormSchema),
    defaultValues: {
      nome: "EVR Retífica",
      email: "",
      tipo_documento: "cpf",
      documento: "07712551529",
      nome_fantasia: "",
      inscricao_estadual: "",
      endereco: {
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: "",
        cep: "",
      },
      telefones: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "telefones",
  })

  useEffect(() => {
    if (dadosConfiguracao?.pessoa) {
      const p = dadosConfiguracao.pessoa
      const ehCnpj = Boolean(p.cnpj)
      const end = p.endereco
      reset({
        nome: p.nome ?? "",
        email: p.email ?? "",
        tipo_documento: ehCnpj ? "cnpj" : "cpf",
        documento: p.cnpj ?? p.cpf ?? "",
        nome_fantasia: p.nome_fantasia ?? "",
        inscricao_estadual: p.inscricao_estadual ?? "",
        endereco: {
          logradouro: end?.logradouro ?? "",
          numero: end?.numero ?? "",
          complemento: end?.complemento ?? "",
          bairro: end?.bairro ?? "",
          cidade: end?.cidade ?? "",
          estado: end?.estado ?? "",
          cep: end?.cep ?? "",
        },
        telefones: p.telefones.map((t) => ({
          ddd: t.ddd,
          telefone: t.telefone,
          tipo_id: t.tipo_id,
        })),
      })
    }
  }, [dadosConfiguracao, reset])

  const valoresAtuais = watch()
  const ehCnpj = valoresAtuais.tipo_documento === "cnpj"
  const primeiroTelefone = valoresAtuais.telefones[0]
  const telefoneExibido = primeiroTelefone?.telefone
    ? `(${primeiroTelefone.ddd}) ${primeiroTelefone.telefone}`
    : null

  async function onSalvarOficina(valores: ConfiguracaoSistemaFormValues) {
    setMensagemSucesso(null)
    setMensagemErro(null)
    const usarCnpj = valores.tipo_documento === "cnpj"
    const payload: ConfiguracaoSistemaPayload = {
      pessoa: {
        nome: valores.nome.trim(),
        email: valores.email.trim() || null,
        cpf:
          valores.tipo_documento === "cpf"
            ? valores.documento.replace(/[.\-\s]/g, "")
            : null,
        cnpj: usarCnpj ? valores.documento.replace(/[.\-/\s]/g, "") : null,
        nome_fantasia:
          usarCnpj && valores.nome_fantasia.trim()
            ? valores.nome_fantasia.trim()
            : null,
        inscricao_estadual:
          usarCnpj && valores.inscricao_estadual.trim()
            ? valores.inscricao_estadual.trim()
            : null,
        endereco: normalizarEndereco(valores.endereco),
        telefones: valores.telefones.map((t) => ({
          ddd: t.ddd.trim(),
          telefone: t.telefone.replace(/[-\s]/g, ""),
          tipo_id: Number(t.tipo_id),
        })),
      },
    }
    try {
      await atualizarMutation.mutateAsync(payload)
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
                  {valoresAtuais.nome_fantasia ||
                    valoresAtuais.nome ||
                    "EVR RETÍFICA"}
                </span>
                {valoresAtuais.documento && (
                  <span className="text-muted-foreground">
                    CPF/CNPJ: {valoresAtuais.documento}
                  </span>
                )}
                <span className="text-muted-foreground">
                  {valoresAtuais.endereco.logradouro || "Rua São Salvador"}
                  {valoresAtuais.endereco.numero
                    ? `, ${valoresAtuais.endereco.numero}`
                    : ", 1996"}
                  {valoresAtuais.endereco.complemento
                    ? ` - ${valoresAtuais.endereco.complemento}`
                    : ""}
                </span>
                <span className="text-muted-foreground">
                  {valoresAtuais.endereco.bairro || "35º BI"},{" "}
                  {valoresAtuais.endereco.cidade || "Feira de Santana"}-
                  {valoresAtuais.endereco.estado || "BA"}
                </span>
                <span className="text-muted-foreground">
                  CEP {valoresAtuais.endereco.cep || "44094-060"}
                </span>
              </div>

              <div className="flex flex-col gap-0.5 text-xs sm:text-right">
                {valoresAtuais.email && (
                  <span className="flex items-center gap-1.5 text-muted-foreground sm:justify-end">
                    <Mail className="size-3" />
                    {valoresAtuais.email}
                  </span>
                )}
                {telefoneExibido && (
                  <span className="flex items-center gap-1.5 font-medium text-foreground sm:justify-end">
                    <Phone className="size-3" />
                    {telefoneExibido}
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
              <Label htmlFor="nome">
                Nome / Razão Social <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nome"
                placeholder="Ex: EVR Retífica"
                {...register("nome")}
              />
              {errors.nome && (
                <p className="text-xs text-destructive">
                  {errors.nome.message}
                </p>
              )}
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

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tipo_documento">Tipo de Documento</Label>
              <select
                id="tipo_documento"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                {...register("tipo_documento")}
              >
                <option value="cpf">CPF</option>
                <option value="cnpj">CNPJ</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="documento">
                {ehCnpj ? "CNPJ" : "CPF"}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="documento"
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                {...register("documento")}
              />
              {errors.documento && (
                <p className="text-xs text-destructive">
                  {errors.documento.message}
                </p>
              )}
            </div>

            {ehCnpj && (
              <>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
                  <Input
                    id="nome_fantasia"
                    placeholder="Ex: EVR Retífica"
                    {...register("nome_fantasia")}
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
              </>
            )}
          </div>

          <div className="border-t pt-4">
            <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <MapPin className="size-3.5" />
              Endereço do Estabelecimento
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
              <div className="flex flex-col gap-1.5 sm:col-span-3">
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  placeholder="44094-060"
                  {...register("endereco.cep")}
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-6">
                <Label htmlFor="logradouro">Logradouro / Rua</Label>
                <Input
                  id="logradouro"
                  placeholder="Rua São Salvador"
                  {...register("endereco.logradouro")}
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-3">
                <Label htmlFor="numero">Número</Label>
                <Input
                  id="numero"
                  placeholder="1996"
                  {...register("endereco.numero")}
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-4">
                <Label htmlFor="complemento">Complemento</Label>
                <Input
                  id="complemento"
                  placeholder="Galpão / Sala"
                  {...register("endereco.complemento")}
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-4">
                <Label htmlFor="bairro">Bairro</Label>
                <Input
                  id="bairro"
                  placeholder="35º BI"
                  {...register("endereco.bairro")}
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-3">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  placeholder="Feira de Santana"
                  {...register("endereco.cidade")}
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-1">
                <Label htmlFor="estado">UF</Label>
                <Input
                  id="estado"
                  placeholder="BA"
                  maxLength={2}
                  {...register("endereco.estado")}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Phone className="size-3.5" />
                Telefones
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    ddd: "",
                    telefone: "",
                    tipo_id: TipoTelefone.WHATSAPP,
                  })
                }
              >
                Adicionar telefone
              </Button>
            </div>

            {fields.map((field, index) => (
              <div
                key={field.id}
                className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 sm:p-4"
              >
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Telefone #{index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => remove(index)}
                  >
                    Remover
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                  <div className="flex flex-col gap-1.5 sm:col-span-3">
                    <Label htmlFor={`telefones.${index}.ddd`}>DDD</Label>
                    <Input
                      id={`telefones.${index}.ddd`}
                      placeholder="75"
                      {...register(`telefones.${index}.ddd`)}
                    />
                    {errors.telefones?.[index]?.ddd && (
                      <p className="text-xs text-destructive">
                        {errors.telefones[index]?.ddd?.message}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5 sm:col-span-5">
                    <Label htmlFor={`telefones.${index}.telefone`}>Número</Label>
                    <Input
                      id={`telefones.${index}.telefone`}
                      placeholder="991181598"
                      {...register(`telefones.${index}.telefone`)}
                    />
                    {errors.telefones?.[index]?.telefone && (
                      <p className="text-xs text-destructive">
                        {errors.telefones[index]?.telefone?.message}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5 sm:col-span-4">
                    <Label htmlFor={`telefones.${index}.tipo_id`}>
                      Tipo de telefone
                    </Label>
                    <select
                      id={`telefones.${index}.tipo_id`}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      {...register(`telefones.${index}.tipo_id`, {
                        valueAsNumber: true,
                      })}
                    >
                      <option value={TipoTelefone.CELULAR}>Celular</option>
                      <option value={TipoTelefone.FIXO}>Fixo</option>
                      <option value={TipoTelefone.WHATSAPP}>WhatsApp</option>
                      <option value={TipoTelefone.COMERCIAL}>Comercial</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
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
