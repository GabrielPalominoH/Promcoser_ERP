import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Campo, Input } from '../ui/Field'
import { useAuth } from '../../context/useAuth'
import { ETIQUETAS_ROL } from '../../utils/permisos'

// Configuración global de la aplicación (preferencias de apariencia).
// Se abre desde el botón que vive en la parte de abajo del sidebar, tanto
// en el panel general como en el de un servicio. Todo lo que maneja aquí
// es una preferencia VISUAL guardada en este navegador: no toca los datos
// de negocio ni el almacenamiento del módulo de datos.
const TEMAS = [
  { id: 'claro', nombre: 'Claro', descripcion: 'Fondos claros, el aspecto original.' },
  { id: 'oscuro', nombre: 'Oscuro', descripcion: 'Grafito sobrio, cómodo para sesiones largas.' },
]

// Vista previa fija e INDEPENDIENTE del tema activo: representa cómo se verá
// la interfaz al elegir cada opción. Usa valores hexadecimales explícitos en
// lugar de las utilidades semánticas claras, porque el tema oscuro las
// redefine a tonos oscuros y la vista previa del tema claro se vería oscura
// estando en oscuro.
function VistaPrevia({ tema }) {
  const claro = tema === 'claro'
  const fondo = claro ? 'bg-[#e2e8f0]' : 'bg-[#0c0f14]'
  const superficie = claro ? 'bg-[#ffffff]' : 'bg-[#151a21]'
  const borde = claro ? 'border-[#cbd5e1]' : 'border-[#262d38]'
  const activo = claro ? 'bg-[#2563eb]' : 'bg-[#8fb3e6]'
  const linea = claro ? 'bg-[#cbd5e1]' : 'bg-[#343d4b]'
  const lineaSuave = claro ? 'bg-[#f1f5f9]' : 'bg-[#1b2129]'

  return (
    <div className={`flex h-16 overflow-hidden rounded-lg border ${borde} ${fondo}`}>
      <div className={`flex w-8 shrink-0 flex-col items-center gap-1.5 border-r py-2 ${superficie} ${borde}`}>
        <span className={`size-3 rounded ${activo}`} />
        <span className={`h-1.5 w-4 rounded-full ${linea}`} />
        <span className={`h-1.5 w-4 rounded-full ${linea}`} />
        <span className={`h-1.5 w-4 rounded-full ${linea}`} />
      </div>
      <div className="flex-1 space-y-1.5 p-2">
        <div className={`h-2 w-10 rounded ${linea}`} />
        <div className={`h-6 rounded ${superficie}`} />
        <div className={`h-2 w-14 rounded ${lineaSuave}`} />
      </div>
    </div>
  )
}

// Mi cuenta: datos de la sesión y cambio de clave propia.
function MiCuenta() {
  const { usuario, cambiarMiClave } = useAuth()
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [mensaje, setMensaje] = useState(null)

  if (!usuario?.correo) return null

  const enviar = (e) => {
    e.preventDefault()
    const r = cambiarMiClave(actual, nueva)
    setMensaje(r.ok ? { ok: true, texto: 'Clave actualizada.' } : { ok: false, texto: r.error })
    if (r.ok) {
      setActual('')
      setNueva('')
    }
  }

  return (
    <div className="mt-6 border-t border-slate-200 pt-4">
      <p className="text-sm font-semibold text-slate-900">Mi cuenta</p>
      <p className="mt-0.5 text-sm text-slate-500">
        {usuario.nombre} · {usuario.correo} · {ETIQUETAS_ROL[usuario.rol] ?? usuario.rol}
      </p>
      <form onSubmit={enviar} noValidate className="mt-3 space-y-3">
        <Campo label="Clave actual" htmlFor="cuenta-actual">
          <Input id="cuenta-actual" type="password" autoComplete="current-password" value={actual} onChange={(e) => { setActual(e.target.value); setMensaje(null) }} />
        </Campo>
        <Campo label="Clave nueva" htmlFor="cuenta-nueva" hint="Mínimo 8 caracteres.">
          <Input id="cuenta-nueva" type="password" autoComplete="new-password" value={nueva} onChange={(e) => { setNueva(e.target.value); setMensaje(null) }} />
        </Campo>
        {mensaje && (
          <p role="status" className={`text-sm font-medium ${mensaje.ok ? 'text-emerald-700' : 'text-red-600'}`}>
            {mensaje.texto}
          </p>
        )}
        <Button type="submit" variante="secundario">
          Cambiar clave
        </Button>
      </form>
    </div>
  )
}

export function ConfiguracionModal({ abierto, onCerrar, tema, onCambiarTema }) {
  return (
    <Modal
      abierto={abierto}
      titulo="Configuración"
      descripcion="Preferencias de apariencia de la aplicación."
      onCerrar={onCerrar}
      ancho="sm"
    >
      <div>
        <p className="text-sm font-semibold text-slate-900">Tema</p>
        <p className="mt-0.5 text-sm text-slate-500">
          Cambia cómo se ve la interfaz. La elección se aplica al instante.
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {TEMAS.map((opcion) => {
            const activo = tema === opcion.id
            return (
              <button
                key={opcion.id}
                type="button"
                onClick={() => onCambiarTema(opcion.id)}
                aria-pressed={activo}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  activo
                    ? 'border-primary-600 ring-2 ring-primary-600/30'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
              >
                <VistaPrevia tema={opcion.id} />
                <p className="mt-2 text-sm font-semibold text-slate-900">{opcion.nombre}</p>
                <p className="text-xs text-slate-500">{opcion.descripcion}</p>
              </button>
            )
          })}
        </div>

        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          Esta preferencia se guarda solo en este navegador y no modifica tus datos de negocio.
        </p>
        <MiCuenta />
      </div>
    </Modal>
  )
}
