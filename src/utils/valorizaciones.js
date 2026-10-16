// Valorizaciones de obra (F3).
//
// Una valorización es el cobro del avance de un periodo: por cada partida
// (tarea hoja) se toma el metrado ejecutado acumulado y se le resta lo ya
// valorizado en periodos anteriores; el diferencial × precio unitario es el
// importe del periodo. Sobre el bruto se aplican las deducciones de obra:
//
//   − amortización del adelanto directo      (proporcional al avance valorizado)
//   − amortización del adelanto de materiales
//   − fondo de garantía / retención           (% del bruto)
//   = subtotal → + IGV → − detracción → NETO a pagar.
//
// Si una partida no tiene metrado/precio unitario, se usa su monto como base
// y precio 1 (equivale a monto × avance/100). Todo es puro y devuelve 0/null
// (nunca NaN) cuando no hay base.

import { hoyISO, montoTarea } from './calculadora'
import { formatearMoneda } from './formatters'

const n = (v, porDefecto = 0) => {
  const x = Number(v)
  return Number.isFinite(x) ? x : porDefecto
}
const r2 = (x) => Math.round((Number(x) || 0) * 100) / 100
const r4 = (x) => Math.round((Number(x) || 0) * 10000) / 10000

// Valores por defecto del contrato (Perú). El IGV es legal (18 %); la
// detracción y el fondo de garantía dependen del contrato.
export const DEFAULTS_VALORIZACION = {
  igv_pct: 18,
  detraccion_pct: 0,
  fondo_garantia_pct: 0,
}

// Lee la configuración del servicio con respaldo en los valores por defecto.
export function configValorizacion(servicio = {}) {
  return {
    igv_pct: n(servicio.igv_pct, DEFAULTS_VALORIZACION.igv_pct),
    detraccion_pct: n(servicio.detraccion_pct, DEFAULTS_VALORIZACION.detraccion_pct),
    fondo_garantia_pct: n(servicio.fondo_garantia_pct, DEFAULTS_VALORIZACION.fondo_garantia_pct),
  }
}

// Metrado y precio unitario de una tarea. Devuelve null cuando no están
// cargados (entonces se usa el monto).
export function metradoPu(tarea = {}) {
  const metrado = tarea.metrado == null || tarea.metrado === '' ? null : n(tarea.metrado)
  const pu =
    tarea.precio_unitario == null || tarea.precio_unitario === '' ? null : n(tarea.precio_unitario)
  return { metrado, pu }
}

// Base y precio con los que se mide una partida: metrado×PU si existe, si no
// su monto (precio 1). Así el importe del periodo = base × Δavance.
export function basePrecio(tarea, tareas = []) {
  const { metrado, pu } = metradoPu(tarea)
  if (metrado != null && pu != null) return { base: metrado, precio: pu, mide: 'metrado' }
  return { base: montoTarea(tarea, tareas), precio: 1, mide: 'monto' }
}

// Partidas a valorizar: hojas del cronograma del servicio.
export function partidasValorizables(tareas = [], servicioId = null) {
  return (tareas ?? []).filter(
    (t) =>
      (servicioId == null || t.servicio_id === servicioId) &&
      !(tareas ?? []).some((h) => h.padre_id === t.id),
  )
}

// Metrado ya valorizado de una tarea en las valorizaciones previas.
export function metradoPrevio(valorizaciones = [], tareaId) {
  let total = 0
  for (const v of valorizaciones ?? []) {
    const item = (v.items ?? []).find((i) => i.tarea_id === tareaId)
    if (item) total += n(item.metrado_periodo)
  }
  return r4(total)
}

// Valorizaciones que ya usaron el metrado de alguna de estas tareas (su importe
// del periodo fue mayor que cero). Sirve para AVISAR antes de editar o borrar un
// parte: el avance se ajusta de forma consistente, pero lo ya valorizado no se
// recalcula solo.
export function valorizacionesQueUsanTareas(valorizaciones = [], tareaIds = []) {
  const ids = new Set(tareaIds ?? [])
  return (valorizaciones ?? []).filter((v) =>
    (v.items ?? []).some((i) => ids.has(i.tarea_id) && n(i.metrado_periodo) > 0),
  )
}

// Total de adelantos registrados de un tipo: 'directo' | 'materiales'.
export function totalAdelantos(adelantos = [], servicioId, tipo) {
  return r2(
    (adelantos ?? [])
      .filter((a) => a.servicio_id === servicioId && a.tipo === tipo)
      .reduce((s, a) => s + n(a.monto), 0),
  )
}

// Amortizado de un tipo en las valorizaciones previas (del servicio dado).
export function totalAmortizado(valorizaciones = [], tipo, servicioId = undefined) {
  const campo = tipo === 'materiales' ? 'amort_materiales' : 'amort_directo'
  return r2(
    (valorizaciones ?? [])
      .filter((v) => servicioId === undefined || v.servicio_id === servicioId)
      .reduce((s, v) => s + n(v[campo]), 0),
  )
}

// Valorizaciones de un servicio, ordenadas por número.
function valorizacionesDe(valorizaciones = [], servicioId) {
  return (valorizaciones ?? [])
    .filter((v) => v.servicio_id === servicioId)
    .sort((a, b) => (Number(a.numero) || 0) - (Number(b.numero) || 0))
}

// Saldo de adelantos por tipo.
export function saldoAdelantos({ servicio, valorizaciones = [], adelantos = [] }) {
  const propias = valorizacionesDe(valorizaciones, servicio?.id)
  const armar = (tipo) => {
    const total = totalAdelantos(adelantos, servicio?.id, tipo)
    const amortizado = totalAmortizado(propias, tipo)
    return { total, amortizado, saldo: r2(Math.max(0, total - amortizado)) }
  }
  return { directo: armar('directo'), materiales: armar('materiales') }
}

// Amortización acumulada objetivo del periodo: el adelanto se recupera en la
// misma proporción en que avanza lo valorizado (amortización × avance / obra).
function amortizacionObjetivo(adelanto, brutaAcumulada, presupuesto) {
  if (adelanto <= 0 || presupuesto <= 0) return 0
  return r2(Math.min(adelanto, brutaAcumulada * (adelanto / presupuesto)))
}

// Siguiente número correlativo de valorización del servicio.
export function siguienteNumero(valorizaciones = [], servicioId) {
  const numeros = (valorizaciones ?? [])
    .filter((v) => v.servicio_id === servicioId)
    .map((v) => Number(v.numero) || 0)
  return numeros.length ? Math.max(...numeros) + 1 : 1
}

// Calcula la valorización del periodo sin guardarla.
export function calcularValorizacion({
  servicio,
  tareas = [],
  valorizaciones = [],
  adelantos = [],
  numero = null,
  fecha = hoyISO(),
}) {
  const presupuesto = n(servicio?.presupuesto_asignado)
  const cfg = configValorizacion(servicio)
  const partidas = partidasValorizables(tareas, servicio?.id)

  const items = []
  for (const t of partidas) {
    const { base, precio, mide } = basePrecio(t, tareas)
    if (base <= 0 && precio === 1) continue
    const ejecutado = r4((n(t.avance) / 100) * base)
    const previo = metradoPrevio(valorizaciones, t.id)
    const periodo = r4(Math.max(0, ejecutado - previo))
    items.push({
      tarea_id: t.id,
      nombre: t.nombre,
      unidad: t.unidad ?? null,
      mide,
      metrado_base: r4(base),
      precio_unitario: r4(precio),
      metrado_previo: previo,
      metrado_acumulado: ejecutado,
      metrado_periodo: periodo,
      importe: r2(periodo * precio),
    })
  }

  const bruta = r2(items.reduce((s, i) => s + i.importe, 0))
  const propias = valorizacionesDe(valorizaciones, servicio?.id)
  const brutaAccumulada = r2(propias.reduce((s, v) => s + n(v.bruta), 0) + bruta)

  const adelantoDirecto = totalAdelantos(adelantos, servicio?.id, 'directo')
  const adelantoMateriales = totalAdelantos(adelantos, servicio?.id, 'materiales')
  const amortDirecto = r2(
    Math.max(
      0,
      amortizacionObjetivo(adelantoDirecto, brutaAccumulada, presupuesto) -
        totalAmortizado(propias, 'directo'),
    ),
  )
  const amortMateriales = r2(
    Math.max(
      0,
      amortizacionObjetivo(adelantoMateriales, brutaAccumulada, presupuesto) -
        totalAmortizado(propias, 'materiales'),
    ),
  )
  const retencion = r2((bruta * cfg.fondo_garantia_pct) / 100)
  const subtotal = r2(bruta - amortDirecto - amortMateriales - retencion)
  const igv = r2((subtotal * cfg.igv_pct) / 100)
  const total = r2(subtotal + igv)
  const detraccion = r2((total * cfg.detraccion_pct) / 100)
  const neto = r2(total - detraccion)

  return {
    servicio_id: servicio?.id,
    numero: numero ?? siguienteNumero(valorizaciones, servicio?.id),
    fecha,
    estado: 'Emitida',
    items,
    bruta,
    amort_directo: amortDirecto,
    amort_materiales: amortMateriales,
    retencion,
    subtotal,
    igv_pct: cfg.igv_pct,
    igv,
    detraccion_pct: cfg.detraccion_pct,
    total,
    detraccion,
    neto,
    fondo_garantia_pct: cfg.fondo_garantia_pct,
  }
}

// Resumen acumulado del servicio a partir de las valorizaciones guardadas.
export function resumenValorizaciones({ servicio, valorizaciones = [], adelantos = [] }) {
  const propias = (valorizaciones ?? [])
    .filter((v) => v.servicio_id === servicio?.id)
    .sort((a, b) => (Number(a.numero) || 0) - (Number(b.numero) || 0))
  const sumar = (campo) => r2(propias.reduce((s, v) => s + n(v[campo]), 0))
  const saldo = saldoAdelantos({ servicio, valorizaciones: propias, adelantos })
  return {
    cantidad: propias.length,
    bruta: sumar('bruta'),
    amort_directo: sumar('amort_directo'),
    amort_materiales: sumar('amort_materiales'),
    retencion: sumar('retencion'),
    igv: sumar('igv'),
    total: sumar('total'),
    detraccion: sumar('detraccion'),
    neto: sumar('neto'),
    brutaAcumulada: sumar('bruta'),
    saldo,
  }
}

// Frase corta para avisos y tablas.
export function describirNeto(valorizacion) {
  return `Neto ${formatearMoneda(valorizacion?.neto ?? 0)}`
}
