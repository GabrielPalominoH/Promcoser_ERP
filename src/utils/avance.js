// Modo de medición del avance de cada tarea HOJA (Fase A) y recálculo del
// avance de todo el cronograma como CACHÉ derivado (Fase C).
//
// El avance de una partida no debe teclearse: se deriva de un dato real que
// depende de cómo se mida esa partida. Cada hoja declara `modo_medicion` y
// este módulo (puro) sabe resolver cada modo:
//
//   metrado  (metrado previo + metrado de los partes) ÷ metrado contratado × 100
//   hitos    suma de los pesos de los pasos cumplidos (los pesos suman 100)
//   tiempo   días laborables transcurridos ÷ duración × 100, con el
//            calendario de obra y acotado a la fecha de corte ("hoy")
//   costo    (costo previo + costo ejecutado) ÷ presupuesto de la partida × 100
//   manual   excepción: el avance se fija a mano y exige una nota de
//            justificación; se marca en el Gantt y en Partidas
//
// Solo aplica a HOJAS: los padres siguen derivándose de sus hijas con
// `avanceEfectivo` (src/utils/calculadora.js). `recalcularAvances` es la ÚNICA
// fuente de verdad de `tarea.avance`: derive cada hoja por su modo y cada padre
// de sus hijas, y la app la invoca al cargar/restaurar y tras cada cambio de
// estado (el reducer central). `metrado_previo`/`costo_previo` guardan lo ya
// ejecutado ANTES de usar el sistema, de modo que conectar la medición no
// mueve ningún avance ya registrado (migración `migrarAvancePrevio`).

import { calendarioDe, diasLaborablesRango } from './calendario'
import { avanceEfectivo, costoPorTarea, hoyISO, montoTarea } from './calculadora'

// Orden fijo de UI y catálogo de modos válidos.
export const MODOS_MEDICION = ['metrado', 'hitos', 'tiempo', 'costo', 'manual']

export const ETIQUETAS_MODO = {
  metrado: 'Metrado ejecutado',
  hitos: 'Hitos (pasos con peso)',
  tiempo: 'Tiempo (días laborables)',
  costo: 'Costo ejecutado',
  manual: 'Manual (con justificación)',
}

// Etiqueta corta para la columna de Partidas y las insignias.
export const ETIQUETAS_CORTAS_MODO = {
  metrado: 'Metrado',
  hitos: 'Hitos',
  tiempo: 'Tiempo',
  costo: 'Costo',
  manual: 'Manual',
}

// De dónde debe salir el avance según el modo: se muestra junto al campo del
// modal de tarea y en Partidas, para que nunca se confunda un dato tecleado
// con uno derivado.
export const ORIGEN_AVANCE = {
  metrado: 'Calculado desde partes diarios',
  hitos: 'Calculado por hitos',
  tiempo: 'Calculado por calendario (a hoy)',
  costo: 'Calculado desde costos ejecutados',
  manual: 'Fijado a mano',
}

export const OPCIONES_MODO = MODOS_MEDICION.map((valor) => ({
  valor,
  etiqueta: ETIQUETAS_MODO[valor],
}))

// Nota que deja la migración en las tareas que caen en `manual` por la regla
// inicial: es verdadera y evita bloquear la edición de esas tareas.
export const NOTA_MIGRACION_MANUAL = 'Avance capturado a mano antes de la medición por modos.'

export function esModoMedicion(valor) {
  return MODOS_MEDICION.includes(valor)
}

// Recorta a 0–100 con dos decimales. Sin datos (null/NaN) devuelve 0: nunca
// un porcentaje inventado ni un NaN que contagiara los cálculos.
export function acotarAvance(valor) {
  const numero = Number(valor)
  if (!Number.isFinite(numero)) return 0
  return Math.min(100, Math.max(0, Math.round(numero * 100) / 100))
}

// ¿Es hoja (sin hijas directas)? Espejo de `tieneHijas` de calculadora.js,
// definido aquí para no crear una dependencia entre módulos.
export function esHojaTarea(tarea, tareas) {
  return !(tareas ?? []).some((t) => t.padre_id === tarea?.id)
}

// ------------------------------------------------------------
//  Resolución por modo (pura; conectada como fuente única en la Fase C)
// ------------------------------------------------------------

// 0 si no hay metrado contratado (sin base no hay %).
export function avancePorMetrado({ metrado, ejecutado } = {}) {
  const base = Number(metrado)
  if (!Number.isFinite(base) || base <= 0) return 0
  return acotarAvance(((Number(ejecutado) || 0) / base) * 100)
}

// Suma literal de los pesos cumplidos (los pesos suman 100), acotada 0–100.
export function avancePorHitos(pasos) {
  const lista = Array.isArray(pasos) ? pasos : []
  const cumplidos = lista.reduce(
    (total, paso) => (paso?.estado === 'cumplido' ? total + (Number(paso?.peso) || 0) : total),
    0,
  )
  return acotarAvance(cumplidos)
}

// Duración en días laborables del calendario de obra; "hoy" es la fecha de
// corte. Aún no iniciada = 0; terminada o pasada = 100.
export function avancePorTiempo({ fecha_inicio, fecha_fin, hoy, calendario } = {}) {
  if (!fecha_inicio || !fecha_fin || fecha_fin < fecha_inicio) return 0
  const duracion = diasLaborablesRango(fecha_inicio, fecha_fin, calendario)
  if (duracion <= 0) return 0
  if (!hoy || hoy < fecha_inicio) return 0
  const corte = hoy < fecha_fin ? hoy : fecha_fin
  const transcurridos = diasLaborablesRango(fecha_inicio, corte, calendario)
  return acotarAvance((transcurridos / duracion) * 100)
}

// 0 si el presupuesto de la partida es 0 o no está cargado.
export function avancePorCosto({ presupuesto, costo } = {}) {
  const base = Number(presupuesto)
  if (!Number.isFinite(base) || base <= 0) return 0
  return acotarAvance(((Number(costo) || 0) / base) * 100)
}

// Modo `manual`: se conserva tal cual lo tecleó el usuario (recortado 0–100).
export function avanceManual(tarea) {
  return acotarAvance(Number(tarea?.avance) || 0)
}

// ------------------------------------------------------------
//  Metrado ejecutado en los partes (Fase B)
// ------------------------------------------------------------

const n = (x) => Number(x) || 0
// Dos decimales: el metrado es una cantidad de obra, no dinero.
const dosDecimales = (x) => Math.round((Number(x) || 0) * 100) / 100

// Metrado del día de una fila (null = la fila no es de metrado: legado o hito).
export function metradoDeFila(fila) {
  if (fila?.metrado_dia == null || fila.metrado_dia === '') return null
  const valor = Number(fila.metrado_dia)
  return Number.isFinite(valor) ? valor : null
}

// Suma del metrado ejecutado de una tarea en los partes dados (sin tope).
export function metradoEjecutadoAcumulado(partes = [], tareaId) {
  let total = 0
  for (const p of partes ?? []) {
    for (const x of p.partidas ?? []) {
      if (x.tarea_id !== tareaId) continue
      const metrado = metradoDeFila(x)
      if (metrado != null) total += metrado
    }
  }
  return dosDecimales(total)
}

// ¿Algún parte referencia esta tarea? Sirve para saber si corresponde fijar el
// ejecutado previo (una tarea que ya se mide por partes no lo necesita).
export function tienePartesDe(partes = [], tareaId) {
  return (partes ?? []).some((p) =>
    (p?.partidas ?? []).some((x) => x?.tarea_id === tareaId),
  )
}

// ------------------------------------------------------------
//  Resolución de `tarea.avance` por modo (fuente única, Fase C)
// ------------------------------------------------------------

// Avance de una tarea HOJA según su modo, a partir del contexto disponible:
//   { partes, registros, tareas, hoy, calendario }
// Nunca lanza: sin datos devuelve un número (0..100) y no un NaN.
export function avanceDeTarea(tarea, contexto = {}) {
  if (!tarea) return 0
  const partes = contexto.partes ?? []
  const modo = esModoMedicion(tarea.modo_medicion) ? tarea.modo_medicion : 'manual'
  switch (modo) {
    case 'metrado': {
      const ejecutado = dosDecimales(
        n(tarea.metrado_previo) + metradoEjecutadoAcumulado(partes, tarea.id),
      )
      return avancePorMetrado({ metrado: tarea.metrado, ejecutado })
    }
    case 'hitos':
      return avancePorHitos(tarea.pasos)
    case 'tiempo':
      return avancePorTiempo({
        fecha_inicio: tarea.fecha_inicio,
        fecha_fin: tarea.fecha_fin,
        hoy: contexto.hoy,
        calendario: contexto.calendario,
      })
    case 'costo': {
      const costo = dosDecimales(
        n(tarea.costo_previo) +
          costoPorTarea(contexto.registros ?? [], tarea.servicio_id, tarea.id),
      )
      return avancePorCosto({ presupuesto: montoTarea(tarea, contexto.tareas), costo })
    }
    case 'manual':
    default:
      return avanceManual(tarea)
  }
}

// Recalcula `tarea.avance` de TODAS las tareas (caché derivado): cada hoja por
// su modo y cada padre ponderando a sus hijas como `avanceEfectivo`. Devuelve
// la MISMA referencia del estado cuando no hay nada que cambiar (idempotente),
// de modo que no provoca repintados ni rompe la igualdad referencial.
export function recalcularAvances(estado, hoy = hoyISO()) {
  if (!estado || typeof estado !== 'object' || !Array.isArray(estado.tareas)) {
    return estado
  }
  const tareas = estado.tareas
  const partes = estado.partes_diario ?? []
  const registros = estado.registros_servicio ?? []
  const calendarioPorServicio = new Map(
    (estado.servicios ?? []).map((s) => [s.id, calendarioDe(s)]),
  )

  let cambio = false
  const conHojas = tareas.map((t) => {
    if (!esHojaTarea(t, tareas)) return t
    const nuevo = avanceDeTarea(t, {
      partes,
      registros,
      tareas,
      hoy,
      calendario: calendarioPorServicio.get(t.servicio_id),
    })
    if (typeof t.avance === 'number' && t.avance === nuevo) return t
    cambio = true
    return { ...t, avance: nuevo }
  })
  const finales = conHojas.map((t) => {
    if (esHojaTarea(t, tareas)) return t
    const nuevo = acotarAvance(avanceEfectivo(t, conHojas))
    if (typeof t.avance === 'number' && t.avance === nuevo) return t
    cambio = true
    return { ...t, avance: nuevo }
  })

  return cambio ? { ...estado, tareas: finales } : estado
}

// ------------------------------------------------------------
//  Asignación inicial y migración
// ------------------------------------------------------------

// Regla de asignación inicial para tareas existentes:
//   con metrado → metrado; hito sin duración → hitos; sin metrado y con
//   costos vinculados → costo; el resto → manual (conservando su avance).
// Un modo ya elegido nunca se pisa.
export function modoMedicionInicial(tarea, { registros = [] } = {}) {
  if (esModoMedicion(tarea?.modo_medicion)) return tarea.modo_medicion
  if (Number(tarea?.metrado) > 0) return 'metrado'
  if (tarea?.hito === true) return 'hitos'
  const conCostos = (registros ?? []).some(
    (registro) => registro.servicio_id === tarea?.servicio_id && registro.tarea_id === tarea?.id,
  )
  if (conCostos) return 'costo'
  return 'manual'
}

// Pasos que reproducen exactamente un avance ya registrado: al migrar una
// tarea a modo `hitos` nunca se pierde el avance que tenía. Devuelve la lista
// mínima (1 o 2 pasos) cuyos pesos suman 100.
export function pasosQueReproducenAvance(avance) {
  const porcentaje = acotarAvance(avance)
  if (porcentaje <= 0) {
    return [
      { id: 1, nombre: 'Hito por cumplir', peso: 100, fecha_cumplimiento: null, estado: 'pendiente' },
    ]
  }
  if (porcentaje >= 100) {
    return [
      { id: 1, nombre: 'Hito cumplido', peso: 100, fecha_cumplimiento: null, estado: 'cumplido' },
    ]
  }
  return [
    { id: 1, nombre: 'Avance previo', peso: porcentaje, fecha_cumplimiento: null, estado: 'cumplido' },
    {
      id: 2,
      nombre: 'Hito por cumplir',
      peso: acotarAvance(100 - porcentaje),
      fecha_cumplimiento: null,
      estado: 'pendiente',
    },
  ]
}

// Normaliza una hoja: le asigna su modo si aún no lo trae, le completa los
// pasos (si quedó en `hitos`) o la nota de justificación (si quedó en
// `manual`). Devuelve la MISMA referencia si no falta nada (idempotente).
function normalizarHoja(tarea, tareas, registros) {
  const conFlag = tarea?.avance_por_partes === true
  const esHoja = esHojaTarea(tarea, tareas)
  if (!conFlag && !esHoja) return tarea // los padres no miden: derivan

  // El flag `avance_por_partes` (deprecado en la Fase B) desaparece del modelo:
  // una tarea que lo traía queda en `metrado` si tiene metrado contratado y en
  // `manual` (con nota) si no. Los padres solo sueltan el flag.
  let base = tarea
  if (conFlag) {
    const { avance_por_partes, ...resto } = tarea
    base = esHoja
      ? { ...resto, modo_medicion: Number(resto.metrado) > 0 ? 'metrado' : 'manual' }
      : resto
  }
  if (!esHoja) return base

  const modo = modoMedicionInicial(base, { registros })
  const sinPasos = modo === 'hitos' && !(Array.isArray(base.pasos) && base.pasos.length > 0)
  const sinNota = modo === 'manual' && typeof base.nota_justificacion !== 'string'
  if (base === tarea && modo === base.modo_medicion && !sinPasos && !sinNota) return tarea

  const normalizada = { ...base, modo_medicion: modo }
  if (sinPasos) normalizada.pasos = pasosQueReproducenAvance(base.avance)
  if (sinNota) normalizada.nota_justificacion = NOTA_MIGRACION_MANUAL
  return normalizada
}

// Migración/normalización (idempotente): agrega `modo_medicion` a las hojas
// que aún no lo traen SIN tocar `tarea.avance`, de modo que ningún avance ya
// registrado ni ninguna cifra del panel se mueve por cargar datos viejos.
export function normalizarModoMedicion(estado) {
  if (!estado || typeof estado !== 'object' || !Array.isArray(estado.tareas)) return estado

  const registros = Array.isArray(estado.registros_servicio) ? estado.registros_servicio : []
  const tareas = estado.tareas.map((tarea) => normalizarHoja(tarea, estado.tareas, registros))
  const sinCambios = tareas.every((tarea, i) => tarea === estado.tareas[i])
  if (sinCambios) return estado

  return { ...estado, tareas }
}

// Migración de la Fase C (idempotente): fija cuánto se había ejecutado ANTES de
// que la tarea se midiera por su modo, para que conectar la medición automática
// no mueva ningún avance ya registrado.
//
//   metrado  una hoja con metrado contratado y SIN partes: el avance guardado
//            se traduce a metrado ejecutado (`avance × metrado ÷ 100`). Una
//            hoja que ya tiene partes parte de 0 (su avance ya sale de ellas).
//   costo    una hoja medida por costo: el avance guardado se traduce a un
//            costo ejecutado de referencia y se le resta lo ya registrado, de
//            modo que el cociente (previo + registros) ÷ presupuesto devuelva
//            el avance que traía.
//   resto    no se toca (tiempo/hitos/manual ya son reproducibles).
//
// Solo escribe el campo cuando falta (`== null`); devuelve la MISMA referencia
// si no hay nada que fijar, tal como exige la suite de migraciones.
export function migrarAvancePrevio(estado) {
  if (!estado || typeof estado !== 'object' || !Array.isArray(estado.tareas)) return estado

  const partes = Array.isArray(estado.partes_diario) ? estado.partes_diario : []
  const registros = Array.isArray(estado.registros_servicio) ? estado.registros_servicio : []
  const tareas = estado.tareas

  let cambio = false
  const salida = tareas.map((t) => {
    if (!esHojaTarea(t, tareas)) return t

    if (t.modo_medicion === 'metrado' && t.metrado_previo == null && Number(t.metrado) > 0) {
      if (tienePartesDe(partes, t.id)) return t
      cambio = true
      return { ...t, metrado_previo: dosDecimales((n(t.avance) * Number(t.metrado)) / 100) }
    }

    if (t.modo_medicion === 'costo' && t.costo_previo == null) {
      const base = montoTarea(t, tareas)
      if (base <= 0) return t
      const ejecutado = costoPorTarea(registros, t.servicio_id, t.id)
      const previo = Math.max(0, dosDecimales((n(t.avance) * base) / 100 - ejecutado))
      cambio = true
      return { ...t, costo_previo: previo }
    }

    return t
  })

  return cambio ? { ...estado, tareas: salida } : estado
}
