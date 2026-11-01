import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Navigate, useNavigate } from "react-router-dom"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/useAuth"

const loginSchema = z.object({
  login: z.string().trim().min(1, "Login é obrigatório."),
  senha: z.string().min(1, "Senha é obrigatória."),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function Login() {
  const { usuario, entrar } = useAuth()
  const navigate = useNavigate()
  const [erroServidor, setErroServidor] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      login: "",
      senha: "",
    },
  })

  if (usuario) {
    return <Navigate to="/" replace />
  }

  async function onSubmit(valores: LoginFormValues) {
    setErroServidor(null)
    try {
      await entrar(valores.login, valores.senha)
      navigate("/", { replace: true })
    } catch (err) {
      if (err instanceof Error) {
        setErroServidor(err.message)
      } else {
        setErroServidor("Não foi possível entrar.")
      }
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Entrar — EVR Retifica</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="login">Login</Label>
              <Input id="login" autoComplete="username" {...register("login")} />
              {errors.login && (
                <p className="text-sm text-destructive">{errors.login.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                autoComplete="current-password"
                {...register("senha")}
              />
              {errors.senha && (
                <p className="text-sm text-destructive">{errors.senha.message}</p>
              )}
            </div>

            {erroServidor && (
              <p role="alert" className="text-sm text-destructive">
                {erroServidor}
              </p>
            )}

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
