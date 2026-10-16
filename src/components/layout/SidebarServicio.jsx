import { Link, NavLink } from 'react-router-dom'
import {
  BotonConfiguracion,
  BotonMenu,
  ETIQUETA,
  FILA_ACCION,
  FILA_ENLACE,
  FILA_MARCA,
  FILA_NAV,
  Icono,
  claseVariante,
} from './Sidebar'
import { BadgeEstatus } from '../ui/Badge'
import { usePanelServicio } from '../../pages/servicio/panel'

// Rutas absolutas: este sidebar lo renderiza el Layout (ruta sin path),
// así que los enlaces relativos se resolverían contra la raíz.
const SECCIONES = [
  {
    titulo: 'Servicio',
    opciones: [{ id: 'resumen', etiqueta: 'Resumen', icono: 'grid', end: true }],
  },
  {
    titulo: 'Registro',
    opciones: [
      { id: 'materiales', etiqueta: 'Materiales', icono: 'box' },
      { id: 'personal', etiqueta: 'Personal', icono: 'users' },
      { id: 'equipos', etiqueta: 'Equipos', icono: 'truck' },
      { id: 'gastos', etiqueta: 'Gastos', icono: 'recibo' },
      { id: 'ingresos', etiqueta: 'Ingresos', icono: 'billete' },
    ],
  },
  {
    titulo: 'Planificación',
    opciones: [
      { id: 'cronograma', etiqueta: 'Cronograma', icono: 'gantt' },
      { id: 'curva-s', etiqueta: 'Curva S', icono: 'barras' },
      { id: 'linea-base', etiqueta: 'Línea base', icono: 'bandera' },
      { id: 'partidas', etiqueta: 'Partidas', icono: 'layers' },
    ],
  },
  {
    titulo: 'Cobro',
    opciones: [{ id: 'valorizaciones', etiqueta: 'Valorizaciones', icono: 'factura' }],
  },
  {
    titulo: 'Contrato',
    opciones: [{ id: 'modificaciones', etiqueta: 'Modificaciones', icono: 'enmienda' }],
  },
  {
    titulo: 'Ajustes',
    opciones: [{ id: 'opciones', etiqueta: 'Opciones', icono: 'ajustes' }],
  },
]

export function SidebarServicio({ abierto, onCerrar, onAlternar, colapsado = false, onAbrirConfiguracion }) {
  const { servicio } = usePanelServicio()

  const v = (tabla) => claseVariante(tabla, { abierto, colapsado })

  const base = `/servicios/${servicio.id}`
  const destino = (id) => (id === 'resumen' ? base : `${base}/${id}`)

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
        <div className="border-b border-slate-200">
          <div className={`flex h-16 shrink-0 items-center gap-2 ${v(FILA_MARCA)}`}>
            <div className={`min-w-0 ${v(ETIQUETA)}`}>
              <p className="truncate text-sm font-semibold text-slate-900">PROMCOSER</p>
              <p className="truncate text-xs text-slate-500">Panel del servicio</p>
            </div>
            <BotonMenu abierto={abierto} colapsado={colapsado} onAlternar={onAlternar} clase={v(FILA_ACCION)} />
          </div>

          <div className={`px-4 pt-1 pb-4 ${v(ETIQUETA)}`}>
            <p className="truncate px-2 text-sm font-semibold text-slate-900">
              {servicio.nombre_servicio}
            </p>
            <div className="mt-1.5 px-2">
              <BadgeEstatus estatus={servicio.estatus} />
            </div>
          </div>
        </div>

        <nav className={`flex-1 space-y-5 overflow-y-auto ${v(FILA_NAV)}`}>
          <ul>
            <li>
              <Link
                to="/servicios"
                onClick={onCerrar}
                title="Volver a servicios"
                className={`flex items-center gap-3 rounded-lg py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 ${v(FILA_ENLACE)}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-5 shrink-0"
                  aria-hidden="true"
                >
                  <path d="M19 12H5m7-7-7 7 7 7" />
                </svg>
                <span className={v(ETIQUETA)}>Volver</span>
              </Link>
            </li>
          </ul>

          {SECCIONES.map((seccion) => (
            <div key={seccion.titulo}>
              <p className={`mb-1.5 px-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase ${v(ETIQUETA)}`}>
                {seccion.titulo}
              </p>
              <ul className="space-y-0.5">
                {seccion.opciones.map((opcion) => (
                  <li key={opcion.id}>
                    <NavLink
                      to={destino(opcion.id)}
                      end={opcion.end}
                      onClick={onCerrar}
                      title={opcion.etiqueta}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors ${v(FILA_ENLACE)} ${
                          isActive
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`
                      }
                    >
                      <Icono nombre={opcion.icono} className="size-5 shrink-0" />
                      <span className={v(ETIQUETA)}>{opcion.etiqueta}</span>
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
