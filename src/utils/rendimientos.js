// Rendimiento de partidas en modo metrado (Fase E).
//
// Compara lo REAL (desde los partes) con lo PLANIFICADO (del cronograma con el
// calendario de obra):
//
//   real/día   = metrado de partes (hasta el corte) ÷ días trabajados
//   real/HH    = metrado de partes (hasta el corte) ÷ HH de los partes
//   plan/día   = metrado pendiente al inicio ÷ duración planificada
//   desvío %   = real/día ÷ plan/día × 100 (null sin base o sin datos)
//
// Días trabajados = fechas distintas con metrado registrado para la partida.
// Las HH de un parte (personal presente) se atribuyen íntegras a cada partida
// con metrado ese día: es una aproximación declarada, no un prorrateo oculto.
// El ejecutado previo no entra en lo real (no tiene días ni HH asociados);
// el planificado sí lo descuenta (es lo pendiente al inicio).
//
// Todo es puro; el corte (`hoy`) se inyecta para que las pruebas no dependan
// del reloj.

import { calendarioDe, diasLaborablesRango } from './calendario'
import { hoyISO } from './calculadora'
import { horasPersonal, metradoDeFila } from './partesDiario'

const n = (v) => Number(v) || 0
const r2 = (x) => Math.round(n(x) * 100) / 100
const r4 = (x) => Math.round(n(x) * 10000) / 10000

// Parámetros configurables por obra (campos opcionales del servicio).
export const INACTIVIDAD_DEFECTO_DIAS = 3
export const UMBRAL_RENDIMIENTO_DEFECTO = 70

export function diasInactividadAlerta(servicio = {}) {
  const v = servicio?.alerta_inactividad_dias
  if (v == null || v === '') return INACTIVIDAD_DEFECTO_DIAS
  const x = Number(v)
  return Number.isFinite(x) ? Math.max(0, Math.floor(x)) : INACTIVIDAD_DEFECTO_DIAS
}

export function umbralRendimiento(servicio = {}) {
  const v = servicio?.umbral_rendimiento_pct
  if (v == null || v === '') return UMBRAL_RENDIMIENTO_DEFECTO
  const x = Number(v)
  return Number.isFinite(x) ? Math.max(0, x) : UMBRAL_RENDIMIENTO_DEFECTO
}

// ¿El parte trae metrado de la partida? (null = no: otra partida o legado).
function esFilaDeTarea(x, tareaId) {
  return x?.tarea_id === tareaId && metradoDeFila(x) != null
}

// Partes con metrado de la partida hasta el corte (inclusive).
function partesDeTarea(partes = [], tareaId, corte = null) {
  return (partes ?? []).filter((p) => {
    if (corte != null && corte !== '' && (p?.fecha ?? '') > corte) return false
    return (p?.partidas ?? []).some((x) => esFilaDeTarea(x, tareaId))
  })
}

// Días trabajados: fechas distintas con metrado registrado para la partida.
export function diasTrabajados(partes = [], tareaId, corte = null) {
  return new Set(partesDeTarea(partes, tareaId, corte).map((p) => p.fecha)).size
}

// Metrado de partes de la partida hasta el corte.
export function metradoDePartes(partes = [], tareaId, corte = null) {
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

// HH de los partes que incluyen la partida (personal presente del parte).
export function horasDePartes(partes = [], tareaId, corte = null) {
  let total = 0
  for (const p of partesDeTarea(partes, tareaId, corte)) total += horasPersonal(p)
  return r2(total)
}

// Duración planificada en días laborables del calendario de obra.
export function duracionPlanificada(tarea = {}, servicio = {}) {
  if (!tarea?.fecha_inicio || !tarea?.fecha_fin) return 0
  return diasLaborablesRango(tarea.fecha_inicio, tarea.fecha_fin, calendarioDe(servicio))
}

// Rendimiento de una partida en modo metrado (null sin metrado contratado).
export function rendimientoTarea(tarea = {}, { partes = [], servicio = {}, hoy = hoyISO() } = {}) {
  const metrado = Number(tarea?.metrado)
  if (!Number.isFinite(metrado) || metrado <= 0) return null
  const dias = diasTrabajados(partes, tarea.id, hoy)
  const metradoReal = metradoDePartes(partes, tarea.id, hoy)
  const horas = horasDePartes(partes, tarea.id, hoy)
  const pendienteInicio = Math.max(0, r4(metrado - n(tarea?.metrado_previo)))
  const duracion = duracionPlanificada(tarea, servicio)
  const planDia = duracion > 0 ? r4(pendienteInicio / duracion) : null
  const realDia = dias > 0 ? r4(metradoReal / dias) : null
  const realHH = horas > 0 ? r4(metradoReal / horas) : null
  const desvio =
    planDia != null && planDia > 0 && realDia != null ? r2((realDia / planDia) * 100) : null
  return {
    tarea_id: tarea.id,
    unidad: tarea?.unidad ?? '',
    dias,
    metradoReal,
    horas,
    pendienteInicio,
    duracion,
    planDia,
    realDia,
    realHH,
    desvio,
  }
}

// Semáforo del desvío: verde ≥ 100, ámbar ≥ umbral, rojo < umbral, gris sin datos.
export function tonoDesvio(desvio, umbral = UMBRAL_RENDIMIENTO_DEFECTO) {
  if (desvio == null) return 'gris'
  if (desvio >= 100) return 'verde'
  if (desvio >= umbral) return 'ambar'
  return 'rojo'
}
