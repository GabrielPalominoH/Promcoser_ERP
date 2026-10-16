import { ETIQUETAS_CORTAS_MODO, ORIGEN_AVANCE } from '../../utils/avance'

const variantes = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  info: 'bg-primary-50 text-primary-700 ring-primary-200',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  danger: 'bg-red-50 text-red-700 ring-red-200',
}

export function Badge({ variante = 'neutral', children, className = '', title }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${variantes[variante]} ${className}`}
    >
      {children}
    </span>
  )
}

const TONOS_ESTATUS = {
  Pendiente: 'warning',
  'En curso': 'info',
  Finalizado: 'success',
  Cancelado: 'danger',
}

export function BadgeEstatus({ estatus }) {
  return <Badge variante={TONOS_ESTATUS[estatus] ?? 'neutral'}>{estatus}</Badge>
}

// Tono por modo de medición del avance. `manual` es la excepción y usa el
// tono de advertencia para que se vea enseguida en el Gantt y en Partidas.
const TONOS_MODO = {
  metrado: 'info',
  hitos: 'success',
  tiempo: 'neutral',
  costo: 'neutral',
  manual: 'warning',
}

// Insignia del modo en que se mide el avance de una partida. Al pasar el
// cursor explica de dónde sale el dato ("Calculado desde partes diarios", …).
export function BadgeModo({ modo, className = '' }) {
  if (!modo) return null
  return (
    <Badge variante={TONOS_MODO[modo] ?? 'neutral'} className={className} title={ORIGEN_AVANCE[modo]}>
      {ETIQUETAS_CORTAS_MODO[modo] ?? modo}
    </Badge>
  )
}
