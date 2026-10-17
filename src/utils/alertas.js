// Alertas de partidas (Fase E, Fase 3 del control de obra).
//
// Tres tipos, todos puros y con `hoy` inyectado (las pruebas no dependen del
// reloj):
//   inactividad  partida en modo metrado, ya iniciada, sin avance completo y
//                sin partes desde hace N días (N de la obra, 3 por defecto)
//   rendimiento  partida en modo metrado con desvío real/plan bajo el umbral
//                (umbral de la obra, 70 % por defecto)
//   vencida      partida (cualquier modo) con fecha fin vencida y avance < 100 %
//
// Los modos manual, hitos, costo y tiempo solo generan (c): su avance no sale
// de partes, así que no tiene sentido medirles inactividad ni rendimiento.
// Cada alerta trae { tipo, servicio_id, servicio, tarea_id, tarea, unidad,
// detalle }; el enlace a la partida lo arma la UI (`partidas?tarea=<id>`).

import { hoyISO } from './calculadora'
import { esHojaTarea } from './avance'
import {
  diasInactividadAlerta,
  rendimientoTarea,
  umbralRendimiento,
} from './rendimientos'

const n = (v) => Number(v) || 0

// Días calendario entre dos fechas ISO (puede ser negativo).
function diasCalendarioEntre(desdeISO, hastaISO) {
  const [a1, m1, d1] = String(desdeISO).split('-').map(Number)
  const [a2, m2, d2] = String(hastaISO).split('-').map(Number)
  if (![a1, m1, d1, a2, m2, d2].every(Number.isFinite)) return 0
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000)
}

// Última fecha (<= hoy) de un parte que menciona la partida (cualquier fila).
function ultimaFechaParte(partes = [], tareaId, hoy) {
  let ultima = null
  for (const p of partes ?? []) {
    if ((p?.fecha ?? '') > hoy) continue
    if (!(p?.partidas ?? []).some((x) => x?.tarea_id === tareaId)) continue
    if (ultima == null || p.fecha > ultima) ultima = p.fecha
  }
  return ultima
}

// Alertas de las partidas (hojas) de una obra.
export function alertasDeObra({ servicio = {}, tareas = [], partes = [], hoy = hoyISO() } = {}) {
  const alertas = []
  const inactividadDias = diasInactividadAlerta(servicio)
  const umbral = umbralRendimiento(servicio)
  const base = { servicio_id: servicio?.id ?? null, servicio: servicio?.nombre_servicio ?? '' }
  const hojas = (tareas ?? []).filter(
    (t) => (servicio?.id == null || t.servicio_id === servicio.id) && esHojaTarea(t, tareas),
  )

  for (const t of hojas) {
    const avance = n(t?.avance)
    const comun = {
      ...base,
      tarea_id: t.id,
      tarea: t?.nombre ?? '',
      unidad: t?.unidad ?? '',
    }
    // (c) vencida: cualquier modo, sin avance completo.
    if (t?.fecha_fin && t.fecha_fin < hoy && avance < 100) {
      const [a1, m1, d1] = String(t.fecha_fin).split('-').map(Number)
      const [a2, m2, d2] = String(hoy).split('-').map(Number)
      const atraso = Math.max(0, Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000))
      alertas.push({
        ...comun,
        tipo: 'vencida',
        detalle: `Terminaba el ${t.fecha_fin} y va en ${avance} %.`,
        atraso_dias: atraso,
      })
    }
    if (t?.modo_medicion !== 'metrado' || avance >= 100) continue
    // (a) inactividad: iniciada y sin partes desde hace N días (o desde el
    // inicio si nunca tuvo).
    if (t?.fecha_inicio && t.fecha_inicio <= hoy) {
      const ultima = ultimaFechaParte(partes, t.id, hoy)
      const referencia = ultima ?? t.fecha_inicio
      const dias = diasCalendarioEntre(referencia, hoy)
      if (dias >= inactividadDias) {
        alertas.push({
          ...comun,
          tipo: 'inactividad',
          detalle: ultima
            ? `Sin partes hace ${dias} días (último: ${ultima}).`
            : `Iniciada hace ${dias} días sin ningún parte.`,
          dias_sin_partes: dias,
        })
      }
    }
    // (b) rendimiento: desvío real/plan bajo el umbral (con datos).
    const rend = rendimientoTarea(t, { partes, servicio, hoy })
    if (rend?.desvio != null && rend.desvio < umbral) {
      alertas.push({
        ...comun,
        tipo: 'rendimiento',
        detalle: `Rinde ${rend.desvio} % de lo planificado (${rend.realDia} de ${rend.planDia} ${rend.unidad}/día).`,
        rendimiento_pct: rend.desvio,
      })
    }
  }
  return alertas
}

// Alertas de toda la cartera (para el Dashboard; el Resumen filtra por obra).
export function alertasDeCartera({ servicios = [], tareas = [], partes = [], hoy = hoyISO() } = {}) {
  return (servicios ?? []).flatMap((s) => alertasDeObra({ servicio: s, tareas, partes, hoy }))
}
