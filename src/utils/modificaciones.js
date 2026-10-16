// Modificaciones contractuales de una obra: adicionales, deductivos y
// ampliaciones de plazo (M11).
//
// Reglas de negocio:
//   presupuesto vigente = presupuesto original + adicionales aprobados
//                                              − deductivos aprobados.
//   plazo vigente       = fecha fin + días aprobados de ampliaciones.
//
// Solo cuentan los estados 'aprobado'; los borradores/presentados/rechazados
// se muestran pero no alteran el contrato. Nada aquí reimplementa fórmulas de
// otras utilidades: los importes salen de metrado × precio unitario y las
// fechas de `calendario.js`.
//
// Módulo puro: no toca localStorage ni el estado de React.

import { sumarDiasISO } from './calendario'
import { hoyISO } from './calculadora'

const r2 = (x) => Math.round((Number(x) || 0) * 100) / 100

// Estado de una modificación (mismo vocabulario para adicionales/deductivos y
// ampliaciones de plazo).
export const ESTADOS_MODIFICACION = ['borrador', 'presentado', 'aprobado', 'rechazado']

export const ETIQUETA_ESTADO = {
  borrador: 'Borrador',
  presentado: 'Presentado',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
}

// Tipos de modificación presupuestal.
export const TIPOS_MODIFICACION = ['adicional', 'deductivo']

export const ETIQUETA_TIPO = {
  adicional: 'Adicional',
  deductivo: 'Deductivo',
}

// Importe de una partida = metrado × precio unitario (0 si falta base; nunca
// NaN). El signo se decide por el tipo de la modificación, no por la partida.
export function importePartida(partida = {}) {
  const metrado = Number(partida.metrado)
  const pu = Number(partida.precio_unitario)
  if (!Number.isFinite(metrado) || !Number.isFinite(pu)) return 0
  return r2(metrado * pu)
}

// Importe total de una modificación = suma de sus partidas.
export function importeModificacion(modificacion = {}) {
  return r2((modificacion.partidas ?? []).reduce((s, p) => s + importePartida(p), 0))
}

export function esAprobada(modificacion) {
  return modificacion?.estado === 'aprobado'
}

// Importe de partidas suma de las modificaciones aprobadas del servicio y tipo.
export function totalAprobado(modificaciones = [], servicioId, tipo) {
  return r2(
    (modificaciones ?? [])
      .filter((m) => m.servicio_id === servicioId && m.tipo === tipo && esAprobada(m))
      .reduce((s, m) => s + importeModificacion(m), 0),
  )
}

// Presupuesto contractual vigente = original + adic. aprobados − ded. aprobados.
export function presupuestoVigente(servicio, modificaciones = []) {
  const original = Number(servicio?.presupuesto_asignado) || 0
  const adicionales = totalAprobado(modificaciones, servicio?.id, 'adicional')
  const deductivos = totalAprobado(modificaciones, servicio?.id, 'deductivo')
  return r2(original + adicionales - deductivos)
}

// Días de ampliación de plazo aprobados para un servicio.
export function diasAmpliados(ampliaciones = [], servicioId) {
  return (ampliaciones ?? [])
    .filter((a) => a.servicio_id === servicioId && esAprobada(a))
    .reduce((s, a) => s + (Number(a.dias_aprobados) || 0), 0)
}

// Días de ampliación efectivamente aplicados a la fecha fin contractual
// (`dias_aplicados` se guarda al aprobar y se revierte al salir de aprobado).
export function diasAplicados(ampliaciones = [], servicioId) {
  return (ampliaciones ?? [])
    .filter((a) => a.servicio_id === servicioId)
    .reduce((s, a) => s + (Number(a.dias_aplicados) || 0), 0)
}

// Servicio "efectivo" con el presupuesto vigente en `presupuesto_asignado`, para
// que las funciones existentes (estado de presupuesto, Curva S, valorizaciones)
// lo consuman sin cambiar su firma. Conserva el original en
// `presupuesto_original` por si la UI quiere mostrar la variación.
export function servicioConPresupuestoVigente(servicio, modificaciones = []) {
  const original = Number(servicio?.presupuesto_asignado) || 0
  return {
    ...servicio,
    presupuesto_original: original,
    presupuesto_asignado: presupuestoVigente(servicio, modificaciones),
  }
}

// Resumen para la cabecera de la sección: importes, variación y plazo.
export function resumenModificaciones({ servicio, modificaciones = [], ampliaciones = [] } = {}) {
  const propias = (modificaciones ?? []).filter((m) => m.servicio_id === servicio?.id)
  const propiasAmpl = (ampliaciones ?? []).filter((a) => a.servicio_id === servicio?.id)
  const original = Number(servicio?.presupuesto_asignado) || 0
  const adicionales = totalAprobado(modificaciones, servicio?.id, 'adicional')
  const deductivos = totalAprobado(modificaciones, servicio?.id, 'deductivo')
  const vigente = r2(original + adicionales - deductivos)
  const porEstado = (estado) => propias.filter((m) => m.estado === estado).length
  const plazoAprobado = diasAmpliados(ampliaciones, servicio?.id)
  const plazoAplicado = diasAplicados(ampliaciones, servicio?.id)
  // La fecha fin guardada en el servicio YA incluye lo aplicado, así que la
  // "original" se reconstruye restando los días aplicados (no se re-suma).
  const fechaFinVigente = servicio?.fecha_fin_estimada ?? null
  const fechaFinOriginal = fechaFinVigente
    ? sumarDiasISO(fechaFinVigente, -plazoAplicado)
    : null

  return {
    cantidad: propias.length,
    cantidadAmpliaciones: propiasAmpl.length,
    borradores: porEstado('borrador'),
    presentados: porEstado('presentado'),
    aprobados: porEstado('aprobado'),
    rechazados: porEstado('rechazado'),
    original,
    vigente,
    variacion: r2(vigente - original),
    adicionales,
    deductivos,
    plazoAprobado,
    plazoAplicado,
    fechaFinVigente,
    fechaFinOriginal,
  }
}

// Siguiente número correlativo dentro de un servicio (max + 1).
export function siguienteNumero(items = [], servicioId) {
  const maximo = (items ?? [])
    .filter((x) => x.servicio_id === servicioId)
    .reduce((max, x) => (Number(x.numero) > max ? Number(x.numero) : max), 0)
  return maximo + 1
}

// Aplica una transición de estado y deja constancia en el historial.
export function aplicarTransicion(item, nuevoEstado, fecha = hoyISO()) {
  const historial = Array.isArray(item?.historial) ? item.historial : []
  let siguiente = historial
  if (historial[historial.length - 1]?.estado !== nuevoEstado) {
    siguiente = [...historial, { estado: nuevoEstado, fecha }]
  }
  return { ...item, estado: nuevoEstado, historial: siguiente }
}

// Fecha fin contractual desplazada por los días de ampliación aprobados.
export function desplazarFechaFin(fechaFinISO, dias) {
  if (!fechaFinISO) return null
  return sumarDiasISO(fechaFinISO, Math.max(0, Math.round(Number(dias) || 0)))
}

// Convierte las partidas de un adicional APROBADO en tareas hoja del
// cronograma, para que se valoricen y entren al avance/EVM sin tocar fórmulas.
// Cada tarea queda marcada con `modificacion_id`/`partida_index` para poder
// reconciliarla (actualizarla o retirarla) si la modificación cambia.
export function partidasATareas({ servicio, modificacion } = {}) {
  if (!servicio || !modificacion || modificacion.tipo !== 'adicional') return []
  if (!esAprobada(modificacion)) return []
  return (modificacion.partidas ?? []).map((p, i) => ({
    servicio_id: servicio.id,
    nombre: p.nombre || `Adicional ${modificacion.numero} – partida ${i + 1}`,
    fecha_inicio: modificacion.fecha,
    fecha_fin: modificacion.fecha,
    // `avance` no se fija aquí: lo deriva `recalcularAvances` al entrar al
    // estado (única fuente), igual que cualquier otra tarea nueva.
    monto: importePartida(p),
    unidad: p.unidad ?? null,
    metrado: p.metrado ?? null,
    precio_unitario: p.precio_unitario ?? null,
    modificacion_id: modificacion.id,
    partida_index: i,
    es_adicional: true,
  }))
}

// Clave estructural de una tarea materializada, para reconciliar sin duplicar.
export function clavePartida(modificacionId, partidaIndex) {
  return `${modificacionId}:${partidaIndex}`
}
