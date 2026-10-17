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
//  16 = + `valorizado_previo` en cada hoja con metrado (Fase D): lo ya cobrado
//       antes del sistema, por defecto igual a `metrado_previo`. La primera
//       valorización parte de lo cobrado y solo cobra la diferencia.
//  17 = + `valorizacion_id` opcional en cobros y facturas (vínculo explícito
//       valorización→cobro) y `dias_alerta_valorizacion_sin_cobro` por obra.
//       No cambia ningún importe: solo se rellena con `null` lo que falta.
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
  migrarValorizadoPrevio,
  normalizarModoMedicion,
  recalcularAvances,
} from '../utils/avance'
import { hoyISO } from '../utils/calculadora'
import { migrarPartesAMetrado } from '../utils/partesDiario'
import { migrarVinculoValorizacion } from '../utils/valorizaciones'
import { normalizarEstadoAlertas } from '../utils/alertasCentro'

export const VERSION_ESQUEMA = 17

// Normalización al cargar/importar (todo idempotente): modo de medición de
// cada hoja, migración del parte diario (metrado), fijación del ejecutado
// previo y de lo ya cobrado, vínculo valorización→cobro, y recálculo final del
// avance como caché derivado. `alertasEstado` no es una colección: es el estado
// mínimo del centro de alertas (pospuestas y descartadas) y se normaliza aparte.
function normalizarEstado(estado) {
  const migrado = migrarVinculoValorizacion(
    migrarValorizadoPrevio(migrarAvancePrevio(migrarPartesAMetrado(normalizarModoMedicion(estado)))),
  )
  const conAlertas = { ...migrado, alertasEstado: normalizarEstadoAlertas(migrado.alertasEstado) }
  return recalcularAvances(conAlertas, hoyISO())
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
// colecciones nuevas toman el valor inicial sin descartar el resto. El estado
// del centro de alertas (no es colección) se conserva si viene guardado.
export function combinarEstado(guardado) {
  if (!estadoValido(guardado)) return null

  const combinado = { ...ESTADO_INICIAL }
  for (const coleccion of COLECCIONES) {
    if (Array.isArray(guardado[coleccion])) {
      combinado[coleccion] = guardado[coleccion]
    }
  }
  combinado.alertasEstado = normalizarEstadoAlertas(guardado.alertasEstado)
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

// ------------------------------------------------------------
//  Primer uso y respaldos (uso real, sin backend)
// ------------------------------------------------------------
// Preferencias de operación guardadas en este navegador. No son datos de
// negocio: no viajan en el respaldo.
const CLAVE_INICIALIZADO = 'promcoser_inicializado'
const CLAVE_ULTIMO_RESPALDO = 'promcoser_ultimo_respaldo'
export const DIAS_AVISO_RESPALDO = 7

function leerPreferencia(clave) {
  try {
    return backend().get(clave)
  } catch {
    return null
  }
}

// ¿Es la primera vez en este navegador? Se mide UNA vez al cargar el módulo,
// antes de que el proveedor de datos persista nada (la pantalla de acceso se
// muestra antes que el Layout y, si se midiera después, ya habría datos
// guardados). En SSR/pruebas siempre es falso.
const PRIMER_USO_AL_CARGAR =
  typeof window !== 'undefined' &&
  !leerPreferencia(CLAVE_INICIALIZADO) &&
  !leerPreferencia(STORAGE_KEY) &&
  !leerPreferencia(STORAGE_KEY_ANTERIOR)

export function esPrimerUso() {
  return PRIMER_USO_AL_CARGAR && !leerPreferencia(CLAVE_INICIALIZADO)
}

export function marcarInicializado() {
  try {
    backend().set(CLAVE_INICIALIZADO, '1')
  } catch {
    // Sin almacenamiento: el aviso de bienvenida solo se omite en esta sesión.
  }
}

// Registra que se descargó un respaldo (fecha local ISO yyyy-mm-dd).
export function registrarRespaldo(hoy = hoyISO()) {
  try {
    backend().set(CLAVE_ULTIMO_RESPALDO, hoy)
  } catch {
    // Solo se pierde el recordatorio.
  }
}

// Días desde el último respaldo descargado; null si nunca se descargó uno.
export function diasDesdeRespaldo(hoy = hoyISO()) {
  const ultimo = leerPreferencia(CLAVE_ULTIMO_RESPALDO)
  if (!ultimo) return null
  const dias = Math.round((new Date(`${hoy}T00:00:00`) - new Date(`${ultimo}T00:00:00`)) / 86400000)
  return Number.isFinite(dias) ? Math.max(0, dias) : null
}

// ¿Hay información de negocio que valga la pena respaldar?
export function hayDatosParaRespaldar(estado) {
  return ['servicios', 'personal', 'equipos', 'costos_oficina'].some(
    (coleccion) => (estado?.[coleccion] ?? []).length > 0,
  )
}
