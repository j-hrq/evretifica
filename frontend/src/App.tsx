import { useState, type ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { AuthProvider, useAuth } from "@/hooks/useAuth"
import { Clientes } from "@/pages/Clientes"
import { Home } from "@/pages/Home"
import { Itens } from "@/pages/Itens"
import { Login } from "@/pages/Login"
import { MarcasVeiculo } from "@/pages/MarcasVeiculo"
import { Orcamentos } from "@/pages/Orcamentos"
import { Veiculos } from "@/pages/Veiculos"

function LayoutAutenticado({ children }: { children: ReactNode }) {
  const { usuario, sair } = useAuth()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <nav className="flex items-center gap-4">
            <Link to="/" className="font-bold">
              Oficina OS
            </Link>
            <Link
              to="/clientes"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Clientes
            </Link>
            <Link
              to="/marcas-veiculo"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Marcas
            </Link>
            <Link
              to="/veiculos"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Veículos
            </Link>
            <Link
              to="/itens"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Itens
            </Link>
            <Link
              to="/orcamentos"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Orçamentos
            </Link>
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
