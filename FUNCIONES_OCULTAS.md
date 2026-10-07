# Funciones ocultas (para reactivar después)

Registro de lo que se ocultó temporalmente y cómo volver a mostrarlo.
Estado al: commit `2c893b0`.

## 1. Módulo Oficina (`/oficina`)
- **Estado:** código, datos (`costos_oficina`) y pruebas intactos.
- **Oculto en:** `src/App.jsx` (ruta comentada/eliminada) y `src/components/layout/Sidebar.jsx` (enlace eliminado).
- **Reactivar:** devolver la ruta `<Route path="oficina" element={<Oficina />} />` con su import, y el enlace `{ to: '/oficina', label: 'Oficina', icono: 'grid' }` en `SECCIONES_NAVEGACION`.

## 2. Pestaña Cronograma del servicio (`/servicios/:id/cronograma`)
- **Estado:** página `src/pages/servicio/CronogramaServicio.jsx`, datos (`tareas`) y pruebas intactos.
- **Oculto en:** `src/App.jsx` (ruta eliminada) y `src/components/layout/SidebarServicio.jsx` (enlace y sección eliminados).
- **Reactivar:** devolver la ruta anidada + el enlace `{ id: 'cronograma', etiqueta: 'Cronograma', icono: 'gantt' }` (y su contador si se quiere).

## 3. Bloque “Avance del cronograma” del Resumen
- **Estado:** el cálculo (`metricasCronograma`, `avanceEfectivo`) y los datos siguen activos; solo se quitó su visualización en `src/pages/servicio/ResumenServicio.jsx`.
- **Reactivar:** reponer el bloque entre “Movimientos” y la cascada (ver historial git del archivo).

## 4. Módulo Gestión de Servicios (antiguo)
- **Estado:** ⚠️ ELIMINADO del disco antes del primer commit (no está en git). Su funcionalidad vive repartida en el panel del servicio (Materiales/Personal/Equipos/Gastos).
- **Reactivar:** no es posible tal cual; habría que reconstruirlo.

## 5. Páginas sin ruta (existen, nunca se enlazan)
- `src/pages/Dashboard.jsx`, `src/pages/Materiales.jsx` — sin ruta en `App.jsx` ni enlace en el sidebar.
- **Reactivar:** agregarles ruta y enlace como con Oficina.

## 6. Campos retirados de catálogos (datos viejos los conservan)
- Equipos: `costo_por_hora`, `estado_operativo`, `placa`, `tipo_unidad` (la migración v1 aún rellena `costo_por_hora: 0`).
- Personal: concepto `activo` (el CRUD lo ignora con `tieneActivo: false`).

## 7. Servicios de prueba eliminados
- Solo queda el servicio 6 en `src/data/mockData.js`. Los servicios 1–5 y sus registros/tareas se quitaron de las semillas (siguen en el historial git anterior si se necesitan como ejemplo).
