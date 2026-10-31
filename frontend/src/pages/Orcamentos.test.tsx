import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { AppRoutes } from "@/App"
import {
  calcularDataVencimento,
  calcularTotalLinhaCentavos,
} from "@/lib/validacao"

describe("Cálculos de orçamento no frontend", () => {
  it("calcula total da linha em centavos com arredondamento", () => {
    expect(calcularTotalLinhaCentavos("1.50", "200.00")).toBe(30000)
    expect(calcularTotalLinhaCentavos("1,5", "3,33")).toBe(500)
  })

  it("calcula data de vencimento a partir da emissão e validade em dias", () => {
    expect(calcularDataVencimento("2026-05-10", "15")).toBe("2026-05-25")
    expect(calcularDataVencimento("2026-05-10", "")).toBeNull()
  })
})

describe("Página de Orçamentos", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("valida formulário, atualiza vencimento e total enquanto digita e envia orçamento", async () => {
    const clienteMock = {
      id: 10,
      pessoa_id: 10,
      ativo: true,
      pessoa: {
        id: 10,
        nome: "Roberto Cliente",
        email: "roberto@exemplo.com",
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
      id: 7,
      cliente_id: 10,
      marca_id: 3,
      modelo: "Civic",
      placa: "ABC1D23",
      ano_fabricacao: 2020,
      ano_modelo: 2021,
      cor: "Preto",
      km: 60000,
      observacao: null,
      cliente: clienteMock,
      marca: {
        id: 3,
        nome: "Honda",
        ativo: true,
        data_criacao: "2026-10-31T12:00:00Z",
        data_alteracao: "2026-10-31T12:00:00Z",
      },
      data_criacao: "2026-10-31T12:00:00Z",
      data_alteracao: "2026-10-31T12:00:00Z",
    }

    const itemMock = {
      id: 4,
      nome: "Retífica de cabeçote",
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

        if (url.startsWith("/api/orcamentos") && method === "GET") {
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

        if (url === "/api/orcamentos" && method === "POST") {
          return {
            ok: true,
            status: 201,
            json: async () => ({
              id: 1,
              numero: "001-2026-ORC",
              cliente_id: 10,
              veiculo_id: 7,
              status_id: 1,
              data_emissao: "2026-05-10",
              validade_dias: 15,
              data_vencimento: "2026-05-25",
              descricao: "Troca de junta",
              total: 30000,
              cliente: clienteMock,
              veiculo: veiculoMock,
              itens: [
                {
                  id: 1,
                  orcamento_id: 1,
                  item_id: 4,
                  tipo_id: 1,
                  quantidade: "1.50",
                  valor_unitario: 20000,
                  total: 30000,
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
      <MemoryRouter initialEntries={["/orcamentos"]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(
        screen.getByText("Nenhum orçamento encontrado."),
      ).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: "Novo orçamento" }))

    await waitFor(() => {
      expect(screen.getByLabelText("Veículo")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: "Salvar" }))

    await waitFor(() => {
      expect(screen.getByText("Veículo é obrigatório.")).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText("Veículo"), {
      target: { value: "7" },
    })

    await waitFor(() => {
      expect(screen.getByText("Roberto Cliente")).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText("Data de emissão"), {
      target: { value: "2026-05-10" },
    })
    fireEvent.change(screen.getByLabelText("Validade (dias)"), {
      target: { value: "15" },
    })

    await waitFor(() => {
      expect(screen.getByLabelText("Vencimento calculado")).toHaveTextContent(
        "25/05/2026",
      )
    })

    fireEvent.change(screen.getByLabelText("Descrição / Observações"), {
      target: { value: "Troca de junta" },
    })

    fireEvent.click(screen.getByRole("button", { name: "Adicionar item" }))

    fireEvent.change(screen.getByLabelText("Item"), {
      target: { value: "4" },
    })
    fireEvent.change(screen.getByLabelText("Qtd."), {
      target: { value: "1.5" },
    })
    fireEvent.change(screen.getByLabelText("Valor unit. (R$)"), {
      target: { value: "200.00" },
    })

    await waitFor(() => {
      expect(screen.getByText(/Total:.*300,00/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: "Salvar" }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/orcamentos",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            veiculo_id: 7,
            status_id: 1,
            data_emissao: "2026-05-10",
            validade_dias: 15,
            descricao: "Troca de junta",
            itens: [
              {
                item_id: 4,
                tipo_id: 1,
                quantidade: "1.50",
                valor_unitario: 20000,
              },
            ],
          }),
        }),
      )
    })
  })
})
