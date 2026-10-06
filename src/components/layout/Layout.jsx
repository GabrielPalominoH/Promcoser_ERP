import { useState } from 'react'
import { Outlet, useMatch, useParams } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { SidebarServicio } from './SidebarServicio'
import { PanelProveedor } from '../../pages/servicio/panel'
import { useData } from '../../context/useData'

const CLAVE_SIDEBAR = 'promcoser_sidebar_colapsado'

function leerColapsado() {
  try {
    return window.localStorage.getItem(CLAVE_SIDEBAR) === '1'
  } catch {
    return false
  }
}

function BotonColapsar({ colapsado, onCambiar }) {
  return (
    <button
      type="button"
      onClick={onCambiar}
      className="hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:block"
      aria-label={colapsado ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
      title={colapsado ? 'Expandir menú' : 'Colapsar menú'}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-5"
        aria-hidden="true"
      >
        <path d="M4 4h16v16H4zM9 4v16" />
      </svg>
    </button>
  )
}

export function Layout() {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [colapsado, setColapsado] = useState(leerColapsado)
  const coincideServicio = useMatch('/servicios/:servicioId/*')
  const coincideCronograma = useMatch('/servicios/:servicioId/cronograma')
  const { servicioId } = useParams()
  const {
    estado: { servicios },
  } = useData()

  const servicioEnPanel = coincideServicio
    ? (servicios.find((s) => String(s.id) === String(servicioId)) ?? null)
    : null

  const cerrarMenu = () => setMenuAbierto(false)
  const alternarColapsado = () => {
    setColapsado((valor) => {
      try {
        window.localStorage.setItem(CLAVE_SIDEBAR, valor ? '0' : '1')
      } catch {
        // Sin almacenamiento: solo cambia en memoria.
      }
      return !valor
    })
  }
  const desplazamiento = colapsado ? 'md:pl-20' : 'md:pl-64'

  return (
    <div className="min-h-screen bg-slate-100">
      {servicioEnPanel ? (
        <PanelProveedor servicio={servicioEnPanel}>
          <SidebarServicio abierto={menuAbierto} onCerrar={cerrarMenu} colapsado={colapsado} />

          <div className={desplazamiento}>
            <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
              <button
                type="button"
                onClick={() => setMenuAbierto((valor) => !valor)}
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
                aria-label="Abrir menú de navegación"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  className="size-5"
                  aria-hidden="true"
                >
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              </button>
              <BotonColapsar colapsado={colapsado} onCambiar={alternarColapsado} />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {servicioEnPanel.nombre_servicio}
                </p>
                <p className="hidden text-xs text-slate-500 sm:block">
                  PROMCOSER · Panel del servicio
                </p>
              </div>
            </header>

            <main
              className={`mx-auto p-4 sm:p-6 ${coincideCronograma ? 'max-w-none' : 'max-w-7xl'}`}
            >
              <Outlet />
            </main>
          </div>
        </PanelProveedor>
      ) : (
        <>
          <Sidebar abierto={menuAbierto} onCerrar={cerrarMenu} colapsado={colapsado} />

          <div className={desplazamiento}>
            <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
              <button
                type="button"
                onClick={() => setMenuAbierto((valor) => !valor)}
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
                aria-label="Abrir menú de navegación"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  className="size-5"
                  aria-hidden="true"
                >
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              </button>
              <BotonColapsar colapsado={colapsado} onCambiar={alternarColapsado} />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  Control Maestro de Servicios
                </p>
                <p className="hidden text-xs text-slate-500 sm:block">
                  PROMCOSER · Sistema de control interno
                </p>
              </div>
            </header>

            <main className="mx-auto max-w-7xl p-4 sm:p-6">
              <Outlet />
            </main>
          </div>
        </>
      )}
    </div>
  )
}
