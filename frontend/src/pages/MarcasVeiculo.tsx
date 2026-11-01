import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
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
import {
  useAtualizarMarcaVeiculo,
  useCriarMarcaVeiculo,
  useExcluirMarcaVeiculo,
  useMarcasVeiculo,
  type MarcaVeiculo,
} from "@/hooks/useMarcasVeiculo"
import {
  marcaVeiculoFormSchema,
  type MarcaVeiculoFormValues,
} from "@/lib/validacao"

function valoresIniciais(marca: MarcaVeiculo | null): MarcaVeiculoFormValues {
  if (!marca) {
    return {
      nome: "",
      ativo: true,
    }
  }
  return {
    nome: marca.nome,
    ativo: marca.ativo,
  }
}

export function MarcasVeiculo() {
  const [busca, setBusca] = useState<string>("")
  const [filtroAtivo, setFiltroAtivo] = useState<string>("")
  const [page, setPage] = useState<number>(1)
  const [modalAberto, setModalAberto] = useState<boolean>(false)
  const [marcaEmEdicao, setMarcaEmEdicao] = useState<MarcaVeiculo | null>(null)
  const [marcaParaExcluir, setMarcaParaExcluir] = useState<MarcaVeiculo | null>(
    null,
  )
  const [erroFormulario, setErroFormulario] = useState<string | null>(null)
  const [erroExclusao, setErroExclusao] = useState<string | null>(null)

  const ativoParam =
    filtroAtivo === "true" ? true : filtroAtivo === "false" ? false : undefined

  const { data, isLoading, isError, error, refetch } = useMarcasVeiculo({
    q: busca,
    ativo: ativoParam,
    page,
    per_page: 10,
  })
  const criarMutation = useCriarMarcaVeiculo()
  const atualizarMutation = useAtualizarMarcaVeiculo()
  const excluirMutation = useExcluirMarcaVeiculo()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MarcaVeiculoFormValues>({
    resolver: zodResolver(marcaVeiculoFormSchema),
    defaultValues: valoresIniciais(null),
  })

  useEffect(() => {
    if (modalAberto) {
      reset(valoresIniciais(marcaEmEdicao))
      setErroFormulario(null)
    }
  }, [modalAberto, marcaEmEdicao, reset])

  function abrirNova() {
    setMarcaEmEdicao(null)
    setModalAberto(true)
  }

  function abrirEdicao(marca: MarcaVeiculo) {
    setMarcaEmEdicao(marca)
    setModalAberto(true)
  }

  async function onSubmit(valores: MarcaVeiculoFormValues) {
    setErroFormulario(null)
    const payload = {
      nome: valores.nome.trim(),
      ativo: valores.ativo,
    }

    try {
      if (marcaEmEdicao) {
        await atualizarMutation.mutateAsync({
          id: marcaEmEdicao.id,
          payload,
        })
      } else {
        await criarMutation.mutateAsync(payload)
      }
      setModalAberto(false)
    } catch (err) {
      setErroFormulario(
        err instanceof Error ? err.message : "Erro ao salvar marca de veículo.",
      )
    }
  }

  async function confirmarExclusao() {
    if (!marcaParaExcluir) return
    setErroExclusao(null)
    try {
      await excluirMutation.mutateAsync(marcaParaExcluir.id)
      setMarcaParaExcluir(null)
    } catch (err) {
      setErroExclusao(
        err instanceof Error
          ? err.message
          : "Erro ao excluir marca de veículo.",
      )
    }
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Marcas de veículo</h1>
        <Button onClick={abrirNova}>Nova marca</Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Input
            placeholder="Buscar por nome..."
            aria-label="Buscar marcas de veículo"
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
            value={filtroAtivo}
            onChange={(e) => {
              setFiltroAtivo(e.target.value)
              setPage(1)
            }}
          >
            <option value="">Todos os status</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
        </div>
      </div>

      {isLoading && (
        <p className="text-muted-foreground">Carregando marcas de veículo...</p>
      )}

      {isError && (
        <div className="flex flex-wrap items-center gap-3">
          <p role="alert" className="text-destructive">
            {error instanceof Error
              ? error.message
              : "Erro ao carregar marcas de veículo."}
          </p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <p className="text-muted-foreground">
          Nenhuma marca de veículo encontrada.
        </p>
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((marca) => (
                <TableRow key={marca.id}>
                  <TableCell className="font-medium">{marca.nome}</TableCell>
                  <TableCell>
                    <Badge variant={marca.ativo ? "default" : "secondary"}>
                      {marca.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => abrirEdicao(marca)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setErroExclusao(null)
                          setMarcaParaExcluir(marca)
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {marcaEmEdicao ? "Editar marca" : "Nova marca"}
            </DialogTitle>
            <DialogDescription>
              Informe o nome e o status da marca de veículo.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" {...register("nome")} />
              {errors.nome && (
                <p className="text-sm text-destructive">{errors.nome.message}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                id="ativo"
                type="checkbox"
                className="h-4 w-4 rounded border-input outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                {...register("ativo")}
              />
              <Label htmlFor="ativo">Ativo</Label>
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
        open={Boolean(marcaParaExcluir)}
        onOpenChange={(aberto) => {
          if (!aberto) setMarcaParaExcluir(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a marca{" "}
              <strong>{marcaParaExcluir?.nome}</strong>?
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
              onClick={() => setMarcaParaExcluir(null)}
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
