import { useEffect, useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm } from "react-hook-form"
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
  useAtualizarOrdemServico,
  useCriarOrdemServico,
  useExcluirOrdemServico,
  useOrdensServico,
  type OrdemServico,
  type OrdemServicoPayload,
} from "@/hooks/useOrdensServico"
import { useVeiculos, type Veiculo } from "@/hooks/useVeiculos"
import {
  calcularTotalLinhaCentavos,
  converterReaisParaCentavos,
  formatarCentavosParaInput,
  formatarMoedaCentavos,
  normalizarQuantidadeDecimal,
  ordemServicoFormSchema,
  SITUACAO_AVALIACAO_LABELS,
  SituacaoAvaliacao,
  TIPO_ITEM_LABELS,
  TipoItem,
  type OrdemServicoFormValues,
} from "@/lib/validacao"

function valoresIniciais(osObj: OrdemServico | null): OrdemServicoFormValues {
  if (!osObj) {
    return {
      veiculo_id: 0,
      km_entrada: "",
      status_id: SituacaoAvaliacao.PENDENTE,
      descricao: "",
      itens: [],
    }
  }
  return {
    veiculo_id: osObj.veiculo_id,
    km_entrada: osObj.km_entrada !== null ? String(osObj.km_entrada) : "",
    status_id: osObj.status_id,
    descricao: osObj.descricao ?? "",
    itens: osObj.itens.map((linha) => ({
      item_id: linha.item_id,
      tipo_id: linha.tipo_id,
      quantidade: String(linha.quantidade),
      valor_unitario: formatarCentavosParaInput(linha.valor_unitario),
    })),
  }
}

export function OrdensServico() {
  const [busca, setBusca] = useState<string>("")
  const [filtroStatus, setFiltroStatus] = useState<string>("")
  const [page, setPage] = useState<number>(1)
  const [modalAberto, setModalAberto] = useState<boolean>(false)
  const [osEmEdicao, setOsEmEdicao] = useState<OrdemServico | null>(null)
  const [osParaExcluir, setOsParaExcluir] = useState<OrdemServico | null>(null)
  const [buscaVeiculoModal, setBuscaVeiculoModal] = useState<string>("")
  const [erroFormulario, setErroFormulario] = useState<string | null>(null)
  const [erroExclusao, setErroExclusao] = useState<string | null>(null)

  const statusIdParam = filtroStatus ? Number(filtroStatus) : undefined

  const { data, isLoading, isError, error, refetch } = useOrdensServico({
    q: busca,
    status_id: statusIdParam,
    page,
    per_page: 10,
  })
  const { data: veiculosData } = useVeiculos({
    q: buscaVeiculoModal,
    page: 1,
    per_page: 50,
  })
  const { data: itensAtivosData } = useItens({
    ativo: true,
    page: 1,
    per_page: 100,
  })

  const criarMutation = useCriarOrdemServico()
  const atualizarMutation = useAtualizarOrdemServico()
  const excluirMutation = useExcluirOrdemServico()

  const opcoesVeiculos = useMemo<Veiculo[]>(() => {
    const lista = veiculosData?.items ?? []
    if (osEmEdicao && !lista.some((v) => v.id === osEmEdicao.veiculo.id)) {
      return [osEmEdicao.veiculo, ...lista]
    }
    return lista
  }, [veiculosData, osEmEdicao])

  const opcoesItens = useMemo<Item[]>(() => {
    const mapa = new Map<number, Item>()
    for (const item of itensAtivosData?.items ?? []) {
      mapa.set(item.id, item)
    }
    if (osEmEdicao) {
      for (const linha of osEmEdicao.itens) {
        if (!mapa.has(linha.item.id)) {
          mapa.set(linha.item.id, linha.item)
        }
      }
    }
    return Array.from(mapa.values())
  }, [itensAtivosData, osEmEdicao])

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<OrdemServicoFormValues>({
    resolver: zodResolver(ordemServicoFormSchema),
    defaultValues: valoresIniciais(null),
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "itens",
  })

  const veiculoIdSelecionado = watch("veiculo_id")
  const itensWatch = watch("itens")

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
    if (osEmEdicao && Number(veiculoIdSelecionado) === osEmEdicao.veiculo_id) {
      return osEmEdicao.cliente.pessoa.nome
    }
    const veiculo = opcoesVeiculos.find(
      (v) => v.id === Number(veiculoIdSelecionado),
    )
    return veiculo?.cliente.pessoa.nome ?? "-"
  }, [veiculoIdSelecionado, osEmEdicao, opcoesVeiculos])

  useEffect(() => {
    if (modalAberto) {
      reset(valoresIniciais(osEmEdicao))
      setBuscaVeiculoModal("")
      setErroFormulario(null)
    }
  }, [modalAberto, osEmEdicao, reset])

  function abrirNova() {
    setOsEmEdicao(null)
    setModalAberto(true)
  }

  function abrirEdicao(osObj: OrdemServico) {
    setOsEmEdicao(osObj)
    setModalAberto(true)
  }

  async function onSubmit(valores: OrdemServicoFormValues) {
    setErroFormulario(null)
    const kmLimpo = valores.km_entrada.trim()
    const descLimpa = valores.descricao.trim()

    const payload: OrdemServicoPayload = {
      veiculo_id: valores.veiculo_id,
      km_entrada: kmLimpo ? Number(kmLimpo) : null,
      status_id: valores.status_id,
      descricao: descLimpa || null,
      itens: valores.itens.map((linha) => ({
        item_id: linha.item_id,
        tipo_id: linha.tipo_id,
        quantidade: normalizarQuantidadeDecimal(linha.quantidade) ?? "1.00",
        valor_unitario: converterReaisParaCentavos(linha.valor_unitario) ?? 0,
      })),
    }

    try {
      if (osEmEdicao) {
        await atualizarMutation.mutateAsync({
          id: osEmEdicao.id,
          payload,
        })
      } else {
        await criarMutation.mutateAsync(payload)
      }
      setModalAberto(false)
    } catch (err) {
      setErroFormulario(
        err instanceof Error ? err.message : "Erro ao salvar ordem de serviço.",
      )
    }
  }

  async function confirmarExclusao() {
    if (!osParaExcluir) return
    setErroExclusao(null)
    try {
      await excluirMutation.mutateAsync(osParaExcluir.id)
      setOsParaExcluir(null)
    } catch (err) {
      setErroExclusao(
        err instanceof Error
          ? err.message
          : "Erro ao excluir ordem de serviço.",
      )
    }
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Ordens de serviço</h1>
        <Button onClick={abrirNova}>Nova OS</Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Input
            placeholder="Buscar por número, placa ou cliente..."
            aria-label="Buscar ordens de serviço"
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
        <p className="text-muted-foreground">Carregando ordens de serviço...</p>
      )}

      {isError && (
        <div className="flex flex-wrap items-center gap-3">
          <p role="alert" className="text-destructive">
            {error instanceof Error
              ? error.message
              : "Erro ao carregar ordens de serviço."}
          </p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <p className="text-muted-foreground">
          Nenhuma ordem de serviço encontrada.
        </p>
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Veículo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>KM entrada</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((osObj) => (
                <TableRow key={osObj.id}>
                  <TableCell className="font-mono font-medium">
                    {osObj.numero}
                  </TableCell>
                  <TableCell>
                    {osObj.veiculo.placa} - {osObj.veiculo.modelo}
                  </TableCell>
                  <TableCell>{osObj.cliente.pessoa.nome}</TableCell>
                  <TableCell>
                    {osObj.km_entrada !== null
                      ? osObj.km_entrada.toLocaleString("pt-BR")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {SITUACAO_AVALIACAO_LABELS[osObj.status_id] ??
                        osObj.status_id}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatarMoedaCentavos(osObj.total)}
                  </TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => abrirEdicao(osObj)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setErroExclusao(null)
                        setOsParaExcluir(osObj)
                      }}
                    >
                      Excluir
                    </Button>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {osEmEdicao
                ? `Editar OS ${osEmEdicao.numero}`
                : "Nova ordem de serviço"}
            </DialogTitle>
            <DialogDescription>
              {osEmEdicao
                ? `Número da OS: ${osEmEdicao.numero}`
                : "O número sequencial será gerado automaticamente ao salvar."}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="busca_veiculo_os">Buscar veículo</Label>
              <Input
                id="busca_veiculo_os"
                placeholder="Filtrar veículo por placa, modelo ou cliente..."
                value={buscaVeiculoModal}
                onChange={(e) => setBuscaVeiculoModal(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="veiculo_id">Veículo</Label>
                <select
                  id="veiculo_id"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  {...register("veiculo_id", { valueAsNumber: true })}
                >
                  <option value={0}>Selecione um veículo...</option>
                  {opcoesVeiculos.map((veiculo) => (
                    <option key={veiculo.id} value={veiculo.id}>
                      {veiculo.placa} - {veiculo.modelo} (
                      {veiculo.cliente.pessoa.nome})
                    </option>
                  ))}
                </select>
                {errors.veiculo_id && (
                  <p className="text-sm text-destructive">
                    {errors.veiculo_id.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <span id="rotulo_cliente_os" className="text-sm font-medium">
                  Cliente da OS
                </span>
                <div
                  aria-labelledby="rotulo_cliente_os"
                  className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm"
                >
                  {nomeClienteExibido}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="km_entrada">KM de entrada</Label>
                <Input
                  id="km_entrada"
                  placeholder="85000"
                  {...register("km_entrada")}
                />
                {errors.km_entrada && (
                  <p className="text-sm text-destructive">
                    {errors.km_entrada.message}
                  </p>
                )}
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
                <span className="text-sm font-medium">Itens da OS</span>
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
                const subtotalLinha = calcularTotalLinhaCentavos(
                  linhaAtual?.quantidade ?? "",
                  linhaAtual?.valor_unitario ?? "",
                )

                return (
                  <div
                    key={field.id}
                    className="grid grid-cols-1 items-start gap-2 rounded-md border p-2 sm:grid-cols-12"
                  >
                    <div className="flex flex-col gap-1 sm:col-span-4">
                      <Label htmlFor={`itens.${index}.item_id`}>Item</Label>
                      <select
                        id={`itens.${index}.item_id`}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                        {...register(`itens.${index}.item_id`, {
                          valueAsNumber: true,
                        })}
                      >
                        <option value={0}>Selecione...</option>
                        {opcoesItens.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.nome}
                          </option>
                        ))}
                      </select>
                      {errors.itens?.[index]?.item_id && (
                        <p className="text-xs text-destructive">
                          {errors.itens[index]?.item_id?.message}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <Label htmlFor={`itens.${index}.tipo_id`}>Tipo</Label>
                      <select
                        id={`itens.${index}.tipo_id`}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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

                    <div className="flex flex-col gap-1 sm:col-span-2">
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

                    <div className="flex flex-col gap-1 sm:col-span-2">
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

                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <span className="text-sm font-medium">Subtotal</span>
                      <div className="flex h-9 items-center justify-between gap-1">
                        <span className="text-xs font-medium">
                          {formatarMoedaCentavos(subtotalLinha)}
                        </span>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => remove(index)}
                        >
                          Remover
                        </Button>
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
        open={Boolean(osParaExcluir)}
        onOpenChange={(aberto) => {
          if (!aberto) setOsParaExcluir(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a ordem de serviço{" "}
              <strong>{osParaExcluir?.numero}</strong>?
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
              onClick={() => setOsParaExcluir(null)}
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
