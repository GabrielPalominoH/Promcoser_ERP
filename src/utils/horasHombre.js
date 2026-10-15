// Horas-hombre (HH) de la obra.
//
// Dos lecturas que se comparan igual que en P6 (planificado vs real):
//   HH plan  → las horas que comprometen las ASIGNACIONES de personal sobre
//              cada partida (días de solape con la ventana de la tarea ×
//              horas por día). Es el recurso planificado.
//   HH real  → lo efectivamente trabajado según los REGISTROS diarios de
//              personal (cantidad_o_horas), sin contar los domingos salvo
//              régimen mensual (cuentaComoManoDeObra).
//
// A partir de ahí: desviación de horas, productividad (metrado por hora) y
// series mensuales para el histograma de recursos.
//
// Todo es puro. Los importes y horas se redondean a céntimos.

import {
  costoMensualAsignacion,
  cuentaComoManoDeObra,
  diasCalendarioRango,
  mesesEntre,
} from './calculadora'

const n = (v) => Number(v) || 0
const r2 = (x) => Math.round(n(x) * 100) / 100

// IDs de una tarea y todas sus descendientes (mismo criterio que diasRealesTarea).
function idsSubarbol(tarea, tareas) {
  const ids = new Set([tarea.id])
  let cambio = true
  while (cambio) {
    cambio = false
    for (const t of tareas ?? []) {
      if (!ids.has(t.id) && t.padre_id != null && ids.has(t.padre_id)) {
        ids.add(t.id)
        cambio = true
      }
    }
  }
  return ids
}

// Horas planificadas de una asignación dentro de una ventana [desde, hasta].
function horasPlanAsignacion(asignacion, desde, hasta) {
  const inicio = [desde, asignacion.fecha_inicio].filter(Boolean).sort().at(-1)
  const fin = [hasta, asignacion.fecha_fin].filter(Boolean).sort()[0]
  const dias = diasCalendarioRango(inicio, fin)
  return Math.max(0, dias) * n(asignacion.horas_por_dia)
}

// HH planificadas de una tarea (hoja) y sus descendientes, según las
// asignaciones de personal cuya ventana cae dentro de la ventana de la tarea.
export function horasPlanTarea(tarea, tareas, asignaciones, servicio = null) {
  if (!tarea) return 0
  const ids = idsSubarbol(tarea, tareas)
  let total = 0
  for (const a of asignaciones ?? []) {
    if (servicio && a.servicio_id !== servicio.id) continue
    if (a.tarea_id == null || !ids.has(a.tarea_id)) continue
    const propia = (tareas ?? []).find((t) => t.id === a.tarea_id)
    const desde = propia?.fecha_inicio ?? servicio?.fecha_inicio
    const hasta = propia?.fecha_fin ?? servicio?.fecha_fin_estimada
    total += horasPlanAsignacion(a, desde, hasta)
  }
  return r2(total)
}

// HH reales de una tarea y sus descendientes, según los registros de personal.
export function horasRealesTarea(tarea, tareas, registros, servicioId) {
  if (!tarea) return 0
  const ids = idsSubarbol(tarea, tareas)
  let total = 0
  for (const r of registros ?? []) {
    if (r.servicio_id !== servicioId || r.tipo_registro !== 'personal') continue
    if (r.tarea_id == null || !ids.has(r.tarea_id)) continue
    if (!cuentaComoManoDeObra(r)) continue
    total += n(r.cantidad_o_horas)
  }
  return r2(total)
}

// Desviación de horas: real − plan (+ = más horas de las previstas).
// Porcentaje null sin plan (no hay base contra qué comparar).
export function desviacionHoras(plan, real) {
  const p = n(plan)
  const rr = n(real)
  return {
    diferencia: r2(rr - p),
    porcentaje: p === 0 ? null : Math.round((rr / p) * 10000) / 100,
  }
}

// Productividad: unidades de metrado por hora-hombre. null sin horas.
export function productividadHH(metrado, horas) {
  const h = n(horas)
  if (h <= 0) return null
  return Math.round((n(metrado) / h) * 10000) / 10000
}

// HH reales por mes (YYYY-MM) con meses intermedios en cero, ordenados.
// `servicioId` null agrega toda la cartera.
export function horasRealesMensual(registros, servicioId = null) {
  const porMes = new Map()
  for (const r of registros ?? []) {
    if (servicioId != null && r.servicio_id !== servicioId) continue
    if (r.tipo_registro !== 'personal') continue
    if (!cuentaComoManoDeObra(r)) continue
    if (!r.fecha || r.fecha.length < 7) continue
    const mes = r.fecha.slice(0, 7)
    porMes.set(mes, (porMes.get(mes) || 0) + n(r.cantidad_o_horas))
  }
  const meses = [...porMes.keys()].sort()
  if (meses.length === 0) return []
  return mesesEntre(meses[0], meses[meses.length - 1]).map((mes) => ({
    mes,
    horas: r2(porMes.get(mes) || 0),
  }))
}

// HH planificadas por mes (YYYY-MM): cada asignación reparte sus horas mes a
// mes con el mismo régimen de 30 días que usa el costo de mano de obra.
export function horasPlanMensual(asignaciones, servicios, servicioId = null) {
  const lista = (asignaciones ?? []).filter(
    (a) => servicioId == null || a.servicio_id === servicioId,
  )
  const porMes = new Map()
  for (const a of lista) {
    if (!a.fecha_inicio) continue
    const servicio = (servicios ?? []).find((s) => s.id === a.servicio_id) ?? null
    const fin = a.fecha_fin || servicio?.fecha_fin_estimada || a.fecha_inicio
    for (const mes of mesesEntre(a.fecha_inicio.slice(0, 7), fin.slice(0, 7))) {
      const { horas } = costoMensualAsignacion(a, mes, servicio)
      porMes.set(mes, (porMes.get(mes) || 0) + horas)
    }
  }
  const meses = [...porMes.keys()].sort()
  if (meses.length === 0) return []
  return mesesEntre(meses[0], meses[meses.length - 1]).map((mes) => ({
    mes,
    horas: r2(porMes.get(mes) || 0),
  }))
}

// Serie continua plan vs real para el histograma de recursos.
export function serieHorasHombre({
  asignaciones = [],
  servicios = [],
  registros = [],
  servicioId = null,
} = {}) {
  const plan = horasPlanMensual(asignaciones, servicios, servicioId)
  const real = horasRealesMensual(registros, servicioId)
  const meses = new Set([...plan.map((p) => p.mes), ...real.map((p) => p.mes)])
  if (meses.size === 0) return []
  const lista = [...meses].sort()
  const planMap = new Map(plan.map((p) => [p.mes, p.horas]))
  const realMap = new Map(real.map((p) => [p.mes, p.horas]))
  return mesesEntre(lista[0], lista[lista.length - 1]).map((mes) => ({
    mes,
    plan: r2(planMap.get(mes) || 0),
    real: r2(realMap.get(mes) || 0),
  }))
}

// Resumen de HH de un servicio (todas las partidas de primer nivel).
export function resumenHorasServicio({
  tareas = [],
  asignaciones = [],
  registros = [],
  servicio = null,
} = {}) {
  const raices = (tareas ?? []).filter(
    (t) => t.servicio_id === servicio?.id && t.padre_id == null,
  )
  let plan = 0
  let real = 0
  for (const t of raices) {
    plan += horasPlanTarea(t, tareas, asignaciones, servicio)
    real += horasRealesTarea(t, tareas, registros, servicio?.id)
  }
  return {
    plan: r2(plan),
    real: r2(real),
    desviacion: desviacionHoras(plan, real),
  }
}
