// Línea base (baseline) y lecturas de avance de un servicio.
//
// La LÍNEA BASE es una copia inmutable del cronograma (fechas, montos,
// metrados) congelada en una fecha. El PV de la Curva S sale de aquí: cambiar
// el cronograma después no reescribe el plan contra el que se controla la
// obra (práctica estándar de PMP/valor ganado).
//
// Las LECTURAS son cortes de avance firmados ("a tal fecha, la obra iba al
// X %"). Cuando existen, el EV histórico sale de ellas en vez de reconstruirse
// con las fechas de las tareas.
//
// Módulo puro: no toca localStorage ni reimplementa fórmulas.

import { diasCalendarioRango, hoyISO, montoTarea } from './calculadora'

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100

function diasEntre(aISO, bISO) {
  if (!aISO || !bISO) return null
  const [ay, am, ad] = aISO.split('-').map(Number)
  const [by, bm, bd] = bISO.split('-').map(Number)
  const a = Date.UTC(ay, am - 1, ad)
  const b = Date.UTC(by, bm - 1, bd)
  return Math.round((b - a) / 86400000)
}

// Foto inmutable de las tareas del servicio (solo lo que define el plan).
export function instantaneaTareas(tareas = [], servicioId = null) {
  return (tareas ?? [])
    .filter((t) => servicioId == null || t.servicio_id === servicioId)
    .map((t) => ({
      id: t.id,
      servicio_id: t.servicio_id,
      padre_id: t.padre_id ?? null,
      nombre: t.nombre,
      fecha_inicio: t.fecha_inicio ?? '',
      fecha_fin: t.fecha_fin ?? '',
      monto: Number(t.monto) || 0,
      metrado: t.metrado ?? null,
      precio_unitario: t.precio_unitario ?? null,
    }))
}

// Siguiente número de versión para la línea base de un servicio.
export function siguienteVersionLineaBase(servicioId, lineasBase = []) {
  const versiones = (lineasBase ?? [])
    .filter((l) => l.servicio_id === servicioId)
    .map((l) => Number(l.version) || 0)
  return versiones.length ? Math.max(...versiones) + 1 : 1
}

// Línea base vigente del servicio (la de mayor versión).
export function lineaBaseVigente(servicioId, lineasBase = []) {
  return (
    (lineasBase ?? [])
      .filter((l) => l.servicio_id === servicioId)
      .sort((a, b) => (Number(b.version) || 0) - (Number(a.version) || 0))[0] ?? null
  )
}

// Presupuesto de una línea base: suma de los montos de nivel raíz.
export function presupuestoLineaBase(lineaBase) {
  const tareas = lineaBase?.tareas ?? []
  return r2(
    tareas
      .filter((t) => t.padre_id == null)
      .reduce((s, t) => s + montoTarea(t, tareas), 0),
  )
}

// Arma el objeto de línea base listo para guardar (aún sin id).
export function armarLineaBase({
  servicio,
  tareas = [],
  lineasBase = [],
  fecha = hoyISO(),
  nota = '',
}) {
  return {
    servicio_id: servicio.id,
    version: siguienteVersionLineaBase(servicio.id, lineasBase),
    fecha,
    nota: nota.trim(),
    presupuesto: Number(servicio.presupuesto_asignado) || 0,
    tareas: instantaneaTareas(tareas, servicio.id),
  }
}

// Arma una lectura de avance (snapshot) lista para guardar (aún sin id).
export function armarLectura({ servicio, tareas = [], fecha = hoyISO(), avance, nota = '' }) {
  const propias = (tareas ?? []).filter((t) => t.servicio_id === servicio.id)
  return {
    servicio_id: servicio.id,
    fecha,
    avance: Math.round(Number(avance) || 0),
    nota: nota.trim(),
    tareas: propias.map((t) => ({ id: t.id, avance: Number(t.avance) || 0 })),
  }
}

// Compara el cronograma vivo contra la línea base, tarea por tarea.
// Devuelve filas con el desvío de fechas (días) y de monto (S/).
export function compararConLineaBase({ tareas = [], lineaBase = null }) {
  const base = lineaBase?.tareas ?? []
  const vivas = tareas ?? []
  const porId = new Map(vivas.map((t) => [t.id, t]))

  const filas = base.map((b) => {
    const vivo = porId.get(b.id)
    return {
      id: b.id,
      nombre: b.nombre,
      plan_inicio: b.fecha_inicio,
      plan_fin: b.fecha_fin,
      plan_monto: b.monto,
      real_inicio: vivo?.fecha_inicio ?? null,
      real_fin: vivo?.fecha_fin ?? null,
      real_monto: vivo ? Number(vivo.monto) || 0 : null,
      real_metrado: vivo?.metrado ?? null,
      real_pu: vivo?.precio_unitario ?? null,
      avance: vivo ? Number(vivo.avance) || 0 : 0,
      existe: Boolean(vivo),
      desvio_inicio: vivo ? diasEntre(b.fecha_inicio, vivo.fecha_inicio) : null,
      desvio_fin: vivo ? diasEntre(b.fecha_fin, vivo.fecha_fin) : null,
      desvio_monto: vivo ? r2((Number(vivo.monto) || 0) - b.monto) : null,
      desvio_metrado:
        vivo && vivo.metrado != null && b.metrado != null
          ? r2((Number(vivo.metrado) || 0) - (Number(b.metrado) || 0))
          : null,
    }
  })

  const idsBase = new Set(base.map((b) => b.id))
  const nuevas = vivas
    .filter((t) => !idsBase.has(t.id))
    .map((t) => ({
      id: t.id,
      nombre: t.nombre,
      real_inicio: t.fecha_inicio ?? null,
      real_fin: t.fecha_fin ?? null,
      real_monto: Number(t.monto) || 0,
      avance: Number(t.avance) || 0,
    }))

  const planMonto = r2(filas.reduce((s, f) => s + f.plan_monto, 0))
  const realMonto = r2(filas.reduce((s, f) => s + (f.real_monto ?? 0), 0))
  const plazoPlan = base.reduce((s, t) => s + Math.max(0, diasCalendarioRango(t.fecha_inicio, t.fecha_fin)), 0)
  const plazoReal = filas.reduce(
    (s, f) =>
      s + (f.real_inicio && f.real_fin ? Math.max(0, diasCalendarioRango(f.real_inicio, f.real_fin)) : 0),
    0,
  )

  return {
    filas,
    nuevas,
    planMonto,
    realMonto,
    desvioMonto: r2(realMonto - planMonto),
    planTareas: base.length,
    realTareas: filas.filter((f) => f.existe).length,
    nuevasTareas: nuevas.length,
    plazoPlan,
    plazoReal,
    desvioPlazo: plazoReal - plazoPlan,
  }
}
