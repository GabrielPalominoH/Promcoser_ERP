// Valorizaciones de obra (F3; ajuste de metrado en la Fase D).
//
// Una valorización es el cobro del avance de un periodo: por cada partida
// (tarea hoja) se toma el metrado ejecutado acumulado —el total (previo +
// partes) hasta la fecha de corte— y se le resta lo ya valorizado en periodos
// anteriores; el diferencial × precio unitario es el importe del periodo.
// Sobre el bruto se aplican las deducciones de obra:
//
//   − amortización del adelanto directo      (proporcional al avance valorizado)
//   − amortización del adelanto de materiales
//   − fondo de garantía / retención           (% del bruto)
//   = subtotal → + IGV → − detracción → NETO a pagar.
//
// Antes de cerrarla, el usuario puede AJUSTAR el metrado a valorizar por
// partida (distinto al reportado), con nota obligatoria y la diferencia
// visible. El ajuste vive solo en esa valorización: no toca el avance de la
// tarea, y la siguiente valorización arranca del acumulado ajustado (lo
// valorizado no se vuelve a cobrar). Una valorización cerrada es inmutable.
//
// Si una partida no tiene metrado/precio unitario, se usa su monto como base
// y precio 1 (equivale a monto × avance/100). Todo es puro y devuelve 0/null
// (nunca NaN) cuando no hay base.

import { hoyISO, montoTarea } from './calculadora'
import { metradoDeFila } from './partesDiario'
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

// Metrado ya valorizado de una tarea: el acumulado de su ítem en la
// valorización previa con mayor número (ajustes incluidos). Para
// valorizaciones guardadas antes de la Fase D coincide con la suma de sus
// periodos, así que la lectura es sin pérdida y no requiere migración.
export function metradoPrevio(valorizaciones = [], tareaId) {
  let mejor = null
  for (const v of valorizaciones ?? []) {
    const item = (v?.items ?? []).find((i) => i?.tarea_id === tareaId)
    if (!item) continue
    if (mejor == null || (Number(v?.numero) || 0) > (Number(mejor.numero) || 0)) {
      mejor = { numero: Number(v?.numero) || 0, item }
    }
  }
  return mejor ? r4(n(mejor.item.metrado_acumulado)) : 0
}

// Tolerancia de la OBRA para el tope del acumulado valorizado (% sobre el
// metrado contratado). 5 por defecto, igual que el parte diario.
export const TOLERANCIA_VALORIZADO_DEFECTO = 5

export function toleranciaMetrado(servicio = {}) {
  const v = servicio?.tolerancia_metrado
  if (v == null || v === '') return TOLERANCIA_VALORIZADO_DEFECTO
  const x = Number(v)
  return Number.isFinite(x) ? Math.max(0, x) : TOLERANCIA_VALORIZADO_DEFECTO
}

// Metrado ejecutado de una tarea en los partes hasta una fecha de corte
// (inclusive). Sin corte suma todo.
export function metradoEjecutadoHasta(partes = [], tareaId, corte = null) {
  let total = 0
  for (const p of partes ?? []) {
    if (corte != null && corte !== '' && (p?.fecha ?? '') > corte) continue
    for (const x of p?.partidas ?? []) {
      if (x?.tarea_id !== tareaId) continue
      const metrado = metradoDeFila(x)
      if (metrado != null) total += metrado
    }
  }
  return r4(total)
}

// Total acumulado (previo + partes) de una tarea de metrado hasta la fecha de
// corte: es el metrado ejecutado que toma la valorización. No usa
// `tarea.avance` (caché derivado) para no depender del momento del recálculo.
export function ejecutadoAcumulado(tarea = {}, partes = [], corte = null) {
  return r4(n(tarea?.metrado_previo) + metradoEjecutadoHasta(partes, tarea?.id, corte))
}

// Tope del acumulado valorizado: contratado × (1 + tolerancia/100). null sin
// metrado contratado.
export function topeAcumuladoValorizado(tarea = {}, tolerancia = TOLERANCIA_VALORIZADO_DEFECTO) {
  const base = Number(tarea?.metrado)
  if (!Number.isFinite(base) || base <= 0) return null
  const tol = Number(tolerancia)
  return r4(base * (1 + (Number.isFinite(tol) ? tol : 0) / 100))
}

// Evalúa un ajuste del metrado a valorizar (puro, para la UI y la suite):
// todo ajuste exige nota; por encima del tope además se advierte.
export function evaluarAjuste({
  tarea = {},
  reportado = 0,
  acumulado = 0,
  nota = '',
  tolerancia = TOLERANCIA_VALORIZADO_DEFECTO,
} = {}) {
  const rep = r4(reportado)
  const acum = Math.max(0, r4(acumulado))
  const diferencia = r4(acum - rep)
  const tope = topeAcumuladoValorizado(tarea, tolerancia)
  const excedeTope = tope != null && acum > tope
  const requiereNota = diferencia !== 0
  const tieneNota = String(nota ?? '').trim() !== ''
  const mensajes = []
  if (excedeTope) {
    mensajes.push(
      `El acumulado a valorizar (${acum}) supera el tope contratado + tolerancia (${tope}${tarea?.unidad ? ` ${tarea.unidad}` : ''}).`,
    )
  }
  if (requiereNota && !tieneNota) {
    mensajes.push('Todo ajuste exige una nota que lo justifique.')
  }
  return {
    reportado: rep,
    acumulado: acum,
    diferencia,
    tope,
    excedeTope,
    requiereNota,
    valido: !requiereNota || tieneNota,
    mensajes,
  }
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

// Aviso (para la UI) cuando el metrado de las partidas de un parte ya se
// valorizó: el avance se ajusta igual, pero la valorización emitida no se
// recalcula sola. Devuelve `{ tipo, mensaje }` o `null` si no hay nada que
// avisar. Función pura para poder probarla sin montar el componente.
export function avisoMetradoValorizado(valorizaciones = [], partidas = []) {
  const ids = (partidas ?? []).map((f) => f?.tarea_id).filter((x) => x != null)
  if (ids.length === 0) return null
  const usadas = valorizacionesQueUsanTareas(valorizaciones, ids)
  if (usadas.length === 0) return null
  const numeros = usadas.map((v) => v.numero).filter((x) => x != null).join(', ')
  return {
    tipo: 'warning',
    mensaje: `Este metrado ya se incluyó en la valorización N° ${numeros || '—'}. El avance se ajusta, pero esa valorización no se recalcula sola.`,
  }
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

// Calcula la valorización del periodo sin guardarla. `partes` alimenta el
// ejecutado (previo + partes hasta `fecha`); `ajustes` es la lista de
// `{ tarea_id, metrado_acumulado, nota }` que el usuario fijó antes de cerrar.
export function calcularValorizacion({
  servicio,
  tareas = [],
  valorizaciones = [],
  adelantos = [],
  partes = [],
  ajustes = [],
  numero = null,
  fecha = hoyISO(),
}) {
  const presupuesto = n(servicio?.presupuesto_asignado)
  const cfg = configValorizacion(servicio)
  const partidas = partidasValorizables(tareas, servicio?.id)
  const porTarea = new Map((ajustes ?? []).map((a) => [a?.tarea_id, a]))

  const items = []
  for (const t of partidas) {
    const { base, precio, mide } = basePrecio(t, tareas)
    if (base <= 0 && precio === 1) continue
    const reportado =
      mide === 'metrado' ? ejecutadoAcumulado(t, partes, fecha) : r4((n(t.avance) / 100) * base)
    const previo = metradoPrevio(valorizaciones, t.id)
    const ajuste = porTarea.get(t.id)
    const acumulado = ajuste ? Math.max(0, r4(ajuste.metrado_acumulado)) : reportado
    const periodo = r4(Math.max(0, acumulado - previo))
    const item = {
      tarea_id: t.id,
      nombre: t.nombre,
      unidad: t.unidad ?? null,
      mide,
      metrado_base: r4(base),
      precio_unitario: r4(precio),
      metrado_previo: previo,
      metrado_reportado: reportado,
      metrado_acumulado: acumulado,
      metrado_periodo: periodo,
      importe: r2(periodo * precio),
    }
    const diferencia = r4(acumulado - reportado)
    if (diferencia !== 0) {
      item.ajuste = diferencia
      item.nota_ajuste = ajuste?.nota ? String(ajuste.nota) : ''
    }
    items.push(item)
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
