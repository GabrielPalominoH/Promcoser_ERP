import { Link, useOutletContext } from 'react-router-dom'
import { useData } from '../../context/useData'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import {
  formatearCantidad,
  formatearMes,
  formatearMoneda,
  formatearFecha,
} from '../../utils/formatters'
import {
  alertasServicio,
  costoSubarbol,
  cuentaComoManoDeObra,
  desglosePorTipo,
  diasEstimadosTarea,
  diasRealesTarea,
  diasRestantes,
  desviacionDias,
  estadoPresupuesto,
  gastoPorMes,
  horasPorMes,
  hoyISO,
  mediaMovil,
  metricasCronograma,
  proyeccionFinanciera,
  registrosDeServicio,
  utilidadReal,
  valorizadoTarea,
} from '../../utils/calculadora'
import { curvaServicio } from '../../utils/curvaS'
import { lineaBaseVigente } from '../../utils/lineaBase'
import { servicioConPresupuestoVigente } from '../../utils/modificaciones'
import { resumenHorasServicio } from '../../utils/horasHombre'
import { usePanelServicio } from './panel'

// Diagrama de cascada vertical: cómo lo cobrado se consume paso a paso
// por tipo de costo hasta llegar a la utilidad. Todo en divs, sin librerías.
function CascadaUtilidad({ cobrado, materiales, manoObra, equipos, gastos, utilidad }) {
  const maximo = Math.max(cobrado, materiales + manoObra + equipos + gastos, Math.abs(utilidad), 1)
  const altura = (valor) => `${Math.min(100, (Math.abs(valor) / maximo) * 100)}%`

  const pasos = [
    {
      etiqueta: 'Cobrado',
      valor: cobrado,
      texto: formatearMoneda(cobrado),
      tono: 'bg-primary-600',
      altura: altura(cobrado),
    },
    {
      etiqueta: '− Materiales',
      valor: materiales,
      texto: `−${formatearMoneda(materiales)}`,
      tono: 'bg-red-500',
      altura: altura(materiales),
    },
    {
      etiqueta: '− Personal',
      valor: manoObra,
      texto: `−${formatearMoneda(manoObra)}`,
      tono: 'bg-emerald-500',
      altura: altura(manoObra),
    },
    {
      etiqueta: '− Equipos',
      valor: equipos,
      texto: `−${formatearMoneda(equipos)}`,
      tono: 'bg-sky-500',
      altura: altura(equipos),
    },
    {
      etiqueta: '− Gastos',
      valor: gastos,
      texto: `−${formatearMoneda(gastos)}`,
      tono: 'bg-amber-500',
      altura: altura(gastos),
    },
    {
      etiqueta: utilidad < 0 ? '= Pérdida' : '= Utilidad',
      valor: utilidad,
      texto: formatearMoneda(Math.abs(utilidad)),
      tono: utilidad < 0 ? 'bg-red-600' : 'bg-emerald-700',
      altura: altura(utilidad),
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
        Utilidad {formatearMoneda(utilidad)} = cobrado menos cada tipo
      </p>
    </div>
  )
}

// Curva de gasto acumulado (burn-up) con ejes rotulados. SVG puro, sin
// librerías; responde al ancho y alterna las etiquetas de mes en dos filas
// para que nunca se encimen.
function CurvaGasto({ porMes }) {
  if (porMes.length === 0) return null

  const acumulado = []
  let suma = 0
  for (const item of porMes) {
    suma += item.monto
    acumulado.push({ mes: item.mes, monto: item.monto, total: suma })
  }

  const ANCHO = 600
  const ALTO = 175
  const IZQ = 64
  const DER = 12
  const ARRIBA = 10
  const ABAJO = 40
  const anchoUtil = ANCHO - IZQ - DER
  const altoUtil = ALTO - ARRIBA - ABAJO
  const maximo = Math.max(suma, 1)
  const pasoX = (i) =>
    porMes.length === 1
      ? IZQ + anchoUtil / 2
      : IZQ + (i * anchoUtil) / (porMes.length - 1)
  const posY = (valor) => ARRIBA + altoUtil - (valor / maximo) * altoUtil
  const puntos = acumulado.map((p, i) => `${pasoX(i)},${posY(p.total)}`).join(' ')
  const ultimoX = pasoX(acumulado.length - 1)

  return (
    <div>
      <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
        Curva de gasto acumulado
      </p>
      <div className="rounded-xl border border-slate-300 bg-white p-3">
        <svg
          viewBox={`0 0 ${ANCHO} ${ALTO}`}
          className="w-full"
          role="img"
          aria-label="Curva de gasto acumulado por mes"
        >
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <g key={f}>
              <line
                x1={IZQ}
                x2={ANCHO - DER}
                y1={posY(maximo * f)}
                y2={posY(maximo * f)}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              <text x={IZQ - 6} y={posY(maximo * f) + 3.5} textAnchor="end" fontSize="9.5" fill="#64748b" className="tabular-nums">
                {formatearMoneda(maximo * f)}
              </text>
            </g>
          ))}
          <polygon points={`${pasoX(0)},${posY(0)} ${puntos} ${ultimoX},${posY(0)}`} fill="#2563eb" opacity="0.12" />
          <polyline points={puntos} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {acumulado.map((p, i) => (
            <g key={p.mes}>
              <circle cx={pasoX(i)} cy={posY(p.total)} r="4.5" fill="#2563eb">
                <title>{`${formatearMes(p.mes)}: ${formatearMoneda(p.total)} acumulado`}</title>
              </circle>
              <text
                x={pasoX(i)}
                y={i % 2 === 0 ? ALTO - 22 : ALTO - 8}
                textAnchor="middle"
                fontSize="10"
                fill="#64748b"
              >
                {formatearMes(p.mes).split(' ')[0]}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-primary-600" /> Gastado acumulado
        </span>
      </div>
    </div>
  )
}

// Tendencia de gasto mensual: barras por mes + línea de media móvil de 3
// meses. Responde si el gasto acelera o se frena (la curva de arriba es el
// acumulado; esta es el ritmo).
function TendenciaGasto({ porMes }) {
  if (porMes.length === 0) return null

  const montos = porMes.map((m) => m.monto)
  const mm = mediaMovil(montos)
  const ANCHO = 600
  const ALTO = 190
  const IZQ = 64
  const DER = 12
  const ARRIBA = 12
  const ABAJO = 40
  const anchoUtil = ANCHO - IZQ - DER
  const altoUtil = ALTO - ARRIBA - ABAJO
  const maximo = Math.max(...montos, ...mm, 1)
  const paso = anchoUtil / porMes.length
  const centroX = (i) => IZQ + paso * i + paso / 2
  const posY = (valor) => ARRIBA + altoUtil - (valor / maximo) * altoUtil
  const puntosMM = mm.map((v, i) => `${centroX(i)},${posY(v)}`).join(' ')

  return (
    <div>
      <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
        Tendencia de gasto mensual
      </p>
      <div className="rounded-xl border border-slate-300 bg-white p-3">
        <svg
          viewBox={`0 0 ${ANCHO} ${ALTO}`}
          className="w-full"
          role="img"
          aria-label="Gasto por mes con media móvil de 3 meses"
        >
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <g key={f}>
              <line
                x1={IZQ}
                x2={ANCHO - DER}
                y1={posY(maximo * f)}
                y2={posY(maximo * f)}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              <text x={IZQ - 6} y={posY(maximo * f) + 3.5} textAnchor="end" fontSize="9.5" fill="#64748b" className="tabular-nums">
                {formatearMoneda(maximo * f)}
              </text>
            </g>
          ))}
          {porMes.map((m, i) => (
            <g key={m.mes}>
              <rect
                x={centroX(i) - Math.min(26, paso * 0.3)}
                y={posY(m.monto)}
                width={Math.min(52, paso * 0.6)}
                height={Math.max(0, ARRIBA + altoUtil - posY(m.monto))}
                rx="4"
                fill="#2563eb"
                opacity="0.75"
              >
                <title>{`${formatearMes(m.mes)}: ${formatearMoneda(m.monto)}`}</title>
              </rect>
              <text
                x={centroX(i)}
                y={i % 2 === 0 ? ALTO - 22 : ALTO - 8}
                textAnchor="middle"
                fontSize="10"
                fill="#64748b"
              >
                {formatearMes(m.mes).split(' ')[0]}
              </text>
            </g>
          ))}
          {porMes.length > 1 && (
            <polyline points={puntosMM} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          )}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded bg-primary-600/75" /> Gasto del mes
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-amber-500" /> Media de 3 meses
        </span>
      </div>
    </div>
  )
}

// Horas hombre por mes: barras con las horas de personal registradas.
// Conecta con la tarjeta de Productividad (estimado vs. real del total).
function HorasMes({ porMes }) {
  if (porMes.length === 0) return null

  const ANCHO = 600
  const ALTO = 190
  const IZQ = 56
  const DER = 12
  const ARRIBA = 12
  const ABAJO = 40
  const anchoUtil = ANCHO - IZQ - DER
  const altoUtil = ALTO - ARRIBA - ABAJO
  const maximo = Math.max(...porMes.map((m) => m.horas), 1)
  const paso = anchoUtil / porMes.length
  const centroX = (i) => IZQ + paso * i + paso / 2
  const posY = (valor) => ARRIBA + altoUtil - (valor / maximo) * altoUtil

  return (
    <div>
      <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
        Horas hombre por mes
      </p>
      <div className="rounded-xl border border-slate-300 bg-white p-3">
        <svg
          viewBox={`0 0 ${ANCHO} ${ALTO}`}
          className="w-full"
          role="img"
          aria-label="Horas de personal por mes"
        >
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <g key={f}>
              <line
                x1={IZQ}
                x2={ANCHO - DER}
                y1={posY(maximo * f)}
                y2={posY(maximo * f)}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              <text x={IZQ - 6} y={posY(maximo * f) + 3.5} textAnchor="end" fontSize="9.5" fill="#64748b" className="tabular-nums">
                {`${Math.round(maximo * f)} h`}
              </text>
            </g>
          ))}
          {porMes.map((m, i) => (
            <g key={m.mes}>
              <rect
                x={centroX(i) - Math.min(26, paso * 0.3)}
                y={posY(m.horas)}
                width={Math.min(52, paso * 0.6)}
                height={Math.max(0, ARRIBA + altoUtil - posY(m.horas))}
                rx="4"
                fill="#0d9488"
                opacity="0.8"
              >
                <title>{`${formatearMes(m.mes)}: ${m.horas} h`}</title>
              </rect>
              <text
                x={centroX(i)}
                y={i % 2 === 0 ? ALTO - 22 : ALTO - 8}
                textAnchor="middle"
                fontSize="10"
                fill="#64748b"
              >
                {formatearMes(m.mes).split(' ')[0]}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded bg-teal-600/80" /> Horas registradas
        </span>
      </div>
    </div>
  )
}

// Valorizado contra costo por tarea principal: qué trabajo deja margen.
// Barras horizontales agrupadas (los números viven en Partidas).
function ValorizadoCosto({ raices, tareas, registros, servicioId }) {
  if (raices.length === 0) return null

  const filas = raices.map((t) => ({
    nombre: t.nombre,
    valorizado: Math.round(valorizadoTarea(t, tareas) * 100) / 100,
    costo: Math.round(costoSubarbol(t, tareas, registros, servicioId) * 100) / 100,
  }))
  const maximo = Math.max(1, ...filas.flatMap((f) => [f.valorizado, f.costo]))

  return (
    <div>
      <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
        Valorizado contra costo por trabajo
      </p>
      <ul className="space-y-3">
        {filas.map((f) => (
          <li key={f.nombre}>
            <p className="mb-1 truncate text-sm font-medium text-slate-700" title={f.nombre}>
              {f.nombre}
            </p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-right text-xs text-slate-500">Valoriz.</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${(f.valorizado / maximo) * 100}%` }}
                    title={`Valorizado ${formatearMoneda(f.valorizado)}`}
                  />
                </div>
                <span className="w-24 shrink-0 text-right text-xs text-slate-500 tabular-nums">
                  {formatearMoneda(f.valorizado)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-right text-xs text-slate-500">Costo</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${f.costo > f.valorizado ? 'bg-red-500' : 'bg-slate-400'}`}
                    style={{ width: `${(f.costo / maximo) * 100}%` }}
                    title={`Costo ${formatearMoneda(f.costo)}`}
                  />
                </div>
                <span className="w-24 shrink-0 text-right text-xs text-slate-500 tabular-nums">
                  {formatearMoneda(f.costo)}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Valorizado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-400" /> Costo (rojo si lo supera)
        </span>
      </div>
    </div>
  )
}

export function ResumenServicio() {
  const { servicio } = useOutletContext()
  const { abrirEditar } = usePanelServicio()
  const {
    estado: {
      registros_servicio: todosLosRegistros,
      tareas: todasLasTareas,
      personal,
      asignaciones: todasLasAsignaciones,
      cobros: todosLosCobros,
      lineas_base: lineasBase,
      lecturas_avance: lecturasAvance,
      modificaciones: todasLasModificaciones,
    },
  } = useData()

  // El presupuesto contractual vigente (original + adicionales − deductivos
  // aprobados) alimenta el control; el original se conserva aparte para
  // mostrar la variación.
  const servicioVig = servicioConPresupuestoVigente(servicio, todasLasModificaciones ?? [])
  const variacionPresupuesto = servicioVig.presupuesto_asignado - servicioVig.presupuesto_original

  // El personal con costo sí suma al gastado, igual que materiales y
  // gastos. Los registros diarios viejos en domingo no cuentan (régimen
  // diario); los mensuales automáticos siempre cuentan.
  const registrosVigentes = todosLosRegistros.filter(cuentaComoManoDeObra)
  const dias = diasRestantes(servicio.fecha_fin_estimada)

  const registros = registrosDeServicio(registrosVigentes, servicio.id)
  const porMesGasto = gastoPorMes(registros)
  const porMesHoras = horasPorMes(registrosVigentes, servicio.id)
  const estado = estadoPresupuesto(servicioVig, registrosVigentes, todosLosCobros)
  const gastado = estado.gastado
  const cobrado = estado.cobrado
  const utilidad = utilidadReal(cobrado, gastado)
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
  // Índices del valor ganado: el mismo SPI/EV/PV que muestra la Curva S, para
  // que Resumen y Curva S nunca lean distinto el ritmo de la obra.
  const curva = curvaServicio({
    servicio: servicioVig,
    tareas,
    registros: registrosVigentes,
    hoy: hoyISO(),
    lineaBase: lineaBaseVigente(servicio.id, lineasBase),
    lecturas: lecturasAvance ?? [],
  })
  const diasEst = tareas
    .filter((t) => t.padre_id == null)
    .reduce((s, t) => s + diasEstimadosTarea(t, tareas), 0)
  const diasReales = tareas
    .filter((t) => t.padre_id == null)
    .reduce((s, t) => s + diasRealesTarea(t, tareas, registrosVigentes, servicio.id), 0)
  const desvDias = desviacionDias(diasEst, diasReales)
  const ritmoAvance = curva.spi
  const proyeccion = proyeccionFinanciera({
    presupuesto: estado.presupuesto,
    gastado,
    cobrado,
    avance: cronograma.avanceGlobal,
    spi: ritmoAvance,
  })
  const semaforo = {
    verde: {
      variante: 'success',
      titulo: 'Vas bien',
      accion: 'Mantén el ritmo y factura lo avanzado.',
    },
    amarillo: {
      variante: 'warning',
      titulo: 'Ojo con el plazo',
      accion: 'Revisa las tareas atrasadas antes de que muerdan el margen.',
    },
    rojo: {
      variante: 'danger',
      titulo: 'Alto: riesgo de pérdida',
      accion: 'Estás gastando más de lo que la obra da. Revisa costos hoy.',
    },
  }[proyeccion.semaforo] ?? null
  const lecturaSpi =
    ritmoAvance == null
      ? null
      : ritmoAvance >= 1
        ? { texto: 'A tiempo o adelantado', tono: 'text-emerald-700' }
        : ritmoAvance >= 0.9
          ? { texto: 'Leve retraso en tiempo', tono: 'text-amber-700' }
          : { texto: 'Atrasado en tiempo', tono: 'text-red-600' }
  const horasEquipos = registros
    .filter((r) => r.tipo_registro === 'equipo')
    .reduce((s, r) => s + (Number(r.cantidad_o_horas) || 0), 0)
  const hh = resumenHorasServicio({
    tareas: todasLasTareas,
    asignaciones: todasLasAsignaciones ?? [],
    registros: todosLosRegistros,
    servicio,
  })
  const costoHH = hh.real > 0 ? desglose.personal / hh.real : null
  const alertas = alertasServicio({ estado, dias })

  return (
    <div className="space-y-6">
      <Card
        titulo="Información del servicio"
        descripcion="Resumen de presupuesto, ingresos, gastos y tiempos."
        acciones={
          <>
            <Button variante="secundario" tamano="sm" onClick={() => window.print()}>
              Imprimir reporte
            </Button>
            <Button variante="secundario" tamano="sm" onClick={abrirEditar}>
              Editar
            </Button>
          </>
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

        {alertas.length > 0 && (
          <div className="mb-5 space-y-2">
            {alertas.map((alerta) => (
              <p
                key={alerta.codigo}
                className={`rounded-lg px-4 py-2.5 text-sm font-medium ${
                  alerta.nivel === 'peligro'
                    ? 'bg-red-50 text-red-700'
                    : 'bg-amber-50 text-amber-800'
                }`}
              >
                {alerta.mensaje}
              </p>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-300 p-4 text-center sm:grid-cols-2 xl:grid-cols-5">
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Presupuesto vigente
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
              {formatearMoneda(estado.presupuesto)}
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {variacionPresupuesto !== 0
                ? `Original ${formatearMoneda(servicioVig.presupuesto_original)} (${
                    variacionPresupuesto > 0 ? '+' : '−'
                  }${formatearMoneda(Math.abs(variacionPresupuesto))})`
                : `Cliente: ${servicio.cliente}`}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Cobrado
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
              {formatearMoneda(cobrado)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Ingresos efectivamente recibidos ·{' '}
              <Link to="ingresos" className="font-medium text-primary-700 underline">
                Ver ingresos
              </Link>
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Gastado
            </p>
            <p className="mt-1 text-xl font-bold text-red-600 tabular-nums">
              {formatearMoneda(gastado)}
            </p>
            <div className="mx-auto mt-2 h-2 max-w-44 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${estado.excedido ? 'bg-red-500' : 'bg-primary-600'}`}
                style={{ width: `${Math.min(100, Math.max(0, estado.porcentaje))}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-slate-500 tabular-nums">
              {estado.porcentaje.toFixed(1)}% del presupuesto
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              {estado.disponible < 0 ? 'Excedente' : 'Saldo disponible'}
            </p>
            <p
              className={`mt-1 text-xl font-bold tabular-nums ${
                estado.disponible < 0 ? 'text-red-600' : 'text-emerald-700'
              }`}
            >
              {formatearMoneda(Math.abs(estado.disponible))}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {estado.excedido ? 'Superó el presupuesto inicial' : 'Aún por comprometer'}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Utilidad real
            </p>
            <p
              className={`mt-1 text-xl font-bold tabular-nums ${
                utilidad < 0 ? 'text-red-600' : 'text-emerald-700'
              }`}
            >
              {formatearMoneda(utilidad)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Cobrado menos gastado
            </p>
          </div>
        </div>
        <details className="mt-4 text-xs text-slate-500">
          <summary className="cursor-pointer font-medium hover:text-slate-700">
            ¿Cómo se calcula?
          </summary>
          <p className="mt-1">
            Utilidad = cobrado − gastado; Saldo = presupuesto inicial − gastado.
          </p>
        </details>
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
                  { etiqueta: 'Personal', total: conteoTipo.personal, detalle: null, a: 'personal' },
                  { etiqueta: 'Gastos', total: conteoTipo.gasto, detalle: null, a: 'gastos' },
                  { etiqueta: 'Equipos', total: conteoTipo.equipo, detalle: `${formatearCantidad(horasEquipos)} h`, a: 'equipos' },
                ].map((item) => (
                  <li key={item.etiqueta} className="flex items-baseline justify-between gap-2 py-2 text-sm">
                    <Link to={item.a} className="font-medium text-slate-700 hover:text-primary-700 hover:underline">
                      {item.etiqueta}
                    </Link>
                    <span className="text-slate-500 tabular-nums">
                      {item.total} registros{item.detalle ? ` · ${item.detalle}` : ''}
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
              Cascada de utilidad
            </p>
            <CascadaUtilidad
              cobrado={cobrado}
              materiales={desglose.material}
              manoObra={desglose.personal}
              equipos={desglose.equipo}
              gastos={desglose.gasto}
              utilidad={utilidad}
            />
          </div>
        </div>
      </Card>

      <Card
        titulo="Tendencias"
        descripcion="Ritmo del gasto, horas por mes y valorizado contra costo por trabajo."
      >
        {(porMesGasto.length > 0 || porMesHoras.length > 0) ? (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
            <CurvaGasto porMes={porMesGasto} />
            <TendenciaGasto porMes={porMesGasto} />
            <HorasMes porMes={porMesHoras} />
            <ValorizadoCosto
              raices={tareas.filter((t) => t.padre_id == null)}
              tareas={tareas}
              registros={todosLosRegistros}
              servicioId={servicio.id}
            />
          </div>
        ) : (
          <p className="text-sm text-slate-400">
            Aún no hay movimientos registrados.{' '}
            <Link to="materiales" className="font-medium text-primary-700 underline">
              Registrar
            </Link>
          </p>
        )}
      </Card>

      <Card
        titulo="Productividad (días de personal)"
        descripcion="Duración planificada en el Cronograma contra días reales con trabajo registrado."
      >
        {diasEst === 0 ? (
          <p className="text-sm text-slate-400">
            Sin tareas con fechas todavía.{' '}
            <Link to="cronograma" className="font-medium text-primary-700 underline">
              Planificar
            </Link>
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 text-center sm:grid-cols-3">
            <div className="rounded-xl border border-slate-300 p-4">
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Estimado
              </p>
              <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
                {diasEst} d
              </p>
            </div>
            <div className="rounded-xl border border-slate-300 p-4">
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Real
              </p>
              <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
                {diasReales} d
              </p>
              <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                {desvDias.porcentaje == null ? '—' : `${desvDias.porcentaje}% de lo estimado`}
              </p>
            </div>
            <div className="rounded-xl border border-slate-300 p-4">
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Desviación
              </p>
              <p
                className={`mt-1 text-xl font-bold tabular-nums ${
                  desvDias.diferencia > 0 ? 'text-red-600' : 'text-emerald-700'
                }`}
              >
                {desvDias.diferencia > 0 ? `+${desvDias.diferencia}` : desvDias.diferencia} d
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {desvDias.diferencia > 0 ? 'Más días de los planeados' : 'Dentro de lo planeado'}
              </p>
            </div>
          </div>
        )}
        <details className="mt-4 text-xs text-slate-500">
          <summary className="cursor-pointer font-medium hover:text-slate-700">
            ¿Cómo se calcula?
          </summary>
          <p className="mt-1">
            Estimado = duración planificada (fin − inicio + 1 día); real = días con registros
            de personal. Desviación = reales − estimados.
          </p>
        </details>
      </Card>

      <Card
        titulo="Horas-hombre"
        descripcion="Lo que comprometen las asignaciones de personal contra las horas realmente trabajadas."
      >
        <div className="grid grid-cols-1 gap-4 text-center sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-300 p-4">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              HH planificadas
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
              {formatearCantidad(hh.plan)} h
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Días de asignación × horas por día.
            </p>
          </div>
          <div className="rounded-xl border border-slate-300 p-4">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              HH reales
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
              {formatearCantidad(hh.real)} h
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Suma de los registros de personal.
            </p>
          </div>
          <div className="rounded-xl border border-slate-300 p-4">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Desviación
            </p>
            <p
              className={`mt-1 text-xl font-bold tabular-nums ${
                hh.desviacion.diferencia > 0 ? 'text-red-600' : 'text-emerald-700'
              }`}
            >
              {hh.desviacion.diferencia > 0 ? '+' : ''}
              {formatearCantidad(hh.desviacion.diferencia)} h
            </p>
            <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
              {hh.desviacion.porcentaje == null
                ? 'Sin horas planificadas'
                : `${hh.desviacion.porcentaje}% de lo planificado`}
            </p>
          </div>
          <div className="rounded-xl border border-slate-300 p-4">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Costo por HH
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
              {costoHH == null ? '—' : formatearMoneda(costoHH)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Gasto de personal ÷ horas reales.
            </p>
          </div>
        </div>
        <details className="mt-4 text-xs text-slate-500">
          <summary className="cursor-pointer font-medium hover:text-slate-700">
            ¿Cómo se calcula?
          </summary>
          <p className="mt-1">
            HH planificadas = horas comprometidas por las asignaciones dentro de la ventana de
            cada partida. HH reales = lo registrado como personal (los domingos no cuentan salvo
            régimen mensual). Desviación = reales − planificadas.
          </p>
        </details>
      </Card>

      <Card
        titulo="Proyección financiera"
        descripcion="Estimado a futuro con el ritmo actual. No es dinero ejecutado."
        acciones={<Badge variante="warning">Estimado</Badge>}
      >
        {!proyeccion.tieneProyeccion ? (
          <p className="text-sm text-slate-400">
            Avanza tareas en el Cronograma y aquí aparecerá tu proyección.
          </p>
        ) : (
          <div className="space-y-5">
            {semaforo && (
              <div
                className={`flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 ${
                  proyeccion.semaforo === 'verde'
                    ? 'bg-emerald-50'
                    : proyeccion.semaforo === 'amarillo'
                      ? 'bg-amber-50'
                      : 'bg-red-50'
                }`}
              >
                <Badge variante={semaforo.variante}>{semaforo.titulo}</Badge>
                <p
                  className={`text-sm font-medium ${
                    proyeccion.semaforo === 'verde'
                      ? 'text-emerald-800'
                      : proyeccion.semaforo === 'amarillo'
                        ? 'text-amber-800'
                        : 'text-red-700'
                  }`}
                >
                  {semaforo.accion}
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 text-center sm:grid-cols-3">
              <div className="rounded-xl border border-slate-300 p-4">
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  Utilidad proyectada
                </p>
                <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
                  {formatearMoneda(proyeccion.utilidadProyectada)}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Si sigues así, te quedarían {formatearMoneda(proyeccion.utilidadProyectada)} al
                  terminar ({proyeccion.margenProyectadoPct}% del presupuesto).
                </p>
              </div>
              <div className="rounded-xl border border-slate-300 p-4">
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  Costo final estimado
                </p>
                <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
                  {formatearMoneda(proyeccion.costoFinal)}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  La obra terminaría costando {formatearMoneda(proyeccion.costoFinal)} de{' '}
                  {formatearMoneda(estado.presupuesto)}.
                </p>
              </div>
              <div className="rounded-xl border border-slate-300 p-4">
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  Ritmo de gasto
                </p>
                <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
                  {proyeccion.cpi == null ? '—' : proyeccion.cpi.toFixed(2)}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {proyeccion.cpi == null
                    ? 'Aún sin gasto registrado.'
                    : proyeccion.cpi >= 1
                      ? `Por cada S/ 1 que gastas, avanzas S/ ${proyeccion.cpi.toFixed(2)} de obra. Vas bien.`
                      : `Por cada S/ 1 que gastas, avanzas S/ ${proyeccion.cpi.toFixed(2)}. Estás gastando de más.`}
                </p>
              </div>
            </div>
            <div>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-primary-600"
                  style={{
                    width: `${Math.min(100, Math.max(0, (proyeccion.costoFinal / estado.presupuesto) * 100))}%`,
                  }}
                  title={`Costo final ${formatearMoneda(proyeccion.costoFinal)}`}
                />
                {proyeccion.utilidadProyectada >= 0 && (
                  <div
                    className="h-full bg-emerald-500"
                    style={{
                      width: `${Math.min(100, Math.max(0, (proyeccion.utilidadProyectada / estado.presupuesto) * 100))}%`,
                    }}
                    title={`Utilidad proyectada ${formatearMoneda(proyeccion.utilidadProyectada)}`}
                  />
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary-600" /> Costo final
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${proyeccion.utilidadProyectada < 0 ? 'bg-red-500' : 'bg-emerald-500'}`}
                  />{' '}
                  {proyeccion.utilidadProyectada < 0 ? 'Sobrecosto' : 'Lo que te quedaría'}
                </span>
              </div>
            </div>
            <p
              className={`rounded-lg px-4 py-2.5 text-sm font-medium tabular-nums ${
                proyeccion.faltanteCobro > 0
                  ? 'bg-amber-50 text-amber-800'
                  : 'bg-emerald-50 text-emerald-800'
              }`}
            >
              {proyeccion.faltanteCobro > 0
                ? `Has cobrado ${formatearMoneda(cobrado)} de ${formatearMoneda(estado.presupuesto)}. Al ritmo actual faltarían ${formatearMoneda(proyeccion.faltanteCobro)} por facturar: factura lo avanzado para no descapitalizarte.`
                : `Has cobrado ${formatearMoneda(cobrado)} de ${formatearMoneda(estado.presupuesto)}. Vas al día con la facturación.`}
            </p>
            <details className="rounded-lg bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
              <summary className="cursor-pointer font-medium text-slate-700">
                ¿Cómo se calcula?
              </summary>
              <p className="mt-2">
                Proyección lineal: supone que sigues al ritmo actual hasta el 100 %. Valor
                ganado = presupuesto × avance ({formatearMoneda(proyeccion.valorGanado)}); ritmo
                de gasto = valor ganado ÷ gastado; costo final = gastado ÷ avance; utilidad
                proyectada = presupuesto − costo final.
              </p>
            </details>
          </div>
        )}
      </Card>

      <Card
        titulo="Control de avance (valor ganado)"
        descripcion="Índices estándar de valor ganado: PV planificado, EV ganado y SPI = EV ÷ PV. Coinciden con la Curva S."
      >
        <div className="grid grid-cols-1 gap-4 text-center sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-300 p-4">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              SPI (desempeño de plazo)
            </p>
            {ritmoAvance == null ? (
              <>
                <p className="mt-1 text-xl font-bold text-slate-400">—</p>
                <p className="mt-0.5 text-xs text-slate-500">Requiere plan y avance.</p>
              </>
            ) : (
              <>
                <p className={`mt-1 text-xl font-bold tabular-nums ${lecturaSpi.tono}`}>
                  {ritmoAvance.toFixed(2)}
                </p>
                <p className={`mt-0.5 text-xs font-medium ${lecturaSpi.tono}`}>
                  {lecturaSpi.texto}
                </p>
              </>
            )}
          </div>
          <div className="rounded-xl border border-slate-300 p-4">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              PV planificado a hoy
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
              {curva.pv == null ? '—' : formatearMoneda(curva.pv)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Costo que debería llevar el plan.</p>
          </div>
          <div className="rounded-xl border border-slate-300 p-4">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              EV valor ganado
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
              {formatearMoneda(curva.ev)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Avance {cronograma.avanceGlobal}% del presupuesto.
            </p>
          </div>
          <div className="rounded-xl border border-slate-300 p-4">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              SV desviación de cronograma
            </p>
            <p
              className={`mt-1 text-xl font-bold tabular-nums ${
                curva.sv == null ? 'text-slate-400' : curva.sv < 0 ? 'text-red-600' : 'text-emerald-700'
              }`}
            >
              {curva.sv == null ? '—' : formatearMoneda(curva.sv)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">EV − PV. Negativo = atrasado.</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
