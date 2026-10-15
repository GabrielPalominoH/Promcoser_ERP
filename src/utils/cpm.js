// Motor de programación CPM (Critical Path Method) para el cronograma.
//
// Calcula, sobre las hojas del cronograma de un servicio:
//   ES (inicio temprano), EF (fin temprano),
//   LS (inicio tardío),   LF (fin tardío),
//   holgura total (en días laborables) y si la tarea es crítica,
// además del orden topológico y los ciclos de dependencias.
//
// Es "asesor": no reescribe las fechas por sí solo. La UI muestra el resultado
// y solo aplica los cambios cuando el usuario pulsa "Reprogramar (CPM)".
//
// Tipos de dependencia soportados (igual que P6):
//   FS (fin→inicio), SS (inicio→inicio), FF (fin→fin), SF (inicio→fin).
// `lag` se mide en días laborables.
//
// Con tareas sin predecesoras el resultado es coherente con el cronograma
// actual (cada hoja conserva su inicio manual), por lo que el módulo es
// compatible hacia atrás con los datos existentes.

import {
  calendarioDe,
  diasLaborablesRango,
  restarDiasLaborables,
  sumarDiasISO,
  sumarDiasLaborables,
} from './calendario'

const n = (v) => Number(v) || 0
const maxISO = (a, b) => (!a ? b : !b ? a : a > b ? a : b)
const minISO = (a, b) => (!a ? b : !b ? a : a < b ? a : b)

export const TIPOS_DEPENDENCIA = [
  { valor: 'FS', etiqueta: 'Fin → Inicio (FS)' },
  { valor: 'SS', etiqueta: 'Inicio → Inicio (SS)' },
  { valor: 'FF', etiqueta: 'Fin → Fin (FF)' },
  { valor: 'SF', etiqueta: 'Inicio → Fin (SF)' },
]

// Hojas con fechas: sobre ellas corre la red.
function hojas(tareas) {
  const conFechas = (tareas ?? []).filter((t) => t.fecha_inicio && t.fecha_fin)
  return conFechas.filter((t) => !(tareas ?? []).some((h) => h.padre_id === t.id))
}

// Orden topológico por predecesoras. Devuelve {orden, ciclos}.
function ordenTopologico(ids, predsPorId) {
  const estado = new Map() // 0 = en pila, 1 = resuelto
  const orden = []
  const ciclos = new Set()

  const visitar = (id, pila) => {
    const e = estado.get(id)
    if (e === 1) return
    if (e === 0) {
      const desde = pila.indexOf(id)
      for (const x of (desde >= 0 ? pila.slice(desde) : pila)) ciclos.add(x)
      return
    }
    estado.set(id, 0)
    pila.push(id)
    for (const p of predsPorId.get(id) ?? []) {
      if (ids.has(p.id)) visitar(p.id, pila)
    }
    pila.pop()
    estado.set(id, 1)
    orden.push(id)
  }

  for (const id of ids) visitar(id, [])
  return { orden, ciclos: [...ciclos] }
}

function esHito(t) {
  return t.hito === true
}

// Holgura en días laborables entre ES y LS (negativa si LS < ES).
function holguraEntre(es, ls, cal) {
  if (!es || !ls) return 0
  if (ls >= es) return diasLaborablesRango(es, ls, cal) - 1
  return -(diasLaborablesRango(ls, es, cal) - 1)
}

/**
 * Programa la red de un servicio.
 * @returns {{
 *   valido: boolean, ciclos: number[], sucursales: object,
 *   porTarea: Object<number, {es,ef,ls,lf,duracion,holgura,critica,inicio,fin,hito}>,
 *   inicio: string|null, fin: string|null, rutaCritica: number[]
 * }}
 */
export function programar({ tareas = [], servicio = null, calendario = null } = {}) {
  const cal = calendario ?? calendarioDe(servicio)
  const delServicio = (tareas ?? []).filter(
    (t) => servicio == null || t.servicio_id === servicio.id,
  )
  const lista = hojas(delServicio)
  const ids = new Set(lista.map((t) => t.id))
  const porId = new Map(lista.map((t) => [t.id, t]))

  const predsPorId = new Map()
  for (const t of lista) {
    const preds = (t.predecesoras ?? []).filter((p) => p && ids.has(p.id) && p.id !== t.id)
    predsPorId.set(t.id, preds)
  }

  const { orden, ciclos } = ordenTopologico(ids, predsPorId)
  const info = new Map()

  const duracionDe = (t) => {
    if (esHito(t)) return 0
    return Math.max(1, diasLaborablesRango(t.fecha_inicio, t.fecha_fin, cal))
  }

  // ---- Pasada hacia adelante -------------------------------------------
  for (const id of orden) {
    const t = porId.get(id)
    const dur = duracionDe(t)
    const preds = predsPorId.get(id) ?? []
    // Una tarea SIN predecesoras se ancla a su fecha manual (restricción de
    // inicio del cronograma). Una tarea CON predecesoras sigue la lógica: su
    // inicio lo fijan sus dependencias (criterio P6).
    let es = preds.length > 0 ? null : t.fecha_inicio
    let efRestringido = null

    for (const p of preds) {
      const pred = info.get(p.id)
      if (!pred) continue
      const lag = n(p.lag)
      if (p.tipo === 'SS') {
        es = maxISO(es, sumarDiasLaborables(pred.es, lag, cal))
      } else if (p.tipo === 'FF') {
        efRestringido = maxISO(efRestringido, sumarDiasLaborables(pred.ef, lag, cal))
      } else if (p.tipo === 'SF') {
        efRestringido = maxISO(efRestringido, sumarDiasLaborables(pred.es, lag, cal))
      } else {
        // FS: el sucesor empieza el primer día laborable después del fin del pred.
        es = maxISO(es, sumarDiasLaborables(sumarDiasISO(pred.ef, 1), lag, cal))
      }
    }

    es = es ?? t.fecha_inicio
    es = sumarDiasLaborables(es, 0, cal)
    let ef = dur === 0 ? es : sumarDiasLaborables(es, dur - 1, cal)
    if (efRestringido && efRestringido > ef) {
      ef = efRestringido
      es = dur === 0 ? ef : restarDiasLaborables(ef, dur - 1, cal)
    }
    info.set(id, { es, ef, duracion: dur, hito: esHito(t) })
  }

  // Fin del proyecto = máximo fin temprano.
  let finProyecto = null
  for (const id of ids) {
    const i = info.get(id)
    if (i) finProyecto = maxISO(finProyecto, i.ef)
  }

  // Sucesores, para la pasada hacia atrás.
  const sucPorId = new Map()
  for (const id of ids) sucPorId.set(id, [])
  for (const t of lista) {
    for (const p of predsPorId.get(t.id) ?? []) {
      sucPorId.get(p.id)?.push({ id: t.id, tipo: p.tipo, lag: n(p.lag) })
    }
  }

  // ---- Pasada hacia atrás (holgura) ------------------------------------
  for (let k = orden.length - 1; k >= 0; k--) {
    const id = orden[k]
    const i = info.get(id)
    const dur = i.duracion
    let lf = finProyecto

    for (const s of sucPorId.get(id) ?? []) {
      const suc = info.get(s.id)
      if (!suc) continue
      const lag = s.lag
      if (s.tipo === 'SS') {
        // pred.ES = suc.LS - lag  ⇒  pred.EF = eso + dur - 1
        const base = restarDiasLaborables(suc.ls ?? suc.es, lag, cal)
        lf = minISO(lf, sumarDiasLaborables(base, dur - 1, cal))
      } else if (s.tipo === 'FF') {
        lf = minISO(lf, restarDiasLaborables(suc.lf ?? suc.ef, lag, cal))
      } else if (s.tipo === 'SF') {
        // pred.ES = suc.LF - lag  ⇒  pred.EF = eso + dur - 1
        const base = restarDiasLaborables(suc.lf ?? suc.ef, lag, cal)
        lf = minISO(lf, sumarDiasLaborables(base, dur - 1, cal))
      } else {
        // FS: pred.EF = suc.LS - lag - 1 día laborable
        lf = minISO(lf, restarDiasLaborables(suc.ls ?? suc.es, lag + 1, cal))
      }
    }

    const ls = dur === 0 ? lf : restarDiasLaborables(lf, dur - 1, cal)
    const holgura = holguraEntre(i.es, ls, cal)
    info.set(id, { ...i, ls, lf, holgura, critica: holgura <= 0 })
  }

  // ---- Volcado y resumen del árbol (padres = span de hijas) -------------
  const porTarea = {}
  for (const [id, i] of info) {
    porTarea[id] = {
      es: i.es,
      ef: i.ef,
      ls: i.ls,
      lf: i.lf,
      duracion: i.duracion,
      holgura: i.holgura,
      critica: i.critica,
      hito: i.hito,
      inicio: i.es,
      fin: i.ef,
    }
  }

  // Padres: inicio = mín ES de descendientes; fin = máx EF; crítico si alguna
  // hoja descendiente es crítica.
  const conHijas = delServicio.filter((t) => delServicio.some((h) => h.padre_id === t.id))
  for (const padre of conHijas) {
    let inicio = null
    let fin = null
    let critica = false
    let duracion = 0
    for (const [id, v] of Object.entries(porTarea)) {
      const t = porId.get(Number(id))
      if (!t) continue
      // ¿es descendiente del padre?
      let cur = t
      let esDesc = false
      while (cur && cur.padre_id != null) {
        if (cur.padre_id === padre.id) {
          esDesc = true
          break
        }
        cur = delServicio.find((x) => x.id === cur.padre_id)
      }
      if (!esDesc) continue
      inicio = minISO(inicio, v.es)
      fin = maxISO(fin, v.ef)
      critica = critica || v.critica
      duracion += v.duracion
    }
    if (inicio && fin) {
      porTarea[padre.id] = {
        es: inicio,
        ef: fin,
        ls: inicio,
        lf: fin,
        duracion: diasLaborablesRango(inicio, fin, cal),
        holgura: 0,
        critica,
        hito: false,
        inicio,
        fin,
        resumen: true,
      }
    }
  }

  let inicioProyecto = null
  for (const i of Object.values(porTarea)) {
    if (i.resumen) continue
    inicioProyecto = minISO(inicioProyecto, i.es)
  }

  const rutaCritica = Object.entries(porTarea)
    .filter(([, v]) => v.critica && !v.resumen)
    .map(([id]) => Number(id))
    .sort((a, b) => (porTarea[a].es || '').localeCompare(porTarea[b].es || '') || a - b)

  return {
    valido: ciclos.length === 0,
    ciclos,
    porTarea,
    inicio: inicioProyecto,
    fin: finProyecto,
    rutaCritica,
  }
}
