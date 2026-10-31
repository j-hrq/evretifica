import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { AppRoutes } from "@/App"

describe("Página de Itens", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("exibe estado vazio, valida formulário e cria item", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input, init) => {
        const url = typeof input === "string" ? input : input.toString()
        const method = init?.method ?? "GET"

        if (url === "/api/auth/me") {
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

        if (url.startsWith("/api/itens") && method === "GET") {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              items: [],
              total: 0,
              page: 1,
              per_page: 10,
              total_pages: 1,
            }),
          } as Response
        }

        if (url === "/api/itens" && method === "POST") {
          return {
            ok: true,
            status: 201,
            json: async () => ({
              id: 1,
              nome: "Retífica de cabeçote",
              ativo: true,
              data_criacao: "2026-10-31T12:00:00Z",
              data_alteracao: "2026-10-31T12:00:00Z",
            }),
          } as Response
        }

        throw new Error(`Chamada inesperada: ${method} ${url}`)
      })

    render(
      <MemoryRouter initialEntries={["/itens"]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText("Nenhum item encontrado.")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: "Novo item" }))

    await waitFor(() => {
      expect(screen.getByLabelText("Nome")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: "Salvar" }))

    await waitFor(() => {
      expect(screen.getByText("Nome é obrigatório.")).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText("Nome"), {
      target: { value: "Retífica de cabeçote" },
    })

    fireEvent.click(screen.getByRole("button", { name: "Salvar" }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/itens",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ nome: "Retífica de cabeçote", ativo: true }),
        }),
      )
    })
  })
})
