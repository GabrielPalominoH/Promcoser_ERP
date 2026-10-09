import { createContext, useEffect, useMemo, useReducer } from 'react'
import {
  COLECCIONES,
  ESTADO_INICIAL,
  STORAGE_KEY,
  STORAGE_KEY_ANTERIOR,
  migrarEstadoV1,
  migrarPresupuestoATareas,
} from '../data/mockData'

const DataContext = createContext(null)

// ------------------------------------------------------------
//  Persistencia en localStorage (sin backend, sin API)
// ------------------------------------------------------------

function estadoValido(guardado) {
  return (
    guardado &&
    typeof guardado === 'object' &&
    COLECCIONES.some((coleccion) => Array.isArray(guardado[coleccion]))
  )
}

// Combina lo guardado con el estado inicial colección por colección:
// las colecciones nuevas (ej. tareas) toman el valor inicial sin
// descartar el resto de los datos del usuario.
function combinarEstado(guardado) {
  if (!estadoValido(guardado)) return null

  const combinado = { ...ESTADO_INICIAL }
  for (const coleccion of COLECCIONES) {
    if (Array.isArray(guardado[coleccion])) {
      combinado[coleccion] = guardado[coleccion]
    }
  }
  return combinado
}

function cargarEstadoGuardado() {
  if (typeof window === 'undefined') return ESTADO_INICIAL

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      // Migración única del modelo anterior (partidas separadas) al actual
      // (presupuesto en las tareas). Después se guarda ya migrado.
      const combinado = combinarEstado(migrarPresupuestoATareas(JSON.parse(raw)))
      if (combinado) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(combinado))
        return combinado
      }
    }

    // Migración desde el esquema anterior (v1): se conserva lo guardado
    // y se rellenan los campos nuevos con valores por defecto.
    const rawAnterior = window.localStorage.getItem(STORAGE_KEY_ANTERIOR)
    if (rawAnterior) {
      const migrado = migrarEstadoV1(JSON.parse(rawAnterior))
      const combinado = combinarEstado(migrado)
      if (combinado) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(combinado))
        return combinado
      }
    }

    return ESTADO_INICIAL
  } catch {
    return ESTADO_INICIAL
  }
}

function guardarEstado(estado) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(estado))
  } catch {
    // Cuota excedida o almacenamiento bloqueado: el estado sigue en memoria.
  }
}

// ------------------------------------------------------------
//  Utilidades de colecciones
// ------------------------------------------------------------

export function siguienteId(items) {
  const maximo = items.reduce((max, item) => (item.id > max ? item.id : max), 0)
  return maximo + 1
}

function reemplazarEnColeccion(estado, coleccion, fn) {
  return {
    ...estado,
    [coleccion]: fn(estado[coleccion]),
  }
}

// ------------------------------------------------------------
//  Reducer genérico por colección
// ------------------------------------------------------------

// Exportado para poder verificarlo en pruebas.
export function dataReducer(estado, accion) {
  const { type, payload } = accion

  switch (type) {
    case 'AGREGAR_ITEM':
      return reemplazarEnColeccion(estado, payload.coleccion, (items) => [
        ...items,
        payload.item,
      ])

    case 'ACTUALIZAR_ITEM':
      return reemplazarEnColeccion(estado, payload.coleccion, (items) =>
        items.map((item) =>
          item.id === payload.item.id ? { ...item, ...payload.item } : item,
        ),
      )

    case 'ELIMINAR_ITEM': {
      const restantes = estado[payload.coleccion].filter(
        (item) => item.id !== payload.id,
      )

      // Integridad referencial: al borrar un servicio se van sus registros,
      // sus tareas del cronograma y sus asignaciones de personal.
      if (payload.coleccion === 'servicios') {
        return {
          ...estado,
          servicios: restantes,
          registros_servicio: estado.registros_servicio.filter(
            (registro) => registro.servicio_id !== payload.id,
          ),
          tareas: estado.tareas.filter(
            (tarea) => tarea.servicio_id !== payload.id,
          ),
          asignaciones: (estado.asignaciones ?? []).filter(
            (asignacion) => asignacion.servicio_id !== payload.id,
          ),
        }
      }

      // Al borrar una tarea se van sus subtareas en todos los niveles.
      if (payload.coleccion === 'tareas') {
        const porBorrar = new Set([payload.id])
        let cambio = true
        while (cambio) {
          cambio = false
          for (const tarea of estado.tareas) {
            if (
              !porBorrar.has(tarea.id) &&
              tarea.padre_id != null &&
              porBorrar.has(tarea.padre_id)
            ) {
              porBorrar.add(tarea.id)
              cambio = true
            }
          }
        }
        return {
          ...estado,
          tareas: estado.tareas.filter((tarea) => !porBorrar.has(tarea.id)),
          // Los costos no se borran: conservan su partida y quedan sin tarea.
          registros_servicio: estado.registros_servicio.map((registro) =>
            porBorrar.has(registro.tarea_id)
              ? { ...registro, tarea_id: null }
              : registro,
          ),
        }
      }

      return { ...estado, [payload.coleccion]: restantes }
    }

    case 'ALTERNAR_ACTIVO':
      return reemplazarEnColeccion(estado, payload.coleccion, (items) =>
        items.map((item) =>
          item.id === payload.id ? { ...item, activo: !item.activo } : item,
        ),
      )

    case 'REEMPLAZAR_COLECCION':
      return reemplazarEnColeccion(estado, payload.coleccion, () => payload.items)

    case 'RESTABLECER':
      return ESTADO_INICIAL

    default:
      return estado
  }
}

// ------------------------------------------------------------
//  Provider
// ------------------------------------------------------------

export function DataProvider({ children }) {
  const [estado, dispatch] = useReducer(dataReducer, null, cargarEstadoGuardado)

  useEffect(() => {
    guardarEstado(estado)
  }, [estado])

  const valor = useMemo(() => {
    const acciones = {
      agregarItem: (coleccion, item) => {
        const itemCompleto = {
          ...item,
          id: item.id ?? siguienteId(estado[coleccion]),
        }
        dispatch({
          type: 'AGREGAR_ITEM',
          payload: { coleccion, item: itemCompleto },
        })
        return itemCompleto
      },
      actualizarItem: (coleccion, item) =>
        dispatch({ type: 'ACTUALIZAR_ITEM', payload: { coleccion, item } }),
      eliminarItem: (coleccion, id) =>
        dispatch({ type: 'ELIMINAR_ITEM', payload: { coleccion, id } }),
      alternarActivo: (coleccion, id) =>
        dispatch({ type: 'ALTERNAR_ACTIVO', payload: { coleccion, id } }),
      reemplazarColeccion: (coleccion, items) =>
        dispatch({
          type: 'REEMPLAZAR_COLECCION',
          payload: { coleccion, items },
        }),
      restablecer: () => dispatch({ type: 'RESTABLECER' }),
    }

    return { estado, dispatch, ...acciones }
  }, [estado])

  return <DataContext.Provider value={valor}>{children}</DataContext.Provider>
}

export { DataContext }