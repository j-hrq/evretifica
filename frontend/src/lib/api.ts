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
