import { useState } from "react"
import { Check, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

export interface OpcaoBuscaModal {
  id: number
  titulo: string
  subtitulo?: string | null
  detalhe?: string | null
}

interface CampoBuscaModalProps {
  id: string
  valorId: number
  textoSelecionado: string
  placeholder: string
  rotuloBotaoLupa: string
  tituloModal: string
  descricaoModal: string
  placeholderBusca: string
  busca: string
  onBuscaChange: (valor: string) => void
  opcoes: OpcaoBuscaModal[]
  carregando?: boolean
  mensagemVazio?: string
  onSelecionar: (id: number) => void
}

export function CampoBuscaModal({
  id,
  valorId,
  textoSelecionado,
  placeholder,
  rotuloBotaoLupa,
  tituloModal,
  descricaoModal,
  placeholderBusca,
  busca,
  onBuscaChange,
  opcoes,
  carregando = false,
  mensagemVazio = "Nenhum registro encontrado.",
  onSelecionar,
}: CampoBuscaModalProps) {
  const [aberto, setAberto] = useState(false)

  function handleEscolher(opcaoId: number) {
    onSelecionar(opcaoId)
    setAberto(false)
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        <Input
          id={id}
          readOnly
          value={textoSelecionado}
          title={textoSelecionado || placeholder}
          placeholder={placeholder}
          onClick={() => setAberto(true)}
          className="cursor-pointer truncate bg-background"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={rotuloBotaoLupa}
          title={rotuloBotaoLupa}
          onClick={() => setAberto(true)}
          className="shrink-0"
        >
          <Search className="size-4" />
        </Button>
      </div>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{tituloModal}</DialogTitle>
            <DialogDescription>{descricaoModal}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
              <Input
                aria-label={placeholderBusca}
                placeholder={placeholderBusca}
                value={busca}
                onChange={(e) => onBuscaChange(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="max-h-72 divide-y overflow-y-auto rounded-md border">
              {carregando ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  Carregando...
                </p>
              ) : opcoes.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  {mensagemVazio}
                </p>
              ) : (
                opcoes.map((opcao) => {
                  const ativo = valorId === opcao.id
                  return (
                    <div
                      key={opcao.id}
                      className={`flex items-center justify-between gap-3 p-3 transition-colors hover:bg-muted/60 ${
                        ativo ? "bg-secondary/40" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {opcao.titulo}
                        </p>
                        {opcao.subtitulo && (
                          <p className="truncate text-xs text-muted-foreground">
                            {opcao.subtitulo}
                          </p>
                        )}
                        {opcao.detalhe && (
                          <p className="truncate text-xs text-muted-foreground">
                            {opcao.detalhe}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant={ativo ? "default" : "secondary"}
                        size="sm"
                        className="shrink-0"
                        onClick={() => handleEscolher(opcao.id)}
                      >
                        {ativo && <Check className="size-3.5" />}
                        Selecionar
                      </Button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
