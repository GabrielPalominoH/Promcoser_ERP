# Ejemplo de uso guiado — PROMCOSER ERP

Recorrido completo con un caso ficticio, tocando **todos los módulos** en
orden. Sigue los pasos con los valores exactos y verifica al final que ves
los números esperados.

> Datos 100% ficticios para aprender. Antes de empezar, exporta tu respaldo
> (Configuración → **Datos y respaldo** → **Exportar respaldo**): así no arriesgas
> tu información real.

## El caso

Servicio **Misceláneo**: *"Reparación de cerco perimétrico"*, cliente
ficticio *"Almacenes del Sur S.A.C."*, del 1 al 15 de octubre, factura total
**S/ 8,500**.

## Paso 1. Crear el servicio (Servicios)
1. Menú → **Servicios** → **Registrar servicio**.
2. Completa: nombre *Reparación de cerco perimétrico*, cliente *Almacenes del
   Sur S.A.C.*, tipo **Misceláneo**, presupuesto inicial **8500**, inicio
   *2026-10-01*, fin *2026-10-15*, estatus **En curso**. Guarda.
3. **Verás:** el servicio en la lista con tipo Misceláneo y su presupuesto
   inicial. Clic en **Ver** para entrar a su panel.

## Paso 2. Crear las tareas (Cronograma)
1. Pestaña **Cronograma** → **Nueva tarea** (3 veces). Como es un trabajo ya
   terminado y sin metrado, en cada una elige **Modo de medición: Manual**,
   avance 100 y una justificación (ej. *"Trabajo concluido, ejemplo"*):
   - *Desmontaje* 01→05 oct.
   - *Reparación* 06→12 oct.
   - *Pintado y entrega* 13→15 oct.
   (En una obra real, el avance se mediría por metrado desde el **Parte
   diario**; el modo manual es la excepción y queda marcado.)
2. **Verás:** las 3 tareas en el Gantt al 100%, avance global 100%, 0 atrasadas.

## Paso 3. Poner montos (Partidas)
1. Pestaña **Partidas** → botón **Editar** a la derecha de cada tarea:
   - Desmontaje: **2500**. Reparación: **4000**. Pintado y entrega: **2000**.
2. **Verás:** montos **S/ 8,500**, valorizado **S/ 8,500**,
   avance 100% en cada fila. Costo y margen aún en S/ 0 (falta cargar costos).

## Paso 4. Fichas de Personal y Equipos (catálogos)
1. Menú → **Personal** → **Registrar**: *Luis Quispe*, cargo *Ayudante*,
   tarifa **20**. Guarda.
2. Menú → **Equipos** → **Registrar**: *Amoladora*, costo/hora **15**,
   propiedad **Propio**. Guarda.
3. **Verás:** ambas fichas en sus listas (contadores del menú suben a +1).

## Paso 5. Asignar personal (Personal del servicio)
1. Pestaña **Personal** → **Asignar personal**: persona *Luis Quispe*, tarea
   *Reparación*, 8 horas/día, tarifa 20, desde *2026-10-06*. Guarda.
2. **Verás:** la asignación Vigente y las tarjetas: el costo de octubre,
   S/ 1,600 (10 días × 8 h × 20 del 6 al 15 oct), ya aparece como Gastado
   (devengado) porque el mes ya empezó; Proyectado S/ 0 y Total S/ 1,600.

## Paso 6. Parte diario (opcional, informativo)
1. Pestaña **Parte diario** → **Nuevo parte** (fecha *2026-10-08*): marca a
   *Luis Quispe* y la *Amoladora* como presentes, clima soleado, y guarda.
2. **Verás:** el parte en la lista, con opción **Imprimir / PDF**. En esta obra
   el avance es manual, así que el parte no cambia ningún monto.

## Paso 7. El costo del personal se devenga solo
No hay tareo ni botón de asentar. El costo de la asignación del Paso 5 se
**devenga automáticamente**: cada mes ya iniciado genera un único registro de
gasto real por persona vigente.
1. Vuelve a la pestaña **Personal**.
2. **Verás:** Gastado **S/ 1,600**, Proyectado S/ 0, Total S/ 1,600. Si la
   asignación cayera en un mes futuro, ese monto se vería como proyectado hasta
   que el mes empiece.

## Paso 8. Materiales, equipos y gastos (con tarea)
1. **Materiales → Agregar**: *Cemento* cantidad 10, costo **385**, fecha
   10-03, tarea *Desmontaje*.
2. **Materiales → Agregar**: *Pintura* cantidad 2, costo **190**, fecha
   10-13, tarea *Pintado y entrega*.
3. **Equipos → Agregar**: equipo *Amoladora*, 6 horas, costo **90**, fecha
   10-08, tarea *Reparación*.
4. **Gastos → Agregar gasto**: concepto *Flete*, monto **250**, fecha 10-02, sin
   tarea. Guarda.
5. **Verás** en **Partidas**: Desmontaje costo S/ 385, Reparación S/ 1,690
   (1,600 de personal + 90 de equipo), Pintado S/ 190, más S/ 250 sin tarea (el flete); márgenes 2115,
   2310 y 1810 en verde. Días estimados de Reparación: 7. Gastado total del servicio: **S/ 2,515**.

## Paso 9. Facturar y cobrar (Ingresos)
1. **Ingresos → Agregar ingreso**: fecha 10-02, monto **3000**, concepto *adelanto*,
   sin factura. Guarda.
2. **Ingresos → Agregar ingreso**: fecha 10-20, monto **5500**, concepto
   *valorización*, factura nueva *F001-000077* (se crea sola con ese total). Guarda.
3. **Verás:** Cobrado **S/ 8,500**; la factura pasa a
   **cobrada** con saldo S/ 0. Utilidad real: **S/ 5,985** (8500 − 2515).

## Paso 10. Tipo del servicio
1. Entra al servicio → **Opciones → Editar** → campo **Tipo** → verifica que
   diga *Misceláneo* (se elige al crear el servicio: Obra, Misceláneo o Contrato).
2. **Verás** en **Servicios** que la obra figura con su tipo, y en el
   **Dashboard** podrás filtrar por tipo Misceláneo para ver solo sus números.

## Paso 11. Oficina y Dashboard
1. Menú → **Oficina**: registra un costo de octubre para una persona de
   Oficina (ej. S/ 1,500). **Verás** el total del mes y el resultado empresa
   actualizado.
2. Menú → **Dashboard**: **verás** el panel gerencial con los KPIs de la
   empresa (resultado, gastado, cobrado, servicios),
   el servicio en **Gasto por servicio**,
   **Cronograma global** al 100% y la **Proyección** con el personal por mes.
   Descarga el **CSV de rentabilidad** con el botón Exportar CSV.
3. Filtra por cliente *Almacenes del Sur*, por tipo *Misceláneo* y por estado:
   todo lo por servicio se recalcula (Oficina y resultado empresa no se
   filtran).
4. En la tarjeta **Meta de ingreso**, escribe un monto (ej. 10000) y pulsa
   **Guardar meta**: **verás** el % de avance y cuánto falta para la meta (es la
   meta de la empresa, no le afectan los filtros).

## Paso 12. Respaldo y limpieza
1. Configuración → **Datos y respaldo** → **Exportar respaldo** y guárdalo.
2. Para borrar el ejemplo: Servicios → entra a la obra → **Opciones** →
   escribe *Eliminar servicio*. **Verás** que arrastra registros, tareas,
   asignaciones, facturas e ingresos.

## Números esperados (verificación final)

| Indicador | Valor |
|---|---|
| Montos / Valorizado | S/ 8,500 / S/ 8,500 |
| Días estimados (obra) | 15 d |
| Gastado total | S/ 2,515 (385 + 1,690 + 190 + 250 sin tarea) |
| Facturado / Cobrado | 5500 / 8500 |
| Utilidad real | **S/ 5,985** (margen 70.4%) |
| Personal devengado | S/ 1,600 |

## Funciones que existen fuera de este flujo

- **Baja y reactivación** (Personal): con fecha de último día y prorrateo;
  útil en obras largas, no en este ejemplo de 15 días.
- **Anular** factura, **eliminar** ingresos, **reactivar** asignación.
- **Valorizaciones, Curva S, Línea base y Modificaciones**: pensadas para obras con
  metrado y presupuesto por partidas; no se usan en este ejemplo de 15 días.
- **Alertas** (campana) e **importar/exportar Excel** del cronograma.
- **Imprimir** el reporte del Resumen y **Restablecer datos de ejemplo**.
