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

  it("realiza login, acessa a tela inicial e faz logout", async () => {
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
      if (url === "/api/health") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: "ok" }),
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
        screen.getByRole("heading", { name: "Oficina OS" }),
      ).toBeInTheDocument()
      expect(screen.getByText("Oficina Admin")).toBeInTheDocument()
      expect(screen.getByText("ok")).toBeInTheDocument()
    })

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
