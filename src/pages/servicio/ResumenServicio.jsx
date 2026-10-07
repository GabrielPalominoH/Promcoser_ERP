import { Link, useOutletContext } from 'react-router-dom'
import { useData } from '../../context/useData'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import {
  formatearCantidad,
  formatearMes,
  formatearMoneda,
  formatearFecha,
} from '../../utils/formatters'
import {
  consumoPresupuesto,
  desglosePorTipo,
  diasRestantes,
  gastoPorMes,
  indiceAvance,
  metricasCronograma,
  registrosDeServicio,
  rentabilidadServicio,
} from '../../utils/calculadora'
import { usePanelServicio } from './panel'

// Diagrama de cascada vertical: cómo el presupuesto se consume paso a
// paso hasta llegar al saldo. Todo en divs, sin librerías.
function CascadaPresupuesto({ presupuesto, materiales, manoObra, gastos, saldo }) {
  const maximo = Math.max(presupuesto, materiales + manoObra + gastos, Math.abs(saldo), 1)
  const altura = (valor) => `${Math.min(100, (Math.abs(valor) / maximo) * 100)}%`

  const pasos = [
    {
      etiqueta: 'Presupuesto',
      valor: presupuesto,
      texto: formatearMoneda(presupuesto),
      tono: 'bg-primary-600',
      altura: altura(presupuesto),
    },
    {
      etiqueta: '− Materiales',
      valor: materiales,
      texto: `−${formatearMoneda(materiales)}`,
      tono: 'bg-red-500',
      altura: altura(materiales),
    },
    {
      etiqueta: '− Mano de obra',
      valor: manoObra,
      texto: `−${formatearMoneda(manoObra)}`,
      tono: 'bg-emerald-500',
      altura: altura(manoObra),
    },
    {
      etiqueta: '− Gastos',
      valor: gastos,
      texto: `−${formatearMoneda(gastos)}`,
      tono: 'bg-amber-500',
      altura: altura(gastos),
    },
    {
      etiqueta: saldo < 0 ? '= Excedente' : '= Saldo',
      valor: saldo,
      texto: formatearMoneda(Math.abs(saldo)),
      tono: saldo < 0 ? 'bg-red-600' : 'bg-emerald-700',
      altura: altura(saldo),
    },
  ]

  return (
    <div>
      <div className="flex h-56 items-stretch justify-around gap-2">
        {pasos.map((paso) => (
          <div key={paso.etiqueta} className="flex min-w-0 flex-1 flex-col items-center">
            <p className="mb-1 flex h-8 items-end justify-center text-center text-[11px] leading-tight font-semibold text-slate-700 tabular-nums">
              {paso.texto}
            </p>
            <div className="relative h-44 w-full max-w-10 rounded-lg bg-slate-100">
              <div
                className={`absolute right-1 bottom-0 left-1 rounded-md ${paso.tono}`}
                style={{
                  height: paso.altura,
                  minHeight: paso.valor !== 0 ? 14 : 0,
                }}
                title={`${paso.etiqueta}: ${paso.texto}`}
              />
            </div>
            <p className="mt-1.5 flex h-8 items-start justify-center overflow-hidden text-center text-[11px] leading-tight font-medium text-slate-500">
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

// Curva de gasto acumulado (burn-up) con línea de presupuesto.
// SVG puro, sin librerías: cada mes ocupa el mismo ancho.
function CurvaGasto({ porMes, presupuesto }) {
  if (porMes.length === 0) return null

  const acumulado = []
  let suma = 0
  for (const item of porMes) {
    suma += item.monto
    acumulado.push({ mes: item.mes, monto: item.monto, total: suma })
  }

  const ANCHO_MES = 72
  const ALTO = 170
  const MARGEN_ABAJO = 26
  const altoUtil = ALTO - MARGEN_ABAJO
  const maximo = Math.max(presupuesto, suma, 1)
  const pasoX = (i) => 8 + (i * ((porMes.length * ANCHO_MES - 16) / Math.max(1, porMes.length - 1 || 1)))
  const posY = (valor) => altoUtil - (valor / maximo) * altoUtil
  const puntos = acumulado.map((p, i) => `${pasoX(i)},${posY(p.total)}`).join(' ')
  const anchoTotal = porMes.length * ANCHO_MES

  return (
    <div className="mb-5">
      <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
        Curva de gasto acumulado
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-3">
        <svg
          width={anchoTotal}
          height={ALTO}
          viewBox={`0 0 ${anchoTotal} ${ALTO}`}
          role="img"
          aria-label="Curva de gasto acumulado por mes"
        >
          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1="0"
              x2={anchoTotal}
              y1={altoUtil * f}
              y2={altoUtil * f}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
          ))}
          <line
            x1="0"
            x2={anchoTotal}
            y1={posY(presupuesto)}
            y2={posY(presupuesto)}
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeDasharray="6 4"
          />
          <text x={anchoTotal - 4} y={Math.max(12, posY(presupuesto) - 5)} textAnchor="end" fontSize="10" fill="#64748b">
            Presupuesto
          </text>
          <polygon points={`8,${altoUtil} ${puntos} ${pasoX(acumulado.length - 1)},${altoUtil}`} fill="#2563eb" opacity="0.12" />
          <polyline points={puntos} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {acumulado.map((p, i) => (
            <g key={p.mes}>
              <circle cx={pasoX(i)} cy={posY(p.total)} r="3.5" fill="#2563eb">
                <title>{`${formatearMes(p.mes)}: ${formatearMoneda(p.total)} acumulado`}</title>
              </circle>
              <text x={pasoX(i)} y={ALTO - 8} textAnchor="middle" fontSize="10" fill="#64748b">
                {porMes.length > 8 && i % 2 === 1 ? '' : formatearMes(p.mes).split(' ')[0]}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-primary-600" /> Gastado acumulado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0 w-4 border-t-2 border-dashed border-slate-400" /> Presupuesto
        </span>
      </div>
    </div>
  )
}

export function ResumenServicio() {
  const { servicio } = useOutletContext()
  const { abrirEditar } = usePanelServicio()
  const {
    estado: { registros_servicio: todosLosRegistros, tareas: todasLasTareas },
  } = useData()

  // La mano de obra (personal con costo) sí suma al gastado, igual que
  // materiales y gastos. Los registros viejos de personal con monto 0 no
  // alteran los totales.
  const registrosVigentes = todosLosRegistros
  const consumo = consumoPresupuesto(servicio, registrosVigentes)
  const dias = diasRestantes(servicio.fecha_fin_estimada)

  const registros = registrosDeServicio(registrosVigentes, servicio.id)
  const desglose = desglosePorTipo(registros)
  const conteoTipo = {
    material: registros.filter((r) => r.tipo_registro === 'material').length,
    personal: registros.filter((r) => r.tipo_registro === 'personal').length,
    gasto: registros.filter((r) => r.tipo_registro === 'gasto').length,
    equipo: registros.filter((r) => r.tipo_registro === 'equipo').length,
  }
  const tareas = todasLasTareas
    .filter((t) => t.servicio_id === servicio.id)
    .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))
  const cronograma = metricasCronograma(tareas)
  const rentabilidad = rentabilidadServicio(servicio, registrosVigentes, tareas)
  const ritmoAvance = indiceAvance(servicio, rentabilidad.avance)
  const lecturaSpi =
    ritmoAvance == null
      ? null
      : ritmoAvance.spi >= 1
        ? { texto: 'A tiempo o adelantado', tono: 'text-emerald-700' }
        : ritmoAvance.spi >= 0.85
          ? { texto: 'Leve retraso en tiempo', tono: 'text-amber-700' }
          : { texto: 'Atrasado en tiempo', tono: 'text-red-600' }
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
        descripcion="Lectura rápida del gasto y sus movimientos."
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div>
            <p className="mb-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Movimientos
            </p>
            {registros.length === 0 ? (
              <p className="text-sm text-slate-400">
                Aún no hay movimientos registrados.{' '}
                <Link to="materiales" className="font-medium text-primary-700 underline">
                  Registrar
                </Link>
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {[
                  { etiqueta: 'Materiales', total: conteoTipo.material, detalle: null, a: 'materiales' },
                  { etiqueta: 'Mano de obra', total: conteoTipo.personal, detalle: null, a: 'personal' },
                  { etiqueta: 'Gastos', total: conteoTipo.gasto, detalle: null, a: 'gastos' },
                  { etiqueta: 'Usos de equipo', total: conteoTipo.equipo, detalle: `${formatearCantidad(horasEquipos)} h`, a: 'equipos' },
                ].map((item) => (
                  <li key={item.etiqueta} className="flex items-baseline justify-between gap-2 py-2 text-sm">
                    <Link to={item.a} className="font-medium text-slate-700 hover:text-primary-700 hover:underline">
                      {item.etiqueta}
                    </Link>
                    <span className="text-slate-500 tabular-nums">
                      {item.total} reg.{item.detalle ? ` · ${item.detalle}` : ''}
                    </span>
                  </li>
                ))}
                <li className="flex items-baseline justify-between gap-2 py-2 text-sm font-semibold">
                  <span className="text-slate-800">Total movimientos</span>
                  <span className="text-slate-900 tabular-nums">{registros.length}</span>
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
              manoObra={desglose.personal}
              gastos={desglose.gasto}
              saldo={consumo.disponible}
            />
          </div>
        </div>
      </Card>

      <Card
        titulo="Rentabilidad"
        descripcion="Margen proyectado al cierre, ritmos de gasto y avance, costo final y curva de gasto."
      >
        <CurvaGasto
          porMes={gastoPorMes(registros)}
          presupuesto={consumo.presupuesto}
        />
        <div className="mt-4 grid grid-cols-1 gap-4 text-center sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Margen proyectado
            </p>
            {rentabilidad.margenProyectado == null ? (
              <>
                <p className="mt-1 text-xl font-bold text-slate-400">—</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Requiere avance en cronograma.
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
                  {((rentabilidad.margenProyectado / consumo.presupuesto) * 100).toFixed(1)}%
                  del presupuesto al cierre
                </p>
              </>
            )}
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Ritmo de gasto
            </p>
            {rentabilidad.cpi == null ? (
              <>
                <p className="mt-1 text-xl font-bold text-slate-400">—</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Sin avance en cronograma.
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
              Ritmo de avance
            </p>
            {ritmoAvance == null ? (
              <>
                <p className="mt-1 text-xl font-bold text-slate-400">—</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Requiere plazo y avance.
                </p>
              </>
            ) : (
              <>
                <p className={`mt-1 text-xl font-bold tabular-nums ${lecturaSpi.tono}`}>
                  {ritmoAvance.spi.toFixed(2)}
                </p>
                <p className={`mt-0.5 text-xs font-medium ${lecturaSpi.tono}`}>
                  {lecturaSpi.texto} · esperado {ritmoAvance.esperado.toFixed(0)}%
                </p>
              </>
            )}
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Costo final estimado
            </p>
            {rentabilidad.costoFinal == null ? (
              <>
                <p className="mt-1 text-xl font-bold text-slate-400">—</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Aún sin proyección (requiere avance).
                </p>
              </>
            ) : (
              <>
                <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
                  {formatearMoneda(rentabilidad.costoFinal)}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                  Al ritmo actual de gasto
                </p>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
