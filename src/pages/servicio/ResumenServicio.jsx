import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useData } from '../../context/useData'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge, BadgeEstatus } from '../../components/ui/Badge'
import { StatCard } from '../../components/ui/StatCard'
import { useAuth } from '../../context/useAuth'
import { seccionServicioPermitida } from '../../utils/permisos'
import { Campo, Input } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import {
  formatearCantidad,
  formatearMes,
  formatearMoneda,
  formatearFecha,
} from '../../utils/formatters'
import {
  costoSubarbol,
  cuentaComoManoDeObra,
  desglosePorTipo,
  diasRestantes,
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
import { alertasCentro, etiquetaAlerta } from '../../utils/alertasCentro'
import { htmlReporteMensualObra, imprimirHTML } from '../../utils/reportes'
import { usePanelServicio } from './panel'

// Monto corto para rótulos estrechos (la cifra exacta va en el tooltip).
function compacto(valor) {
  const v = Math.abs(valor)
  const signo = valor < 0 ? '−' : ''
  if (v >= 1e6) return `${signo}S/ ${(v / 1e6).toFixed(1)} M`
  if (v >= 1e3) return `${signo}S/ ${(v / 1e3).toFixed(v >= 1e5 ? 0 : 1)} k`
  return `${signo}S/ ${v.toFixed(0)}`
}

// Diagrama de cascada vertical: cómo lo cobrado se consume paso a paso
// por tipo de costo hasta llegar a la utilidad. Todo en divs, sin librerías.
function CascadaUtilidad({ cobrado, materiales, manoObra, equipos, gastos, utilidad }) {
  const maximo = Math.max(cobrado, materiales + manoObra + equipos + gastos, Math.abs(utilidad), 1)
  const altura = (valor) => `${Math.min(100, (Math.abs(valor) / maximo) * 100)}%`

  const pasos = [
    {
      etiqueta: 'Cobrado',
      valor: cobrado,
      texto: compacto(cobrado),
      exacto: formatearMoneda(cobrado),
      tono: 'bg-primary-600',
      altura: altura(cobrado),
    },
    {
      etiqueta: '− Materiales',
      valor: materiales,
      texto: compacto(-materiales),
      exacto: `−${formatearMoneda(materiales)}`,
      tono: 'bg-red-500',
      altura: altura(materiales),
    },
    {
      etiqueta: '− Personal',
      valor: manoObra,
      texto: compacto(-manoObra),
      exacto: `−${formatearMoneda(manoObra)}`,
      tono: 'bg-emerald-500',
      altura: altura(manoObra),
    },
    {
      etiqueta: '− Equipos',
      valor: equipos,
      texto: compacto(-equipos),
      exacto: `−${formatearMoneda(equipos)}`,
      tono: 'bg-sky-500',
      altura: altura(equipos),
    },
    {
      etiqueta: '− Gastos',
      valor: gastos,
      texto: compacto(-gastos),
      exacto: `−${formatearMoneda(gastos)}`,
      tono: 'bg-amber-500',
      altura: altura(gastos),
    },
    {
      etiqueta: utilidad < 0 ? '= Pérdida' : '= Utilidad',
      valor: utilidad,
      texto: compacto(utilidad),
      exacto: formatearMoneda(utilidad),
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
                title={`${paso.etiqueta}: ${paso.exacto}`}
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

// Tendencia de gasto mensual: barras por mes + línea de media móvil de 3
// meses. Responde si el gasto acelera o se frena (el acumulado vive en la
// Curva S).
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
// Acompaña a la tarjeta de Mano de obra (plan vs. registrado).
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

// Selector de mes para el reporte mensual de obra (PDF). Extraído para poder
// montarlo abierto en pruebas; el contenido es el mismo del bloque inline.
export function ModalReporteMensual({ abierto, mes, onCambiarMes, onCerrar, onGenerar }) {
  return (
    <Modal
      abierto={abierto}
      titulo="Reporte mensual de obra"
      descripcion="Elige el mes; se abrirá el diálogo de impresión (puedes guardarlo como PDF)."
      onCerrar={onCerrar}
      ancho="sm"
      pie={
        <>
          <Button variante="secundario" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button onClick={onGenerar}>Generar reporte</Button>
        </>
      }
    >
      <Campo label="Mes del reporte">
        <Input
          type="month"
          value={mes}
          onChange={(evento) => onCambiarMes(evento.target.value)}
        />
      </Campo>
    </Modal>
  )
}

export function ResumenServicio() {  const { servicio } = useOutletContext()
  const { abrirEditar } = usePanelServicio()
  const {
    estado: {
      registros_servicio: todosLosRegistros,
      tareas: todasLasTareas,
      personal,
      materiales,
      equipos,
      asignaciones: todasLasAsignaciones,
      cobros: todosLosCobros,
      valorizaciones: todasLasValorizaciones,
      lineas_base: lineasBase,
      lecturas_avance: lecturasAvance,
      modificaciones: todasLasModificaciones,
      partes_diario: todosLosPartes,
      facturas: todasLasFacturas,
      config: configuracion,
      alertasEstado,
    },
  } = useData()

  const { rol } = useAuth()
  const puedeVerIngresos = seccionServicioPermitida(rol, 'ingresos')
  const [reporteMesAbierto, setReporteMesAbierto] = useState(false)
  const [mesReporte, setMesReporte] = useState(() => hoyISO().slice(0, 7))

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
  const hh = resumenHorasServicio({
    tareas: todasLasTareas,
    asignaciones: todasLasAsignaciones ?? [],
    registros: todosLosRegistros,
    servicio,
  })
  const costoHH = hh.real > 0 ? desglose.personal / hh.real : null
  // Alertas del servicio: MISMA fuente única que la campana y el Dashboard
  // (`alertasCentro`), filtrada a esta obra. Solo cambia la presentación.
  const alertasDeEstaObra = alertasCentro({
    estado: {
      servicios: [servicio],
      tareas: todasLasTareas,
      registros_servicio: todosLosRegistros,
      cobros: todosLosCobros,
      facturas: todasLasFacturas ?? [],
      valorizaciones: todasLasValorizaciones ?? [],
      config: configuracion ?? [],
      modificaciones: todasLasModificaciones ?? [],
      partes_diario: todosLosPartes ?? [],
    },
    hoy: hoyISO(),
    alertasEstado,
  })
  const alertas = alertasDeEstaObra.filter((a) => !a.tipo.startsWith('partida_'))
  const alertasPartidas = alertasDeEstaObra.filter((a) => a.tipo.startsWith('partida_'))

  // Reporte mensual de obra (PDF): resumen, avance, costos y valorizaciones
  // del mes elegido. Reutiliza las fórmulas puras vía `reportes.js`.
  const imprimirReporteMensual = () => {
    imprimirHTML(
      htmlReporteMensualObra({
        servicio,
        mes: mesReporte,
        tareas: todasLasTareas,
        registros: todosLosRegistros,
        cobros: todosLosCobros,
        valorizaciones: todasLasValorizaciones ?? [],
        modificaciones: todasLasModificaciones ?? [],
        personal,
        materiales: materiales ?? [],
        equipos: equipos ?? [],
      }),
    )
    setReporteMesAbierto(false)
  }

  const tonoIndice = (v) =>
    v == null ? 'text-slate-400' : v >= 1 ? 'text-emerald-700' : v >= 0.9 ? 'text-amber-700' : 'text-red-600'
  const cpi = curva.ac > 0 ? Math.round((curva.ev / curva.ac) * 100) / 100 : null
  const pctCobrado = estado.presupuesto > 0 ? (cobrado / estado.presupuesto) * 100 : null
  const raices = tareas.filter((t) => t.padre_id == null)
  const textoDias =
    dias === null ? 'sin fecha de fin' : dias < 0 ? `vencida hace ${Math.abs(dias)} d` : dias === 0 ? 'vence hoy' : `${dias} d restantes`

  return (
    <div className="space-y-6">
      {/* Encabezado de la obra */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{servicio.nombre_servicio}</h1>
            <BadgeEstatus estatus={servicio.estatus} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {servicio.cliente} · {servicio.tipo ?? 'Obra'} · {formatearFecha(servicio.fecha_inicio)} →{' '}
            {servicio.fecha_fin_estimada ? formatearFecha(servicio.fecha_fin_estimada) : '—'} ·{' '}
            <span className={dias !== null && dias < 0 ? 'font-semibold text-red-600' : dias !== null && dias <= 15 ? 'font-semibold text-amber-700' : ''}>
              {textoDias}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variante="secundario" tamano="sm" onClick={() => setReporteMesAbierto(true)}>
            Reporte mensual (PDF)
          </Button>
          <Button variante="secundario" tamano="sm" onClick={() => window.print()}>
            Imprimir
          </Button>
          <Button variante="secundario" tamano="sm" onClick={abrirEditar}>
            Editar
          </Button>
        </div>
      </div>

      {alertas.length > 0 && (
        <div className="space-y-2">
          {alertas.map((alerta) => (
            <p
              key={alerta.id}
              className={`rounded-lg border px-4 py-2.5 text-sm font-medium ${
                alerta.gravedad === 'alta' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-800'
              }`}
            >
              <Link to={alerta.enlace} className="underline">
                {etiquetaAlerta(alerta.tipo)}
              </Link>
              {' · '}
              {alerta.mensaje}
            </p>
          ))}
        </div>
      )}

      {/* Indicadores clave */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          titulo="Presupuesto vigente"
          valor={formatearMoneda(estado.presupuesto)}
          detalle={
            variacionPresupuesto !== 0
              ? `Original ${formatearMoneda(servicioVig.presupuesto_original)} (${variacionPresupuesto > 0 ? '+' : '−'}${formatearMoneda(Math.abs(variacionPresupuesto))})`
              : 'Sin adicionales ni deductivos aprobados'
          }
          tono="slate"
          destino="modificaciones"
        />
        <StatCard
          titulo="Gastado"
          valor={formatearMoneda(gastado)}
          detalle={`${estado.porcentaje.toFixed(1)}% ejecutado · ${estado.disponible < 0 ? 'excedido en' : 'saldo'} ${formatearMoneda(Math.abs(estado.disponible))}`}
          tono={estado.excedido ? 'danger' : estado.porcentaje > cronograma.avanceGlobal + 10 ? 'warning' : 'slate'}
          nota="Ejecutado = gastado ÷ presupuesto vigente. Si supera el avance en más de 10 puntos, se gasta más rápido de lo que se avanza."
        />
        <StatCard
          titulo="Cobrado"
          valor={formatearMoneda(cobrado)}
          detalle={pctCobrado == null ? 'Sin presupuesto' : `${pctCobrado.toFixed(1)}% del presupuesto`}
          tono="success"
          destino={puedeVerIngresos ? 'ingresos' : null}
        />
        <StatCard
          titulo="Utilidad real"
          valor={formatearMoneda(utilidad)}
          detalle={cobrado > 0 ? `Margen ${((utilidad / cobrado) * 100).toFixed(1)}% sobre lo cobrado` : 'Aún sin cobros'}
          tono={utilidad < 0 ? 'danger' : 'success'}
          nota="Utilidad real = cobrado − gastado. Al inicio de una obra suele ser negativa: el gasto va antes del cobro."
        />
        <StatCard
          titulo="Avance"
          valor={`${cronograma.avanceGlobal}%`}
          detalle={`SPI ${ritmoAvance == null ? '—' : ritmoAvance.toFixed(2)} · CPI ${cpi == null ? '—' : cpi.toFixed(2)} · ${cronograma.atrasadas} atrasada(s)`}
          tono={ritmoAvance != null && ritmoAvance < 0.9 ? 'warning' : 'primary'}
          destino="curva-s"
        />
      </div>

      {/* Desempeño y proyección */}
      <Card
        titulo="Desempeño y proyección"
        descripcion="Valor ganado a hoy y cómo terminaría la obra si sigue al ritmo actual. Coincide con la Curva S."
        acciones={<Badge variante="warning">Estimado</Badge>}
      >
        {!proyeccion.tieneProyeccion ? (
          <p className="text-sm text-slate-400">Registra avance en el Parte diario o el Cronograma para ver el desempeño.</p>
        ) : (
          <div className="space-y-5">
            {semaforo && (
              <div
                className={`flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 ${
                  proyeccion.semaforo === 'verde'
                    ? 'border-emerald-200 bg-emerald-50'
                    : proyeccion.semaforo === 'amarillo'
                      ? 'border-amber-200 bg-amber-50'
                      : 'border-red-200 bg-red-50'
                }`}
              >
                <Badge variante={semaforo.variante}>{semaforo.titulo}</Badge>
                <p
                  className={`text-sm font-medium ${
                    proyeccion.semaforo === 'verde' ? 'text-emerald-800' : proyeccion.semaforo === 'amarillo' ? 'text-amber-800' : 'text-red-700'
                  }`}
                >
                  {semaforo.accion}
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              {[
                ['SPI · plazo', ritmoAvance == null ? '—' : ritmoAvance.toFixed(2), lecturaSpi?.texto ?? 'Requiere plan y avance', tonoIndice(ritmoAvance)],
                ['CPI · costo', cpi == null ? '—' : cpi.toFixed(2), cpi == null ? 'Sin gasto registrado' : cpi >= 1 ? 'Rinde lo presupuestado' : 'Gasta de más', tonoIndice(cpi)],
                ['Desviación de plazo', curva.sv == null ? '—' : formatearMoneda(curva.sv), 'Valor ganado − planificado', curva.sv == null ? 'text-slate-400' : curva.sv < 0 ? 'text-red-600' : 'text-emerald-700'],
                ['Costo final estimado', formatearMoneda(proyeccion.costoFinal), `de ${formatearMoneda(estado.presupuesto)}`, proyeccion.costoFinal > estado.presupuesto ? 'text-red-600' : 'text-slate-900'],
                ['Utilidad proyectada', formatearMoneda(proyeccion.utilidadProyectada), `${proyeccion.margenProyectadoPct}% del presupuesto`, proyeccion.utilidadProyectada < 0 ? 'text-red-600' : 'text-emerald-700'],
              ].map(([etiqueta, valor, detalle, tono]) => (
                <div key={etiqueta} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{etiqueta}</p>
                  <p className={`mt-1 text-xl font-semibold tabular-nums ${tono}`}>{valor}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{detalle}</p>
                </div>
              ))}
            </div>
            <div>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className={proyeccion.costoFinal > estado.presupuesto ? 'h-full bg-red-600' : 'h-full bg-primary-600'}
                  style={{ width: `${Math.min(100, Math.max(0, (proyeccion.costoFinal / estado.presupuesto) * 100))}%` }}
                  title={`Costo final ${formatearMoneda(proyeccion.costoFinal)}`}
                />
                {proyeccion.utilidadProyectada >= 0 && (
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${Math.min(100, Math.max(0, (proyeccion.utilidadProyectada / estado.presupuesto) * 100))}%` }}
                    title={`Utilidad proyectada ${formatearMoneda(proyeccion.utilidadProyectada)}`}
                  />
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-primary-600" /> Costo final estimado
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-emerald-500" /> Utilidad que quedaría
                </span>
              </div>
            </div>
            <p
              className={`rounded-lg px-4 py-2.5 text-sm font-medium tabular-nums ${
                proyeccion.faltanteCobro > 0 ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'
              }`}
            >
              {proyeccion.faltanteCobro > 0
                ? `Por facturar según lo avanzado: ${formatearMoneda(proyeccion.faltanteCobro)}. Valoriza para no financiar la obra con caja propia.`
                : 'La facturación va al día con el avance.'}
            </p>
            <details className="rounded-lg bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
              <summary className="cursor-pointer font-medium text-slate-700">¿Cómo se calcula?</summary>
              <p className="mt-2">
                SPI = valor ganado ÷ planificado a hoy; CPI = valor ganado ÷ gastado. Costo final = gastado ÷ avance
                (proyección lineal al 100 %); utilidad proyectada = presupuesto − costo final. Planificado a hoy{' '}
                {curva.pv == null ? '—' : formatearMoneda(curva.pv)}; valor ganado {formatearMoneda(curva.ev)}.
              </p>
            </details>
          </div>
        )}
      </Card>

      <Card
        titulo="Alertas de partidas"
        descripcion="Inactividad, bajo rendimiento y partidas vencidas. Toca una para ir a la partida."
      >
        {alertasPartidas.length === 0 ? (
          <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            Sin alertas en las partidas.
          </p>
        ) : (
          <ul className="grid gap-2 lg:grid-cols-2">
            {alertasPartidas.map((a) => (
              <li key={a.id}>
                <Link
                  to={a.enlace}
                  className={`block rounded-lg border px-4 py-2.5 transition-colors hover:bg-slate-50 ${
                    a.gravedad === 'alta' ? 'border-red-200' : 'border-amber-200'
                  }`}
                >
                  <p className="text-sm font-medium text-slate-900">{a.titulo}</p>
                  <p className={`mt-0.5 text-xs ${a.gravedad === 'alta' ? 'text-red-700' : 'text-amber-800'}`}>
                    {etiquetaAlerta(a.tipo)} · {a.mensaje}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Dónde se gana o se pierde */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card
          titulo="Valorizado contra costo por partida"
          descripcion="Qué trabajos dejan margen y cuáles se están comiendo el presupuesto."
          className="xl:col-span-3"
        >
          {raices.length === 0 ? (
            <p className="text-sm text-slate-400">
              Sin partidas todavía.{' '}
              <Link to="cronograma" className="font-medium text-primary-700 underline">
                Planificar
              </Link>
            </p>
          ) : (
            <ValorizadoCosto raices={raices} tareas={tareas} registros={todosLosRegistros} servicioId={servicio.id} />
          )}
        </Card>
        <Card titulo="Cascada de utilidad" descripcion="Cómo lo cobrado se consume por tipo de costo." className="xl:col-span-2">
          <CascadaUtilidad
            cobrado={cobrado}
            materiales={desglose.material}
            manoObra={desglose.personal}
            equipos={desglose.equipo}
            gastos={desglose.gasto}
            utilidad={utilidad}
          />
        </Card>
      </div>

      {/* Ritmo de gasto y mano de obra */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card titulo="Gasto mensual" descripcion="Si el gasto acelera o se frena (barras) frente a su promedio de 3 meses (línea).">
          {porMesGasto.length === 0 ? (
            <p className="text-sm text-slate-400">Aún no hay gastos registrados.</p>
          ) : (
            <TendenciaGasto porMes={porMesGasto} />
          )}
        </Card>
        <Card titulo="Mano de obra" descripcion="Horas comprometidas por las asignaciones frente a las registradas.">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="text-xs text-slate-500">Planificadas</p>
              <p className="text-lg font-semibold text-slate-900 tabular-nums">{formatearCantidad(hh.plan)} h</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="text-xs text-slate-500">Registradas</p>
              <p className="text-lg font-semibold text-slate-900 tabular-nums">{formatearCantidad(hh.real)} h</p>
              <p className="text-xs text-slate-500 tabular-nums">
                {hh.desviacion.porcentaje == null ? '—' : `${Math.round((hh.real / Math.max(hh.plan, 1)) * 100)}% del plan`}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="text-xs text-slate-500">Costo por HH</p>
              <p className="text-lg font-semibold text-slate-900 tabular-nums">{costoHH == null ? '—' : formatearMoneda(costoHH)}</p>
            </div>
          </div>
          {porMesHoras.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Horas registradas por mes</p>
              <HorasMes porMes={porMesHoras} />
            </div>
          )}
        </Card>
      </div>

      <ModalReporteMensual
        abierto={reporteMesAbierto}
        mes={mesReporte}
        onCambiarMes={setMesReporte}
        onCerrar={() => setReporteMesAbierto(false)}
        onGenerar={imprimirReporteMensual}
      />
    </div>
  )
}
