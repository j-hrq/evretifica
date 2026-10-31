import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { AppRoutes } from "@/App"
import { validarCnpj, validarCpf } from "@/lib/validacao"

describe("Validação de CPF e CNPJ no frontend", () => {
  it("valida CPF corretamente", () => {
    expect(validarCpf("52998224725")).toBe(true)
    expect(validarCpf("529.982.247-25")).toBe(true)
    expect(validarCpf("000.000.000-00")).toBe(false)
    expect(validarCpf("52998224700")).toBe(false)
  })

  it("valida CNPJ corretamente", () => {
    expect(validarCnpj("11222333000181")).toBe(true)
    expect(validarCnpj("11.222.333/0001-81")).toBe(true)
    expect(validarCnpj("00.000.000/0000-00")).toBe(false)
    expect(validarCnpj("11222333000100")).toBe(false)
  })
})

describe("Página de Clientes", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("exibe estado vazio, valida formulário e cria cliente com telefone", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
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

      if (url.startsWith("/api/clientes") && method === "GET") {
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

      if (url === "/api/clientes" && method === "POST") {
        return {
          ok: true,
          status: 201,
          json: async () => ({
            id: 10,
            pessoa_id: 20,
            ativo: true,
            data_criacao: "2026-10-31T12:00:00Z",
            data_alteracao: "2026-10-31T12:00:00Z",
            pessoa: {
              id: 20,
              nome: "Maria Oliveira",
              email: "maria@teste.com",
              cpf: "52998224725",
              cnpj: null,
              telefones: [
                {
                  id: 1,
                  ddd: "11",
                  telefone: "988887777",
                  tipo_id: 1,
                  data_criacao: "2026-10-31T12:00:00Z",
                  data_alteracao: "2026-10-31T12:00:00Z",
                },
              ],
              data_criacao: "2026-10-31T12:00:00Z",
              data_alteracao: "2026-10-31T12:00:00Z",
            },
          }),
        } as Response
      }

      throw new Error(`Chamada inesperada: ${method} ${url}`)
    })

    render(
      <MemoryRouter initialEntries={["/clientes"]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText("Nenhum cliente encontrado.")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: "Novo cliente" }))

    await waitFor(() => {
      expect(screen.getByLabelText("Nome")).toBeInTheDocument()
    })

    // Tenta salvar com CPF inválido e sem nome
    fireEvent.change(screen.getByLabelText("CPF"), {
      target: { value: "000.000.000-00" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }))

    await waitFor(() => {
      expect(screen.getByText("Nome é obrigatório.")).toBeInTheDocument()
      expect(screen.getByText("CPF inválido.")).toBeInTheDocument()
    })

    // Preenche corretamente e adiciona um telefone
    fireEvent.change(screen.getByLabelText("Nome"), {
      target: { value: "Maria Oliveira" },
    })
    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "maria@teste.com" },
    })
    fireEvent.change(screen.getByLabelText("CPF"), {
      target: { value: "529.982.247-25" },
    })

    fireEvent.click(screen.getByRole("button", { name: "Adicionar telefone" }))
    fireEvent.change(screen.getByLabelText("DDD"), {
      target: { value: "11" },
    })
    fireEvent.change(screen.getByLabelText("Número"), {
      target: { value: "98888-7777" },
    })

    fireEvent.click(screen.getByRole("button", { name: "Salvar" }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/clientes",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            ativo: true,
            pessoa: {
              nome: "Maria Oliveira",
              email: "maria@teste.com",
              cpf: "52998224725",
              cnpj: null,
              telefones: [{ ddd: "11", telefone: "988887777", tipo_id: 1 }],
            },
          }),
        }),
      )
    })
  })
})
