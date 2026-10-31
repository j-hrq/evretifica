import { useEffect, useState } from "react"
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
import {
  useAtualizarCliente,
  useClientes,
  useCriarCliente,
  useExcluirCliente,
  type Cliente,
  type ClientePayload,
} from "@/hooks/useClientes"
import {
  clienteFormSchema,
  TIPO_TELEFONE_LABELS,
  TipoTelefone,
  type ClienteFormValues,
} from "@/lib/validacao"

function valoresIniciais(cliente: Cliente | null): ClienteFormValues {
  if (!cliente) {
    return {
      nome: "",
      email: "",
      tipo_documento: "cpf",
      documento: "",
      ativo: true,
      telefones: [],
    }
  }
  const ehCnpj = Boolean(cliente.pessoa.cnpj)
  return {
    nome: cliente.pessoa.nome,
    email: cliente.pessoa.email ?? "",
    tipo_documento: ehCnpj ? "cnpj" : "cpf",
    documento: cliente.pessoa.cnpj ?? cliente.pessoa.cpf ?? "",
    ativo: cliente.ativo,
    telefones: cliente.pessoa.telefones.map((t) => ({
      ddd: t.ddd,
      telefone: t.telefone,
      tipo_id: t.tipo_id,
    })),
  }
}

export function Clientes() {
  const [busca, setBusca] = useState<string>("")
  const [filtroAtivo, setFiltroAtivo] = useState<string>("")
  const [page, setPage] = useState<number>(1)
  const [modalAberto, setModalAberto] = useState<boolean>(false)
  const [clienteEmEdicao, setClienteEmEdicao] = useState<Cliente | null>(null)
  const [clienteParaExcluir, setClienteParaExcluir] = useState<Cliente | null>(
    null,
  )
  const [erroFormulario, setErroFormulario] = useState<string | null>(null)
  const [erroExclusao, setErroExclusao] = useState<string | null>(null)

  const ativoParam =
    filtroAtivo === "true" ? true : filtroAtivo === "false" ? false : undefined

  const { data, isLoading, isError, error, refetch } = useClientes({
    q: busca,
    ativo: ativoParam,
    page,
    per_page: 10,
  })
  const criarMutation = useCriarCliente()
  const atualizarMutation = useAtualizarCliente()
  const excluirMutation = useExcluirCliente()

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteFormSchema),
    defaultValues: valoresIniciais(null),
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "telefones",
  })

  const tipoDocumento = watch("tipo_documento")

  useEffect(() => {
    if (modalAberto) {
      reset(valoresIniciais(clienteEmEdicao))
      setErroFormulario(null)
    }
  }, [modalAberto, clienteEmEdicao, reset])

  function abrirNovo() {
    setClienteEmEdicao(null)
    setModalAberto(true)
  }

  function abrirEdicao(cliente: Cliente) {
    setClienteEmEdicao(cliente)
    setModalAberto(true)
  }

  async function onSubmit(valores: ClienteFormValues) {
    setErroFormulario(null)
    const payload: ClientePayload = {
      ativo: valores.ativo,
      pessoa: {
        nome: valores.nome.trim(),
        email: valores.email?.trim() ? valores.email.trim() : null,
        cpf:
          valores.tipo_documento === "cpf"
            ? valores.documento.replace(/[.\-\s]/g, "")
            : null,
        cnpj:
          valores.tipo_documento === "cnpj"
            ? valores.documento.replace(/[.\-/\s]/g, "")
            : null,
        telefones: valores.telefones.map((t) => ({
          ddd: t.ddd.trim(),
          telefone: t.telefone.replace(/[-\s]/g, ""),
          tipo_id: Number(t.tipo_id),
        })),
      },
    }

    try {
      if (clienteEmEdicao) {
        await atualizarMutation.mutateAsync({
          id: clienteEmEdicao.id,
          payload,
        })
      } else {
        await criarMutation.mutateAsync(payload)
      }
      setModalAberto(false)
    } catch (err) {
      setErroFormulario(
        err instanceof Error ? err.message : "Erro ao salvar cliente.",
      )
    }
  }

  async function confirmarExclusao() {
    if (!clienteParaExcluir) return
    setErroExclusao(null)
    try {
      await excluirMutation.mutateAsync(clienteParaExcluir.id)
      setClienteParaExcluir(null)
    } catch (err) {
      setErroExclusao(
        err instanceof Error ? err.message : "Erro ao excluir cliente.",
      )
    }
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <Button onClick={abrirNovo}>Novo cliente</Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Input
            placeholder="Buscar por nome, e-mail, CPF ou CNPJ..."
            aria-label="Buscar clientes"
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
        <p className="text-muted-foreground">Carregando clientes...</p>
      )}

      {isError && (
        <div className="flex flex-wrap items-center gap-3">
          <p role="alert" className="text-destructive">
            {error instanceof Error
              ? error.message
              : "Erro ao carregar clientes."}
          </p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <p className="text-muted-foreground">Nenhum cliente encontrado.</p>
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF / CNPJ</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefones</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((cliente) => (
                <TableRow key={cliente.id}>
                  <TableCell className="font-medium">
                    {cliente.pessoa.nome}
                  </TableCell>
                  <TableCell>
                    {cliente.pessoa.cpf ?? cliente.pessoa.cnpj}
                  </TableCell>
                  <TableCell>{cliente.pessoa.email ?? "-"}</TableCell>
                  <TableCell>
                    {cliente.pessoa.telefones.length === 0
                      ? "-"
                      : cliente.pessoa.telefones
                          .map(
                            (t) =>
                              `(${t.ddd}) ${t.telefone} (${TIPO_TELEFONE_LABELS[t.tipo_id] ?? t.tipo_id})`,
                          )
                          .join(", ")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={cliente.ativo ? "default" : "secondary"}>
                      {cliente.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => abrirEdicao(cliente)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setErroExclusao(null)
                        setClienteParaExcluir(cliente)
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
              {clienteEmEdicao ? "Editar cliente" : "Novo cliente"}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados da pessoa, documento e telefones do cliente.
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

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tipo_documento">Tipo</Label>
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
                  {tipoDocumento === "cnpj" ? "CNPJ" : "CPF"}
                </Label>
                <Input id="documento" {...register("documento")} />
                {errors.documento && (
                  <p className="text-sm text-destructive">
                    {errors.documento.message}
                  </p>
                )}
              </div>
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

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Telefones</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      ddd: "",
                      telefone: "",
                      tipo_id: TipoTelefone.CELULAR,
                    })
                  }
                >
                  Adicionar telefone
                </Button>
              </div>

              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid grid-cols-1 items-start gap-2 rounded-md border p-2 sm:grid-cols-12"
                >
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <Label htmlFor={`telefones.${index}.ddd`}>DDD</Label>
                    <Input
                      id={`telefones.${index}.ddd`}
                      placeholder="11"
                      {...register(`telefones.${index}.ddd`)}
                    />
                    {errors.telefones?.[index]?.ddd && (
                      <p className="text-xs text-destructive">
                        {errors.telefones[index]?.ddd?.message}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 sm:col-span-5">
                    <Label htmlFor={`telefones.${index}.telefone`}>Número</Label>
                    <Input
                      id={`telefones.${index}.telefone`}
                      placeholder="988887777"
                      {...register(`telefones.${index}.telefone`)}
                    />
                    {errors.telefones?.[index]?.telefone && (
                      <p className="text-xs text-destructive">
                        {errors.telefones[index]?.telefone?.message}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 sm:col-span-3">
                    <Label htmlFor={`telefones.${index}.tipo_id`}>
                      Tipo de telefone
                    </Label>
                    <select
                      id={`telefones.${index}.tipo_id`}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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

                  <div className="flex flex-col gap-1 sm:col-span-2 sm:pt-5">
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
              ))}
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
        open={Boolean(clienteParaExcluir)}
        onOpenChange={(aberto) => {
          if (!aberto) setClienteParaExcluir(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o cliente{" "}
              <strong>{clienteParaExcluir?.pessoa.nome}</strong>?
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
              onClick={() => setClienteParaExcluir(null)}
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
