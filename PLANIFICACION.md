# Planificación por módulos — PROMCOSER ERP

Roadmap de entregables por módulo necesario. Estado base: commit `0bb33b8`
(presupuestos, indirectos, filtros, CSV). Convención: cada módulo
se cierra con suite verde (`npm run verificar`), build OK, push a `master` y
manual actualizado.

## M1. Servicios (base — completar)
**Existe:** CRUD, tipos (Obra/Misceláneo/Contrato), panel de
11 pestañas, búsqueda, columna tipo.
**Falta:**
- Fecha fin real, responsable descriptivo (texto, sin usuarios), ubicación.
- Filtros por tipo y estado en el listado (hoy solo búsqueda).
- Historial de cambios del servicio (fecha + campo + valor anterior/nuevo).
**Aceptación:** crear/editar/filtrar por tipo, ver historial, sin duplicar ingresos ni costos.

## M2. Presupuesto y costos (existe parcial)
**Existe:** categorías con inicial/adicional/vigente, real por categoría, desviación y ejecución, sin-categoría.
**Falta:**
- Cantidad/precio unitario por línea donde aplique (opcional por categoría).
- Costo comprometido separado del real (sin sumar dos veces).
- Costo final estimado = real + pendiente de terminar; desviación proyectada.
- Alertas: sobrecosto previsto, margen bajo objetivo configurable.
**Aceptación:** Casos D (300k→340k, 13.33%) y F (10k→11.5k, 115%) del programa maestro en la suite.

## M3. Personal y tareo (existe base)
**Existe:** asignaciones, tareo con aprobación, asentamiento mensual, baja con prorrateo, proyección inicio-fin.
**Falta:**
- Horas extras con recargo configurable + viáticos en el tareo.
- Reportes: horas por trabajador/servicio/periodo, costo laboral por tarea.
- Productividad: unidades producidas por tarea → costo por unidad y unid/hora-hombre.
**Aceptación:** Caso H (trabajador en varios servicios sin duplicar) en la suite.

## M4. Equipos (existe base)
**Existe:** fichas con propiedad, costo/hora, asignación a tareas y servicios.
**Falta:**
- Mantenimiento y estado del equipo.
- Horas disponibles vs. utilizadas → % utilización.
- Costo por unidad producida.
**Aceptación:** Caso H (equipo en dos servicios sin duplicar) en la suite.

## M5. Materiales y compras (mínimo viable — el más ausente)
**Existe:** costo de materiales por servicio (texto libre) mapeado a presupuesto.
**Falta:**
- Registro con proveedor (descriptivo) y comprobante.
- Estados: solicitud → orden → recibido → consumido → facturado → pagado, sin
  contar dos veces el mismo hecho (flujo simplificado directo a servicio, sin
  almacén obligatorio).
**Aceptación:** Caso G (compra→factura→pago suma una vez) y Caso H en la suite.

## M6. Gastos y pagos (existe base)
**Existe:** gastos con categoría/tarea, pagos con saldos, anticipos, CxP por gasto.
**Falta:**
- Fechas de documento, vencimiento y pago; proveedor/beneficiario.
- CxP global por pagar (consolidado empresa, no solo por servicio).
**Aceptación:** Casos D y E (saldos 1500 y 1200) ya en suite; agregar vencidas.

## M7. Facturación y cobros (existe base)
**Existe:** facturas con saldos/estados/anulación, cobros atados con tope, adelantos, CxC por servicio.
**Falta:**
- Adicionales al monto contratado que recalculen contratado y por cobrar.
- Retenciones y amortización de adelantos.
- Antigüedad de deuda y alertas de vencidas (global + servicio).
- Reporte de rentabilidad por cliente.
**Aceptación:** Casos C (10000/4000→6000) y F (10000→4000+6000→0) ya en suite; agregar retenciones.

## M8. Contratos (eliminado por decisión)
El módulo Contratos se retiró: el tipo se elige al crear/editar cada servicio
(Obra, Misceláneo, Contrato). Sin módulo, colección ni
consolidado separados.

## M9. Caja y cierre (existe base)
**Existe:** caja derivada + manuales, cierre con checklist, snapshot, reapertura motivada, bloqueo de meses cerrados, reporte imprimible.
**Falta:**
- Reporte mensual completo de 14 puntos (resumen ejecutivo, comparativas, desviaciones, alertas) imprimible/PDF.
- Exportación Excel vía CSV mejorado (mismo contenido del reporte).
**Aceptación:** Caso I (cierre + corrección exige reapertura) y Caso K (respaldo) ya en suite; agregar totales CSV = pantalla.

## M10. Dashboard y reportes (existe base)
**Existe:** 12 tarjetas, personal, quién debe, cronograma global, resultado empresa, mes con tendencia y CSV.
**Falta:**
- Rentabilidad por cliente y producción (depende de M3/M7).
- Filtros por responsable/estado (requiere esos datos en M1).
**Aceptación:** Caso J (sin datos: ceros y N/D, sin NaN) ya en suite; filtros recalculan todo lo por servicio.

## Orden de ejecución sugerido

M2 → M7 → M9 (rentabilidad y caja primero) → M5/M6 → M3/M4 → M1/M10.

## Backlog (fuera de alcance inicial)

Backend/BD centralizada, usuarios/roles/permisos, auditoría con usuario,
multi-moneda, integración SUNAT, sincronización entre dispositivos,
contabilidad formal. Puerta de entrada: si el piloto exige multiusuario, se
adelanta backend.

## Riesgos y supuestos vigentes

- 104 DNI en seeds sin verificar (reales o generados): pendiente de
  confirmación; no reproducir ni borrar sin autorización.
- Ingresos reconocidos = valorizado (monto × avance); redondeo a céntimos;
  PEN por defecto. Validar con contador antes de uso contable.
- Datos de ejemplo, no reales. Piloto con 1 obra + 1 misceláneo en paralelo
  al control actual antes de operar de verdad.
