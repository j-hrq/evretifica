import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { apiFetch, EVENTO_NAO_AUTENTICADO } from "@/lib/api"

export interface Usuario {
  id: number
  login: string
  pessoa_id: number
  nome: string
}

interface AuthContextValue {
  usuario: Usuario | null
  carregando: boolean
  entrar: (login: string, senha: string) => Promise<void>
  sair: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [carregando, setCarregando] = useState<boolean>(true)

  useEffect(() => {
    let ativo = true

    async function carregarSessao() {
      try {
        const res = await apiFetch("/api/auth/me")
        if (!ativo) return
        if (res.ok) {
          const dados: Usuario = await res.json()
          setUsuario(dados)
        } else {
          setUsuario(null)
        }
      } catch {
        if (ativo) {
          setUsuario(null)
        }
      } finally {
        if (ativo) {
          setCarregando(false)
        }
      }
    }

    void carregarSessao()

    return () => {
      ativo = false
    }
  }, [])

  useEffect(() => {
    function aoDesautenticar() {
      setUsuario(null)
    }

    window.addEventListener(EVENTO_NAO_AUTENTICADO, aoDesautenticar)
    return () => {
      window.removeEventListener(EVENTO_NAO_AUTENTICADO, aoDesautenticar)
    }
  }, [])

  const entrar = useCallback(async (login: string, senha: string) => {
    const res = await apiFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, senha }),
    })

    if (!res.ok) {
      let mensagem = "Login ou senha inválidos."
      try {
        const erro = (await res.json()) as { detail?: string }
        if (erro.detail) {
          mensagem = erro.detail
        }
      } catch {
        // mantém mensagem padrão
      }
      throw new Error(mensagem)
    }

    const dados: Usuario = await res.json()
    setUsuario(dados)
  }, [])

  const sair = useCallback(async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" })
    } finally {
      setUsuario(null)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ usuario, carregando, entrar, sair }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.")
  }
  return ctx
}
