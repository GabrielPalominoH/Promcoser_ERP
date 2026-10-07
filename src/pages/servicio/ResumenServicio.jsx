import { Link, useOutletContext } from 'react-router-dom'
import { useData } from '../../context/useData'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import {
  formatearCantidad,
  formatearMoneda,
  formatearFecha,
} from '../../utils/formatters'
import {
  consumoPresupuesto,
  desglosePorTipo,
  diasRestantes,
  metricasCronograma,
  registrosDeServicio,
  rentabilidadServicio,
} from '../../utils/calculadora'
import { usePanelServicio } from './panel'

// Diagrama de cascada vertical: cómo el presupuesto se consume paso a
// paso hasta llegar al saldo. Todo en divs, sin librerías.
function CascadaPresupuesto({ presupuesto, materiales, gastos, saldo }) {
  const maximo = Math.max(presupuesto, materiales + gastos, Math.abs(saldo), 1)
  const altura = (valor) => `${Math.min(100, (Math.abs(valor) / maximo) * 100)}%`
  const base = (acumulado) => `${Math.max(0, (acumulado / maximo) * 100)}%`

  const trasMateriales = presupuesto - materiales
  const trasGastos = trasMateriales - gastos

  const pasos = [
    {
      etiqueta: 'Presupuesto',
      texto: formatearMoneda(presupuesto),
      tono: 'bg-primary-600',
      base: '0%',
      altura: altura(presupuesto),
    },
    {
      etiqueta: '− Materiales',
      texto: `−${formatearMoneda(materiales)}`,
      tono: 'bg-red-500',
      base: base(trasMateriales),
      altura: altura(materiales),
    },
    {
      etiqueta: '− Gastos',
      texto: `−${formatearMoneda(gastos)}`,
      tono: 'bg-amber-500',
      base: base(trasGastos),
      altura: altura(gastos),
    },
    {
      etiqueta: saldo < 0 ? '= Excedente' : '= Saldo',
      texto: formatearMoneda(Math.abs(saldo)),
      tono: saldo < 0 ? 'bg-red-600' : 'bg-emerald-500',
      base: '0%',
      altura: altura(saldo),
    },
  ]

  return (
    <div>
      <div className="flex h-56 items-stretch justify-around gap-2">
        {pasos.map((paso) => (
          <div key={paso.etiqueta} className="flex min-w-0 flex-1 flex-col items-center">
            <p className="mb-1 h-8 text-center text-[11px] leading-tight font-semibold text-slate-700 tabular-nums">
              {paso.texto}
            </p>
            <div className="relative w-full max-w-16 flex-1 rounded-lg bg-slate-100">
              <div
                className={`absolute right-1 left-1 rounded-md ${paso.tono}`}
                style={{ bottom: paso.base, height: paso.altura, minHeight: paso.texto ? 4 : 0 }}
                title={`${paso.etiqueta}: ${paso.texto}`}
              />
            </div>
            <p className="mt-1.5 text-center text-[11px] leading-tight font-medium text-slate-500">
              {paso.etiqueta}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-slate-400 tabular-nums">
        Quedan {formatearMoneda(Math.max(0, saldo))}
        {saldo < 0 ? ` · excedido en ${formatearMoneda(Math.abs(saldo))}` : ' por comprometer'}
      </p>
    </div>
  )
}

export function ResumenServicio() {
  const { servicio } = useOutletContext()
  const { abrirEditar } = usePanelServicio()
  const {
    estado: { registros_servicio: todosLosRegistros, tareas: todasLasTareas },
  } = useData()

  // El personal ya no forma parte del detalle: se excluye también del
  // cálculo para que gastado y saldo coincidan siempre con las tablas.
  const registrosVigentes = todosLosRegistros.filter(
    (r) => r.tipo_registro !== 'personal',
  )
  const consumo = consumoPresupuesto(servicio, registrosVigentes)
  const dias = diasRestantes(servicio.fecha_fin_estimada)

  const registros = registrosDeServicio(registrosVigentes, servicio.id)
  const desglose = desglosePorTipo(registros)
  const tareas = todasLasTareas
    .filter((t) => t.servicio_id === servicio.id)
    .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))
  const cronograma = metricasCronograma(tareas)
  const rentabilidad = rentabilidadServicio(servicio, registrosVigentes, tareas)
  const lecturaCpi =
    rentabilidad.cpi == null
      ? null
      : rentabilidad.cpi >= 1
        ? { texto: 'Eficiente: avanzas más de lo que gastas', tono: 'text-emerald-700' }
        : rentabilidad.cpi >= 0.85
          ? { texto: 'Ajustado: el gasto va alcanzando al avance', tono: 'text-amber-700' }
          : { texto: 'En pérdida: gastas más rápido de lo que avanzas', tono: 'text-red-600' }
  const horasEquipos = registros
    .filter((r) => r.tipo_registro === 'equipo')
    .reduce((s, r) => s + (Number(r.cantidad_o_horas) || 0), 0)

  return (
    <div className="space-y-6">
      <Card
        titulo="Información del servicio"
        descripcion="Resumen de presupuesto y tiempos."
        acciones={
          <Button variante="secundario" tamano="sm" onClick={abrirEditar}>
            Editar
          </Button>
        }
      >
        <div className="mb-5 grid grid-cols-1 gap-4 rounded-xl bg-slate-50 p-4 text-center sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Fecha de inicio
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
              {formatearFecha(servicio.fecha_inicio)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Fecha de fin
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
              {servicio.fecha_fin_estimada
                ? formatearFecha(servicio.fecha_fin_estimada)
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Días restantes
            </p>
            <p
              className={`mt-1 text-xl font-bold tabular-nums ${
                dias !== null && dias < 0 ? 'text-red-600' : 'text-slate-900'
              }`}
            >
              {dias === null
                ? '—'
                : dias < 0
                  ? `Vencido (${Math.abs(dias)} d)`
                  : dias === 0
                    ? 'Vence hoy'
                    : `${dias} días`}
            </p>
          </div>
        </div>

        {(consumo.excedido || (dias !== null && dias < 0)) && (
          <div className="mb-5 space-y-2">
            {consumo.excedido && (
              <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
                El servicio superó su presupuesto.
              </p>
            )}
            {dias !== null && dias < 0 && (
              <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
                Plazo vencido hace {Math.abs(dias)} día(s). Fin estimado:{' '}
                {formatearFecha(servicio.fecha_fin_estimada)}.
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 p-4 text-center sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Presupuesto
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
              {formatearMoneda(servicio.presupuesto_asignado)}
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              Cliente: {servicio.cliente}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Gastado
            </p>
            <p className="mt-1 text-xl font-bold text-red-600 tabular-nums">
              {formatearMoneda(consumo.gastado)}
            </p>
            <div className="mx-auto mt-2 h-2 max-w-44 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${consumo.excedido ? 'bg-red-500' : 'bg-primary-600'}`}
                style={{ width: `${Math.min(100, Math.max(0, consumo.porcentaje))}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-slate-500 tabular-nums">
              {consumo.porcentaje.toFixed(1)}% del presupuesto
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              {consumo.disponible < 0 ? 'Excedente' : 'Saldo disponible'}
            </p>
            <p
              className={`mt-1 text-xl font-bold tabular-nums ${
                consumo.disponible < 0 ? 'text-red-600' : 'text-emerald-700'
              }`}
            >
              {formatearMoneda(Math.abs(consumo.disponible))}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {consumo.excedido ? 'Superó lo presupuestado' : 'Aún por comprometer'}
            </p>
          </div>
        </div>
      </Card>

      <Card
        titulo="Métricas del servicio"
        descripcion="Lectura rápida del gasto, el cronograma y la actividad."
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div>
            <p className="mb-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              En qué se gasta
            </p>
            {consumo.gastado === 0 ? (
              <p className="text-sm text-slate-400">
                Aún no hay gasto registrado.{' '}
                <Link to="materiales" className="font-medium text-primary-700 underline">
                  Registrar
                </Link>
              </p>
            ) : (
              <ul className="space-y-3">
                {[
                  { etiqueta: 'Materiales', monto: desglose.material, tono: 'bg-primary-600' },
                  { etiqueta: 'Gastos', monto: desglose.gasto, tono: 'bg-amber-500' },
                ].map((item) => (
                  <li key={item.etiqueta}>
                    <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-medium text-slate-700">{item.etiqueta}</span>
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {formatearMoneda(item.monto)}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${item.tono}`}
                        style={{ width: `${Math.min(100, (item.monto / consumo.gastado) * 100)}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400 tabular-nums">
                      {((item.monto / consumo.gastado) * 100).toFixed(1)}% del gastado
                    </p>
                  </li>
                ))}
                <li className="flex items-baseline justify-between gap-2 border-t border-slate-100 pt-2 text-sm">
                  <span className="font-medium text-slate-700">Equipos (control)</span>
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {formatearCantidad(horasEquipos)} h
                  </span>
                </li>
              </ul>
            )}
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Avance del cronograma
            </p>
            {cronograma.total === 0 ? (
              <p className="text-sm text-slate-400">
                Sin tareas todavía.{' '}
                <Link to="cronograma" className="font-medium text-primary-700 underline">
                  Planificar
                </Link>
              </p>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-slate-900 tabular-nums">
                    {cronograma.avanceGlobal}%
                  </p>
                  <p className="text-xs text-slate-500">
                    {cronograma.completadas}/{cronograma.total} tareas
                  </p>
                </div>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${cronograma.avanceGlobal}%` }}
                  />
                </div>
                {cronograma.atrasadas > 0 ? (
                  <p className="mt-2 inline-block rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                    {cronograma.atrasadas} atrasada(s)
                  </p>
                ) : (
                  <p className="mt-2 inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                    Al día
                  </p>
                )}
              </>
            )}
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Cascada del presupuesto
            </p>
            <CascadaPresupuesto
              presupuesto={consumo.presupuesto}
              materiales={desglose.material}
              gastos={desglose.gasto}
              saldo={consumo.disponible}
            />
          </div>
        </div>
      </Card>

      <Card
        titulo="Rentabilidad"
        descripcion="Margen actual, ritmo de gasto frente al avance y proyección al cierre."
      >
        <div className="grid grid-cols-1 gap-4 text-center sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Margen actual
            </p>
            <p
              className={`mt-1 text-xl font-bold tabular-nums ${
                rentabilidad.margen < 0 ? 'text-red-600' : 'text-slate-900'
              }`}
            >
              {formatearMoneda(rentabilidad.margen)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
              {rentabilidad.margenPct.toFixed(1)}% del presupuesto
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Ritmo de gasto
            </p>
            {rentabilidad.cpi == null ? (
              <>
                <p className="mt-1 text-xl font-bold text-slate-400">—</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Sin avance en cronograma.{' '}
                  <Link to="cronograma" className="font-medium text-primary-700 underline">
                    Planificar
                  </Link>
                </p>
              </>
            ) : (
              <>
                <p className={`mt-1 text-xl font-bold tabular-nums ${lecturaCpi.tono}`}>
                  {rentabilidad.cpi.toFixed(2)}
                </p>
                <p className={`mt-0.5 text-xs font-medium ${lecturaCpi.tono}`}>
                  {lecturaCpi.texto}
                </p>
              </>
            )}
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Proyección al cierre
            </p>
            {rentabilidad.margenProyectado == null ? (
              <>
                <p className="mt-1 text-xl font-bold text-slate-400">—</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Aún sin proyección (requiere avance).
                </p>
              </>
            ) : (
              <>
                <p
                  className={`mt-1 text-xl font-bold tabular-nums ${
                    rentabilidad.margenProyectado < 0 ? 'text-red-600' : 'text-slate-900'
                  }`}
                >
                  {formatearMoneda(rentabilidad.margenProyectado)}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                  Costo final ≈ {formatearMoneda(rentabilidad.costoFinal)}
                </p>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
