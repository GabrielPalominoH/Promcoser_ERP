// Parte diario de obra (Fase 2).
//
// Un parte registra una jornada: clima, responsable, personal presente,
// equipos usados, partidas ejecutadas con su avance DEL DÍA, incidencias,
// observaciones y fotos (solo metadata; los archivos viven en IndexedDB).
//
// "Sin duplicar datos": el parte referencia personas y equipos por id (los
// nombres se resuelven al pintar) y el avance de una tarea se DERIVA de la suma
// de los avances diarios de sus partes (`avanceAcumulado`). Así el parte es el
// único punto donde se teclea el progreso diario y `tarea.avance` queda
// sincronizado por `recalcularAvanceTareas`.
//
// Módulo puro: no toca localStorage, IndexedDB ni el estado de React.

const n = (x) => Number(x) || 0
const clamp01a100 = (x) => Math.min(100, Math.max(0, x))

export const CLIMAS = [
  'Soleado',
  'Parcialmente nublado',
  'Nublado',
  'Lluvia ligera',
  'Lluvia intensa',
  'Viento',
  'Neblina',
]

export function mesDeFecha(fecha) {
  return String(fecha ?? '').slice(0, 7)
}

// Días (ISO) de un mes YYYY-MM.
export function diasDelMes(mesISO) {
  const [anio, mes] = String(mesISO ?? '').split('-').map(Number)
  if (!anio || !mes) return []
  const total = new Date(anio, mes, 0).getDate()
  return Array.from(
    { length: total },
    (_, i) => `${mesISO}-${String(i + 1).padStart(2, '0')}`,
  )
}

// Semanas (filas de 7 celdas, `null` para huecos) de un mes, con la semana
// empezando en domingo (coherente con el calendario laboral del sistema).
export function matrizCalendario(mesISO) {
  const dias = diasDelMes(mesISO)
  if (dias.length === 0) return []
  const primerDia = new Date(`${dias[0]}T00:00:00`).getDay()
  const celdas = [...Array(primerDia).fill(null), ...dias]
  while (celdas.length % 7 !== 0) celdas.push(null)
  const semanas = []
  for (let i = 0; i < celdas.length; i += 7) semanas.push(celdas.slice(i, i + 7))
  return semanas
}

export function parteDeFecha(partes = [], servicioId, fecha) {
  return (
    (partes ?? []).find(
      (p) => p.servicio_id === servicioId && p.fecha === fecha,
    ) ?? null
  )
}

export function partesDeServicio(partes = [], servicioId) {
  return (partes ?? []).filter((p) => p.servicio_id === servicioId)
}

export function ordenarPartesDesc(partes = []) {
  return [...(partes ?? [])].sort((a, b) =>
    String(b.fecha ?? '').localeCompare(String(a.fecha ?? '')),
  )
}

export function agruparPartesPorMes(partes = []) {
  const porMes = {}
  for (const p of partes ?? []) {
    const mes = mesDeFecha(p.fecha)
    if (!mes) continue
    if (!porMes[mes]) porMes[mes] = []
    porMes[mes].push(p)
  }
  return porMes
}

// Suma de los avances del día registrados para una tarea (sin tope).
export function avanceDiarioPorTarea(partes = [], tareaId) {
  let total = 0
  for (const p of partes ?? []) {
    for (const x of p.partidas ?? []) {
      if (x.tarea_id === tareaId) total += n(x.avance_dia)
    }
  }
  return total
}

// Avance acumulado de una tarea = suma de sus avances diarios, acotado a 0–100.
export function avanceAcumulado(partes = [], tareaId) {
  return clamp01a100(avanceDiarioPorTarea(partes, tareaId))
}

// Horas de personal / equipos de un parte.
export function horasPersonal(parte = {}) {
  return (parte.personal ?? []).reduce((s, x) => s + n(x.horas), 0)
}

export function horasEquipos(parte = {}) {
  return (parte.equipos ?? []).reduce((s, x) => s + n(x.horas), 0)
}

export function resumenParte(parte = {}) {
  const partidas = parte.partidas ?? []
  const avanceTotal = partidas.reduce((s, x) => s + n(x.avance_dia), 0)
  return {
    personal: (parte.personal ?? []).length,
    equipos: (parte.equipos ?? []).length,
    partidas: partidas.length,
    fotos: (parte.fotos ?? []).length,
    horasPersonal: horasPersonal(parte),
    horasEquipos: horasEquipos(parte),
    avanceTotal,
  }
}

// Resumen de los partes dentro de un rango [desde, hasta] (ambos ISO).
export function resumenPeriodo(partes = [], desde = null, hasta = null) {
  const enRango = (partes ?? []).filter(
    (p) =>
      (!desde || String(p.fecha) >= desde) && (!hasta || String(p.fecha) <= hasta),
  )
  return {
    cantidad: enRango.length,
    horasPersonal: enRango.reduce((s, p) => s + horasPersonal(p), 0),
    horasEquipos: enRango.reduce((s, p) => s + horasEquipos(p), 0),
    partidas: enRango.reduce((s, p) => s + (p.partidas ?? []).length, 0),
    fotos: enRango.reduce((s, p) => s + (p.fotos ?? []).length, 0),
    partes: enRango,
  }
}

// Personal sugerido para un parte: las asignaciones vigentes ese día. El parte
// decide cuáles estuvieron presentes, pero el sugerido evita teclear de cero.
export function personalPresenteSugerido({
  asignaciones = [],
  personal = [],
  servicio,
  fecha,
} = {}) {
  const servicioId = servicio?.id
  return (asignaciones ?? [])
    .filter(
      (a) =>
        a.servicio_id === servicioId &&
        (!a.fecha_inicio || String(a.fecha_inicio) <= fecha) &&
        (!a.fecha_fin || String(a.fecha_fin) >= fecha),
    )
    .map((a) => {
      const persona = (personal ?? []).find((p) => p.id === a.personal_id)
      return {
        personal_id: a.personal_id,
        nombre: persona ? `${persona.nombre} ${persona.apellido ?? ''}`.trim() : `Personal ${a.personal_id}`,
        cargo: persona?.cargo ?? '',
        horas: n(a.horas_por_dia) || 8,
        tarea_id: a.tarea_id ?? null,
      }
    })
}

// Recalcula `tarea.avance` desde los partes diarios. Solo toca tareas
// "gobernadas por partes": las que aparecen en algún parte o las que ya traen
// `avance_por_partes: true` (aunque sus partes se hayan borrado, vuelven a 0).
// Devuelve la lista de cambios a aplicar con `actualizarItem('tareas', ...)`.
export function recalcularAvanceTareas({ partes = [], tareas = [], servicioId } = {}) {
  const delServicio = (partes ?? []).filter(
    (p) => servicioId == null || p.servicio_id === servicioId,
  )
  const referenciadas = new Set()
  for (const p of delServicio) {
    for (const x of p.partidas ?? []) {
      if (x.tarea_id != null) referenciadas.add(x.tarea_id)
    }
  }

  const cambios = []
  for (const t of tareas ?? []) {
    if (servicioId != null && t.servicio_id !== servicioId) continue
    const gobernada = referenciadas.has(t.id) || t.avance_por_partes === true
    if (!gobernada) continue

    const nuevo = avanceAcumulado(delServicio, t.id)
    if (n(t.avance) !== nuevo || t.avance_por_partes !== true) {
      cambios.push({ id: t.id, avance: nuevo, avance_por_partes: true })
    }
  }
  return cambios
}

// Peso total (bytes) de las fotos de una colección de partes, según su metadata.
export function pesoFotos(partes = []) {
  return (partes ?? []).reduce(
    (s, p) => s + (p.fotos ?? []).reduce((t, f) => t + n(f.tamano), 0),
    0,
  )
}
