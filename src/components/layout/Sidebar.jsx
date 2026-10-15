import { NavLink } from 'react-router-dom'
import { useData } from '../../context/useData'

export const SECCIONES_NAVEGACION = [
  {
    titulo: 'Principal',
    enlaces: [
      { to: '/', label: 'Dashboard', icono: 'grid', end: true },
      { to: '/servicios', label: 'Servicios', icono: 'clipboard' },

      { to: '/personal', label: 'Personal', icono: 'users' },
      { to: '/cargos', label: 'Cargos', icono: 'maletin' },
      { to: '/equipos', label: 'Equipos', icono: 'truck' },
      { to: '/oficina', label: 'Oficina', icono: 'oficina' },
      { to: '/unidades', label: 'Unidades', icono: 'box' },
    ],
  },
]

const ICONOS = {
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  box: 'M21 8l-9-5-9 5m18 0v8l-9 5m0-18v18m0-13l9-5M3 16l9 5',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m13 18v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  maletin: 'M3 8h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18',
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
  bandera: 'M6 21V4m0 0 11 3-11 3',
  // Controles del propio sidebar (antes vivían en el header).
  hamburguesa: 'M4 7h16M4 12h16M4 17h16',
  cerrar: 'M6 6l12 12M18 6L6 18',
  colapsar: 'M4 4h16v16H4zM9 4v16',
  expandir: 'M4 4h16v16H4zM15 4v16',
  config: 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
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

// ------------------------------------------------------------
//  Expansión del sidebar (antes la resolvía el header)
//
//  El sidebar tiene dos estados de ancho por breakpoint:
//    • móvil (< md): riel de 64px (`w-16`, etiquetas ocultas) y cajón de
//      256px (`w-64`, etiquetas visibles) cuando `abierto` está en true;
//      el cajón se superpone al contenido y lleva fondo oscuro.
//    • escritorio (≥ md): expandido (`md:w-64`) o colapsado (`md:w-20`),
//      según `colapsado`.
//
//  Cada tabla agrupa las 4 combinaciones posibles como clases LITERALES:
//  Tailwind detecta las clases por texto, así que nunca se concatenan
//  prefijos `md:` en tiempo de ejecución (se rompería la generación de CSS).
//    expandida     → etiquetas en móvil y escritorio
//    centrada      → riel/colapsado: todo centrado y sin etiquetas
//    soloEscritorio→ riel en móvil, expandido en escritorio
//    soloMovil     → cajón abierto en móvil, colapsado en escritorio
// ------------------------------------------------------------

export const FILA_MARCA = {
  expandida: 'justify-start px-5',
  centrada: 'justify-center px-2',
  soloEscritorio: 'justify-center px-2 md:justify-start md:px-5',
  soloMovil: 'justify-start px-5 md:justify-center md:px-2',
}

export const FILA_ENLACE = {
  expandida: 'justify-start px-3',
  centrada: 'justify-center px-2',
  soloEscritorio: 'justify-center px-2 md:justify-start md:px-3',
  soloMovil: 'justify-start px-3 md:justify-center md:px-2',
}

export const FILA_NAV = {
  expandida: 'p-4',
  centrada: 'p-2',
  soloEscritorio: 'p-2 md:p-4',
  soloMovil: 'p-4 md:p-2',
}

// Margen del botón de menú dentro de la fila de marca.
export const FILA_ACCION = {
  expandida: 'ml-auto',
  centrada: '',
  soloEscritorio: 'md:ml-auto',
  soloMovil: 'ml-auto md:ml-0',
}

// Etiqueta de texto: visible donde hay espacio para ella.
export const ETIQUETA = {
  expandida: '',
  centrada: 'hidden',
  soloEscritorio: 'hidden md:block',
  soloMovil: 'block md:hidden',
}

export function claseVariante(tabla, { abierto, colapsado }) {
  const movil = abierto
  const escritorio = !colapsado
  if (movil && escritorio) return tabla.expandida
  if (!movil && !escritorio) return tabla.centrada
  return movil ? tabla.soloMovil : tabla.soloEscritorio
}

// El único control de menú de la aplicación, y vive DENTRO del sidebar
// (la barra superior se eliminó): en móvil alterna el cajón con las
// etiquetas; en escritorio colapsa/expandir el ancho. El texto del tooltip
// corresponde a escritorio (en móvil no hay hover) y el `aria-label` vale
// para los dos casos.
export function BotonMenu({ abierto, colapsado, onAlternar, clase = '' }) {
  return (
    <button
      type="button"
      onClick={onAlternar}
      title={colapsado ? 'Expandir menú' : 'Colapsar menú'}
      aria-label="Alternar menú lateral"
      className={`flex shrink-0 items-center justify-center rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 ${clase}`}
    >
      <span className="md:hidden">
        <Icono nombre={abierto ? 'cerrar' : 'hamburguesa'} />
      </span>
      <span className="hidden md:block">
        <Icono nombre={colapsado ? 'expandir' : 'colapsar'} />
      </span>
    </button>
  )
}

// Botón de Configuración: vive SIEMPRE en la parte de abajo del sidebar
// (tanto en el panel general como en el de un servicio). Usa las mismas
// tablas de variante que los enlaces para alinearse y ocultar la etiqueta
// cuando el sidebar está colapsado.
export function BotonConfiguracion({ onAbrir, variante = '', etiqueta = '' }) {
  return (
    <button
      type="button"
      onClick={onAbrir}
      title="Configuración"
      aria-label="Abrir configuración"
      className={`flex items-center gap-3 rounded-lg py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 ${variante}`}
    >
      <Icono nombre="config" className="size-5 shrink-0" />
      <span className={etiqueta}>Configuración</span>
    </button>
  )
}

export function Sidebar({ abierto, onCerrar, onAlternar, colapsado = false, onAbrirConfiguracion }) {
  const { estado } = useData()
  const v = (tabla) => claseVariante(tabla, { abierto, colapsado })
  const conteos = {
    '/servicios': (estado.servicios ?? []).filter((s) => s.estatus === 'En curso').length,
    '/personal': (estado.personal ?? []).length,
    '/cargos': (estado.cargos ?? []).length,
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
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-300 bg-white transition-all duration-200 ${
          abierto ? 'w-64' : 'w-16'
        } ${colapsado ? 'md:w-20' : 'md:w-64'}`}
      >
        <div className={`flex h-16 shrink-0 items-center gap-2 border-b border-slate-200 ${v(FILA_MARCA)}`}>
          <div className={`min-w-0 ${v(ETIQUETA)}`}>
            <p className="truncate text-sm font-semibold text-slate-900">PROMCOSER</p>
            <p className="truncate text-xs text-slate-500">Control de servicios</p>
          </div>
          <BotonMenu abierto={abierto} colapsado={colapsado} onAlternar={onAlternar} clase={v(FILA_ACCION)} />
        </div>

        <nav className={`flex-1 space-y-6 overflow-y-auto ${v(FILA_NAV)}`}>
          {SECCIONES_NAVEGACION.map((seccion) => (
            <div key={seccion.titulo}>
              <p className={`mb-2 px-2 text-xs font-semibold tracking-wide text-slate-400 uppercase ${v(ETIQUETA)}`}>
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
                        `flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors ${v(FILA_ENLACE)} ${
                          isActive
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`
                      }
                    >
                      <Icono nombre={enlace.icono} className="size-5 shrink-0" />
                      <span className={v(ETIQUETA)}>{enlace.label}</span>
                      {conteos[enlace.to] > 0 && (
                        <span
                          className={`${v(ETIQUETA)} ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 tabular-nums`}
                        >
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

        {/* Configuración: siempre visible al pie del sidebar. */}
        <div className={`shrink-0 border-t border-slate-200 ${v(FILA_NAV)}`}>
          <BotonConfiguracion
            onAbrir={onAbrirConfiguracion}
            variante={v(FILA_ENLACE)}
            etiqueta={v(ETIQUETA)}
          />
        </div>
      </aside>
    </>
  )
}
