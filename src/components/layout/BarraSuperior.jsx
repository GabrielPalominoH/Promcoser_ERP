import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/useAuth'
import { ETIQUETAS_ROL, esSoloLectura } from '../../utils/permisos'
import { AlertasCentro } from './AlertasCentro'
import { Icono } from './Sidebar'

function iniciales(nombre) {
  const partes = String(nombre ?? '').trim().split(/\s+/).filter(Boolean)
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || '?'
}

// Menú del usuario: quién está conectado, su rol, Mi cuenta y Cerrar sesión.
function MenuUsuario({ onAbrirConfiguracion }) {
  const { usuario, cerrarSesion } = useAuth()
  const [abierto, setAbierto] = useState(false)
  const caja = useRef(null)

  // Se cierra al hacer clic fuera o con Escape.
  useEffect(() => {
    if (!abierto) return undefined
    const fuera = (e) => {
      if (caja.current && !caja.current.contains(e.target)) setAbierto(false)
    }
    const tecla = (e) => {
      if (e.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('keydown', tecla)
    }
  }, [abierto])

  if (!usuario) return null
  const rol = ETIQUETAS_ROL[usuario.rol] ?? usuario.rol

  return (
    <div ref={caja} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label="Menú de usuario"
        className="flex items-center gap-2.5 rounded-full border border-slate-300 bg-white py-1 pr-3 pl-1 text-left shadow-sm transition-colors hover:bg-slate-50"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-semibold text-white">
          {iniciales(usuario.nombre)}
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block max-w-40 truncate text-sm font-medium text-slate-900">{usuario.nombre}</span>
          <span className="block text-xs text-slate-500">{rol}</span>
        </span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4 text-slate-400" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {abierto && (
        <div
          role="menu"
          className="absolute top-full right-0 z-50 mt-2 w-64 rounded-xl border border-slate-300 bg-white p-2 shadow-xl"
        >
          <div className="border-b border-slate-200 px-3 pt-1 pb-3">
            <p className="truncate text-sm font-semibold text-slate-900">{usuario.nombre}</p>
            <p className="truncate text-xs text-slate-500">{usuario.correo}</p>
            <p className="mt-1 text-xs font-medium text-primary-700">{rol}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setAbierto(false)
              onAbrirConfiguracion()
            }}
            className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            <Icono nombre="config" className="size-4" />
            Mi cuenta y configuración
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={cerrarSesion}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <Icono nombre="salir" className="size-4" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}

// Barra superior del área de contenido: campana de alertas y menú de usuario.
export function BarraSuperior({ onAbrirConfiguracion }) {
  const { rol } = useAuth()
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-end gap-3 border-b border-slate-300 bg-white/95 px-4 backdrop-blur sm:px-6 print:hidden">
      {esSoloLectura(rol) && (
        <span className="mr-auto rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
          Modo solo lectura
        </span>
      )}
      <AlertasCentro />
      <MenuUsuario onAbrirConfiguracion={onAbrirConfiguracion} />
    </header>
  )
}
