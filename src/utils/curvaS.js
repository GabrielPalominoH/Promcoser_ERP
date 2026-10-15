// Curva S / Valor ganado (Earned Value Management) de un servicio.
//
// Tres variables de control financiero y de avance:
//   PV (Planned Value)  → costo planificado acumulado a una fecha.
//   AC (Actual Cost)    → costo real acumulado (lo devengado/gastado).
//   EV (Earned Value)   → valor del trabajo ya ejecutado a precios del
//                         presupuesto original (presupuesto × avance).
//
// La serie admite granularidad: mensual, semanal (7 días), cada 4 días, cada
// 2 días o diario. Los valores "a hoy" (PV/AC/EV e índices) no dependen de la
// granularidad: son siempre el corte exacto de hoy.
//
// Este módulo NO reimplementa fórmulas: reutiliza `proyeccionFinanciera`
// (calculadora) para el EV/CPI/EAC de hoy y las reconstrucciones de avance de
// `gerencial`. Todo es puro y devuelve null (nunca NaN) cuando no hay base.

import {
  diasCalendarioRango,
  hoyISO,
  metricasCronograma,
  mesesEntre,
  proyeccionFinanciera,
  ultimoDiaMes,
} from './calculadora'
import { avancePlanEnFecha, avanceServicioEnFecha } from './gerencial'
import { formatearFecha, formatearMes } from './formatters'

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100

// Granularidades disponibles y su paso en días (mensual se maneja aparte).
const PASOS = { semanal: 7, '4d': 4, '2d': 2, diario: 1 }
export const GRANULARIDADES = ['mensual', 'semanal', '4d', '2d', 'diario']

function sumarDias(iso, dias) {
  const [anio, mes, dia] = iso.split('-').map(Number)
  const fecha = new Date(anio, mes - 1, dia)
  fecha.setDate(fecha.getDate() + dias)
  const mm = String(fecha.getMonth() + 1).padStart(2, '0')
  const dd = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mm}-${dd}`
}

// Hojas del cronograma (sin hijas): ahí vive el monto del presupuesto.
function hojas(tareas) {
  return (tareas ?? []).filter(
    (t) => t.fecha_inicio && t.fecha_fin && !tareas.some((h) => h.padre_id === t.id),
  )
}

// Fracción del presupuesto planificada hasta `corte`, repartiendo el monto de
// cada hoja linealmente dentro de su ventana [inicio, fin]. El plan se pondera
// por monto; si las tareas no traen monto, por duración. Se normaliza a 1 en el
// fin del plazo para que PV cierre exactamente en el presupuesto.
function fraccionPlan(tareas, corte) {
  const lista = hojas(tareas)
  if (lista.length === 0 || !corte) return null

  let pesos = lista.map((t) => Number(t.monto) || 0)
  if (pesos.reduce((s, p) => s + p, 0) <= 0) {
    pesos = lista.map((t) => Math.max(1, diasCalendarioRango(t.fecha_inicio, t.fecha_fin)))
  }
  const totalPeso = pesos.reduce((s, p) => s + p, 0)
  if (totalPeso <= 0) return null

  let avance = 0
  lista.forEach((t, i) => {
    if (corte <= t.fecha_inicio) return
    const dur = Math.max(1, diasCalendarioRango(t.fecha_inicio, t.fecha_fin))
    const hasta = corte < t.fecha_fin ? corte : t.fecha_fin
    const transcurrido = Math.min(dur, diasCalendarioRango(t.fecha_inicio, hasta))
    avance += (pesos[i] / totalPeso) * (transcurrido / dur)
  })
  return Math.min(1, avance)
}

// Periodos {clave, inicio, fin} entre dos fechas. En mensual son los meses
// naturales; en el resto, tramos de N días contados desde el inicio.
function construirPeriodos(fechaMin, fechaMax, granularidad) {
  if (!fechaMin || !fechaMax || fechaMax < fechaMin) return []

  if (granularidad === 'mensual') {
    return mesesEntre(fechaMin.slice(0, 7), fechaMax.slice(0, 7)).map((mes) => ({
      clave: mes,
      inicio: `${mes}-01`,
      fin: ultimoDiaMes(mes),
    }))
  }

  const paso = PASOS[granularidad] ?? 1
  const periodos = []
  let cursor = fechaMin
  while (cursor <= fechaMax) {
    const finPeriodo = sumarDias(cursor, paso - 1)
    const fin = finPeriodo < fechaMax ? finPeriodo : fechaMax
    periodos.push({ clave: cursor, inicio: cursor, fin })
    cursor = sumarDias(fin, 1)
  }
  return periodos
}

function etiquetaDe(periodo, granularidad) {
  if (granularidad === 'mensual') {
    const titulo = formatearMes(periodo.clave)
    return { titulo, corta: titulo.split(' ')[0], anio: periodo.clave.slice(0, 4) }
  }
  const corta = `${periodo.inicio.slice(8, 10)}/${periodo.inicio.slice(5, 7)}`
  const titulo =
    periodo.fin === periodo.inicio
      ? formatearFecha(periodo.inicio)
      : `${formatearFecha(periodo.inicio)} – ${formatearFecha(periodo.fin)}`
  return { titulo, corta, anio: null }
}

function vacio(granularidad = 'mensual') {
  return {
    hayDatos: false,
    presupuesto: 0,
    avance: 0,
    pv: null,
    ac: 0,
    ev: 0,
    sv: null,
    cv: null,
    spi: null,
    cpi: null,
    eac: null,
    etc: null,
    vac: null,
    semaforo: null,
    granularidad,
    indiceHoy: -1,
    periodos: [],
    usaLineaBase: false,
    versionLineaBase: null,
    lecturas: 0,
  }
}

export function curvaServicio({
  servicio,
  tareas = [],
  registros = [],
  hoy = hoyISO(),
  granularidad = 'mensual',
  lineaBase = null,
  lecturas = [],
} = {}) {
  if (!servicio) return vacio(granularidad)

  const gran = GRANULARIDADES.includes(granularidad) ? granularidad : 'mensual'
  const presupuesto = Number(servicio.presupuesto_asignado) || 0
  const tareasServicio = (tareas ?? []).filter((t) => t.servicio_id === servicio.id)
  const registrosServicio = (registros ?? []).filter((r) => r.servicio_id === servicio.id)

  const puedePlanificar = Boolean(servicio.fecha_inicio && servicio.fecha_fin_estimada)
  if (!puedePlanificar && registrosServicio.length === 0) return vacio(gran)

  // El PV sale de la LÍNEA BASE cuando existe (el plan congelado y firmado);
  // solo si no hay línea base se usa el cronograma vivo. Así reprogramar
  // tareas no reescribe el pasado del plan.
  const tareasPlan = (lineaBase?.tareas ?? []).length ? lineaBase.tareas : tareasServicio
  const usaLineaBase = tareasPlan !== tareasServicio

  // Valor planificado a un corte: por el plan de tareas; si no hay cronograma
  // con fechas, se reparte lineal sobre el plazo del servicio.
  const pvEn = (corte) => {
    const fraccion = fraccionPlan(tareasPlan, corte)
    if (fraccion != null) return r2(presupuesto * fraccion)
    const plan = avancePlanEnFecha(servicio, corte)
    return plan == null ? null : r2(presupuesto * (plan / 100))
  }

  const acHasta = (corte) =>
    r2(
      registrosServicio
        .filter((r) => (r.fecha || '') <= corte)
        .reduce((s, r) => s + (Number(r.monto_calculado) || 0), 0),
    )

  const avanceActual = tareasServicio.length
    ? metricasCronograma(tareasServicio, hoy).avanceGlobal
    : 0

  // El avance histórico sale de las LECTURAS (snapshots firmados) cuando las
  // hay; si no, se reconstruye con las fechas de las tareas. Nunca se mezcla.
  const lecturasServicio = (lecturas ?? [])
    .filter((l) => l.servicio_id === servicio.id && l.fecha)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
  const avanceHistorico = (corte) => {
    const previas = lecturasServicio.filter((l) => l.fecha <= corte)
    if (previas.length) return Number(previas[previas.length - 1].avance) || 0
    return avanceServicioEnFecha(tareasServicio, corte)
  }
  const avanceEnCorte = (corte) => (corte >= hoy ? avanceActual : avanceHistorico(corte))

  // --- Valores a hoy (no dependen de la granularidad) -------------------
  const ac = acHasta(hoy)
  const pv = pvEn(hoy)
  const ev = r2(presupuesto * (avanceActual / 100))

  const sv = pv == null ? null : r2(ev - pv)
  const cv = r2(ev - ac)
  const spi = pv != null && pv > 0 ? r2(ev / pv) : null
  const cpi = ac > 0 ? r2(ev / ac) : null

  // El semáforo combina costo y plazo: se le pasa el SPI de valor ganado
  // (EV ÷ PV), el mismo que muestra la tarjeta de índices. Así el Resumen y
  // la Curva S nunca dan lecturas distintas.
  const proyeccion = proyeccionFinanciera({
    presupuesto,
    gastado: ac,
    cobrado: 0,
    avance: avanceActual,
    spi,
  })
  const eac = proyeccion.costoFinal
  const vac = eac == null ? null : r2(presupuesto - eac)
  const etc = eac == null ? null : r2(eac - ac)

  // --- Serie (gráfico) --------------------------------------------------
  const fechas = [
    servicio.fecha_inicio,
    servicio.fecha_fin_estimada,
    hoy,
    ...tareasServicio.flatMap((t) => [t.fecha_inicio, t.fecha_fin]),
    ...registrosServicio.map((r) => (r.fecha || '').slice(0, 10)),
  ].filter((f) => f && f.length >= 10)
  const fechaMin = fechas.length ? fechas.reduce((a, b) => (a < b ? a : b)) : null
  const fechaMax = fechas.length ? fechas.reduce((a, b) => (a > b ? a : b)) : null

  const crudos = construirPeriodos(fechaMin, fechaMax, gran)
  const indiceFin = crudos.length - 1

  let indiceHoy = -1
  const detalle = crudos.map((p, i) => {
    const futuro = p.inicio > hoy
    const cortePv = !futuro && p.fin > hoy ? hoy : p.fin
    const corteAc = p.fin < hoy ? p.fin : hoy
    if (indiceHoy < 0 && !futuro && hoy <= p.fin) indiceHoy = i
    const { titulo, corta, anio } = etiquetaDe(p, gran)
    return {
      clave: p.clave,
      inicio: p.inicio,
      fin: p.fin,
      etiqueta: titulo,
      corta,
      anio,
      fecha: cortePv,
      pv: pvEn(cortePv),
      ac: futuro ? null : acHasta(corteAc),
      ev: futuro ? null : r2(presupuesto * (avanceEnCorte(corteAc) / 100)),
      futuro,
    }
  })
  if (indiceHoy < 0) indiceHoy = indiceFin

  // Proyección lineal desde el corte de hoy hasta el fin del plazo: AC hacia
  // el costo final estimado (EAC) y EV hacia el presupuesto.
  const base = indiceHoy >= 0 ? indiceHoy : 0
  const proporcion = (i) => (indiceFin <= base ? 1 : (i - base) / (indiceFin - base))
  const periodos = detalle.map((p, i) => ({
    ...p,
    evProy: i < base ? null : r2(ev + (presupuesto - ev) * proporcion(i)),
    acProy: i < base || eac == null ? null : r2(ac + (eac - ac) * proporcion(i)),
  }))

  return {
    hayDatos: periodos.length > 0,
    presupuesto,
    avance: avanceActual,
    pv,
    ac,
    ev,
    sv,
    cv,
    spi,
    cpi,
    eac,
    etc,
    vac,
    semaforo: proyeccion.semaforo,
    granularidad: gran,
    indiceHoy,
    periodos,
    usaLineaBase,
    versionLineaBase: usaLineaBase ? (lineaBase?.version ?? null) : null,
    lecturas: lecturasServicio.length,
  }
}
