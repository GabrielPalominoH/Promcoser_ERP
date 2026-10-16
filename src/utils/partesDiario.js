// Parte diario de obra (Fase 2; metrado ejecutado desde la Fase B).
//
// Un parte registra una jornada: clima, responsable, personal presente,
// equipos usados, partidas ejecutadas con su METRADO DEL DÍA (o los pasos
// cumplidos, si la partida se mide por hitos), incidencias, observaciones y
// fotos (solo metadata; los archivos viven en IndexedDB).
//
// "Sin duplicar datos": el parte referencia personas y equipos por id (los
// nombres se resuelven al pintar) y el avance de una tarea se DERIVA de la suma
// de los metrados ejecutados de sus partes (`metradoEjecutadoAcumulado`). Así el
// parte es el único punto donde se teclea el progreso diario y `tarea.avance`
// queda sincronizado por `recalcularAvances` (src/utils/avance.js).
//
// Los partes anteriores a la Fase B (avance diario en %) se migran con
// `migrarPartesAMetrado` cuando la tarea tiene metrado contratado; los de
// tareas sin metrado se conservan como registro legado de solo lectura.
//
// Módulo puro: no toca localStorage, IndexedDB ni el estado de React.

import {
  avancePorHitos,
  avancePorMetrado,
  esHojaTarea,
  metradoDeFila,
  metradoEjecutadoAcumulado,
} from './avance'

// Re-exportados: el metrado de los partes ahora vive en `avance.js` (módulo del
// que se deriva `tarea.avance`), pero se mantienen accesibles desde aquí para
// no romper a quien los consumía (`reportes.js`, la suite).
export { metradoDeFila, metradoEjecutadoAcumulado }

const n = (x) => Number(x) || 0
const clamp01a100 = (x) => Math.min(100, Math.max(0, x))
// Dos decimales: el metrado es una cantidad de obra, no dinero.
const dosDecimales = (x) => Math.round((Number(x) || 0) * 100) / 100

// Tolerancia por defecto (en %) sobre el metrado contratado antes de exigir
// una nota que justifique el exceso de metrado ejecutado.
export const TOLERANCIA_METRADO_DEFECTO = 5

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

// Suma de los avances del día registrados para una tarea (sin tope). Vía
// LEGADO (%), conservada para los partes anteriores a la Fase B en tareas sin
// metrado contratado.
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
// Es la vía LEGADO (partes anteriores a la Fase B, en %): solo se usa para
// tareas sin metrado contratado.
export function avanceAcumulado(partes = [], tareaId) {
  return clamp01a100(avanceDiarioPorTarea(partes, tareaId))
}

// ------------------------------------------------------------
//  Metrado ejecutado (Fase B)
// ------------------------------------------------------------
// `metradoDeFila` y `metradoEjecutadoAcumulado` viven en `avance.js` (se
// importan y re-exportan arriba): el avance se deriva de ellos y desde la
// Fase C son la misma fuente de verdad.

// Estado de una fila de metrado: acumulado (otros partes + hoy), saldo por
// ejecutar, % resultante, rendimiento del día y tope con tolerancia. Nunca
// devuelve NaN; sin metrado contratado el % es 0 y no hay tope que exceder.
export function estadoFilaMetrado({
  tarea,
  metradoDia = 0,
  acumuladoOtros = 0,
  tolerancia = TOLERANCIA_METRADO_DEFECTO,
} = {}) {
  const contratado = Number(tarea?.metrado) > 0 ? Number(tarea.metrado) : 0
  const delDia = Number(metradoDia) || 0
  const tol = Number(tolerancia) || 0
  const acumulado = dosDecimales(n(acumuladoOtros) + delDia)
  const tope = dosDecimales(contratado * (1 + tol / 100))
  const excedente = dosDecimales(Math.max(0, acumulado - contratado))
  return {
    tarea_id: tarea?.id ?? null,
    unidad: tarea?.unidad ?? '',
    contratado,
    delDia,
    acumulado,
    saldo: dosDecimales(Math.max(0, contratado - acumulado)),
    excedente,
    porcentaje: avancePorMetrado({ metrado: contratado, ejecutado: acumulado }),
    rendimiento: delDia,
    rendimientoPct: contratado > 0 ? dosDecimales((delDia / contratado) * 100) : 0,
    tolerancia: tol,
    tope,
    excede: contratado > 0 && acumulado > tope,
    excedeContratado: contratado > 0 && acumulado > contratado,
  }
}

// Evalúa las filas de metrado de un parte contra el metrado contratado de su
// tarea, sumando lo ejecutado en los DEMÁS partes (editar un parte pasado
// recalcula su acumulado sin contarse dos veces).
export function evaluarFilasMetrado({
  filas = [],
  tareas = [],
  partes = [],
  parteId = null,
  tolerancia = TOLERANCIA_METRADO_DEFECTO,
} = {}) {
  const otros = (partes ?? []).filter((p) => parteId == null || p.id !== parteId)
  return (filas ?? []).map((fila) => {
    const tarea = (tareas ?? []).find((t) => t.id === fila?.tarea_id) ?? null
    return {
      tarea,
      tipo: 'metrado',
      ...estadoFilaMetrado({
        tarea,
        metradoDia: metradoDeFila(fila) ?? 0,
        acumuladoOtros: metradoEjecutadoAcumulado(otros, fila?.tarea_id),
        tolerancia,
      }),
    }
  })
}

// Avance de una tarea derivado de sus partes, según su modo de medición:
// `metrado` → metrado ejecutado ÷ contratado; `hitos` → pesos de los pasos
// cumplidos; el resto (legado en %) → suma de los avances diarios.
export function avanceDePartes({ tarea, partes = [] } = {}) {
  if (!tarea) return 0
  if (tarea.modo_medicion === 'metrado') {
    return avancePorMetrado({
      metrado: tarea.metrado,
      ejecutado: metradoEjecutadoAcumulado(partes, tarea.id),
    })
  }
  if (tarea.modo_medicion === 'hitos') return avancePorHitos(tarea.pasos)
  return avanceAcumulado(partes, tarea.id)
}

// Partidas hoja que se pueden medir en un parte con el modo indicado.
export function partidasMedibles(tareas = [], modo) {
  return (tareas ?? []).filter(
    (t) => t?.modo_medicion === modo && esHojaTarea(t, tareas),
  )
}

// Marca pasos como cumplidos (idempotente): un paso ya cumplido conserva su
// fecha y su responsable. Devuelve `{ pasos, cambio }` con la MISMA referencia
// cuando no hay nada que marcar.
export function marcarPasosCumplidos(pasos, ids, { fecha = null, por = null } = {}) {
  const lista = Array.isArray(pasos) ? pasos : []
  const objetivo = new Set(ids ?? [])
  let cambio = false
  const salida = lista.map((paso) => {
    if (!objetivo.has(paso?.id) || paso.estado === 'cumplido') return paso
    cambio = true
    return {
      ...paso,
      estado: 'cumplido',
      fecha_cumplimiento: fecha ?? paso.fecha_cumplimiento ?? null,
      cumplido_por: por ?? paso.cumplido_por ?? null,
    }
  })
  return { pasos: cambio ? salida : lista, cambio }
}

// Migración Fase B (idempotente): los `avance_dia` guardados pasan a
// `metrado_dia = % × metrado ÷ 100` cuando la tarea tiene metrado contratado
// (pérdida cero: el % se reproduce exacto). Los de tareas sin metrado se
// conservan tal cual como registro legado de solo lectura.
export function migrarPartesAMetrado(estado) {
  if (!estado || typeof estado !== 'object' || !Array.isArray(estado.partes_diario)) {
    return estado
  }
  const tareas = Array.isArray(estado.tareas) ? estado.tareas : []
  const metradoDeTarea = (tareaId) => {
    const tarea = tareas.find((t) => t.id === tareaId)
    return Number(tarea?.metrado) > 0 ? Number(tarea.metrado) : 0
  }

  let cambio = false
  const partes = estado.partes_diario.map((parte) => {
    if (!Array.isArray(parte?.partidas) || parte.partidas.length === 0) return parte
    let cambioParte = false
    const partidas = parte.partidas.map((fila) => {
      if (!fila || metradoDeFila(fila) != null) return fila // ya migrada
      const avance = Number(fila.avance_dia)
      if (!Number.isFinite(avance)) return fila
      const metrado = metradoDeTarea(fila.tarea_id)
      if (metrado <= 0) return fila // legado: solo lectura
      cambioParte = true
      const { avance_dia, ...resto } = fila
      return { ...resto, metrado_dia: dosDecimales((avance * metrado) / 100) }
    })
    if (!cambioParte) return parte
    cambio = true
    return { ...parte, partidas }
  })

  return cambio ? { ...estado, partes_diario: partes } : estado
}

// Horas de personal / equipos de un parte.
export function horasPersonal(parte = {}) {
  return (parte.personal ?? []).reduce((s, x) => s + n(x.horas), 0)
}

export function horasEquipos(parte = {}) {
  return (parte.equipos ?? []).reduce((s, x) => s + n(x.horas), 0)
}

// Resumen de una jornada. `avanceTotal` es el aporte del día en %: suma el %
// de cada fila de metrado (metrado del día ÷ contratado) y conserva la suma de
// los avances diarios de las filas legado.
export function resumenParte(parte = {}, { tareas = [] } = {}) {
  const partidas = parte.partidas ?? []
  const avanceTotal = dosDecimales(
    partidas.reduce((s, x) => {
      const metrado = metradoDeFila(x)
      if (metrado == null) return s + n(x.avance_dia)
      const tarea = (tareas ?? []).find((t) => t.id === x.tarea_id)
      const contratado = Number(tarea?.metrado) || 0
      if (contratado <= 0) return s
      return s + (metrado / contratado) * 100
    }, 0),
  )
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

// Peso total (bytes) de las fotos de una colección de partes, según su metadata.
export function pesoFotos(partes = []) {
  return (partes ?? []).reduce(
    (s, p) => s + (p.fotos ?? []).reduce((t, f) => t + n(f.tamano), 0),
    0,
  )
}
