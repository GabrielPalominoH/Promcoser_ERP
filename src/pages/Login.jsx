import { useState } from 'react'
import { useAuth } from '../context/useAuth'
import { Button } from '../components/ui/Button'
import { Campo, Input } from '../components/ui/Field'

export function Login() {
  const { iniciarSesion } = useAuth()
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [ver, setVer] = useState(false)
  const [error, setError] = useState('')

  const enviar = (evento) => {
    evento.preventDefault()
    if (!correo.trim() || !clave) {
      setError('Escribe tu correo y tu clave.')
      return
    }
    const resultado = iniciarSesion(correo, clave)
    if (!resultado.ok) {
      setError(resultado.error)
      setClave('')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-200 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-primary-700 text-lg font-bold text-white">
            P
          </div>
          <h1 className="text-xl font-semibold tracking-wide text-slate-900">PROMCOSER</h1>
          <p className="text-sm text-slate-500">Gestión de obras y servicios</p>
        </div>

        <form
          onSubmit={enviar}
          noValidate
          className="space-y-4 rounded-xl border border-slate-300 bg-white p-6 shadow-sm"
        >
          <h2 className="text-base font-semibold text-slate-900">Iniciar sesión</h2>

          <Campo label="Correo" htmlFor="login-correo">
            <Input
              id="login-correo"
              type="email"
              autoComplete="username"
              autoFocus
              value={correo}
              onChange={(e) => {
                setCorreo(e.target.value)
                setError('')
              }}
              placeholder="usuario@empresa.com"
            />
          </Campo>

          <Campo label="Clave" htmlFor="login-clave">
            <div className="relative">
              <Input
                id="login-clave"
                type={ver ? 'text' : 'password'}
                autoComplete="current-password"
                value={clave}
                onChange={(e) => {
                  setClave(e.target.value)
                  setError('')
                }}
                className="pr-20"
              />
              <button
                type="button"
                onClick={() => setVer((v) => !v)}
                className="absolute inset-y-0 right-2 my-auto h-7 rounded px-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                aria-label={ver ? 'Ocultar clave' : 'Mostrar clave'}
              >
                {ver ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </Campo>

          {error && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full">
            Entrar
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          ¿Olvidaste tu clave? Pide al administrador que la restablezca.
        </p>
      </div>
    </div>
  )
}
