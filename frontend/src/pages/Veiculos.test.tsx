import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { AppRoutes } from "@/App"
import { validarPlaca } from "@/lib/validacao"

describe("Validação pura de placa no frontend", () => {
  it("aceita padrão antigo e Mercosul com ou sem hífen", () => {
    expect(validarPlaca("ABC1234")).toBe(true)
    expect(validarPlaca("abc-1234")).toBe(true)
    expect(validarPlaca("BRA2E19")).toBe(true)
    expect(validarPlaca("bra-2e19")).toBe(true)
  })

  it("rejeita placas inválidas", () => {
    expect(validarPlaca("")).toBe(false)
    expect(validarPlaca("AB1234")).toBe(false)
    expect(validarPlaca("ABC12A3")).toBe(false)
    expect(validarPlaca("A-BC1234")).toBe(false)
  })
})

describe("Página de Veículos", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("lista veículo com ano AAAA/AAAA, valida formulário e cria veículo com placa normalizada", async () => {
    const clienteMock = {
      id: 10,
      pessoa_id: 10,
      ativo: true,
      pessoa: {
        id: 10,
        nome: "Carlos Motorista",
        email: "carlos@exemplo.com",
        cpf: "52998224725",
        cnpj: null,
        telefones: [],
        data_criacao: "2026-10-31T12:00:00Z",
        data_alteracao: "2026-10-31T12:00:00Z",
      },
      data_criacao: "2026-10-31T12:00:00Z",
      data_alteracao: "2026-10-31T12:00:00Z",
    }

    const marcaMock = {
      id: 5,
      nome: "Fiat",
      ativo: true,
      data_criacao: "2026-10-31T12:00:00Z",
      data_alteracao: "2026-10-31T12:00:00Z",
    }

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

        if (url.startsWith("/api/veiculos") && method === "GET") {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              items: [
                {
                  id: 1,
                  cliente_id: 10,
                  marca_id: 5,
                  modelo: "Uno Mille",
                  placa: "ABC1234",
                  ano_fabricacao: 2019,
                  ano_modelo: 2020,
                  cor: "Prata",
                  km: 45000,
                  observacao: null,
                  cliente: clienteMock,
                  marca: marcaMock,
                  data_criacao: "2026-10-31T12:00:00Z",
                  data_alteracao: "2026-10-31T12:00:00Z",
                },
              ],
              total: 1,
              page: 1,
              per_page: 10,
              total_pages: 1,
            }),
          } as Response
        }

        if (url.startsWith("/api/clientes") && method === "GET") {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              items: [clienteMock],
              total: 1,
              page: 1,
              per_page: 50,
              total_pages: 1,
            }),
          } as Response
        }

        if (url.startsWith("/api/marcas-veiculo") && method === "GET") {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              items: [marcaMock],
              total: 1,
              page: 1,
              per_page: 100,
              total_pages: 1,
            }),
          } as Response
        }

        if (url === "/api/veiculos" && method === "POST") {
          return {
            ok: true,
            status: 201,
            json: async () => ({
              id: 2,
              cliente_id: 10,
              marca_id: 5,
              modelo: "Argo",
              placa: "BRA2E19",
              ano_fabricacao: 2022,
              ano_modelo: 2023,
              cor: "Branco",
              km: 12000,
              observacao: null,
              cliente: clienteMock,
              marca: marcaMock,
              data_criacao: "2026-10-31T12:00:00Z",
              data_alteracao: "2026-10-31T12:00:00Z",
            }),
          } as Response
        }

        throw new Error(`Chamada inesperada: ${method} ${url}`)
      })

    render(
      <MemoryRouter initialEntries={["/veiculos"]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText("Uno Mille")).toBeInTheDocument()
      expect(screen.getByText("2019/2020")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: "Novo veículo" }))

    await waitFor(() => {
      expect(screen.getByLabelText("Placa")).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText("Placa"), {
      target: { value: "INVALIDA" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }))

    await waitFor(() => {
      expect(screen.getByText("Cliente é obrigatório.")).toBeInTheDocument()
      expect(screen.getByText("Marca é obrigatória.")).toBeInTheDocument()
      expect(screen.getByText("Modelo é obrigatório.")).toBeInTheDocument()
      expect(
        screen.getByText("Placa inválida. Use o padrão AAA9999 ou AAA9A99."),
      ).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: "Pesquisar cliente" }))
    await waitFor(() => {
      expect(screen.getByText("Selecionar cliente")).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole("button", { name: "Selecionar" }))

    fireEvent.click(screen.getByRole("button", { name: "Pesquisar marca" }))
    await waitFor(() => {
      expect(screen.getByText("Selecionar marca")).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole("button", { name: "Selecionar" }))

    fireEvent.change(screen.getByLabelText("Modelo"), {
      target: { value: "Argo" },
    })
    fireEvent.change(screen.getByLabelText("Placa"), {
      target: { value: "bra-2e19" },
    })
    fireEvent.change(screen.getByLabelText("Ano fabricação"), {
      target: { value: "2022" },
    })
    fireEvent.change(screen.getByLabelText("Ano modelo"), {
      target: { value: "2023" },
    })

    fireEvent.click(screen.getByRole("button", { name: "Salvar" }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/veiculos",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            cliente_id: 10,
            marca_id: 5,
            modelo: "Argo",
            placa: "BRA2E19",
            ano_fabricacao: 2022,
            ano_modelo: 2023,
            cor: null,
            km: null,
            observacao: null,
          }),
        }),
      )
    })
  })
})
