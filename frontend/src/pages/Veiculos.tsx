import { useEffect, useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { CampoBuscaModal } from "@/components/CampoBuscaModal"
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
import { useClientes, type Cliente } from "@/hooks/useClientes"
import { useMarcasVeiculo, type MarcaVeiculo } from "@/hooks/useMarcasVeiculo"
import {
  useAtualizarVeiculo,
  useCriarVeiculo,
  useExcluirVeiculo,
  useVeiculos,
  type Veiculo,
  type VeiculoPayload,
} from "@/hooks/useVeiculos"
import {
  normalizarPlaca,
  veiculoFormSchema,
  type VeiculoFormValues,
} from "@/lib/validacao"

function formatarAnoVeiculo(
  anoFabricacao: number | null,
  anoModelo: number | null,
): string {
  if (anoFabricacao !== null && anoModelo !== null) {
    return `${anoFabricacao}/${anoModelo}`
  }
  if (anoFabricacao !== null) {
    return `${anoFabricacao}/-`
  }
  if (anoModelo !== null) {
    return `-/${anoModelo}`
  }
  return "-"
}

function valoresIniciais(veiculo: Veiculo | null): VeiculoFormValues {
  if (!veiculo) {
    return {
      cliente_id: 0,
      marca_id: 0,
      modelo: "",
      placa: "",
      ano_fabricacao: "",
      ano_modelo: "",
      cor: "",
      km: "",
      observacao: "",
    }
  }
  return {
    cliente_id: veiculo.cliente_id,
    marca_id: veiculo.marca_id,
    modelo: veiculo.modelo,
    placa: veiculo.placa,
    ano_fabricacao:
      veiculo.ano_fabricacao !== null ? String(veiculo.ano_fabricacao) : "",
    ano_modelo: veiculo.ano_modelo !== null ? String(veiculo.ano_modelo) : "",
    cor: veiculo.cor ?? "",
    km: veiculo.km !== null ? String(veiculo.km) : "",
    observacao: veiculo.observacao ?? "",
  }
}

export function Veiculos() {
  const [busca, setBusca] = useState<string>("")
  const [page, setPage] = useState<number>(1)
  const [modalAberto, setModalAberto] = useState<boolean>(false)
  const [veiculoEmEdicao, setVeiculoEmEdicao] = useState<Veiculo | null>(null)
  const [veiculoParaExcluir, setVeiculoParaExcluir] = useState<Veiculo | null>(
    null,
  )
  const [buscaClienteModal, setBuscaClienteModal] = useState<string>("")
  const [buscaMarcaModal, setBuscaMarcaModal] = useState<string>("")
  const [clienteSelecionadoCache, setClienteSelecionadoCache] =
    useState<Cliente | null>(null)
  const [marcaSelecionadaCache, setMarcaSelecionadaCache] =
    useState<MarcaVeiculo | null>(null)
  const [erroFormulario, setErroFormulario] = useState<string | null>(null)
  const [erroExclusao, setErroExclusao] = useState<string | null>(null)

  const { data, isLoading, isError, error, refetch } = useVeiculos({
    q: busca,
    page,
    per_page: 10,
  })
  const { data: clientesAtivosData, isLoading: carregandoClientes } =
    useClientes({
      q: buscaClienteModal,
      ativo: true,
      page: 1,
      per_page: 50,
    })
  const { data: marcasAtivasData, isLoading: carregandoMarcas } =
    useMarcasVeiculo({
      q: buscaMarcaModal,
      ativo: true,
      page: 1,
      per_page: 100,
    })

  const criarMutation = useCriarVeiculo()
  const atualizarMutation = useAtualizarVeiculo()
  const excluirMutation = useExcluirVeiculo()

  const opcoesClientes = useMemo<Cliente[]>(() => {
    const lista = clientesAtivosData?.items ?? []
    if (
      veiculoEmEdicao &&
      !lista.some((c) => c.id === veiculoEmEdicao.cliente.id)
    ) {
      return [veiculoEmEdicao.cliente, ...lista]
    }
    return lista
  }, [clientesAtivosData, veiculoEmEdicao])

  const opcoesMarcas = useMemo<MarcaVeiculo[]>(() => {
    const lista = marcasAtivasData?.items ?? []
    if (
      veiculoEmEdicao &&
      !lista.some((m) => m.id === veiculoEmEdicao.marca.id)
    ) {
      return [veiculoEmEdicao.marca, ...lista]
    }
    return lista
  }, [marcasAtivasData, veiculoEmEdicao])

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<VeiculoFormValues>({
    resolver: zodResolver(veiculoFormSchema),
    defaultValues: valoresIniciais(null),
  })

  const clienteIdSelecionado = Number(watch("cliente_id") || 0)
  const marcaIdSelecionada = Number(watch("marca_id") || 0)

  const clienteSelecionado = useMemo<Cliente | null>(() => {
    if (!clienteIdSelecionado) return null
    return (
      opcoesClientes.find((c) => c.id === clienteIdSelecionado) ??
      (clienteSelecionadoCache?.id === clienteIdSelecionado
        ? clienteSelecionadoCache
        : null) ??
      (veiculoEmEdicao?.cliente.id === clienteIdSelecionado
        ? veiculoEmEdicao.cliente
        : null)
    )
  }, [
    clienteIdSelecionado,
    opcoesClientes,
    clienteSelecionadoCache,
    veiculoEmEdicao,
  ])

  const marcaSelecionada = useMemo<MarcaVeiculo | null>(() => {
    if (!marcaIdSelecionada) return null
    return (
      opcoesMarcas.find((m) => m.id === marcaIdSelecionada) ??
      (marcaSelecionadaCache?.id === marcaIdSelecionada
        ? marcaSelecionadaCache
        : null) ??
      (veiculoEmEdicao?.marca.id === marcaIdSelecionada
        ? veiculoEmEdicao.marca
        : null)
    )
  }, [
    marcaIdSelecionada,
    opcoesMarcas,
    marcaSelecionadaCache,
    veiculoEmEdicao,
  ])

  useEffect(() => {
    if (modalAberto) {
      reset(valoresIniciais(veiculoEmEdicao))
      setBuscaClienteModal("")
      setBuscaMarcaModal("")
      setClienteSelecionadoCache(veiculoEmEdicao?.cliente ?? null)
      setMarcaSelecionadaCache(veiculoEmEdicao?.marca ?? null)
      setErroFormulario(null)
    }
  }, [modalAberto, veiculoEmEdicao, reset])

  function abrirNovo() {
    setVeiculoEmEdicao(null)
    setModalAberto(true)
  }

  function abrirEdicao(veiculo: Veiculo) {
    setVeiculoEmEdicao(veiculo)
    setModalAberto(true)
  }

  async function onSubmit(valores: VeiculoFormValues) {
    setErroFormulario(null)
    const anoFabLimpo = valores.ano_fabricacao.trim()
    const anoModLimpo = valores.ano_modelo.trim()
    const kmLimpo = valores.km.trim()
    const corLimpa = valores.cor.trim()
    const obsLimpa = valores.observacao.trim()

    const payload: VeiculoPayload = {
      cliente_id: valores.cliente_id,
      marca_id: valores.marca_id,
      modelo: valores.modelo.trim(),
      placa: normalizarPlaca(valores.placa),
      ano_fabricacao: anoFabLimpo ? Number(anoFabLimpo) : null,
      ano_modelo: anoModLimpo ? Number(anoModLimpo) : null,
      cor: corLimpa || null,
      km: kmLimpo ? Number(kmLimpo) : null,
      observacao: obsLimpa || null,
    }

    try {
      if (veiculoEmEdicao) {
        await atualizarMutation.mutateAsync({
          id: veiculoEmEdicao.id,
          payload,
        })
      } else {
        await criarMutation.mutateAsync(payload)
      }
      setModalAberto(false)
    } catch (err) {
      setErroFormulario(
        err instanceof Error ? err.message : "Erro ao salvar veículo.",
      )
    }
  }

  async function confirmarExclusao() {
    if (!veiculoParaExcluir) return
    setErroExclusao(null)
    try {
      await excluirMutation.mutateAsync(veiculoParaExcluir.id)
      setVeiculoParaExcluir(null)
    } catch (err) {
      setErroExclusao(
        err instanceof Error ? err.message : "Erro ao excluir veículo.",
      )
    }
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Veículos</h1>
        <Button onClick={abrirNovo}>Novo veículo</Button>
      </div>

      <div className="flex items-center gap-3">
        <Input
          placeholder="Buscar por placa, modelo ou cliente..."
          aria-label="Buscar veículos"
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value)
            setPage(1)
          }}
        />
      </div>

      {isLoading && (
        <p className="text-muted-foreground">Carregando veículos...</p>
      )}

      {isError && (
        <div className="flex flex-wrap items-center gap-3">
          <p role="alert" className="text-destructive">
            {error instanceof Error
              ? error.message
              : "Erro ao carregar veículos."}
          </p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <p className="text-muted-foreground">Nenhum veículo encontrado.</p>
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Placa</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Ano</TableHead>
                <TableHead>KM</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((veiculo) => (
                <TableRow key={veiculo.id}>
                  <TableCell className="font-mono font-medium">
                    {veiculo.placa}
                  </TableCell>
                  <TableCell>{veiculo.modelo}</TableCell>
                  <TableCell>{veiculo.marca.nome}</TableCell>
                  <TableCell>{veiculo.cliente.pessoa.nome}</TableCell>
                  <TableCell>
                    {formatarAnoVeiculo(
                      veiculo.ano_fabricacao,
                      veiculo.ano_modelo,
                    )}
                  </TableCell>
                  <TableCell>
                    {veiculo.km !== null
                      ? veiculo.km.toLocaleString("pt-BR")
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => abrirEdicao(veiculo)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setErroExclusao(null)
                          setVeiculoParaExcluir(veiculo)
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {veiculoEmEdicao ? "Editar veículo" : "Novo veículo"}
            </DialogTitle>
            <DialogDescription>
              Informe o cliente proprietário, a marca e os dados do veículo.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cliente_id">Cliente</Label>
              <CampoBuscaModal
                id="cliente_id"
                valorId={clienteIdSelecionado}
                textoSelecionado={
                  clienteSelecionado
                    ? `${clienteSelecionado.pessoa.nome} (${clienteSelecionado.pessoa.cpf ?? clienteSelecionado.pessoa.cnpj})`
                    : ""
                }
                placeholder="Clique na lupa para selecionar um cliente..."
                rotuloBotaoLupa="Pesquisar cliente"
                tituloModal="Selecionar cliente"
                descricaoModal="Busque e selecione o cliente proprietário do veículo."
                placeholderBusca="Buscar cliente por nome, CPF, CNPJ ou e-mail..."
                busca={buscaClienteModal}
                onBuscaChange={setBuscaClienteModal}
                carregando={carregandoClientes}
                mensagemVazio="Nenhum cliente encontrado."
                opcoes={opcoesClientes.map((cliente) => ({
                  id: cliente.id,
                  titulo: cliente.pessoa.nome,
                  subtitulo: `CPF/CNPJ: ${cliente.pessoa.cpf ?? cliente.pessoa.cnpj}`,
                  detalhe: cliente.pessoa.email,
                }))}
                onSelecionar={(idEscolhido) => {
                  const achado =
                    opcoesClientes.find((c) => c.id === idEscolhido) ?? null
                  if (achado) setClienteSelecionadoCache(achado)
                  setValue("cliente_id", idEscolhido, { shouldValidate: true })
                }}
              />
              {errors.cliente_id && (
                <p className="text-sm text-destructive">
                  {errors.cliente_id.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="marca_id">Marca</Label>
                <CampoBuscaModal
                  id="marca_id"
                  valorId={marcaIdSelecionada}
                  textoSelecionado={marcaSelecionada?.nome ?? ""}
                  placeholder="Clique na lupa para selecionar..."
                  rotuloBotaoLupa="Pesquisar marca"
                  tituloModal="Selecionar marca"
                  descricaoModal="Busque e selecione a marca do veículo."
                  placeholderBusca="Buscar marca por nome..."
                  busca={buscaMarcaModal}
                  onBuscaChange={setBuscaMarcaModal}
                  carregando={carregandoMarcas}
                  mensagemVazio="Nenhuma marca encontrada."
                  opcoes={opcoesMarcas.map((marca) => ({
                    id: marca.id,
                    titulo: marca.nome,
                  }))}
                  onSelecionar={(idEscolhido) => {
                    const achada =
                      opcoesMarcas.find((m) => m.id === idEscolhido) ?? null
                    if (achada) setMarcaSelecionadaCache(achada)
                    setValue("marca_id", idEscolhido, { shouldValidate: true })
                  }}
                />
                {errors.marca_id && (
                  <p className="text-sm text-destructive">
                    {errors.marca_id.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="modelo">Modelo</Label>
                <Input id="modelo" {...register("modelo")} />
                {errors.modelo && (
                  <p className="text-sm text-destructive">
                    {errors.modelo.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="placa">Placa</Label>
                <Input
                  id="placa"
                  placeholder="AAA9A99"
                  {...register("placa")}
                />
                {errors.placa && (
                  <p className="text-sm text-destructive">
                    {errors.placa.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ano_fabricacao">Ano fabricação</Label>
                <Input
                  id="ano_fabricacao"
                  placeholder="2020"
                  {...register("ano_fabricacao")}
                />
                {errors.ano_fabricacao && (
                  <p className="text-sm text-destructive">
                    {errors.ano_fabricacao.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ano_modelo">Ano modelo</Label>
                <Input
                  id="ano_modelo"
                  placeholder="2021"
                  {...register("ano_modelo")}
                />
                {errors.ano_modelo && (
                  <p className="text-sm text-destructive">
                    {errors.ano_modelo.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cor">Cor</Label>
                <Input id="cor" {...register("cor")} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="km">KM</Label>
                <Input id="km" placeholder="50000" {...register("km")} />
                {errors.km && (
                  <p className="text-sm text-destructive">
                    {errors.km.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="observacao">Observação</Label>
              <Input id="observacao" {...register("observacao")} />
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
        open={Boolean(veiculoParaExcluir)}
        onOpenChange={(aberto) => {
          if (!aberto) setVeiculoParaExcluir(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Deseja realmente excluir o veículo{" "}
              <strong>{veiculoParaExcluir?.placa}</strong> (
              {veiculoParaExcluir?.modelo})?
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
              onClick={() => setVeiculoParaExcluir(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={excluirMutation.isPending}
              onClick={() => void confirmarExclusao()}
            >
              {excluirMutation.isPending
                ? "Excluindo..."
                : "Confirmar exclusão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
