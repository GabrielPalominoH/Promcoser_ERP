import { NavLink } from 'react-router-dom'
import { useData } from '../../context/useData'

export const SECCIONES_NAVEGACION = [
  {
    titulo: 'Principal',
    enlaces: [
      { to: '/', label: 'Dashboard', icono: 'grid', end: true },
      { to: '/servicios', label: 'Servicios', icono: 'clipboard' },

      { to: '/personal', label: 'Personal', icono: 'users' },
      { to: '/equipos', label: 'Equipos', icono: 'truck' },
      { to: '/oficina', label: 'Oficina', icono: 'oficina' },
    ],
  },
]

const ICONOS = {
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  box: 'M21 8l-9-5-9 5m18 0v8l-9 5m0-18v18m0-13l9-5M3 16l9 5',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m13 18v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  truck: 'M3 7h11v8H3zM14 10h4l3 3v2h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4m10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4',
  clipboard: 'M9 4h6v3H9zM9 5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 12h6M9 16h6',
  ajustes: 'M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3M1 14h6m2-6h6m2 8h6',
  gantt: 'M3 5h18M3 12h12M3 19h15M19 10v4m-2-2h4',
  oficina: 'M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 8h2a2 2 0 0 1 2 2v11M3 21h18M8 7h2m-2 4h2m-2 4h2',
  recibo: 'M6 2h12v20l-3-2-3 2-3-2-3 2zM9 7h6M9 11h6',
  layers: 'M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  billete: 'M2 7h20v10H2zM12 12m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0M6 12h.01M18 12h.01',
  factura: 'M7 2h7l5 5v15H7zM14 2v5h5M10 13h5m-5 4h5',
  caja: 'M3 8h18v11H3zM3 8l2-4h14l2 4M10 12h4',
  barras: 'M4 20V10m6 10V4m6 16v-7',
}

export { ICONOS }

export function Icono({ nombre, className = 'size-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={ICONOS[nombre] ?? ICONOS.grid} />
    </svg>
  )
}

export function Sidebar({ abierto, onCerrar, colapsado = false }) {
  const { estado } = useData()
  const conteos = {
    '/servicios': (estado.servicios ?? []).filter((s) => s.estatus === 'En curso').length,
    '/personal': (estado.personal ?? []).length,
    '/equipos': (estado.equipos ?? []).length,
  }
  return (
    <>
      {abierto && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 md:hidden"
          onClick={onCerrar}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-all duration-200 md:translate-x-0 ${
          abierto ? 'translate-x-0' : '-translate-x-full'
        } ${colapsado ? 'md:w-20' : 'md:w-64'}`}
      >
        <div className={`flex h-16 items-center gap-2 border-b border-slate-200 px-5 ${colapsado ? 'md:justify-center md:px-2' : ''}`}>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-600 font-bold text-white">
            P
          </div>
          <div className={`min-w-0 ${colapsado ? 'md:hidden' : ''}`}>
            <p className="truncate text-sm font-semibold text-slate-900">PROMCOSER</p>
            <p className="text-xs text-slate-500">Control de servicios</p>
          </div>
        </div>

        <nav className={`flex-1 space-y-6 overflow-y-auto p-4 ${colapsado ? 'md:p-2' : ''}`}>
          {SECCIONES_NAVEGACION.map((seccion) => (
            <div key={seccion.titulo}>
              <p className={`mb-2 px-2 text-xs font-semibold tracking-wide text-slate-400 uppercase ${colapsado ? 'md:hidden' : ''}`}>
                {seccion.titulo}
              </p>
              <ul className="space-y-1">
                {seccion.enlaces.map((enlace) => (
                  <li key={enlace.to}>
                    <NavLink
                      to={enlace.to}
                      end={enlace.end}
                      onClick={onCerrar}
                      title={enlace.label}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          colapsado ? 'md:justify-center md:px-2' : ''
                        } ${
                          isActive
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`
                      }
                    >
                      <Icono nombre={enlace.icono} className="size-5 shrink-0" />
                      <span className={colapsado ? 'md:hidden' : ''}>{enlace.label}</span>
                      {!colapsado && conteos[enlace.to] > 0 && (
                        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 tabular-nums">
                          {conteos[enlace.to]}
                        </span>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}
