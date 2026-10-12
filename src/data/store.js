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
import {
  COLECCIONES,
  ESTADO_INICIAL,
  STORAGE_KEY,
  STORAGE_KEY_ANTERIOR,
  migrarEstadoV1,
  migrarPresupuestoATareas,
} from './mockData'

export const VERSION_ESQUEMA = 7

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
        guardarEstado(combinado)
        return combinado
      }
    }

    const rawAnterior = backend().get(STORAGE_KEY_ANTERIOR)
    if (rawAnterior) {
      const combinado = combinarEstado(migrarEstadoV1(JSON.parse(rawAnterior)))
      if (combinado) {
        guardarEstado(combinado)
        return combinado
      }
    }

    return ESTADO_INICIAL
  } catch {
    return ESTADO_INICIAL
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

// Valida un objeto como respaldo antes de importarlo. No toca lo guardado.
export function validarRespaldo(datos) {
  const errores = []
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
    return { ok: false, errores: ['El archivo no contiene un objeto JSON válido.'] }
  }
  if (datos._v != null && Number(datos._v) > VERSION_ESQUEMA) {
    errores.push(`Respaldo de versión ${datos._v}: esta app lee hasta la ${VERSION_ESQUEMA}.`)
  }
  for (const coleccion of COLECCIONES) {
    if (!Array.isArray(datos[coleccion])) {
      errores.push(`Falta la colección "${coleccion}".`)
    }
  }
  return { ok: errores.length === 0, errores }
}

// Normaliza un respaldo validado contra el esquema actual (rellena lo que
// falte con valores iniciales). Devuelve null si es inválido.
export function normalizarRespaldo(datos) {
  const { ok } = validarRespaldo(datos)
  if (!ok) return null
  return combinarEstado(datos)
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
