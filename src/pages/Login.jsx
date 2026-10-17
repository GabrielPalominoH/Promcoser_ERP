import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { inicioDeRol } from '../utils/permisos'
import { useAuth } from '../context/useAuth'
import { Button } from '../components/ui/Button'

function Trazo({ d, className = 'size-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

// Marca: casco estilizado sobre el monograma.
function Marca({ className = 'size-11' }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white shadow-lg shadow-black/30 ${className}`}>
      <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4.5 16a7.5 7.5 0 0 1 15 0" />
        <path d="M2.5 16h19v2.5h-19z" />
        <path d="M12 8.5v4M9 9.5V13M15 9.5V13" />
      </svg>
    </span>
  )
}

const claseCampo =
  'w-full rounded-lg border border-slate-300 bg-white py-2.5 pr-3 pl-10 text-sm text-slate-900 transition-colors placeholder:text-slate-400 hover:border-slate-400 focus:border-primary-600 focus:ring-2 focus:ring-primary-600/25 focus:outline-none'

export function Login() {
  const { iniciarSesion } = useAuth()
  const navegar = useNavigate()
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [ver, setVer] = useState(false)
  const [mayusculas, setMayusculas] = useState(false)
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
      return
    }
    // Cada sesión arranca en el inicio de su rol (no en la última pantalla del anterior).
    navegar(inicioDeRol(resultado.rol), { replace: true })
  }

  // Mientras se ve el acceso, el documento toma el fondo oscuro y sin hueco de
  // barra de desplazamiento (si no, asoma una franja clara a la derecha).
  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    document.documentElement.classList.add('pantalla-acceso')
    return () => document.documentElement.classList.remove('pantalla-acceso')
  }, [])

  const detectarMayusculas = (e) => setMayusculas(Boolean(e.getModifierState?.('CapsLock')))

  return (
    <div className="fondo-obra relative min-h-screen overflow-hidden bg-[#0a1322]">
      {/* Velo para legibilidad: más denso a la izquierda (texto) y abajo. */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#060a12]/80 via-[#060a12]/55 to-[#060a12]/80" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-[#060a12]/70 to-transparent" aria-hidden="true" />

      <div className="relative flex min-h-screen items-center justify-center px-5 py-10">
        <section className="w-full max-w-sm motion-safe:animate-subir">
          <div className="mb-7 flex flex-col items-center gap-3 text-white">
            <Marca className="size-12" />
            <p className="text-lg font-semibold tracking-[0.22em]">PROMCOSER</p>
          </div>

          <form
            onSubmit={enviar}
            noValidate
            className="rounded-2xl border border-white/20 bg-white/95 p-7 shadow-2xl shadow-black/40 backdrop-blur-md sm:p-8"
          >
            <div className="mb-6">
              <span className="mb-3 block h-1 w-10 rounded-full bg-obra-500" aria-hidden="true" />
              <h1 className="text-xl font-semibold text-slate-900">Iniciar sesión</h1>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="login-correo" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Correo
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <Trazo d="M3 6h18v12H3zM3 7l9 6 9-6" className="size-4.5" />
                  </span>
                  <input
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
                    className={claseCampo}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-clave" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Clave
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <Trazo d="M6 11h12v10H6zM8 11V8a4 4 0 0 1 8 0v3" className="size-4.5" />
                  </span>
                  <input
                    id="login-clave"
                    type={ver ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={clave}
                    onKeyUp={detectarMayusculas}
                    onKeyDown={detectarMayusculas}
                    onChange={(e) => {
                      setClave(e.target.value)
                      setError('')
                    }}
                    aria-describedby={mayusculas ? 'login-mayus' : undefined}
                    className={`${claseCampo} pr-20`}
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
                {mayusculas && (
                  <p id="login-mayus" className="mt-1.5 text-xs font-medium text-amber-700">
                    Bloq Mayús está activado.
                  </p>
                )}
              </div>

              {error && (
                <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full py-2.5">
                Entrar
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}
