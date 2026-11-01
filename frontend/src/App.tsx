import { useState, type ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
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
import { Clientes } from "@/pages/Clientes"
import { Home } from "@/pages/Home"
import { Itens } from "@/pages/Itens"
import { Login } from "@/pages/Login"
import { MarcasVeiculo } from "@/pages/MarcasVeiculo"
import { Orcamentos } from "@/pages/Orcamentos"
import { OrdensServico } from "@/pages/OrdensServico"
import { Veiculos } from "@/pages/Veiculos"

const LINKS_MENU = [
  { to: "/clientes", label: "Clientes" },
  { to: "/marcas-veiculo", label: "Marcas" },
  { to: "/veiculos", label: "Veículos" },
  { to: "/itens", label: "Itens" },
  { to: "/orcamentos", label: "Orçamentos" },
  { to: "/ordens-servico", label: "OS" },
]

function LayoutAutenticado({ children }: { children: ReactNode }) {
  const { usuario, sair } = useAuth()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <nav
            aria-label="Navegação principal"
            className="flex flex-wrap items-center gap-4"
          >
            <Link to="/" className="font-bold">
              Oficina OS
            </Link>
            {LINKS_MENU.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  isActive
                    ? "text-sm font-semibold text-foreground underline underline-offset-4"
                    : "text-sm text-muted-foreground hover:text-foreground"
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {usuario && (
              <span className="text-sm text-muted-foreground">
                {usuario.nome}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={() => void sair()}>
              Sair
            </Button>
          </div>
        </div>
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
        </Routes>
      </AuthProvider>
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
