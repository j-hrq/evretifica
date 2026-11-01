import { useState, type ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { LogOut, Menu, Settings, Wrench, X } from "lucide-react"
import {
  BrowserRouter,
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
} from "react-router-dom"
import { Button } from "@/components/ui/button"
import { AuthProvider, useAuth } from "@/hooks/useAuth"
import { TemaProvider } from "@/hooks/useTema"
import { Clientes } from "@/pages/Clientes"
import { Configuracoes } from "@/pages/Configuracoes"
import { Home } from "@/pages/Home"
import { Itens } from "@/pages/Itens"
import { Login } from "@/pages/Login"
import { MarcasVeiculo } from "@/pages/MarcasVeiculo"
import { Orcamentos } from "@/pages/Orcamentos"
import { OrdensServico } from "@/pages/OrdensServico"
import { Veiculos } from "@/pages/Veiculos"

const LINKS_MENU = [
  { to: "/", label: "Início", end: true },
  { to: "/clientes", label: "Clientes" },
  { to: "/marcas-veiculo", label: "Marcas" },
  { to: "/veiculos", label: "Veículos" },
  { to: "/itens", label: "Itens" },
  { to: "/orcamentos", label: "Orçamentos" },
  { to: "/ordens-servico", label: "OS" },
]

function LayoutAutenticado({ children }: { children: ReactNode }) {
  const { usuario, sair } = useAuth()
  const [menuAberto, setMenuAberto] = useState(false)

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              onClick={() => setMenuAberto(false)}
              className="flex shrink-0 items-center gap-2 font-bold tracking-tight"
            >
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Wrench className="size-3.5" />
              </span>
              <span>EVR Retifica</span>
            </Link>
            <nav
              aria-label="Navegação principal"
              className="hidden items-center gap-1 lg:flex"
            >
              {LINKS_MENU.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    isActive
                      ? "rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-foreground transition-colors"
                      : "rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {usuario && (
              <span className="hidden rounded-md bg-muted/60 px-2.5 py-1 text-xs font-medium text-muted-foreground xl:inline-block">
                {usuario.nome}
              </span>
            )}
            <NavLink
              to="/configuracoes"
              onClick={() => setMenuAberto(false)}
              aria-label="Configuração do sistema"
              title="Configuração do sistema"
              className={({ isActive }) =>
                `inline-flex size-8 items-center justify-center rounded-md border text-sm transition-colors ${
                  isActive
                    ? "bg-secondary text-foreground"
                    : "bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`
              }
            >
              <Settings className="size-4" />
            </NavLink>
            <Button variant="outline" size="sm" onClick={() => void sair()}>
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="lg:hidden"
              aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
              aria-expanded={menuAberto}
              onClick={() => setMenuAberto((atual) => !atual)}
            >
              {menuAberto ? (
                <X className="size-4" />
              ) : (
                <Menu className="size-4" />
              )}
            </Button>
          </div>
        </div>

        {menuAberto && (
          <nav
            aria-label="Menu móvel"
            className="border-t bg-background px-4 py-3 shadow-sm lg:hidden"
          >
            {usuario && (
              <div className="mb-2 border-b pb-2 text-xs text-muted-foreground xl:hidden">
                Conectado como{" "}
                <span className="font-medium text-foreground">
                  {usuario.nome}
                </span>
              </div>
            )}
            <div className="flex flex-col gap-1">
              {LINKS_MENU.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMenuAberto(false)}
                  className={({ isActive }) =>
                    isActive
                      ? "flex items-center rounded-md bg-secondary px-3 py-2 text-sm font-semibold text-foreground transition-colors"
                      : "flex items-center rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </nav>
        )}
      </header>
      {children}
    </div>
  )
}

function RotaProtegida({ children }: { children: ReactNode }) {
  const { usuario, carregando } = useAuth()

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="text-muted-foreground">Carregando...</p>
      </main>
    )
  }

  if (!usuario) {
    return <Navigate to="/login" replace />
  }

  return <LayoutAutenticado>{children}</LayoutAutenticado>
}

export function AppRoutes() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <TemaProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <RotaProtegida>
                  <Home />
                </RotaProtegida>
              }
            />
            <Route
              path="/clientes"
              element={
                <RotaProtegida>
                  <Clientes />
                </RotaProtegida>
              }
            />
            <Route
              path="/marcas-veiculo"
              element={
                <RotaProtegida>
                  <MarcasVeiculo />
                </RotaProtegida>
              }
            />
            <Route
              path="/veiculos"
              element={
                <RotaProtegida>
                  <Veiculos />
                </RotaProtegida>
              }
            />
            <Route
              path="/itens"
              element={
                <RotaProtegida>
                  <Itens />
                </RotaProtegida>
              }
            />
            <Route
              path="/orcamentos"
              element={
                <RotaProtegida>
                  <Orcamentos />
                </RotaProtegida>
              }
            />
            <Route
              path="/ordens-servico"
              element={
                <RotaProtegida>
                  <OrdensServico />
                </RotaProtegida>
              }
            />
            <Route
              path="/configuracoes"
              element={
                <RotaProtegida>
                  <Configuracoes />
                </RotaProtegida>
              }
            />
          </Routes>
        </AuthProvider>
      </TemaProvider>
    </QueryClientProvider>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App
