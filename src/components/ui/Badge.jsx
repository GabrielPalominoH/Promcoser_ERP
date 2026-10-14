const variantes = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  info: 'bg-primary-50 text-primary-700 ring-primary-200',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  danger: 'bg-red-50 text-red-700 ring-red-200',
}

export function Badge({ variante = 'neutral', children, className = '' }) {
  return (
    <span
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