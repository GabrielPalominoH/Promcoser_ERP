# Planificación por módulos — PROMCOSER ERP

Roadmap de entregables por módulo necesario. Estado base: commit `0bb33b8`
(indirectos, filtros, CSV). Convención: cada módulo
se cierra con suite verde (`npm run verificar`), build OK, push a `master` y
manual actualizado.

## M1. Servicios (base — completar)
**Existe:** CRUD, tipos (Obra/Misceláneo/Contrato), panel de
8 pestañas, búsqueda, columna tipo.
**Falta:**
- Fecha fin real, responsable descriptivo (texto, sin usuarios), ubicación.
- Filtros por tipo y estado en el listado (hoy solo búsqueda).
- Historial de cambios del servicio (fecha + campo + valor anterior/nuevo).
**Aceptación:** crear/editar/filtrar por tipo, ver historial, sin duplicar ingresos ni costos.

## M2. Presupuesto y costos (módulo por categorías eliminado; control básico existe)
El módulo Presupuesto por categorías se retiró: sin colección
`presupuestos` y sin proyecciones EVM (CPI, costo final, margen proyectado).
Quedan el `presupuesto_asignado` de cada servicio (monto inicial editable) y
la lectura de control `estadoPresupuesto` (gastado, disponible, % de
ejecución, excedido, cobrado). El resultado se mide como utilidad real
(cobrado − gastado) y el avance en Partidas (montos y valorizado por tarea).

## M3. Personal (costo directo automático)
**Existe:** asignaciones, costo mensual automático devengado/proyectado, baja con prorrateo, proyección inicio-fin, estimación por duración con comparador estimado vs. real en Partidas y Resumen (`diasEstimadosTarea`, `diasRealesTarea`, `desviacionDias`).
**Sin tareo ni asentamiento manual** (eliminados por decisión: Opción A).
**Falta:**
- Reportes: horas por trabajador/servicio/periodo, costo laboral por tarea.
- Productividad: unidades producidas por tarea → costo por unidad y unid/hora-hombre.
**Aceptación:** Caso H (trabajador en varios servicios sin duplicar) en la suite.

## M4. Equipos (existe base)
**Existe:** fichas con propiedad, costo/hora, uso registrado por servicio y tarjetas de totales en el servicio.
**Falta:**
- Mantenimiento y estado del equipo.
- Horas disponibles vs. utilizadas → % utilización.
- Costo por unidad producida.
**Aceptación:** Caso H (equipo en dos servicios sin duplicar) en la suite.

## M5. Materiales y compras (mínimo viable — el más ausente)
**Existe:** costo de materiales por servicio (texto libre).
**Falta:**
- Registro con proveedor (descriptivo) y comprobante.
- Estados: solicitud → orden → recibido → consumido → facturado → pagado, sin
  contar dos veces el mismo hecho (flujo simplificado directo a servicio, sin
  almacén obligatorio).
**Aceptación:** Caso G (compra→factura→pago suma una vez) y Caso H en la suite.

## M6. Gastos (existe base, sin pagos)
**Existe:** gastos con tarea y comprobante opcional.
**Sin módulo de pagos** (eliminado por decisión, con saldos y CxP).
**Falta:**
- Fechas de documento, vencimiento y pago; proveedor/beneficiario.
**Aceptación:** Caso D (saldo 1500) ya en suite.

## M7. Ingresos con facturas (existe base, fusionado)
**Existe:** módulo único Ingresos: total cobrado, tabla de facturas con saldos/estados/anulación, formulario en modal (fecha, monto, concepto + N° factura opcional con autocreación), ingresos atados a factura con tope, adelantos. La colección interna sigue siendo `cobros`; `/cobros` y `/facturacion` redirigen a `/ingresos`.
**Falta:**
- Retenciones y amortización de adelantos.
- Antigüedad de deuda y alertas de vencidas (global + servicio).
- Reporte de rentabilidad por cliente.
**Aceptación:** Casos C (10000/4000→6000) y F (10000→4000+6000→0) ya en suite; agregar retenciones.

## M8. Contratos (eliminado por decisión)
El módulo Contratos se retiró: el tipo se elige al crear/editar cada servicio
(Obra, Misceláneo, Contrato). Sin módulo, colección ni
consolidado separados.

## M9. Reportes (existe parcial)
**Existe:** CSV de rentabilidad por servicio, reporte imprimible del Resumen y, en el panel gerencial, la evolución mensual real vs proyectada (caja real por mes + personal proyectado).
**Sin cierre mensual** (eliminado por decisión: sin `generarCierre` ni CSV mensual). La tendencia mensual se reactivó como sección del panel gerencial (ver M10); sigue sin existir un cierre contable por mes.
**Falta:**
- Exportación Excel vía CSV mejorado.
**Aceptación:** Caso K (respaldo) ya en suite.

## M10. Dashboard gerencial (hecho)
**Existe:** panel gerencial en `/` con KPIs de empresa (resultado, gastado, cobrado, servicios en curso/en riesgo), meta de ingreso (cobrado vs objetivo, con lo que falta), atención inmediata (obras en riesgo), evolución real (caja por mes) vs proyectada (personal por mes), utilidad por cliente, gasto y ranking por servicio, resultado empresa y cronograma global. El detalle operativo (movimientos recientes) queda colapsado en segundo plano y el respaldo/importación/restablecer vive en el botón **"Datos y respaldo"**.
**Filtros:** cliente, tipo y estado alcanzan a todo lo por servicio; Oficina y resultado empresa son de la empresa y no se filtran.
**Falta:**
- Filtro por responsable (requiere ese dato en M1).
**Aceptación:** Caso J (sin datos: ceros y N/D, sin NaN) ya en suite; filtros recalculan todo lo por servicio; números exactos del servicio 6 verificados en la sección `[ gerencial ]`.

## M11. Modificaciones contractuales (hecho — Fase 1)
**Existe:** sección **Modificaciones** en el panel de servicio
(`/servicios/:id/modificaciones`, grupo *Contrato*) con:
- Adicionales y deductivos con número correlativo, fecha, descripción, partidas
  (metrado × precio unitario), estado (`borrador`/`presentado`/`aprobado`/
  `rechazado`) y documento de sustento.
- Ampliaciones de plazo con días solicitados/aprobados, motivo, estado.
- Presupuesto vigente = original + adicionales aprobados − deductivos aprobados,
  reflejado en Resumen, Curva S, Valorizaciones y Dashboard
  (`servicioConPresupuestoVigente`), conservando el original y mostrando la
  variación.
- Al aprobar un adicional, sus partidas se materializan como tareas hoja (entran
  al Cronograma, Curva S, EVM y valorizaciones); al aprobar una ampliación se
  desplaza `fecha_fin_estimada` y se recalcula el cronograma con CPM.
- Historial de cambios de estado con fecha.
**Falta:**
- Reporte imprimible/PDF del expediente de la modificación (Fase 3).
**Aceptación:** sección `[ modificaciones ]` en la suite (importes, presupuesto
vigente, materialización y valorización del adicional, plazo, historial,
migración v10 → v11).

## Orden de ejecución sugerido

M7 → M5/M6 → M3/M4 → M1/M10.

## Release v1.0 — lista de aceptación (UAT piloto)

Condición: 1 obra + 1 misceláneo reales cargados en paralelo al control
actual (cuaderno/Excel), durante 2 cierres. Marcar solo cuando la utilidad
del sistema iguale a la del control al céntimo.

- [ ] Crear servicio con presupuesto inicial; aparece en Servicios y Resumen.
- [ ] Registrar gasto/material/equipo con tarea; suman al gastado y al costo de la tarea.
- [ ] Asignar personal (horas/día, tarifa, tarea); la proyección inicio-fin cuadra.
- [ ] Registrar cobro con y sin factura (tope de saldo, autocreación, adelanto).
- [ ] Montos, avance y horas estimadas en Cronograma/Partidas; desviación de horas visible.
- [ ] Resumen cuadra: presupuesto, gastado, saldo, cobrado, utilidad, productividad, SPI.
- [ ] Un adicional aprobado sube el presupuesto vigente y su partida se valoriza; una ampliación aprobada mueve la fecha fin.
- [ ] Dashboard cuadra: resultado, caja por mes, utilidad por cliente, gasto y ranking.
- [ ] Exportar → Vaciar todo → Importar: totales idénticos tras el round-trip.
- [ ] Suite verde (`npm run verificar`) + build OK + tag de release en git.
- [ ] Respaldo JSON inicial guardado fuera del equipo; a partir de ahí solo datos reales.

## Backlog (fuera de alcance inicial)

Backend/BD centralizada, usuarios/roles/permisos, auditoría con usuario,
multi-moneda, integración SUNAT, sincronización entre dispositivos,
contabilidad formal. Puerta de entrada: si el piloto exige multiusuario, se
adelanta backend.

## Riesgos y supuestos vigentes

- 104 DNI en seeds sin verificar (reales o generados): pendiente de
  confirmación; no reproducir ni borrar sin autorización.
- Resultado = cobrado − gastado (utilidad real); redondeo a céntimos;
  PEN por defecto. Validar con contador antes de uso contable.
- Datos de ejemplo, no reales. Piloto con 1 obra + 1 misceláneo en paralelo
  al control actual antes de operar de verdad.
