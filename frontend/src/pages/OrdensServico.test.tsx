import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { AppRoutes } from "@/App"

describe("Página de Ordens de serviço", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("valida formulário, atualiza total enquanto digita e envia ordem de serviço com km_entrada", async () => {
    const clienteMock = {
      id: 10,
      pessoa_id: 10,
      ativo: true,
      pessoa: {
        id: 10,
        nome: "Marcos Proprietário",
        email: "marcos@exemplo.com",
        cpf: "52998224725",
        cnpj: null,
        telefones: [],
        data_criacao: "2026-10-31T12:00:00Z",
        data_alteracao: "2026-10-31T12:00:00Z",
      },
      data_criacao: "2026-10-31T12:00:00Z",
      data_alteracao: "2026-10-31T12:00:00Z",
    }

    const veiculoMock = {
      id: 8,
      cliente_id: 10,
      marca_id: 3,
      modelo: "Corolla",
      placa: "DEF2G34",
      ano_fabricacao: 2021,
      ano_modelo: 2022,
      cor: "Cinza",
      km: 75000,
      observacao: null,
      cliente: clienteMock,
      marca: {
        id: 3,
        nome: "Toyota",
        ativo: true,
        data_criacao: "2026-10-31T12:00:00Z",
        data_alteracao: "2026-10-31T12:00:00Z",
      },
      data_criacao: "2026-10-31T12:00:00Z",
      data_alteracao: "2026-10-31T12:00:00Z",
    }

    const itemMock = {
      id: 5,
      nome: "Brunimento de cilindros",
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

        if (url.startsWith("/api/ordens-servico") && method === "GET") {
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

        if (url.startsWith("/api/veiculos") && method === "GET") {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              items: [veiculoMock],
              total: 1,
              page: 1,
              per_page: 50,
              total_pages: 1,
            }),
          } as Response
        }

        if (url.startsWith("/api/itens") && method === "GET") {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              items: [itemMock],
              total: 1,
              page: 1,
              per_page: 100,
              total_pages: 1,
            }),
          } as Response
        }

        if (url === "/api/ordens-servico" && method === "POST") {
          return {
            ok: true,
            status: 201,
            json: async () => ({
              id: 1,
              numero: "001-2026-OS",
              cliente_id: 10,
              veiculo_id: 8,
              km_entrada: 75200,
              status_id: 1,
              descricao: "Serviço de brunimento",
              total: 45000,
              cliente: clienteMock,
              veiculo: veiculoMock,
              itens: [
                {
                  id: 1,
                  ordem_servico_id: 1,
                  item_id: 5,
                  tipo_id: 1,
                  quantidade: "2.00",
                  valor_unitario: 22500,
                  total: 45000,
                  item: itemMock,
                  data_criacao: "2026-10-31T12:00:00Z",
                  data_alteracao: "2026-10-31T12:00:00Z",
                },
              ],
              data_criacao: "2026-10-31T12:00:00Z",
              data_alteracao: "2026-10-31T12:00:00Z",
            }),
          } as Response
        }

        throw new Error(`Chamada inesperada: ${method} ${url}`)
      })

    render(
      <MemoryRouter initialEntries={["/ordens-servico"]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(
        screen.getByText("Nenhuma ordem de serviço encontrada."),
      ).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: "Nova OS" }))

    await waitFor(() => {
      expect(screen.getByLabelText("Veículo")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: "Salvar" }))

    await waitFor(() => {
      expect(screen.getByText("Veículo é obrigatório.")).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText("Veículo"), {
      target: { value: "8" },
    })

    await waitFor(() => {
      expect(screen.getByText("Marcos Proprietário")).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText("KM de entrada"), {
      target: { value: "75200" },
    })
    fireEvent.change(screen.getByLabelText("Descrição / Observações"), {
      target: { value: "Serviço de brunimento" },
    })

    fireEvent.click(screen.getByRole("button", { name: "Adicionar item" }))

    fireEvent.change(screen.getByLabelText("Item"), {
      target: { value: "5" },
    })
    fireEvent.change(screen.getByLabelText("Qtd."), {
      target: { value: "2" },
    })
    fireEvent.change(screen.getByLabelText("Valor unit. (R$)"), {
      target: { value: "225.00" },
    })

    await waitFor(() => {
      expect(screen.getByText(/Total:.*450,00/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: "Salvar" }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/ordens-servico",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            veiculo_id: 8,
            km_entrada: 75200,
            status_id: 1,
            descricao: "Serviço de brunimento",
            itens: [
              {
                item_id: 5,
                tipo_id: 1,
                quantidade: "2.00",
                valor_unitario: 22500,
              },
            ],
          }),
        }),
      )
    })
  })
})
