import { Link } from 'react-router-dom'
import { CatalogoCRUD } from '../components/crud/CatalogoCRUD'
import { CATALOGO_CONTRATOS } from '../config/catalogos'
import { Card } from '../components/ui/Card'
import { useData } from '../context/useData'
import { formatearMoneda } from '../utils/formatters'
import { cobradoServicio, sumarMontos } from '../utils/calculadora'

// Contratos marco: agrupan servicios para ver resultados individuales y
// consolidados. Cada servicio pertenece máximo a un contrato (sin duplicar
// ingresos ni costos en el consolidado).
export function Contratos() {
  const { estado } = useData()
  const contratos = estado.contratos ?? []
  const servicios = estado.servicios ?? []
  const registros = estado.registros_servicio ?? []
  const cobros = estado.cobros ?? []

  const consolidado = (contrato) => {
    const propios = servicios.filter((s) => s.contrato_id === contrato.id)
    const gastado = propios.reduce(
      (s, v) => s + registros.filter((r) => r.servicio_id === v.id).reduce((t, r) => t + Number(r.monto_calculado), 0),
      0,
    )
    const cobrado = propios.reduce((s, v) => s + cobradoServicio(cobros, v.id), 0)
    return { propios, gastado, cobrado, resultado: cobrado - gastado }
  }

  return (
    <div className="space-y-6">
      <CatalogoCRUD config={CATALOGO_CONTRATOS} />

      {contratos.length > 0 && (
        <Card titulo="Consolidado por contrato" descripcion="Suma de sus servicios (cada servicio cuenta una sola vez).">
          <ul className="space-y-3">
            {contratos.map((c) => {
              const k = consolidado(c)
              return (
                <li key={c.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold text-slate-900">
                      {c.codigo} · {c.nombre}
                    </p>
                    <p className={`font-bold tabular-nums ${k.resultado < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                      {formatearMoneda(k.resultado)}
                    </p>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Contratado {formatearMoneda(c.monto_contratado)} · {k.propios.length} servicio(s)
                  </p>
                  {k.propios.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {k.propios.map((s) => {
                        const gastado = sumarMontos(registros.filter((r) => r.servicio_id === s.id))
                        const cobrado = cobradoServicio(cobros, s.id)
                        return (
                          <li key={s.id} className="flex flex-wrap justify-between gap-2 text-sm">
                            <Link to={`/servicios/${s.id}`} className="text-primary-700 hover:underline">
                              {s.nombre_servicio}
                            </Link>
                            <span className="tabular-nums">
                              cob. {formatearMoneda(cobrado)} · gasto {formatearMoneda(gastado)} ·{' '}
                              <span className={`font-semibold ${cobrado - gastado < 0 ? 'text-red-600' : ''}`}>
                                {formatearMoneda(cobrado - gastado)}
                              </span>
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-slate-400">
                      Sin servicios vinculados. Vincúlalos editando cada servicio (Opciones).
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}
