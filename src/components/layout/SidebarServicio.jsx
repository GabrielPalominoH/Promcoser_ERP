import { Link, NavLink } from 'react-router-dom'
import { useData } from '../../context/useData'
import { Icono } from './Sidebar'
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
    ],
  },
  {
    titulo: 'Planificación',
    opciones: [
      { id: 'cronograma', etiqueta: 'Cronograma', icono: 'gantt' },
      { id: 'partidas', etiqueta: 'Partidas', icono: 'layers' },
    ],
  },
  {
    titulo: 'Ajustes',
    opciones: [{ id: 'opciones', etiqueta: 'Opciones', icono: 'ajustes' }],
  },
]

function Contador({ valor }) {
  if (!valor) return null
  return (
    <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 tabular-nums">
      {valor}
    </span>
  )
}

export function SidebarServicio({ abierto, onCerrar, colapsado = false }) {
  const { servicio } = usePanelServicio()
  const {
    estado: { registros_servicio: todos, tareas, partidas: todasPartidas },
  } = useData()

  const conteo = (tipo) =>
    todos.filter((r) => r.servicio_id === servicio.id && r.tipo_registro === tipo).length

  // Personal cuenta personas distintas asignadas, no registros diarios
  // (con el régimen mensual un asignado genera ~30 registros).
  const personasAsignadas = new Set(
    todos
      .filter((r) => r.servicio_id === servicio.id && r.tipo_registro === 'personal')
      .map((r) => r.referencia_id),
  ).size

  const conteos = {
    materiales: conteo('material'),
    personal: personasAsignadas,
    equipos: conteo('equipo'),
    gastos: conteo('gasto'),
    cronograma: tareas.filter((t) => t.servicio_id === servicio.id && t.padre_id == null).length,
    partidas: (todasPartidas ?? []).filter((p) => p.servicio_id === servicio.id).length,
  }

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
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-all duration-200 md:translate-x-0 ${
          abierto ? 'translate-x-0' : '-translate-x-full'
        } ${colapsado ? 'md:w-20' : 'md:w-64'}`}
      >
        <div className="border-b border-slate-200">
          <div className={`flex h-16 items-center px-4 ${colapsado ? 'md:justify-center md:px-2' : ''}`}>
            <Link
              to="/servicios"
              onClick={onCerrar}
              title="Volver a servicios"
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4 shrink-0"
                aria-hidden="true"
              >
                <path d="M19 12H5m7-7-7 7 7 7" />
              </svg>
              <span className={colapsado ? 'md:hidden' : ''}>Volver</span>
            </Link>
          </div>
          <div className={`px-4 pt-1 pb-4 ${colapsado ? 'md:hidden' : ''}`}>
            <p className="truncate px-2 text-sm font-semibold text-slate-900">
              {servicio.nombre_servicio}
            </p>
            <div className="mt-1.5 px-2">
              <BadgeEstatus estatus={servicio.estatus} />
            </div>
          </div>
        </div>

        <nav className={`flex-1 space-y-5 overflow-y-auto p-4 ${colapsado ? 'md:p-2' : ''}`}>
          {SECCIONES.map((seccion) => (
            <div key={seccion.titulo}>
              <p className={`mb-1.5 px-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase ${colapsado ? 'md:hidden' : ''}`}>
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
                        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          colapsado ? 'md:justify-center md:px-2' : ''
                        } ${
                          isActive
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`
                      }
                    >
                      <Icono nombre={opcion.icono} className="size-5 shrink-0" />
                      <span className={colapsado ? 'md:hidden' : ''}>{opcion.etiqueta}</span>
                      {!colapsado && <Contador valor={conteos[opcion.id]} />}
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
