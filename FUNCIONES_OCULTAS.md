# Funciones ocultas y retiradas (registro histórico)

Registro de lo que se ocultó o eliminó temporalmente y cómo volver a mostrarlo.
Estado al: commit actual en `master` (ver `git log`).

## 1. Módulo Oficina (`/oficina`)
- **Estado:** ✅ VISIBLE (ruta, enlace y pruebas activos).

## 2. Pestaña Cronograma del servicio (`/servicios/:id/cronograma`)
- **Estado:** ✅ VISIBLE (ruta, enlace con contador y sección Planificación activos).

## 3. Bloque “Avance del cronograma” del Resumen
- **Estado:** ✅ VISIBLE (entre “Movimientos” y la cascada).

## 4. Módulo Gestión de Servicios (antiguo)
- **Estado:** ⚠️ ELIMINADO del disco antes del primer commit (no está en git). Su funcionalidad vive repartida en el panel del servicio.
- **Reactivar:** no es posible tal cual; habría que reconstruirlo.

## 5. Módulo Almacén y catálogo de materiales (Fase 3–4)
- **Estado:** ❌ ELIMINADO por decisión (costos de materiales por servicio, texto libre). Ver historial git anterior a `1d2d807` si se necesita.
- **Reactivar:** reconstruir `movimientos_almacen`, kardex y página `Almacen.jsx`.

## 6. Colecciones `partidas` y `valorizaciones` (hasta la fusión)
- **Estado:** ❌ ELIMINADAS por decisión (el presupuesto vive en `tareas.monto`). La migración `migrarPresupuestoATareas` sigue en el código para navegadores con datos antiguos: no quitarla.
- **Reactivar:** no previsto; el tablero de Partidas lee el árbol de tareas.

## 7. Registro diario de personal y tareo (hasta asignaciones)
- **Estado:** ❌ ELIMINADO por decisión (un registro mensual por asignación + botón Asentar; sin asistencia ni cobertura). Helpers (`proyeccionLaboral`, `agruparPersonalPorMes`, `coberturaTareo`, generadores de fechas) eliminados de `calculadora.js` y de la suite.
- **Reactivar:** ver historial git anterior a `c3f9c29`.

## 8. Servicios de prueba eliminados
- Solo queda el servicio 6 en `src/data/mockData.js`. Los servicios 1–5 y sus registros/tareas se quitaron de las semillas (siguen en el historial git anterior si se necesitan como ejemplo).
