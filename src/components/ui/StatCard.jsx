import { Link } from 'react-router-dom'

const tonos = {
  primary: 'bg-primary-50 text-primary-700',
  slate: 'bg-slate-100 text-slate-600',
  success: 'bg-emerald-50 text-emerald-700',
  danger: 'bg-red-50 text-red-700',
  warning: 'bg-amber-50 text-amber-700',
}

export function StatCard({
  titulo,
  valor,
  detalle,
  tono = 'primary',
  icono,
  className = '',
  // Drilldown opcional: toda la tarjeta enlaza al detalle.
  destino = null,
  // Metodología opcional: fórmula en una línea tras "¿Cómo se calcula?".
  nota = null,
}) {
  const cuerpo = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{titulo}</p>
        {icono && (
          <span
            className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${tonos[tono]}`}
          >
            {icono}
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{valor}</p>
      {detalle && <p className="mt-1 text-xs text-slate-500">{detalle}</p>}
      {nota && (
        <details className="mt-2 text-xs text-slate-500">
          <summary className="cursor-pointer font-medium hover:text-slate-700">
            ¿Cómo se calcula?
          </summary>
          <p className="mt-1">{nota}</p>
        </details>
      )}
    </>
  )

  if (destino == null) {
    return (
      <div
        className={`rounded-xl border border-slate-300 bg-white p-5 shadow-sm ${className}`}
      >
        {cuerpo}
      </div>
    )
  }

  return (
    <Link
      to={destino}
      className={`block rounded-xl border border-slate-300 bg-white p-5 shadow-sm transition-colors hover:border-primary-300 hover:bg-primary-50/40 ${className}`}
    >
      {cuerpo}
    </Link>
  )
}