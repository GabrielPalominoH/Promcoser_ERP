// Cronograma: utilidades puras de la vista Gantt (Fase 4).
//
// Reúne lo que necesita la vista "gerencial" del cronograma de una obra:
//   · semanas de calendario y ventana "look-ahead" (3–6 semanas),
//   · arrastre y redimensionado de barras respetando el calendario laboral y
//     los grupos (mover un padre mueve todo su subárbol),
//   · desvío contra la línea base, en días calendario,
//   · validación de dependencias (FS/SS/FF/SF) antes de aplicar un movimiento,
//   · histograma semanal de recursos (personal planificado y equipos usados)
//     con detección de sobreasignación.
//
// Todo es puro: no toca el DOM ni localStorage y se prueba sin navegador.

import {
  anteriorLaborable,
  diasLaborablesRango,
  normalizarCalendario,
  siguienteLaborable,
  sumarDiasISO,
  sumarDiasLaborables,
} from './calendario'

const DIA_MS = 86400000
const r2 = (x) => Math.round((Number(x) || 0) * 100) / 100

// --- fechas (horario local, sin desfase UTC) ------------------------------

function parsear(iso) {
  const [a, m, d] = String(iso).split('-').map(Number)
  return new Date(a, m - 1, d)
}

function diaSemana(iso) {
  return parsear(iso).getDay()
}

function diasEntre(aISO, bISO) {
  return Math.round((parsear(bISO) - parsear(aISO)) / DIA_MS)
}

// --- semanas y look-ahead -------------------------------------------------

// Lunes de la semana que contiene `iso` (la semana empieza el lunes, 0 = dom).
export function lunesDe(iso) {
  if (!iso) return iso
  const atras = (diaSemana(iso) + 6) % 7
  return sumarDiasISO(iso, -atras)
}

// Semanas (lunes→domingo) que cubren [desde, hasta]; `desde` se alinea al lunes.
export function semanasEntre(desde, hasta) {
  if (!desde || !hasta) return []
  const lista = []
  let cursor = lunesDe(desde)
  let guarda = 0
  while (cursor <= hasta && guarda < 520) {
    lista.push({ inicio: cursor, fin: sumarDiasISO(cursor, 6) })
    cursor = sumarDiasISO(cursor, 7)
    guarda += 1
  }
  return lista
}

// Ventanas válidas del look-ahead, en semanas.
export const SEMANAS_LOOKAHEAD = [3, 4, 5, 6]

// Ventana de las próximas `semanas` (empieza el lunes de la semana de hoy).
export function ventanaLookahead({ hoy, semanas = 4 } = {}) {
  const n = Math.max(1, Math.min(52, Math.round(Number(semanas) || 4)))
  const inicio = lunesDe(hoy)
  const fin = sumarDiasISO(inicio, n * 7 - 1)
  return { inicio, fin, numeroSemanas: n, semanas: semanasEntre(inicio, fin) }
}

// --- arrastre y redimensionado --------------------------------------------

// Desplaza una fecha `delta` días calendario y la deja en día laborable: se
// mueve hacia adelante al avanzar y hacia atrás al retroceder (así el imán del
// calendario nunca "deshace" el movimiento).
function desplazarLaborable(iso, delta, cal) {
  const d = Math.round(Number(delta) || 0)
  const bruto = sumarDiasISO(iso, d)
  if (d < 0) return anteriorLaborable(bruto, cal)
  return siguienteLaborable(bruto, cal)
}

// Nuevas fechas al mover una tarea `delta` días: conserva su duración en días
// laborables y encaja el inicio en el calendario.
export function moverTarea({ tarea, deltaDias = 0, calendario } = {}) {
  if (!tarea || !tarea.fecha_inicio || !tarea.fecha_fin) return null
  const cal = normalizarCalendario(calendario)
  const hito = tarea.hito === true
  const dur = hito ? 0 : Math.max(0, diasLaborablesRango(tarea.fecha_inicio, tarea.fecha_fin, cal))
  const inicio = desplazarLaborable(tarea.fecha_inicio, deltaDias, cal)
  const fin = hito || dur <= 1 ? inicio : sumarDiasLaborables(inicio, dur - 1, cal)
  return { fecha_inicio: inicio, fecha_fin: fin }
}

// Nuevas fechas al arrastrar un borde: `inicio` mueve el arranque (la tarea no
// puede quedar antes de su fin) y `fin` la duración.
export function redimensionarTarea({ tarea, borde = 'fin', deltaDias = 0, calendario } = {}) {
  if (!tarea || !tarea.fecha_inicio || !tarea.fecha_fin) return null
  const cal = normalizarCalendario(calendario)
  if (borde === 'inicio') {
    let inicio = desplazarLaborable(tarea.fecha_inicio, deltaDias, cal)
    if (inicio > tarea.fecha_fin) inicio = tarea.fecha_fin
    return { fecha_inicio: inicio, fecha_fin: tarea.fecha_fin }
  }
  let fin = desplazarLaborable(tarea.fecha_fin, deltaDias, cal)
  if (fin < tarea.fecha_inicio) fin = tarea.fecha_inicio
  return { fecha_inicio: tarea.fecha_inicio, fecha_fin: fin }
}

// Una tarea y todas sus descendientes (mismo criterio que el resto del ERP).
export function idsSubarbol(tareas = [], id) {
  const ids = [id]
  let cambio = true
  while (cambio) {
    cambio = false
    for (const t of tareas) {
      if (!ids.includes(t.id) && t.padre_id != null && ids.includes(t.padre_id)) {
        ids.push(t.id)
        cambio = true
      }
    }
  }
  return ids
}

// Cambios de fecha que produce un arrastre. Al mover se arrastra todo el
// subárbol (grupo); el redimensionado solo aplica a una tarea.
export function cambiosDeArrastre({
  tarea,
  tareas = [],
  deltaDias = 0,
  modo = 'mover',
  borde = 'fin',
  calendario,
} = {}) {
  if (!tarea) return []
  if (modo === 'redimensionar') {
    const nuevo = redimensionarTarea({ tarea, borde, deltaDias, calendario })
    if (!nuevo) return []
    if (nuevo.fecha_inicio === tarea.fecha_inicio && nuevo.fecha_fin === tarea.fecha_fin) {
      return []
    }
    return [{ id: tarea.id, fecha_inicio: nuevo.fecha_inicio, fecha_fin: nuevo.fecha_fin }]
  }
  const ids = new Set(idsSubarbol(tareas, tarea.id))
  const cambios = []
  for (const t of tareas) {
    if (!ids.has(t.id)) continue
    const nuevo = moverTarea({ tarea: t, deltaDias, calendario })
    if (!nuevo) continue
    if (nuevo.fecha_inicio !== t.fecha_inicio || nuevo.fecha_fin !== t.fecha_fin) {
      cambios.push({ id: t.id, fecha_inicio: nuevo.fecha_inicio, fecha_fin: nuevo.fecha_fin })
    }
  }
  return cambios
}

// --- línea base -----------------------------------------------------------

// Desvío de una tarea contra su línea base, en días calendario.
export function desviacionLineaBase({ tarea, base } = {}) {
  if (!tarea || !base || !base.fecha_inicio || !base.fecha_fin) return null
  const durBase = diasEntre(base.fecha_inicio, base.fecha_fin)
  const durReal = diasEntre(tarea.fecha_inicio, tarea.fecha_fin)
  return {
    inicio: diasEntre(base.fecha_inicio, tarea.fecha_inicio),
    fin: diasEntre(base.fecha_fin, tarea.fecha_fin),
    duracion: durReal - durBase,
  }
}

// Resumen del desvío de todo el cronograma contra la línea base.
export function resumenDesviacionLineaBase({ tareas = [], basePorId = new Map() } = {}) {
  let conDesvio = 0
  let adelanto = 0
  let atraso = 0
  let maxAtraso = 0
  let maxAdelanto = 0
  for (const t of tareas) {
    const base = basePorId.get(t.id)
    if (!base) continue
    const d = desviacionLineaBase({ tarea: t, base })
    if (!d) continue
    if (d.fin > 0) {
      atraso += 1
      conDesvio += 1
    } else if (d.fin < 0) {
      adelanto += 1
      conDesvio += 1
    }
    maxAtraso = Math.max(maxAtraso, d.fin)
    maxAdelanto = Math.min(maxAdelanto, d.fin)
  }
  return { conDesvio, adelanto, atraso, maxAtraso, maxAdelanto }
}

// --- dependencias ---------------------------------------------------------

// Comprueba que un conjunto de cambios de fechas no rompa las dependencias
// (FS/SS/FF/SF) con tareas que NO se mueven. Devuelve la lista de conflictos;
// vacía = movimiento válido. El `lag` se mide en días laborables.
export function conflictosDependencia({ cambios = [], tareas = [], calendario } = {}) {
  const cal = normalizarCalendario(calendario)
  const propuesto = new Map((cambios ?? []).map((c) => [c.id, c]))
  if (propuesto.size === 0) return []
  const ids = new Set(propuesto.keys())
  const porId = new Map((tareas ?? []).map((t) => [t.id, t]))
  const fechas = (id) => {
    const p = propuesto.get(id)
    if (p) return { ini: p.fecha_inicio, fin: p.fecha_fin }
    const t = porId.get(id)
    return t && t.fecha_inicio && t.fecha_fin
      ? { ini: t.fecha_inicio, fin: t.fecha_fin }
      : null
  }
  const conflictos = []

  // Predecesoras de las tareas movidas.
  for (const id of ids) {
    const t = porId.get(id)
    if (!t) continue
    const propio = fechas(id)
    if (!propio) continue
    for (const p of t.predecesoras ?? []) {
      if (!p || ids.has(p.id)) continue
      const pred = fechas(p.id)
      if (!pred) continue
      const tipo = p.tipo ?? 'FS'
      const lag = Number(p.lag) || 0
      let motivo = null
      if (tipo === 'FS') {
        if (propio.ini < sumarDiasLaborables(sumarDiasISO(pred.fin, 1), lag, cal)) {
          motivo = `inicia antes de terminar «${porId.get(p.id)?.nombre ?? p.id}»`
        }
      } else if (tipo === 'SS') {
        if (propio.ini < sumarDiasLaborables(pred.ini, lag, cal)) {
          motivo = `inicia antes que «${porId.get(p.id)?.nombre ?? p.id}»`
        }
      } else if (tipo === 'FF') {
        if (propio.fin < sumarDiasLaborables(pred.fin, lag, cal)) {
          motivo = `termina antes que «${porId.get(p.id)?.nombre ?? p.id}»`
        }
      } else if (propio.fin < sumarDiasLaborables(pred.ini, lag, cal)) {
        motivo = `termina antes de que «${porId.get(p.id)?.nombre ?? p.id}» inicie`
      }
      if (motivo) {
        conflictos.push({ id, tipo, con: p.id, nombre: porId.get(p.id)?.nombre ?? `Tarea ${p.id}`, motivo })
      }
    }
  }

  // Sucesoras (no movidas) que dependen de alguna tarea movida.
  for (const s of tareas ?? []) {
    if (ids.has(s.id)) continue
    const suc = fechas(s.id)
    if (!suc) continue
    for (const p of s.predecesoras ?? []) {
      if (!p || !ids.has(p.id)) continue
      const pred = fechas(p.id)
      if (!pred) continue
      const tipo = p.tipo ?? 'FS'
      const lag = Number(p.lag) || 0
      let motivo = null
      if (tipo === 'FS') {
        if (suc.ini < sumarDiasLaborables(sumarDiasISO(pred.fin, 1), lag, cal)) {
          motivo = `«${s.nombre}» inicia antes de que esta termine`
        }
      } else if (tipo === 'SS') {
        if (suc.ini < sumarDiasLaborables(pred.ini, lag, cal)) {
          motivo = `«${s.nombre}» inicia antes que esta`
        }
      } else if (tipo === 'FF') {
        if (suc.fin < sumarDiasLaborables(pred.fin, lag, cal)) {
          motivo = `«${s.nombre}» termina antes que esta`
        }
      } else if (suc.fin < sumarDiasLaborables(pred.ini, lag, cal)) {
        motivo = `«${s.nombre}» termina antes de que esta inicie`
      }
      if (motivo) {
        conflictos.push({ id: s.id, tipo, con: p.id, nombre: s.nombre, motivo })
      }
    }
  }

  return conflictos
}

// --- histograma de recursos ----------------------------------------------

// Horas por recurso y por semana, con alerta de sobreasignación.
//
// Personal: horas COMPROMETIDAS por sus asignaciones (plan). Equipos: horas
// USADAS según los registros de obra (real). La capacidad de una semana es su
// número de días laborables × `horasDia`. Además, un equipo usado por más de
// un servicio el mismo día queda marcado como "cruce".
export function histogramaRecursosSemanal({
  semanas = [],
  servicio = null,
  asignaciones = [],
  registros = [],
  personal = [],
  equipos = [],
  calendario = null,
  horasDia = 8,
} = {}) {
  const cal = normalizarCalendario(calendario)
  const servicioId = servicio?.id
  const hd = Number(horasDia) || 8
  const capacidad = semanas.map((s) => diasLaborablesRango(s.inicio, s.fin, cal) * hd)

  const filasPersonal = new Map()
  const filasEquipo = new Map()

  const indiceSemana = (fecha) => {
    for (let i = 0; i < semanas.length; i += 1) {
      if (fecha >= semanas[i].inicio && fecha <= semanas[i].fin) return i
    }
    return -1
  }

  // Personal (plan comprometido por las asignaciones).
  for (const a of asignaciones ?? []) {
    if (servicioId != null && a.servicio_id !== servicioId) continue
    if (!a.fecha_inicio) continue
    const persona = personal.find((p) => p.id === a.personal_id)
    const hpd = Number(a.horas_por_dia) || 0
    if (!filasPersonal.has(a.personal_id)) {
      filasPersonal.set(a.personal_id, {
        id: a.personal_id,
        nombre: persona
          ? `${persona.nombre} ${persona.apellido ?? ''}`.trim()
          : `Personal ${a.personal_id}`,
        cargo: persona?.cargo ?? '',
        valores: semanas.map(() => 0),
      })
    }
    const fila = filasPersonal.get(a.personal_id)
    for (let i = 0; i < semanas.length; i += 1) {
      const desde = [semanas[i].inicio, a.fecha_inicio].sort().at(-1)
      const finAsig = a.fecha_fin || servicio?.fecha_fin_estimada || semanas[i].fin
      const hasta = [semanas[i].fin, finAsig].sort()[0]
      const dias = diasLaborablesRango(desde, hasta, cal)
      fila.valores[i] = r2(fila.valores[i] + dias * hpd)
    }
  }

  // Equipos (uso real registrado).
  for (const r of registros ?? []) {
    if (r.tipo_registro !== 'equipo' || !r.fecha) continue
    if (servicioId != null && r.servicio_id !== servicioId) continue
    const i = indiceSemana(r.fecha)
    if (i < 0) continue
    const equipo = equipos.find((e) => e.id === r.referencia_id)
    if (!filasEquipo.has(r.referencia_id)) {
      filasEquipo.set(r.referencia_id, {
        id: r.referencia_id,
        nombre: equipo?.nombre ?? `Equipo ${r.referencia_id}`,
        valores: semanas.map(() => 0),
      })
    }
    const fila = filasEquipo.get(r.referencia_id)
    fila.valores[i] = r2(fila.valores[i] + (Number(r.cantidad_o_horas) || 0))
  }

  // Cruce de equipos: mismo equipo, misma fecha, más de un servicio.
  const porEquipoFecha = new Map()
  for (const r of registros ?? []) {
    if (r.tipo_registro !== 'equipo' || !r.fecha) continue
    const clave = `${r.referencia_id}|${r.fecha}`
    if (!porEquipoFecha.has(clave)) porEquipoFecha.set(clave, new Set())
    porEquipoFecha.get(clave).add(r.servicio_id)
  }
  const equiposCruzados = new Set()
  for (const [clave, servicios] of porEquipoFecha) {
    if (servicios.size > 1) equiposCruzados.add(Number(clave.split('|')[0]))
  }

  const armar = (filas, tipo) =>
    [...filas.values()]
      .map((f) => {
        const total = r2(f.valores.reduce((s, v) => s + v, 0))
        const semanasExcedidas = f.valores
          .map((v, i) => (v > capacidad[i] + 1e-9 ? i : -1))
          .filter((i) => i >= 0)
        const cruce = tipo === 'equipo' && equiposCruzados.has(f.id)
        return { ...f, tipo, total, excede: semanasExcedidas.length > 0, semanasExcedidas, cruce }
      })
      .sort((a, b) => b.total - a.total)

  const listaPersonal = armar(filasPersonal, 'personal')
  const listaEquipos = armar(filasEquipo, 'equipo')

  const alertas = []
  const agregarAlertas = (lista) => {
    for (const f of lista) {
      for (const i of f.semanasExcedidas) {
        alertas.push({
          tipo: f.tipo,
          id: f.id,
          nombre: f.nombre,
          semana: i,
          horas: f.valores[i],
          capacidad: capacidad[i],
        })
      }
    }
  }
  agregarAlertas(listaPersonal)
  agregarAlertas(listaEquipos)
  for (const f of listaEquipos) {
    if (f.cruce) {
      alertas.push({ tipo: 'equipo', id: f.id, nombre: f.nombre, semana: null, horas: null, capacidad: null, cruce: true })
    }
  }

  const maxHoras = Math.max(
    1,
    ...listaPersonal.flatMap((f) => f.valores),
    ...listaEquipos.flatMap((f) => f.valores),
    ...capacidad,
  )

  return {
    semanas,
    capacidad,
    personal: listaPersonal,
    equipos: listaEquipos,
    alertas,
    totalAlertas: alertas.length,
    maxHoras,
  }
}
