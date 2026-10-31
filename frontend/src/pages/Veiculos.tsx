import { useEffect, useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
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
  const [erroFormulario, setErroFormulario] = useState<string | null>(null)
  const [erroExclusao, setErroExclusao] = useState<string | null>(null)

  const { data, isLoading, isError, error } = useVeiculos({
    q: busca,
    page,
    per_page: 10,
  })
  const { data: clientesAtivosData } = useClientes({
    q: buscaClienteModal,
    ativo: true,
    page: 1,
    per_page: 50,
  })
  const { data: marcasAtivasData } = useMarcasVeiculo({
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
    formState: { errors, isSubmitting },
  } = useForm<VeiculoFormValues>({
    resolver: zodResolver(veiculoFormSchema),
    defaultValues: valoresIniciais(null),
  })

  useEffect(() => {
    if (modalAberto) {
      reset(valoresIniciais(veiculoEmEdicao))
      setBuscaClienteModal("")
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
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
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
        <p role="alert" className="text-destructive">
          {error instanceof Error ? error.message : "Erro ao carregar veículos."}
        </p>
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
                  <TableCell className="flex justify-end gap-2">
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
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
              <Label htmlFor="busca_cliente">Buscar cliente</Label>
              <Input
                id="busca_cliente"
                placeholder="Filtrar cliente por nome ou CPF/CNPJ..."
                value={buscaClienteModal}
                onChange={(e) => setBuscaClienteModal(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cliente_id">Cliente</Label>
              <select
                id="cliente_id"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                {...register("cliente_id", { valueAsNumber: true })}
              >
                <option value={0}>Selecione um cliente...</option>
                {opcoesClientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.pessoa.nome} (
                    {cliente.pessoa.cpf ?? cliente.pessoa.cnpj})
                  </option>
                ))}
              </select>
              {errors.cliente_id && (
                <p className="text-sm text-destructive">
                  {errors.cliente_id.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="marca_id">Marca</Label>
                <select
                  id="marca_id"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                  {...register("marca_id", { valueAsNumber: true })}
                >
                  <option value={0}>Selecione uma marca...</option>
                  {opcoesMarcas.map((marca) => (
                    <option key={marca.id} value={marca.id}>
                      {marca.nome}
                    </option>
                  ))}
                </select>
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

            <div className="grid grid-cols-3 gap-3">
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

            <div className="grid grid-cols-2 gap-3">
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
              Tem certeza que deseja excluir o veículo{" "}
              <strong>
                {veiculoParaExcluir?.modelo} ({veiculoParaExcluir?.placa})
              </strong>
              ?
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
              Confirmar exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
