import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useData } from '../../context/useData'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { formatearMoneda } from '../../utils/formatters'
import { cuentaComoManoDeObra } from '../../utils/calculadora'
import { curvaServicio } from '../../utils/curvaS'
import { lineaBaseVigente } from '../../utils/lineaBase'
import { servicioConPresupuestoVigente } from '../../utils/modificaciones'

// Colores de las tres variables del valor ganado (mismos que el resto del
// panel: plan azul, costo real rojo, valor ganado verde).
const COLOR = {
  pv: '#2563eb',
  ac: '#dc2626',
  ev: '#059669',
}

const NOMBRE = {
  pv: 'Costo planificado (PV)',
  ac: 'Costo real (AC)',
  ev: 'Valor ganado (EV)',
}

// Opciones de granularidad de la serie. `id` coincide con curvaS.js.
const GRANULARIDADES = [
  { id: 'mensual', etiqueta: 'Mensual' },
  { id: 'semanal', etiqueta: 'Semanal' },
  { id: '4d', etiqueta: '4 días' },
  { id: '2d', etiqueta: '2 días' },
  { id: 'diario', etiqueta: 'Diario' },
]

// Redondea hacia arriba a un "techo bonito" (1, 2 o 5 × 10^n) para que el eje
// de soles no muestre cifras sucias.
function techoBonito(maximo) {
  if (!(maximo > 0)) return 1
  const exponente = Math.floor(Math.log10(maximo))
  const base = Math.pow(10, exponente)
  const n = maximo / base
  const paso = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return paso * base
}

function dinero(valor) {
  return valor == null ? '—' : formatearMoneda(valor)
}

// Selector segmentado de granularidad (última fila del encabezado del gráfico).
function SelectorGranularidad({ valor, onChange }) {
  return (
    <div
      role="group"
      aria-label="Granularidad de la curva"
      className="inline-flex flex-wrap gap-0.5 rounded-lg border border-slate-300 bg-slate-50 p-0.5"
    >
      {GRANULARIDADES.map((g) => (
        <button
          key={g.id}
          type="button"
          onClick={() => onChange(g.id)}
          aria-pressed={valor === g.id}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            valor === g.id
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          {g.etiqueta}
        </button>
      ))}
    </div>
  )
}

// Ficha de una de las tres variables (PV/AC/EV).
function TarjetaVariable({ color, sigla, etiqueta, valor, detalle }) {
  return (
    <div className="rounded-xl border border-slate-300 p-4">
      <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
        <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
        {etiqueta} <span className="text-slate-400">({sigla})</span>
      </p>
      <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{dinero(valor)}</p>
      <p className="mt-0.5 text-xs text-slate-500">{detalle}</p>
    </div>
  )
}

// Indicador con lectura (índices y desviaciones). `tono` controla el color
// del número: verde = favorable, rojo = desfavorable, gris = sin base.
function Indicador({ etiqueta, valor, detalle, tono = 'text-slate-900' }) {
  return (
    <div className="rounded-xl border border-slate-300 p-4">
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{etiqueta}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${tono}`}>{valor}</p>
      <p className="mt-0.5 text-xs text-slate-500">{detalle}</p>
    </div>
  )
}

// Gráfico de la curva S: líneas acumuladas de PV (plan), AC (real) y EV
// (ganado). SVG puro, sin librerías. Las líneas continuas llegan hasta el
// corte de hoy; las punteadas son la proyección lineal hasta el fin del plazo.
function CurvaSGrafico({ periodos, indiceHoy }) {
  const [activo, setActivo] = useState(null)
  const n = periodos.length
  if (n === 0) return null

  const ANCHO = 960
  const ALTO = 340
  const M = { arriba: 18, derecha: 26, abajo: 36, izquierda: 82 }
  const anchoUtil = ANCHO - M.izquierda - M.derecha
  const altoUtil = ALTO - M.arriba - M.abajo

  const maximoDato = Math.max(
    1,
    ...periodos.map((m) => m.pv ?? 0),
    ...periodos.map((m) => m.ac ?? 0),
    ...periodos.map((m) => m.ev ?? 0),
    ...periodos.map((m) => m.evProy ?? 0),
    ...periodos.map((m) => m.acProy ?? 0),
  )
  const techo = techoBonito(maximoDato)
  const paso = n === 1 ? 0 : anchoUtil / (n - 1)
  const x = (i) => (n === 1 ? M.izquierda + anchoUtil / 2 : M.izquierda + i * paso)
  const y = (valor) => M.arriba + altoUtil * (1 - Math.min(1, Math.max(0, valor / techo)))

  const camino = (campo) => {
    const puntos = periodos
      .map((m, i) => (m[campo] == null ? null : `${x(i).toFixed(1)} ${y(m[campo]).toFixed(1)}`))
      .filter(Boolean)
    return puntos.length ? `M ${puntos.join(' L ')}` : ''
  }

  const idxHoy = indiceHoy >= 0 ? indiceHoy : -1
  const marcasY = [0, 0.25, 0.5, 0.75, 1].map((f) => techo * f)
  const fila = activo != null ? periodos[activo] : null
  // Con muchas series se evitan los puntos (el trazo basta) y se limitan las
  // etiquetas del eje a ~10 para no amontonar.
  const mostrarPuntos = n <= 120
  const pasoEtiqueta = Math.max(1, Math.ceil(n / 10))

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        role="img"
        aria-label="Curva S de valor ganado (PV, AC y EV)"
        className="w-full"
        style={{ height: 'auto' }}
        onMouseLeave={() => setActivo(null)}
      >
        {/* Rejilla horizontal + eje Y (soles) */}
        {marcasY.map((v) => (
          <g key={`y-${v}`}>
            <line
              x1={M.izquierda}
              x2={ANCHO - M.derecha}
              y1={y(v)}
              y2={y(v)}
              stroke={v === 0 ? '#cbd5e1' : '#e2e8f0'}
              strokeWidth={v === 0 ? 1.2 : 1}
              strokeDasharray={v === 0 ? undefined : '3 4'}
            />
            <text
              x={M.izquierda - 8}
              y={y(v) + 3.5}
              textAnchor="end"
              className="fill-slate-400"
              fontSize="10"
            >
              {formatearMoneda(v)}
            </text>
          </g>
        ))}

        {/* Marca del corte de hoy */}
        {idxHoy >= 0 && (
          <g>
            <line
              x1={x(idxHoy)}
              x2={x(idxHoy)}
              y1={M.arriba}
              y2={M.arriba + altoUtil}
              stroke="#94a3b8"
              strokeWidth="1"
              strokeDasharray="4 3"
            />
            <text x={x(idxHoy)} y={M.arriba - 6} textAnchor="middle" className="fill-slate-400" fontSize="9.5">
              hoy
            </text>
          </g>
        )}

        {/* Proyección (punteada) hasta el fin del plazo */}
        {camino('acProy') && (
          <path d={camino('acProy')} fill="none" stroke={COLOR.ac} strokeWidth="1.8" strokeDasharray="5 4" opacity="0.7" strokeLinecap="round" />
        )}
        {camino('evProy') && (
          <path d={camino('evProy')} fill="none" stroke={COLOR.ev} strokeWidth="1.8" strokeDasharray="5 4" opacity="0.7" strokeLinecap="round" />
        )}

        {/* Líneas acumuladas reales */}
        {camino('pv') && <path d={camino('pv')} fill="none" stroke={COLOR.pv} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />}
        {camino('ac') && <path d={camino('ac')} fill="none" stroke={COLOR.ac} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />}
        {camino('ev') && <path d={camino('ev')} fill="none" stroke={COLOR.ev} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />}

        {/* Puntos (solo con series cortas) */}
        {mostrarPuntos &&
          periodos.map((m, i) => (
            <g key={`pts-${m.clave}`}>
              {m.pv != null && <circle cx={x(i)} cy={y(m.pv)} r={activo === i ? 3.4 : 2.4} fill={COLOR.pv} stroke="#fff" strokeWidth="1.1" />}
              {m.ac != null && <circle cx={x(i)} cy={y(m.ac)} r={activo === i ? 3.4 : 2.4} fill={COLOR.ac} stroke="#fff" strokeWidth="1.1" />}
              {m.ev != null && <circle cx={x(i)} cy={y(m.ev)} r={activo === i ? 3.4 : 2.4} fill={COLOR.ev} stroke="#fff" strokeWidth="1.1" />}
            </g>
          ))}

        {/* Resaltado del periodo activo (series largas) */}
        {!mostrarPuntos && fila && (
          <g>
            <line
              x1={x(activo)}
              x2={x(activo)}
              y1={M.arriba}
              y2={M.arriba + altoUtil}
              stroke="#94a3b8"
              strokeWidth="1"
            />
            {fila.pv != null && <circle cx={x(activo)} cy={y(fila.pv)} r="3.2" fill={COLOR.pv} stroke="#fff" strokeWidth="1.1" />}
            {fila.ac != null && <circle cx={x(activo)} cy={y(fila.ac)} r="3.2" fill={COLOR.ac} stroke="#fff" strokeWidth="1.1" />}
            {fila.ev != null && <circle cx={x(activo)} cy={y(fila.ev)} r="3.2" fill={COLOR.ev} stroke="#fff" strokeWidth="1.1" />}
          </g>
        )}

        {/* Etiquetas del eje X */}
        {periodos.map((m, i) => {
          const visible = i === 0 || i === n - 1 || i % pasoEtiqueta === 0
          if (!visible) return null
          return (
            <g key={`x-${m.clave}`}>
              <text x={x(i)} y={ALTO - 18} textAnchor="middle" className="fill-slate-500" fontSize="10">
                {m.corta}
              </text>
              {m.anio && (i === 0 || m.clave.slice(5) === '01') && (
                <text x={x(i)} y={ALTO - 6} textAnchor="middle" className="fill-slate-400" fontSize="9">
                  {m.anio}
                </text>
              )}
            </g>
          )
        })}

        {/* Zonas interactivas por periodo (tooltip) */}
        {periodos.map((m, i) => (
          <rect
            key={`hit-${m.clave}`}
            x={x(i) - (n > 1 ? paso / 2 : anchoUtil / 2)}
            y={M.arriba}
            width={n > 1 ? Math.max(1, paso) : anchoUtil}
            height={altoUtil}
            fill="transparent"
            onMouseEnter={() => setActivo(i)}
            onFocus={() => setActivo(i)}
            tabIndex={0}
          />
        ))}
      </svg>

      {fila && (
        <div
          className="pointer-events-none absolute top-0 z-10 w-52 -translate-x-1/2 rounded-lg border border-slate-200 bg-white/95 p-3 text-xs shadow-lg backdrop-blur"
          style={{ left: `${Math.min(88, Math.max(12, (x(activo) / ANCHO) * 100))}%` }}
          role="tooltip"
        >
          <p className="mb-1.5 font-semibold text-slate-800">{fila.etiqueta}</p>
          <dl className="space-y-1">
            {['pv', 'ac', 'ev'].map((k) => (
              <div key={k} className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-slate-500">
                  <span className="size-2 rounded-full" style={{ backgroundColor: COLOR[k] }} />
                  {NOMBRE[k].split(' (')[0]}
                </dt>
                <dd className="font-medium tabular-nums text-slate-800">{dinero(fila[k])}</dd>
              </div>
            ))}
          </dl>
          {fila.futuro && (
            <p className="mt-1.5 border-t border-slate-100 pt-1.5 text-[11px] text-slate-400">
              Periodo futuro: solo proyección del plan.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function Leyenda() {
  return (
    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
      <span className="flex items-center gap-1.5">
        <span className="h-0.5 w-5" style={{ backgroundColor: COLOR.pv }} /> Costo planificado (PV)
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-0.5 w-5" style={{ backgroundColor: COLOR.ac }} /> Costo real (AC)
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-0.5 w-5" style={{ backgroundColor: COLOR.ev }} /> Valor ganado (EV)
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-0.5 w-5 border-t-2 border-dashed border-slate-400" /> Proyección
      </span>
    </div>
  )
}

export function CurvaSServicio() {
  const { servicio } = useOutletContext()
  const { estado } = useData()
  const [granularidad, setGranularidad] = useState('mensual')

  const registrosVigentes = (estado.registros_servicio ?? []).filter(cuentaComoManoDeObra)
  const curva = curvaServicio({
    servicio: servicioConPresupuestoVigente(servicio, estado.modificaciones),
    tareas: estado.tareas ?? [],
    registros: registrosVigentes,
    granularidad,
    lineaBase: lineaBaseVigente(servicio.id, estado.lineas_base),
    lecturas: estado.lecturas_avance ?? [],
  })

  if (!curva.hayDatos) {
    return (
      <div className="space-y-6">
        <Card
          titulo="Curva S (Valor ganado)"
          descripcion="Costo planificado (PV), costo real (AC) y valor ganado (EV) a la fecha de corte."
        >
          <p className="text-sm text-slate-400">
            Aún no hay cronograma ni movimientos para construir la curva.{' '}
            <Link to="cronograma" className="font-medium text-primary-700 underline">
              Planifica las tareas
            </Link>{' '}
            y registra avances para verla.
          </p>
        </Card>
      </div>
    )
  }

  const semaforo = {
    verde: {
      variante: 'success',
      punto: 'bg-emerald-500',
      titulo: 'Obra bajo control',
      accion: 'Vas adelantado o en plazo y gastando por debajo del valor ganado.',
    },
    amarillo: {
      variante: 'warning',
      punto: 'bg-amber-500',
      titulo: 'Atención al ritmo',
      accion: 'El avance o el costo se están desviando del plan. Revisa las tareas críticas.',
    },
    rojo: {
      variante: 'danger',
      punto: 'bg-red-500',
      titulo: 'Riesgo de sobrecosto',
      accion: 'El gasto supera lo ganado o el proyecto pierde margen. Actúa sobre los costos.',
    },
  }[curva.semaforo] ?? null

  const lecturaIndice = (valor, bueno = 1, medio = 0.9) => {
    if (valor == null) return { tono: 'text-slate-400', texto: 'sin base' }
    if (valor >= bueno) return { tono: 'text-emerald-700', texto: 'favorable' }
    if (valor >= medio) return { tono: 'text-amber-700', texto: 'en observación' }
    return { tono: 'text-red-600', texto: 'desfavorable' }
  }

  const lecturaSpi = lecturaIndice(curva.spi)
  const lecturaCpi = lecturaIndice(curva.cpi)
  const tonoVarianza = (valor) =>
    valor == null ? 'text-slate-400' : valor >= 0 ? 'text-emerald-700' : 'text-red-600'
  const tonoVariacion = (valor) =>
    valor == null ? 'text-slate-400' : valor >= 0 ? 'text-emerald-700' : 'text-red-600'

  const nombreGranularidad = {
    mensual: 'meses',
    semanal: 'semanas',
    '4d': 'tramos de 4 días',
    '2d': 'tramos de 2 días',
    diario: 'días',
  }[granularidad]

  return (
    <div className="space-y-6">
      <Card
        titulo="Curva S (Valor ganado)"
        descripcion="Compara lo planificado (PV), lo gastado (AC) y lo realmente ganado (EV) hasta hoy."
        acciones={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variante={curva.usaLineaBase ? 'success' : 'neutral'}>
              {curva.usaLineaBase
                ? `PV de la línea base v${curva.versionLineaBase}`
                : 'PV del cronograma vivo'}
            </Badge>
            {curva.lecturas > 0 && (
              <Badge variante="info">EV de {curva.lecturas} lectura(s)</Badge>
            )}
          </div>
        }
      >
        <div className="space-y-5">
          {semaforo && (
            <div
              className={`flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 ${
                curva.semaforo === 'verde'
                  ? 'bg-emerald-50'
                  : curva.semaforo === 'amarillo'
                    ? 'bg-amber-50'
                    : 'bg-red-50'
              }`}
            >
              <Badge variante={semaforo.variante}>
                <span
                  className={`mr-1.5 inline-block size-2 rounded-full align-middle ${semaforo.punto}`}
                  aria-hidden="true"
                />
                {semaforo.titulo}
              </Badge>
              <p
                className={`text-sm font-medium ${
                  curva.semaforo === 'verde'
                    ? 'text-emerald-800'
                    : curva.semaforo === 'amarillo'
                      ? 'text-amber-800'
                      : 'text-red-700'
                }`}
              >
                {semaforo.accion}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <TarjetaVariable
              color={COLOR.pv}
              sigla="PV"
              etiqueta="Costo planificado"
              valor={curva.pv}
              detalle={`Lo que el plan preveía gastar a hoy sobre ${formatearMoneda(curva.presupuesto)}.`}
            />
            <TarjetaVariable
              color={COLOR.ac}
              sigla="AC"
              etiqueta="Costo real"
              valor={curva.ac}
              detalle="Dinero efectivamente gastado o devengado."
            />
            <TarjetaVariable
              color={COLOR.ev}
              sigla="EV"
              etiqueta="Valor ganado"
              valor={curva.ev}
              detalle={`${curva.avance}% de avance valorizado a precios del presupuesto.`}
            />
          </div>

          <details className="rounded-lg bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
            <summary className="cursor-pointer font-medium text-slate-700">¿Cómo se calcula?</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <span className="font-medium">PV</span> = presupuesto repartido según el cronograma
                planificado, acumulado hasta la fecha.
              </li>
              <li>
                <span className="font-medium">AC</span> = suma de los costos reales (materiales,
                personal, equipos, gastos) con fecha hasta hoy.
              </li>
              <li>
                <span className="font-medium">EV</span> = presupuesto × avance físico del
                cronograma. Mismo valor que la proyección del Resumen.
              </li>
            </ul>
          </details>
        </div>
      </Card>

      <Card
        titulo="Gráfico de la curva S"
        descripcion="Evolución acumulada. Si EV supera a PV vas adelantado; si AC supera a EV, gastas más de lo ganado."
        acciones={<SelectorGranularidad valor={granularidad} onChange={setGranularidad} />}
      >
        <CurvaSGrafico periodos={curva.periodos} indiceHoy={curva.indiceHoy} />
        <Leyenda />
        <p className="mt-2 text-xs text-slate-400 tabular-nums">
          {curva.periodos.length} {nombreGranularidad} · corte de hoy fijo, la granularidad solo
          cambia el detalle de la serie.
        </p>
      </Card>

      <Card
        titulo="Índices y proyección"
        descripcion="Desviaciones (SV, CV) y eficiencia (SPI, CPI) a hoy; costo final estimado (EAC)."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Indicador
            etiqueta="SPI · Desempeño de plazo"
            valor={curva.spi == null ? '—' : curva.spi.toFixed(2)}
            tono={lecturaSpi.tono}
            detalle={`EV ÷ PV · ${lecturaSpi.texto}`}
          />
          <Indicador
            etiqueta="CPI · Desempeño de costo"
            valor={curva.cpi == null ? '—' : curva.cpi.toFixed(2)}
            tono={lecturaCpi.tono}
            detalle={`EV ÷ AC · ${lecturaCpi.texto}`}
          />
          <Indicador
            etiqueta="SV · Variación de plazo"
            valor={curva.sv == null ? '—' : formatearMoneda(curva.sv)}
            tono={tonoVarianza(curva.sv)}
            detalle="EV − PV · mayor a 0 = adelantado"
          />
          <Indicador
            etiqueta="CV · Variación de costo"
            valor={formatearMoneda(curva.cv)}
            tono={tonoVarianza(curva.cv)}
            detalle="EV − AC · mayor a 0 = bajo presupuesto"
          />
          <Indicador
            etiqueta="EAC · Costo final estimado"
            valor={curva.eac == null ? '—' : formatearMoneda(curva.eac)}
            tono={tonoVariacion(curva.eac == null || curva.eac <= curva.presupuesto ? 0 : -1)}
            detalle={`Proyección sobre ${formatearMoneda(curva.presupuesto)} de presupuesto.`}
          />
          <Indicador
            etiqueta="VAC · Desviación final"
            valor={curva.vac == null ? '—' : formatearMoneda(curva.vac)}
            tono={tonoVariacion(curva.vac)}
            detalle="Presupuesto − EAC · mayor a 0 = te queda margen"
          />
        </div>
        <details className="mt-4 text-xs text-slate-500">
          <summary className="cursor-pointer font-medium hover:text-slate-700">¿Qué mide cada índice?</summary>
          <p className="mt-1">
            SPI y CPI mayores a 1 indican adelanto en plazo y eficiencia en costo. EAC es cuánto
            costaría la obra si mantienes el ritmo actual; VAC es el margen (o sobrecosto) que
            quedaría al terminar.
          </p>
        </details>
      </Card>
    </div>
  )
}
