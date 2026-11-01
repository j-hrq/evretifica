export const EVENTO_NAO_AUTENTICADO = "oficina:nao-autenticado"

export async function apiFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, {
    credentials: "include",
    ...init,
  })

  if (response.status === 401 && input !== "/api/auth/login") {
    window.dispatchEvent(new CustomEvent(EVENTO_NAO_AUTENTICADO))
  }

  return response
}

export async function extrairErro(
  res: Response,
  padrao: string,
): Promise<string> {
  try {
    const corpo = (await res.json()) as {
      detail?: string | Array<{ msg?: string }>
    }
    if (typeof corpo.detail === "string" && corpo.detail.trim()) {
      return corpo.detail
    }
    if (Array.isArray(corpo.detail) && corpo.detail.length > 0) {
      const msgs = corpo.detail
        .map((item) =>
          typeof item?.msg === "string"
            ? item.msg.replace(/^Value error,\s*/i, "")
            : "",
        )
        .filter(Boolean)
      if (msgs.length > 0) {
        return msgs.join("; ")
      }
    }
  } catch {
    // mantém mensagem padrão
  }
  return padrao
}
