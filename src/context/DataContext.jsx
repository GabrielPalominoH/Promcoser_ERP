import { createContext, useEffect, useMemo, useReducer, useState } from 'react'
import { ESTADO_INICIAL } from '../data/mockData'
import {
  cargarEstado as cargarEstadoCentral,
  guardarEstado as persistirEstado,
  siguienteId as siguienteIdCentral,
} from '../data/store'

const DataContext = createContext(null)

// Persistencia centralizada en `src/data/store.js` (único acceso a
// localStorage). Si el guardado falla (cuota/bloqueo), se avisa una vez.

// Re-exportado para la suite de pruebas.
export function siguienteId(items) {
  return siguienteIdCentral(items)
}

// ------------------------------------------------------------
//  Utilidades de colecciones
// ------------------------------------------------------------

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
      // tareas, asignaciones, facturas y cobros.
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
          facturas: (estado.facturas ?? []).filter(
            (factura) => factura.servicio_id !== payload.id,
          ),
          cobros: (estado.cobros ?? []).filter(
            (cobro) => cobro.servicio_id !== payload.id,
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
          // Los costos no se borran: quedan sin tarea.
          registros_servicio: estado.registros_servicio.map((registro) =>
            porBorrar.has(registro.tarea_id)
              ? { ...registro, tarea_id: null }
              : registro,
          ),
        }
      }

      // Al borrar una asignación se van sus registros mensuales automáticos.
      if (payload.coleccion === 'asignaciones') {
        return {
          ...estado,
          asignaciones: restantes,
          registros_servicio: estado.registros_servicio.filter(
            (registro) => registro.asignacion_id !== payload.id,
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
  const [estado, dispatch] = useReducer(dataReducer, null, cargarEstadoCentral)
  const [falloGuardado, setFalloGuardado] = useState(false)

  useEffect(() => {
    if (!persistirEstado(estado)) {
      setFalloGuardado(true)
    }
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

    return { estado, dispatch, falloGuardado, ...acciones }
  }, [estado, falloGuardado])

  return <DataContext.Provider value={valor}>{children}</DataContext.Provider>
}

export { DataContext }