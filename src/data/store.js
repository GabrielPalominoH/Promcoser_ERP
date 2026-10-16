// Capa centralizada de persistencia (Etapa 2).
//
// Toda la persistencia funcional usa `localStorage` (sin backend). Este
// módulo es el ÚNICO punto de acceso al almacenamiento: los componentes no
// deben llamar a `localStorage` directamente. Si el navegador lo bloquea o
// no existe (SSR/pruebas), se usa un respaldo en memoria y las funciones
// informan el resultado en vez de fallar en silencio.
//
// Versiones de esquema:
//   1 = esquema original (promcoser_mvp_v1)
//   2 = colecciones actuales sin partidas (promcoser_mvp_v2)
//   3 = + asignaciones, cobros, facturas, pagos, presupuestos, config
//   4 = sin tareos (costo personal directo automático desde asignaciones)
//   5 = reserva (llegó a usarse para asignaciones_equipos, ya retiradas)
//   6 = sin pagos (se quita el módulo; lo guardado se ignora)
//   8 = sin presupuestos (se quita el módulo; lo guardado se ignora)
//   9 = + cargos (catálogo maestro de cargos; el personal se vincula por nombre)
//  10 = + lineas_base, lecturas_avance, valorizaciones, adelantos (control de
//       obra: línea base del PV, lecturas del EV y valorizaciones del cobro)
//  11 = + modificaciones, ampliaciones_plazo (adicionales/deductivos y
//       ampliaciones de plazo; los respaldos v10 se rellenan vacíos)
//  12 = + partes_diario (parte diario de obra: clima, personal, equipos,
//       partidas ejecutadas y fotos; los respaldos v11 se rellenan vacíos)
//  13 = + modo_medicion en cada tarea hoja (cómo se mide su avance: metrado,
//       hitos, tiempo, costo o manual con justificación). Los respaldos v12 y
//       anteriores se normalizan al cargar sin tocar ningún avance guardado.
//  14 = parte diario con METRADO ejecutado (`metrado_dia`) en lugar del avance
//       diario en %; el parte también marca pasos cumplidos (hitos) y guarda
//       quién y cuándo. Los `avance_dia` de tareas con metrado se migran a
//       metrado (pérdida cero); el flag `avance_por_partes` desaparece.
//  15 = `tarea.avance` pasa a ser un CACHÉ DERIVADO de la medición (Fase C):
//       se recalcula por modo con `recalcularAvances` al cargar/restaurar y
//       tras cada cambio. `metrado_previo`/`costo_previo` guardan lo ejecutado
//       antes del sistema para que ningún avance ya registrado se mueva.
import {
  COLECCIONES,
  ESTADO_INICIAL,
  STORAGE_KEY,
  STORAGE_KEY_ANTERIOR,
  migrarEstadoV1,
  migrarPresupuestoATareas,
} from './mockData'
import {
  migrarAvancePrevio,
  normalizarModoMedicion,
  recalcularAvances,
} from '../utils/avance'
import { hoyISO } from '../utils/calculadora'
import { migrarPartesAMetrado } from '../utils/partesDiario'

export const VERSION_ESQUEMA = 15

// Normalización al cargar/importar (todo idempotente): modo de medición de
// cada hoja, migración del parte diario (metrado), fijación del ejecutado
// previo y recálculo final del avance como caché derivado.
function normalizarEstado(estado) {
  const migrado = migrarAvancePrevio(migrarPartesAMetrado(normalizarModoMedicion(estado)))
  return recalcularAvances(migrado, hoyISO())
}

// Estado inicial ya normalizado (mismo contenido de siempre, con el avance
// derivado y el ejecutado previo fijado). Lo usa el proveedor al restablecer.
export function estadoInicial() {
  return normalizarEstado(ESTADO_INICIAL)
}

const memoria = {}
const backendMemoria = {
  get: (clave) => (clave in memoria ? memoria[clave] : null),
  set: (clave, valor) => {
    memoria[clave] = valor
  },
}

function backend() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return {
        get: (clave) => window.localStorage.getItem(clave),
        set: (clave, valor) => window.localStorage.setItem(clave, valor),
      }
    }
  } catch {
    // Almacenamiento bloqueado: se usa memoria.
  }
  return backendMemoria
}

export function siguienteId(items) {
  const maximo = (items ?? []).reduce((max, item) => (item.id > max ? item.id : max), 0)
  return maximo + 1
}

export function estadoValido(guardado) {
  return (
    guardado &&
    typeof guardado === 'object' &&
    COLECCIONES.some((coleccion) => Array.isArray(guardado[coleccion]))
  )
}

// Combina lo guardado con el estado inicial colección por colección: las
// colecciones nuevas toman el valor inicial sin descartar el resto.
export function combinarEstado(guardado) {
  if (!estadoValido(guardado)) return null

  const combinado = { ...ESTADO_INICIAL }
  for (const coleccion of COLECCIONES) {
    if (Array.isArray(guardado[coleccion])) {
      combinado[coleccion] = guardado[coleccion]
    }
  }
  return combinado
}

// Configuración del negocio (colección de un solo documento, id 1).
export function leerConfig(estado) {
  const lista = estado?.config ?? ESTADO_INICIAL.config
  return lista.find((c) => c.id === 1) ?? ESTADO_INICIAL.config[0]
}

// Lee el estado (migra si viene de un esquema anterior y lo re-guardia
// migrado). Nunca destruye lo guardado si es inválido: devuelve el inicial.
export function cargarEstado() {
  try {
    const raw = backend().get(STORAGE_KEY)
    if (raw) {
      const combinado = combinarEstado(migrarPresupuestoATareas(JSON.parse(raw)))
      if (combinado) {
        const normalizado = normalizarEstado(combinado)
        guardarEstado(normalizado)
        return normalizado
      }
    }

    const rawAnterior = backend().get(STORAGE_KEY_ANTERIOR)
    if (rawAnterior) {
      const combinado = combinarEstado(migrarEstadoV1(JSON.parse(rawAnterior)))
      if (combinado) {
        const normalizado = normalizarEstado(combinado)
        guardarEstado(normalizado)
        return normalizado
      }
    }

    return normalizarEstado(ESTADO_INICIAL)
  } catch {
    return normalizarEstado(ESTADO_INICIAL)
  }
}

// Guarda y devuelve true/false (no se informa éxito si falló: cuota,
// bloqueo o JSON inválido).
export function guardarEstado(estado) {
  try {
    backend().set(STORAGE_KEY, JSON.stringify({ ...estado, _v: VERSION_ESQUEMA }))
    return true
  } catch {
    return false
  }
}

// Tamaño aproximado (en bytes) del estado serializado. Sirve para avisar
// cuando el respaldo se acerca a la cuota típica de localStorage (~5 MB) antes
// de que el guardado empiece a fallar. No escribe nada.
export function tamanoEstado(estado) {
  try {
    return JSON.stringify({ ...estado, _v: VERSION_ESQUEMA }).length
  } catch {
    return 0
  }
}

// Valida un objeto como respaldo antes de importarlo. No toca lo guardado.
export function validarRespaldo(datos) {
  const errores = []
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
    return { ok: false, errores: ['El archivo no contiene un objeto JSON válido.'] }
  }
  const version = Number(datos._v)
  if (datos._v != null && Number.isFinite(version) && version > VERSION_ESQUEMA) {
    errores.push(`Respaldo de versión ${datos._v}: esta app lee hasta la ${VERSION_ESQUEMA}.`)
  }
  // Respaldo del esquema actual: debe traer todas las colecciones.
  // Respaldo de un esquema anterior: basta con que traiga alguna colección
  // conocida; las que falten se rellenan con el estado inicial al normalizar
  // (combinarEstado), de modo que un respaldo v8 (sin `cargos`) sigue
  // importándose y recibe el catálogo semilla.
  if (version >= VERSION_ESQUEMA) {
    for (const coleccion of COLECCIONES) {
      if (!Array.isArray(datos[coleccion])) {
        errores.push(`Falta la colección "${coleccion}".`)
      }
    }
  } else if (!COLECCIONES.some((coleccion) => Array.isArray(datos[coleccion]))) {
    errores.push('El archivo no contiene ninguna colección del sistema.')
  }
  return { ok: errores.length === 0, errores }
}

// Normaliza un respaldo validado contra el esquema actual (rellena lo que
// falte con valores iniciales y completa el modo de medición de las tareas).
// Devuelve null si es inválido.
export function normalizarRespaldo(datos) {
  const { ok } = validarRespaldo(datos)
  if (!ok) return null
  return normalizarEstado(combinarEstado(datos))
}

export function serializarRespaldo(estado) {
  return JSON.stringify({ ...estado, _v: VERSION_ESQUEMA }, null, 2)
}

export function nombreRespaldo(prefijo = 'promcoser-respaldo') {
  const ahora = new Date()
  const mes = String(ahora.getMonth() + 1).padStart(2, '0')
  const dia = String(ahora.getDate()).padStart(2, '0')
  return `${prefijo}-${ahora.getFullYear()}-${mes}-${dia}.json`
}
