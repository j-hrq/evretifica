import { useEffect, useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { FileDown } from "lucide-react"
import { useFieldArray, useForm } from "react-hook-form"
import { CampoBuscaModal } from "@/components/CampoBuscaModal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useItens, type Item } from "@/hooks/useItens"
import {
  useAtualizarOrcamento,
  useCriarOrcamento,
  useExcluirOrcamento,
  useOrcamentos,
  type Orcamento,
  type OrcamentoPayload,
} from "@/hooks/useOrcamentos"
import { useVeiculos, type Veiculo } from "@/hooks/useVeiculos"
import {
  calcularDataVencimento,
  calcularTotalLinhaCentavos,
  converterReaisParaCentavos,
  formatarCentavosParaInput,
  formatarDataIsoParaBr,
  formatarMoedaCentavos,
  normalizarQuantidadeDecimal,
  orcamentoFormSchema,
  SITUACAO_AVALIACAO_LABELS,
  SituacaoAvaliacao,
  TIPO_ITEM_LABELS,
  TipoItem,
  type OrcamentoFormValues,
} from "@/lib/validacao"

function hojeIso(): string {
  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = String(agora.getMonth() + 1).padStart(2, "0")
  const dia = String(agora.getDate()).padStart(2, "0")
  return `${ano}-${mes}-${dia}`
}

function valoresIniciais(orcamento: Orcamento | null): OrcamentoFormValues {
  if (!orcamento) {
    return {
      veiculo_id: 0,
      status_id: SituacaoAvaliacao.PENDENTE,
      data_emissao: hojeIso(),
      validade_dias: "",
      descricao: "",
      itens: [],
    }
  }
  return {
    veiculo_id: orcamento.veiculo_id,
    status_id: orcamento.status_id,
    data_emissao: orcamento.data_emissao,
    validade_dias:
      orcamento.validade_dias !== null ? String(orcamento.validade_dias) : "",
    descricao: orcamento.descricao ?? "",
    itens: orcamento.itens.map((linha) => ({
      item_id: linha.item_id,
      tipo_id: linha.tipo_id,
      quantidade: String(linha.quantidade),
      valor_unitario: formatarCentavosParaInput(linha.valor_unitario),
    })),
  }
}

export function Orcamentos() {
  const [busca, setBusca] = useState<string>("")
  const [filtroStatus, setFiltroStatus] = useState<string>("")
  const [page, setPage] = useState<number>(1)
  const [modalAberto, setModalAberto] = useState<boolean>(false)
  const [orcamentoEmEdicao, setOrcamentoEmEdicao] = useState<Orcamento | null>(
    null,
  )
  const [orcamentoParaExcluir, setOrcamentoParaExcluir] =
    useState<Orcamento | null>(null)
  const [buscaVeiculoModal, setBuscaVeiculoModal] = useState<string>("")
  const [buscaItemModal, setBuscaItemModal] = useState<string>("")
  const [veiculoSelecionadoCache, setVeiculoSelecionadoCache] =
    useState<Veiculo | null>(null)
  const [itensSelecionadosCache, setItensSelecionadosCache] = useState<
    Record<number, Item>
  >({})
  const [erroFormulario, setErroFormulario] = useState<string | null>(null)
  const [erroExclusao, setErroExclusao] = useState<string | null>(null)

  const statusIdParam = filtroStatus ? Number(filtroStatus) : undefined

  const { data, isLoading, isError, error, refetch } = useOrcamentos({
    q: busca,
    status_id: statusIdParam,
    page,
    per_page: 10,
  })
  const { data: veiculosData, isLoading: carregandoVeiculos } = useVeiculos({
    q: buscaVeiculoModal,
    page: 1,
    per_page: 50,
  })
  const { data: itensAtivosData, isLoading: carregandoItens } = useItens({
    q: buscaItemModal,
    ativo: true,
    page: 1,
    per_page: 100,
  })

  const criarMutation = useCriarOrcamento()
  const atualizarMutation = useAtualizarOrcamento()
  const excluirMutation = useExcluirOrcamento()

  const opcoesVeiculos = useMemo<Veiculo[]>(() => {
    const lista = veiculosData?.items ?? []
    if (
      orcamentoEmEdicao &&
      !lista.some((v) => v.id === orcamentoEmEdicao.veiculo.id)
    ) {
      return [orcamentoEmEdicao.veiculo, ...lista]
    }
    return lista
  }, [veiculosData, orcamentoEmEdicao])

  const opcoesItens = useMemo<Item[]>(() => {
    const mapa = new Map<number, Item>()
    for (const item of itensAtivosData?.items ?? []) {
      mapa.set(item.id, item)
    }
    if (orcamentoEmEdicao) {
      for (const linha of orcamentoEmEdicao.itens) {
        if (!mapa.has(linha.item.id)) {
          mapa.set(linha.item.id, linha.item)
        }
      }
    }
    return Array.from(mapa.values())
  }, [itensAtivosData, orcamentoEmEdicao])

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OrcamentoFormValues>({
    resolver: zodResolver(orcamentoFormSchema),
    defaultValues: valoresIniciais(null),
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "itens",
  })

  const veiculoIdSelecionado = Number(watch("veiculo_id") || 0)
  const dataEmissaoWatch = watch("data_emissao")
  const validadeDiasWatch = watch("validade_dias")
  const itensWatch = watch("itens")

  const veiculoSelecionado = useMemo<Veiculo | null>(() => {
    if (!veiculoIdSelecionado) return null
    return (
      opcoesVeiculos.find((v) => v.id === veiculoIdSelecionado) ??
      (veiculoSelecionadoCache?.id === veiculoIdSelecionado
        ? veiculoSelecionadoCache
        : null) ??
      (orcamentoEmEdicao?.veiculo.id === veiculoIdSelecionado
        ? orcamentoEmEdicao.veiculo
        : null)
    )
  }, [
    veiculoIdSelecionado,
    opcoesVeiculos,
    veiculoSelecionadoCache,
    orcamentoEmEdicao,
  ])

  const vencimentoCalculado = calcularDataVencimento(
    dataEmissaoWatch ?? "",
    validadeDiasWatch ?? "",
  )

  const totalCalculadoCentavos = (itensWatch ?? []).reduce(
    (acc, linha) =>
      acc +
      calcularTotalLinhaCentavos(
        linha?.quantidade ?? "",
        linha?.valor_unitario ?? "",
      ),
    0,
  )

  const nomeClienteExibido = useMemo<string>(() => {
    if (!veiculoIdSelecionado) return "-"
    if (
      orcamentoEmEdicao &&
      veiculoIdSelecionado === orcamentoEmEdicao.veiculo_id
    ) {
      return orcamentoEmEdicao.cliente.pessoa.nome
    }
    return veiculoSelecionado?.cliente.pessoa.nome ?? "-"
  }, [veiculoIdSelecionado, orcamentoEmEdicao, veiculoSelecionado])

  useEffect(() => {
    if (modalAberto) {
      reset(valoresIniciais(orcamentoEmEdicao))
      setBuscaVeiculoModal("")
      setBuscaItemModal("")
      setVeiculoSelecionadoCache(orcamentoEmEdicao?.veiculo ?? null)
      const cacheInicialItens: Record<number, Item> = {}
      if (orcamentoEmEdicao) {
        for (const linha of orcamentoEmEdicao.itens) {
          cacheInicialItens[linha.item.id] = linha.item
        }
      }
      setItensSelecionadosCache(cacheInicialItens)
      setErroFormulario(null)
    }
  }, [modalAberto, orcamentoEmEdicao, reset])

  function obterNomeItem(itemId: number): string {
    if (!itemId) return ""
    const item =
      opcoesItens.find((i) => i.id === itemId) ?? itensSelecionadosCache[itemId]
    return item?.nome ?? ""
  }

  function abrirNovo() {
    setOrcamentoEmEdicao(null)
    setModalAberto(true)
  }

  function abrirEdicao(orcamento: Orcamento) {
    setOrcamentoEmEdicao(orcamento)
    setModalAberto(true)
  }

  async function onSubmit(valores: OrcamentoFormValues) {
    setErroFormulario(null)
    const validadeLimpa = valores.validade_dias.trim()
    const descLimpa = valores.descricao.trim()

    const payload: OrcamentoPayload = {
      veiculo_id: valores.veiculo_id,
      status_id: valores.status_id,
      data_emissao: valores.data_emissao.trim(),
      validade_dias: validadeLimpa ? Number(validadeLimpa) : null,
      descricao: descLimpa || null,
      itens: valores.itens.map((linha) => ({
        item_id: linha.item_id,
        tipo_id: linha.tipo_id,
        quantidade: normalizarQuantidadeDecimal(linha.quantidade) ?? "1.00",
        valor_unitario: converterReaisParaCentavos(linha.valor_unitario) ?? 0,
      })),
    }

    try {
      if (orcamentoEmEdicao) {
        await atualizarMutation.mutateAsync({
          id: orcamentoEmEdicao.id,
          payload,
        })
      } else {
        await criarMutation.mutateAsync(payload)
      }
      setModalAberto(false)
    } catch (err) {
      setErroFormulario(
        err instanceof Error ? err.message : "Erro ao salvar orçamento.",
      )
    }
  }

  async function confirmarExclusao() {
    if (!orcamentoParaExcluir) return
    setErroExclusao(null)
    try {
      await excluirMutation.mutateAsync(orcamentoParaExcluir.id)
      setOrcamentoParaExcluir(null)
    } catch (err) {
      setErroExclusao(
        err instanceof Error ? err.message : "Erro ao excluir orçamento.",
      )
    }
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Orçamentos</h1>
        <Button onClick={abrirNovo}>Novo orçamento</Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Input
            placeholder="Buscar por número, placa ou cliente..."
            aria-label="Buscar orçamentos"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <div>
          <select
            aria-label="Filtrar por status"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={filtroStatus}
            onChange={(e) => {
              setFiltroStatus(e.target.value)
              setPage(1)
            }}
          >
            <option value="">Todos os status</option>
            {Object.entries(SITUACAO_AVALIACAO_LABELS).map(([codigo, label]) => (
              <option key={codigo} value={codigo}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && (
        <p className="text-muted-foreground">Carregando orçamentos...</p>
      )}

      {isError && (
        <div className="flex flex-wrap items-center gap-3">
          <p role="alert" className="text-destructive">
            {error instanceof Error
              ? error.message
              : "Erro ao carregar orçamentos."}
          </p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <p className="text-muted-foreground">Nenhum orçamento encontrado.</p>
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Veículo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Emissão</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((orc) => (
                <TableRow key={orc.id}>
                  <TableCell className="font-mono font-medium">
                    {orc.numero}
                  </TableCell>
                  <TableCell>
                    {orc.veiculo.placa} - {orc.veiculo.modelo}
                  </TableCell>
                  <TableCell>{orc.cliente.pessoa.nome}</TableCell>
                  <TableCell>{formatarDataIsoParaBr(orc.data_emissao)}</TableCell>
                  <TableCell>
                    {formatarDataIsoParaBr(orc.data_vencimento)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {SITUACAO_AVALIACAO_LABELS[orc.status_id] ?? orc.status_id}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatarMoedaCentavos(orc.total)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          window.open(
                            `/api/orcamentos/${orc.id}/pdf`,
                            "_blank",
                          )
                        }
                        title="Baixar ou visualizar PDF do orçamento"
                      >
                        <FileDown className="size-3.5" />
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => abrirEdicao(orc)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setErroExclusao(null)
                          setOrcamentoParaExcluir(orc)
                        }}
                      >
                        Excluir
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Página {data.page} de {data.total_pages} ({data.total} registro(s))
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.total_pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </>
      )}

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl lg:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {orcamentoEmEdicao
                ? `Editar orçamento ${orcamentoEmEdicao.numero}`
                : "Novo orçamento"}
            </DialogTitle>
            <DialogDescription>
              {orcamentoEmEdicao
                ? `Número do orçamento: ${orcamentoEmEdicao.numero}`
                : "O número sequencial será gerado automaticamente ao salvar."}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="veiculo_id">Veículo</Label>
                <CampoBuscaModal
                  id="veiculo_id"
                  valorId={veiculoIdSelecionado}
                  textoSelecionado={
                    veiculoSelecionado
                      ? `${veiculoSelecionado.placa} - ${veiculoSelecionado.modelo} (${veiculoSelecionado.cliente.pessoa.nome})`
                      : ""
                  }
                  placeholder="Clique na lupa para selecionar um veículo..."
                  rotuloBotaoLupa="Pesquisar veículo"
                  tituloModal="Selecionar veículo"
                  descricaoModal="Busque por placa, modelo ou cliente e selecione o veículo do orçamento."
                  placeholderBusca="Buscar veículo por placa, modelo ou cliente..."
                  busca={buscaVeiculoModal}
                  onBuscaChange={setBuscaVeiculoModal}
                  carregando={carregandoVeiculos}
                  mensagemVazio="Nenhum veículo encontrado."
                  opcoes={opcoesVeiculos.map((veiculo) => ({
                    id: veiculo.id,
                    titulo: `${veiculo.placa} — ${veiculo.marca.nome} ${veiculo.modelo}`,
                    subtitulo: `Cliente: ${veiculo.cliente.pessoa.nome}`,
                  }))}
                  onSelecionar={(idEscolhido) => {
                    const achado =
                      opcoesVeiculos.find((v) => v.id === idEscolhido) ?? null
                    if (achado) setVeiculoSelecionadoCache(achado)
                    setValue("veiculo_id", idEscolhido, {
                      shouldValidate: true,
                    })
                  }}
                />
                {errors.veiculo_id && (
                  <p className="text-sm text-destructive">
                    {errors.veiculo_id.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <span
                  id="rotulo_cliente_orcamento"
                  className="text-sm font-medium"
                >
                  Cliente do orçamento
                </span>
                <div
                  aria-labelledby="rotulo_cliente_orcamento"
                  title={nomeClienteExibido}
                  className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm"
                >
                  <span className="truncate">{nomeClienteExibido}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="data_emissao">Data de emissão</Label>
                <Input
                  id="data_emissao"
                  type="date"
                  {...register("data_emissao")}
                />
                {errors.data_emissao && (
                  <p className="text-sm text-destructive">
                    {errors.data_emissao.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="validade_dias">Validade (dias)</Label>
                <Input
                  id="validade_dias"
                  placeholder="15"
                  {...register("validade_dias")}
                />
                {errors.validade_dias && (
                  <p className="text-sm text-destructive">
                    {errors.validade_dias.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <span
                  id="rotulo_vencimento_orcamento"
                  className="text-sm font-medium"
                >
                  Vencimento
                </span>
                <div
                  aria-label="Vencimento calculado"
                  aria-labelledby="rotulo_vencimento_orcamento"
                  className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm"
                >
                  {formatarDataIsoParaBr(vencimentoCalculado)}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="status_id">Status</Label>
                <select
                  id="status_id"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  {...register("status_id", { valueAsNumber: true })}
                >
                  {Object.entries(SITUACAO_AVALIACAO_LABELS).map(
                    ([codigo, label]) => (
                      <option key={codigo} value={Number(codigo)}>
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="descricao">Descrição / Observações</Label>
              <Input id="descricao" {...register("descricao")} />
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Itens do orçamento</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      item_id: 0,
                      tipo_id: TipoItem.MAO_DE_OBRA,
                      quantidade: "1.00",
                      valor_unitario: "0.00",
                    })
                  }
                >
                  Adicionar item
                </Button>
              </div>

              {fields.map((field, index) => {
                const linhaAtual = itensWatch?.[index]
                const itemIdAtual = Number(linhaAtual?.item_id || 0)
                const subtotalLinha = calcularTotalLinhaCentavos(
                  linhaAtual?.quantidade ?? "",
                  linhaAtual?.valor_unitario ?? "",
                )

                return (
                  <div
                    key={field.id}
                    className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 sm:p-4"
                  >
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Item #{index + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => remove(index)}
                      >
                        Remover item
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                      <div className="flex flex-col gap-1.5 sm:col-span-7">
                        <Label htmlFor={`itens.${index}.item_id`}>Item</Label>
                        <CampoBuscaModal
                          id={`itens.${index}.item_id`}
                          valorId={itemIdAtual}
                          textoSelecionado={obterNomeItem(itemIdAtual)}
                          placeholder="Clique na lupa para selecionar um item..."
                          rotuloBotaoLupa="Pesquisar item"
                          tituloModal="Selecionar item"
                          descricaoModal="Busque e selecione o item (peça ou serviço) do catálogo."
                          placeholderBusca="Buscar item por nome..."
                          busca={buscaItemModal}
                          onBuscaChange={setBuscaItemModal}
                          carregando={carregandoItens}
                          mensagemVazio="Nenhum item encontrado."
                          opcoes={opcoesItens.map((item) => ({
                            id: item.id,
                            titulo: item.nome,
                          }))}
                          onSelecionar={(idEscolhido) => {
                            const achado =
                              opcoesItens.find((i) => i.id === idEscolhido) ??
                              null
                            if (achado) {
                              setItensSelecionadosCache((prev) => ({
                                ...prev,
                                [achado.id]: achado,
                              }))
                            }
                            setValue(`itens.${index}.item_id`, idEscolhido, {
                              shouldValidate: true,
                            })
                          }}
                        />
                        {errors.itens?.[index]?.item_id && (
                          <p className="text-xs text-destructive">
                            {errors.itens[index]?.item_id?.message}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5 sm:col-span-5">
                        <Label htmlFor={`itens.${index}.tipo_id`}>Tipo</Label>
                        <select
                          id={`itens.${index}.tipo_id`}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                          {...register(`itens.${index}.tipo_id`, {
                            valueAsNumber: true,
                          })}
                        >
                          {Object.entries(TIPO_ITEM_LABELS).map(
                            ([codigo, label]) => (
                              <option key={codigo} value={Number(codigo)}>
                                {label}
                              </option>
                            ),
                          )}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:col-span-8 sm:grid-cols-2">
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor={`itens.${index}.quantidade`}>Qtd.</Label>
                          <Input
                            id={`itens.${index}.quantidade`}
                            placeholder="1.00"
                            {...register(`itens.${index}.quantidade`)}
                          />
                          {errors.itens?.[index]?.quantidade && (
                            <p className="text-xs text-destructive">
                              {errors.itens[index]?.quantidade?.message}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor={`itens.${index}.valor_unitario`}>
                            Valor unit. (R$)
                          </Label>
                          <Input
                            id={`itens.${index}.valor_unitario`}
                            placeholder="150.00"
                            {...register(`itens.${index}.valor_unitario`)}
                          />
                          {errors.itens?.[index]?.valor_unitario && (
                            <p className="text-xs text-destructive">
                              {errors.itens[index]?.valor_unitario?.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5 sm:col-span-4">
                        <span className="text-sm font-medium">Subtotal</span>
                        <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm font-semibold">
                          {formatarMoedaCentavos(subtotalLinha)}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              <div className="flex items-center justify-end border-t pt-2">
                <span className="text-base font-bold">
                  Total: {formatarMoedaCentavos(totalCalculadoCentavos)}
                </span>
              </div>
            </div>

            {erroFormulario && (
              <p role="alert" className="text-sm text-destructive">
                {erroFormulario}
              </p>
            )}

            <DialogFooter>
              {orcamentoEmEdicao && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    window.open(
                      `/api/orcamentos/${orcamentoEmEdicao.id}/pdf`,
                      "_blank",
                    )
                  }
                >
                  <FileDown className="size-4" />
                  PDF do orçamento
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalAberto(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(orcamentoParaExcluir)}
        onOpenChange={(aberto) => {
          if (!aberto) setOrcamentoParaExcluir(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o orçamento{" "}
              <strong>{orcamentoParaExcluir?.numero}</strong>?
            </DialogDescription>
          </DialogHeader>

          {erroExclusao && (
            <p role="alert" className="text-sm text-destructive">
              {erroExclusao}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOrcamentoParaExcluir(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={excluirMutation.isPending}
              onClick={() => void confirmarExclusao()}
            >
              Confirmar exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
