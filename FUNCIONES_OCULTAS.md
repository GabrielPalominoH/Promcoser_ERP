# Funciones ocultas y retiradas (registro histórico)

Registro de lo que se ocultó o eliminó temporalmente y cómo volver a mostrarlo.
Estado al: commit actual en `master` (ver `git log`).

## 1. Módulo Oficina (`/oficina`)
- **Estado:** ✅ VISIBLE (ruta, enlace y pruebas activos).

## 2. Pestaña Cronograma del servicio (`/servicios/:id/cronograma`)
- **Estado:** ✅ VISIBLE (ruta, enlace con contador y sección Planificación activos).

## 3. Bloque “Avance del cronograma” del Resumen
- **Estado:** ✅ VISIBLE (junto a “Movimientos”).

## 4. Módulo Gestión de Servicios (antiguo)
- **Estado:** ⚠️ ELIMINADO del disco antes del primer commit (no está en git). Su funcionalidad vive repartida en el panel del servicio.
- **Reactivar:** no es posible tal cual; habría que reconstruirlo.

## 5. Módulo Almacén y catálogo de materiales (Fase 3–4)
- **Estado:** ❌ ELIMINADO por decisión (costos de materiales por servicio, texto libre). Ver historial git anterior a `1d2d807` si se necesita.
- **Reactivar:** reconstruir `movimientos_almacen`, kardex y página `Almacen.jsx`.

## 6. Colecciones `partidas` y `valorizaciones` (hasta la fusión)
- **Estado:** ❌ ELIMINADAS por decisión (el presupuesto vive en `tareas.monto`). La migración `migrarPresupuestoATareas` sigue en el código para navegadores con datos antiguos: no quitarla.
- **Reactivar:** no previsto; el tablero de Partidas lee el árbol de tareas.

## 7. Registro diario de personal, cobertura de tareo y helpers viejos
- **Estado:** ❌ ELIMINADOS por decisión en la reestructura (cobertura, `proyeccionLaboral`, `agruparPersonalPorMes`, generadores de fechas). El **tareo diario con aprobación** sí existe de nuevo (Etapas 3–5) como detalle que alimenta el asentamiento.
- **Reactivar cobertura:** ver historial git anterior a `5dd806a`.

## 8. Módulo Contratos
- **Estado:** ❌ ELIMINADO por decisión (el tipo se elige en cada servicio: Obra, Misceláneo, Contrato). Ver historial git anterior a `0806ee0` si se necesita.
- **Reactivar:** reconstruir colección `contratos`, página y consolidado.

## 9. Módulos Caja y Cierre mensual
- **Estado:** ❌ ELIMINADOS por decisión (no hay `generarCierre` ni cierre contable por mes; el reporte imprimible vive en el Resumen). La **tendencia mensual** sí se reactivó, pero solo como lectura gerencial dentro del panel: caja real por mes (`flujoCajaMensualReal`) y personal proyectado por mes (`proyeccionMensualPersonal`), sin cierre ni CSV mensual. Helpers `flujoMes` y `mesCerrado` siguen eliminados.
- **Reactivar:** ver historial git si se necesita.

## 10. Servicios de prueba eliminados
- Solo queda el servicio 6 en `src/data/mockData.js`. Los servicios 1–5 y sus registros/tareas se quitaron de las semillas (siguen en el historial git anterior si se necesitan como ejemplo).

## 11. Módulo Presupuesto por categorías y proyecciones EVM
- **Estado:** ❌ ELIMINADOS por decisión (el dinero que ingresa se registra en Ingresos). Sin ruta `/presupuesto`, sin colección `presupuestos`, sin campo Categoría en gastos y sin proyecciones EVM (`consumoPresupuesto`, `rentabilidadServicio`, `proyeccionCierre`, `presupuestoPorCategoria`, `realPorCategoria`, `desviacionCategoria`). Se conservan el `presupuesto_asignado` de cada servicio (monto inicial editable) y la lectura de control `estadoPresupuesto` (disponible, % de ejecución, excedido, cobrado). El resultado se mide como utilidad real (cobrado − gastado) y el avance en Partidas (montos y valorizado por tarea, que se conservan). Esquema `_v: 8`; lo guardado con `presupuestos` se ignora al cargar.
- **Reactivar:** ver historial git si se necesita.

## 12. Agregado "Por cobrar"
- **Estado:** ❌ ELIMINADO por decisión (el sistema registra ingresos, no cobranza). Sin función `porCobrar`, sin tarjetas/columnas de por cobrar y sin tarjeta "Quién debe" (su desglose por concepto vive como "Cobros por concepto" en el Dashboard). Las facturas se conservan como registro documental en Ingresos, con saldos y estados en su propia tabla.
- **Reactivar:** ver historial git si se necesita.

## 13. Distribución de indirectos a servicios
- **Estado:** ❌ ELIMINADA por decisión (la oficina es gasto general, no se atribuye por servicio). Sin tarjeta de distribución, sin regla configurable y sin `REGLAS_INDIRECTOS`/`distribuirIndirectos` (solo quedan en el historial git). Oficina conserva costos mensuales, utilidad total, resultado empresa y utilidad por servicio.
- **Reactivar:** ver historial git si se necesita.
