# Ejemplo de uso guiado — PROMCOSER ERP

Recorrido completo con un caso ficticio, tocando **todos los módulos** en
orden. Sigue los pasos con los valores exactos y verifica al final que ves
los números esperados.

> Datos 100% ficticios para aprender. Antes de empezar, exporta tu respaldo
> (Dashboard → **Datos y respaldo** → **Exportar respaldo**): así no arriesgas
> tu información real.

## El caso

Servicio **Misceláneo**: *"Reparación de cerco perimétrico"*, cliente
ficticio *"Almacenes del Sur S.A.C."*, del 1 al 15 de octubre, monto
contratado **S/ 8,500**.

## Paso 1. Crear el servicio (Servicios)
1. Menú → **Servicios** → **Registrar servicio**.
2. Completa: nombre *Reparación de cerco perimétrico*, cliente *Almacenes del
   Sur S.A.C.*, tipo **Misceláneo**, presupuesto **8500**, inicio
   *2026-10-01*, fin *2026-10-15*, estatus **En curso**. Guarda.
3. **Verás:** el servicio en la lista con tipo Misceláneo, saldo S/ 8,500 y
   consumo 0%. Clic en **Ver** para entrar a su panel.

## Paso 2. Crear las tareas (Cronograma)
1. Pestaña **Cronograma** → **Nueva tarea** (3 veces):
   - *Desmontaje* 01→05 oct, avance 100.
   - *Reparación* 06→12 oct, avance 100.
   - *Pintado y entrega* 13→15 oct, avance 100.
2. **Verás:** las 3 tareas en el Gantt al 100%, avance global 100%, 0 atrasadas.

## Paso 3. Poner montos (Partidas)
1. Pestaña **Partidas** → botón **Editar** a la derecha de cada tarea:
   - Desmontaje: **2500**. Reparación: **4000**. Pintado y entrega: **2000**.
2. **Verás:** presupuesto **S/ 8,500**, valorizado **S/ 8,500** (100%),
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
2. **Verás:** la asignación Vigente y las tarjetas: Gastado S/ 0,
   Proyectado S/ 1,600 (10 días × 8 h × 20 del 6 al 15 oct), Total S/ 1,600.

## Paso 6. Tareo y aprobación (Personal del servicio)
1. Tarjeta **Tareo diario** → registra 5 filas (06, 07, 08, 09 y 10 de
   octubre): Luis, tarea *Reparación*, 8 normales + 0 extras, tarifa 20.
   Cada una muestra importe S/ 160.
2. Filtra mes *2026-10*: verás **40 h.h. · S/ 800 · 5 por aprobar**.
3. Pulsa **Aprobar** en las 5 (quedan en verde).
4. **Verás:** 40 h.h. aprobadas por S/ 800, 0 pendientes.

## Paso 7. Asentar el mes (Personal del servicio)
1. Tarjeta **Asentar mes** → mes *2026-10* (S/ 800) → **Asentar**.
2. **Verás:** el mes pasa a "Meses asentados" por S/ 800; Gastado sube a
   S/ 800 y Proyectado baja a S/ 0. El gasto ya resta del presupuesto.

## Paso 8. Materiales, equipos y gastos (con tarea)
1. **Materiales → Agregar**: *Cemento* cantidad 10, costo **385**, fecha
   10-03, tarea *Desmontaje*.
2. **Materiales → Agregar**: *Pintura* cantidad 2, costo **190**, fecha
   10-13, tarea *Pintado y entrega*.
3. **Equipos → Agregar**: equipo *Amoladora*, 6 horas, costo **90**, fecha
   10-08, tarea *Reparación*.
4. **Gastos → Agregar**: concepto *Flete*, monto **250**, fecha 10-02, sin
   tarea, categoría **Transporte**.
5. **Verás** en **Partidas**: Desmontaje costo S/ 385, Reparación S/ 890
   (800+90), Pintado S/ 190, más S/ 250 sin tarea (el flete); márgenes 2115,
   3110 y 1810 en verde. Gastado total del servicio: **S/ 1,715**.

## Paso 9. Presupuesto por categorías (Presupuesto)
1. Pestaña **Presupuesto** → registra iniciales: Mano de obra **900**,
   Materiales **600**, Equipos propios **100**, Transporte **250**.
2. **Verás:** vigente S/ 1,850 vs. real S/ 1,715 → desviación **−S/ 135**,
   ejecución **92.7%**, ninguna categoría excedida (todo en verde/neutro).

## Paso 10. Facturar y cobrar (Facturación + Ingresos)
1. **Facturación → Agregar**: número *F001-000077*, emisión 10-16,
   vencimiento 10-31, base 8500, impuestos 0, total **8500**, moneda PEN.
2. **Verás:** factura *emitida* con saldo S/ 8,500.
3. **Ingresos → Agregar**: fecha 10-02, monto **3000**, concepto *adelanto*,
   sin factura.
4. **Ingresos → Agregar**: fecha 10-20, monto **5500**, concepto
   *valorización*, factura *F001-000077* (saldo S/ 5,500).
5. **Verás:** Cobrado **S/ 8,500**, Por cobrar **S/ 0**; la factura pasa a
   **cobrada** con saldo S/ 0. Utilidad real: **S/ 6,785** (8500 − 1715).

## Paso 11. Tipo del servicio
1. Entra al servicio → **Opciones → Editar** → campo **Tipo** → verifica que
   diga *Misceláneo* (se elige al crear el servicio: Obra, Misceláneo, Anual,
   Adicional o Contrato).
2. **Verás** en **Servicios** que la obra figura con su tipo, y en el
   **Dashboard** podrás filtrar por tipo Misceláneo para ver solo sus números.

## Paso 12. Oficina y Dashboard
1. Menú → **Oficina**: registra un costo de octubre para una persona de
   Oficina (ej. S/ 1,500). **Verás** el total del mes y el resultado empresa
   actualizado; cambia la **regla de distribución** a *Por costos* y verás el
   prorrateo por servicio con su criterio.
2. Menú → **Dashboard**: **verás** el panel gerencial con los KPIs de la
   empresa (resultado, presupuesto/ejecución, cobrado/por cobrar, servicios),
   el servicio en **Consumo por servicio** (20.2%), **Quién debe** en S/ 0,
   **Cronograma global** al 100% y la **Proyección** con el personal por mes.
   Descarga el **CSV de rentabilidad** con el botón Exportar CSV.
3. Filtra por cliente *Almacenes del Sur*, por tipo *Misceláneo* y por estado:
   todo lo por servicio se recalcula (Oficina y resultado empresa no se
   filtran).

## Paso 13. Respaldo y limpieza
1. Dashboard → **Datos y respaldo** → **Exportar respaldo** y guárdalo.
2. Para borrar el ejemplo: Servicios → entra a la obra → **Opciones** →
   escribe *Eliminar servicio*. **Verás** que arrastra registros, tareas,
   asignaciones, facturas, ingresos y presupuestos.

## Números esperados (verificación final)

| Indicador | Valor |
|---|---|
| Presupuesto / Valorizado | S/ 8,500 / S/ 8,500 (100%) |
| Gastado total | S/ 1,715 (385 + 890 + 190 + 250 sin tarea) |
| Desviación presupuesto | −S/ 135 (92.7%) |
| Facturado / Cobrado / Por cobrar | 8500 / 8500 / 0 |
| Utilidad real | **S/ 6,785** (margen 79.8%) |
| Horas hombre | 40 h.h. por S/ 800 |

## Funciones que existen fuera de este flujo

- **Baja y reactivación** (Personal): con fecha de último día y prorrateo;
  útil en obras largas, no en este ejemplo de 15 días.
- **Desasentar** un mes, **anular** factura, **eliminar** ingresos/tareo,
  **reactivar** asignación.
- **Adicionales** de presupuesto con motivo (Presupuesto).
- **Retenciones/amortización**: vía conceptos de ingreso y documento.
- **Imprimir** el reporte del Resumen y **Restablecer datos de ejemplo**.
