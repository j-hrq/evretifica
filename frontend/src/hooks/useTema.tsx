import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

export type PreferenciaTema = "claro" | "escuro" | "sistema"

const CHAVE_STORAGE_TEMA = "evr-retifica-tema"

interface TemaContextValue {
  tema: PreferenciaTema
  definirTema: (novoTema: PreferenciaTema) => void
}

const TemaContext = createContext<TemaContextValue | undefined>(undefined)

function lerTemaInicial(): PreferenciaTema {
  try {
    const salvo = localStorage.getItem(CHAVE_STORAGE_TEMA)
    if (salvo === "claro" || salvo === "escuro" || salvo === "sistema") {
      return salvo
    }
  } catch {
    // localStorage indisponível
  }
  return "sistema"
}

function sistemaPrefereEscuro(): boolean {
  if (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function"
  ) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
  }
  return false
}

function aplicarClasseTema(preferencia: PreferenciaTema) {
  const escuro =
    preferencia === "escuro" ||
    (preferencia === "sistema" && sistemaPrefereEscuro())
  const root = document.documentElement
  root.classList.toggle("dark", escuro)
}

export function TemaProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<PreferenciaTema>(lerTemaInicial)

  useEffect(() => {
    aplicarClasseTema(tema)

    if (
      tema !== "sistema" ||
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const aoMudarPreferenciaSistema = () => {
      aplicarClasseTema("sistema")
    }

    mediaQuery.addEventListener("change", aoMudarPreferenciaSistema)
    return () => {
      mediaQuery.removeEventListener("change", aoMudarPreferenciaSistema)
    }
  }, [tema])

  const definirTema = useCallback((novoTema: PreferenciaTema) => {
    setTema(novoTema)
    try {
      localStorage.setItem(CHAVE_STORAGE_TEMA, novoTema)
    } catch {
      // ignora falha de escrita em storage
    }
  }, [])

  return (
    <TemaContext.Provider value={{ tema, definirTema }}>
      {children}
    </TemaContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTema(): TemaContextValue {
  const ctx = useContext(TemaContext)
  if (!ctx) {
    throw new Error("useTema deve ser usado dentro de TemaProvider.")
  }
  return ctx
}
