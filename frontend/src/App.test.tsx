import { render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import App from "./App"

describe("App", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("chama /api/health e exibe o resultado", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ok" }),
    } as Response)

    render(<App />)

    expect(screen.getByRole("heading", { name: "Oficina OS" })).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Verificar novamente" }),
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText("ok")).toBeInTheDocument()
    })

    expect(fetchMock).toHaveBeenCalledWith("/api/health")
  })
})
