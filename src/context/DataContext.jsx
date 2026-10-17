import { createContext, useEffect, useMemo, useReducer, useState } from 'react'
import { ESTADO_INICIAL } from '../data/mockData'
import {
  cargarEstado as cargarEstadoCentral,
  estadoInicial as estadoInicialCentral,
  guardarEstado as persistirEstado,
  siguienteId as siguienteIdCentral,
} from '../data/store'
import { recalcularAvances } from '../utils/avance'
import { normalizarEstadoAlertas } from '../utils/alertasCentro'
import { useAuth } from './useAuth'

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
          lineas_base: (estado.lineas_base ?? []).filter(
            (linea) => linea.servicio_id !== payload.id,
          ),
          lecturas_avance: (estado.lecturas_avance ?? []).filter(
            (lectura) => lectura.servicio_id !== payload.id,
          ),
          valorizaciones: (estado.valorizaciones ?? []).filter(
            (valorizacion) => valorizacion.servicio_id !== payload.id,
          ),
          adelantos: (estado.adelantos ?? []).filter(
            (adelanto) => adelanto.servicio_id !== payload.id,
          ),
          modificaciones: (estado.modificaciones ?? []).filter(
            (modificacion) => modificacion.servicio_id !== payload.id,
          ),
          ampliaciones_plazo: (estado.ampliaciones_plazo ?? []).filter(
            (ampliacion) => ampliacion.servicio_id !== payload.id,
          ),
          partes_diario: (estado.partes_diario ?? []).filter(
            (parte) => parte.servicio_id !== payload.id,
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
          tareas: estado.tareas
            .filter((tarea) => !porBorrar.has(tarea.id))
            // Limpia referencias a la tarea borrada en las predecesoras
            // (dependencias) de las tareas que quedan.
            .map((tarea) =>
              Array.isArray(tarea.predecesoras) &&
              tarea.predecesoras.some((p) => porBorrar.has(p?.id))
                ? {
                    ...tarea,
                    predecesoras: tarea.predecesoras.filter(
                      (p) => !porBorrar.has(p?.id),
                    ),
                  }
                : tarea,
            ),
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
      // `activo` ausente cuenta como activo, así que el primer clic desactiva
      // (evita que una ficha antigua sin el campo solo se "reactive").
      return reemplazarEnColeccion(estado, payload.coleccion, (items) =>
        items.map((item) =>
          item.id === payload.id ? { ...item, activo: item.activo === false } : item,
        ),
      )

    case 'REEMPLAZAR_COLECCION':
      return reemplazarEnColeccion(estado, payload.coleccion, () => payload.items)

    case 'REEMPLAZAR_ALERTAS_ESTADO':
      // Estado mínimo del centro de alertas (pospuestas/descartadas). No es
      // una colección: se reemplaza entero y normalizado.
      return { ...estado, alertasEstado: normalizarEstadoAlertas(payload.alertasEstado) }

    case 'RESTABLECER':
      return ESTADO_INICIAL

    default:
      return estado
  }
}

// Envuelve al reducer genérico: tras CADA cambio recalcula `tarea.avance` como
// caché derivado de la medición (Fase C), de modo que no quede ningún camino
// alternativo que escriba el avance a mano. Al restablecer vuelve al estado
// inicial YA normalizado (con el ejecutado previo y el avance recalculados).
// Devuelve la MISMA referencia cuando nada cambia (idempotente).
export function reducerConAvance(estado, accion) {
  if (accion?.type === 'RESTABLECER') return estadoInicialCentral()
  const siguiente = dataReducer(estado, accion)
  if (siguiente === estado) return estado
  return recalcularAvances(siguiente)
}

// ------------------------------------------------------------
//  Provider
// ------------------------------------------------------------

export function DataProvider({ children }) {
  const [estado, dispatch] = useReducer(reducerConAvance, null, cargarEstadoCentral)
  const [falloGuardado, setFalloGuardado] = useState(false)
  const auth = useAuth()

  useEffect(() => {
    if (!persistirEstado(estado)) {
      setFalloGuardado(true)
    }
  }, [estado])

  const valor = useMemo(() => {
    // Permisos por rol (ver `src/utils/permisos.js`). Los registros mensuales
    // automáticos del personal (con `asignacion_id`) son derivados del sistema,
    // no ediciones del usuario: se permiten siempre para no romper el devengado.
    const permitir = (coleccion, accion, item) => {
      if (auth.puedeEscribir(coleccion, accion)) return true
      if (coleccion === 'registros_servicio' && item?.asignacion_id != null) return true
      auth.avisarDenegado('Tu rol no permite modificar esta información.')
      return false
    }
    const existente = (coleccion, id) => (estado[coleccion] ?? []).find((x) => x.id === id)
    const acciones = {
      agregarItem: (coleccion, item) => {
        const itemCompleto = {
          ...item,
          id: item.id ?? siguienteId(estado[coleccion]),
        }
        if (permitir(coleccion, 'agregar', itemCompleto)) {
          dispatch({
            type: 'AGREGAR_ITEM',
            payload: { coleccion, item: itemCompleto },
          })
        }
        return itemCompleto
      },
      actualizarItem: (coleccion, item) => {
        if (permitir(coleccion, 'actualizar', existente(coleccion, item.id) ?? item)) {
          dispatch({ type: 'ACTUALIZAR_ITEM', payload: { coleccion, item } })
        }
      },
      eliminarItem: (coleccion, id) => {
        if (permitir(coleccion, 'eliminar', existente(coleccion, id))) {
          dispatch({ type: 'ELIMINAR_ITEM', payload: { coleccion, id } })
        }
      },
      alternarActivo: (coleccion, id) => {
        if (permitir(coleccion, 'actualizar', existente(coleccion, id))) {
          dispatch({ type: 'ALTERNAR_ACTIVO', payload: { coleccion, id } })
        }
      },
      reemplazarColeccion: (coleccion, items) => {
        if (permitir(coleccion, 'reemplazar')) {
          dispatch({
            type: 'REEMPLAZAR_COLECCION',
            payload: { coleccion, items },
          })
        }
      },
      actualizarAlertasEstado: (alertasEstado) =>
        dispatch({
          type: 'REEMPLAZAR_ALERTAS_ESTADO',
          payload: { alertasEstado },
        }),
      restablecer: () => {
        if (permitir('*', 'restablecer')) dispatch({ type: 'RESTABLECER' })
      },
    }

    return { estado, dispatch, falloGuardado, ...acciones }
  }, [estado, falloGuardado, auth])

  return <DataContext.Provider value={valor}>{children}</DataContext.Provider>
}

export { DataContext }