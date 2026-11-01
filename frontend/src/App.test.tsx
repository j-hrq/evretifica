import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { AppRoutes } from "./App"

describe("Autenticação e rotas protegidas", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("redireciona para a tela de login quando /api/auth/me retorna 401", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ detail: "Não autenticado." }),
    } as Response)

    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Entrar" }),
      ).toBeInTheDocument()
    })
  })

  it("realiza login, acessa o painel inicial, abre configuração do sistema e faz logout", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input.toString()
      if (url === "/api/auth/me") {
        return {
          ok: false,
          status: 401,
          json: async () => ({ detail: "Não autenticado." }),
        } as Response
      }
      if (url === "/api/auth/login") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 1,
            login: "admin",
            pessoa_id: 1,
            nome: "Oficina Admin",
          }),
        } as Response
      }
      if (
        url.startsWith("/api/ordens-servico") ||
        url.startsWith("/api/orcamentos") ||
        url.startsWith("/api/clientes") ||
        url.startsWith("/api/veiculos")
      ) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            items: [],
            total: 0,
            page: 1,
            per_page: 5,
            total_pages: 1,
          }),
        } as Response
      }
      if (url === "/api/health") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: "ok" }),
        } as Response
      }
      if (url === "/api/configuracao-oficina") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 1,
            nome_fantasia: "EVR Retífica",
            razao_social: "EVR Retífica",
            cnpj_cpf: "077.125.515-29",
            inscricao_estadual: null,
            telefone: "(75) 99118-1598",
            whatsapp: "(75) 99118-1598",
            email: "evrretifica@gmail.com",
            logradouro: "Rua São Salvador",
            numero: "1996",
            complemento: null,
            bairro: "35º BI",
            cidade: "Feira de Santana",
            estado: "BA",
            cep: "44094-060",
            nome_responsavel: "Evandro Ramos Rosado",
            data_criacao: "2026-10-31T00:00:00Z",
            data_alteracao: "2026-10-31T00:00:00Z",
          }),
        } as Response
      }
      if (url === "/api/auth/logout") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: "ok" }),
        } as Response
      }
      throw new Error(`URL inesperada: ${url}`)
    })

    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByLabelText("Login")).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText("Login"), {
      target: { value: "admin" },
    })
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "senha123" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }))

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "EVR Retifica" }),
      ).toBeInTheDocument()
      expect(screen.getByText("Oficina Admin")).toBeInTheDocument()
      expect(
        screen.getByRole("heading", { name: "Últimas Ordens de Serviço" }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole("heading", { name: "Últimos Orçamentos" }),
      ).toBeInTheDocument()
    })

    fireEvent.click(
      screen.getByRole("button", { name: "Abrir menu" }),
    )

    const menuMovel = screen.getByRole("navigation", { name: "Menu móvel" })
    expect(menuMovel).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole("link", { name: "Configuração do sistema" }),
    )

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Configuração do sistema" }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole("heading", { name: "Dados da Empresa / Oficina" }),
      ).toBeInTheDocument()
      expect(screen.getByText("ok")).toBeInTheDocument()
      expect(
        screen.queryByRole("navigation", { name: "Menu móvel" }),
      ).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("radio", { name: /Escuro/i }))
    expect(document.documentElement.classList.contains("dark")).toBe(true)
    expect(localStorage.getItem("evr-retifica-tema")).toBe("escuro")

    fireEvent.click(screen.getByRole("radio", { name: /Claro/i }))
    expect(document.documentElement.classList.contains("dark")).toBe(false)
    expect(localStorage.getItem("evr-retifica-tema")).toBe("claro")

    fireEvent.click(screen.getByRole("radio", { name: /Sistema/i }))
    expect(localStorage.getItem("evr-retifica-tema")).toBe("sistema")

    fireEvent.click(screen.getByRole("button", { name: "Sair" }))

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Entrar" }),
      ).toBeInTheDocument()
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/logout",
      expect.objectContaining({ method: "POST" }),
    )
  })
})
