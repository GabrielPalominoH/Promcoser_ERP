# Planificación por módulos — PROMCOSER ERP

Roadmap de entregables por módulo necesario. Estado base: commit `0bb33b8`
(presupuestos, indirectos, filtros, CSV). Convención: cada módulo
se cierra con suite verde (`npm run verificar`), build OK, push a `master` y
manual actualizado.

## M1. Servicios (base — completar)
**Existe:** CRUD, tipos (Obra/Misceláneo/Contrato), panel de
9 pestañas, búsqueda, columna tipo.
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

## M3. Personal (costo directo automático)
**Existe:** asignaciones, costo mensual automático devengado/proyectado, baja con prorrateo, proyección inicio-fin.
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
**Existe:** costo de materiales por servicio (texto libre) mapeado a presupuesto.
**Falta:**
- Registro con proveedor (descriptivo) y comprobante.
- Estados: solicitud → orden → recibido → consumido → facturado → pagado, sin
  contar dos veces el mismo hecho (flujo simplificado directo a servicio, sin
  almacén obligatorio).
**Aceptación:** Caso G (compra→factura→pago suma una vez) y Caso H en la suite.

## M6. Gastos (existe base, sin pagos)
**Existe:** gastos con categoría/tarea y comprobante opcional.
**Sin módulo de pagos** (eliminado por decisión, con saldos y CxP).
**Falta:**
- Fechas de documento, vencimiento y pago; proveedor/beneficiario.
**Aceptación:** Caso D (saldo 1500) ya en suite.

## M7. Ingresos con facturas (existe base, fusionado)
**Existe:** módulo único Ingresos: tarjetas (cobrado, por cobrar, utilidad), tabla de facturas con saldos/estados/anulación, formulario único (fecha, monto, concepto + N° factura opcional con autocreación), ingresos atados a factura con tope, adelantos, CxC por servicio. La colección interna sigue siendo `cobros`; `/cobros` y `/facturacion` redirigen a `/ingresos`.
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

## M9. Reportes (existe parcial)
**Existe:** CSV de rentabilidad por servicio, reporte imprimible del Resumen y, en el panel gerencial, la evolución mensual real vs proyectada (caja real por mes + personal proyectado).
**Sin cierre mensual** (eliminado por decisión: sin `generarCierre` ni CSV mensual). La tendencia mensual se reactivó como sección del panel gerencial (ver M10); sigue sin existir un cierre contable por mes.
**Falta:**
- Exportación Excel vía CSV mejorado.
**Aceptación:** Caso K (respaldo) ya en suite.

## M10. Dashboard gerencial (hecho)
**Existe:** panel gerencial en `/` con KPIs de empresa (resultado, presupuesto/ejecución, cobrado/por cobrar, servicios en curso/en riesgo), atención inmediata (obras en riesgo), evolución real (caja por mes) vs proyectada (personal por mes + cierre estimado), rentabilidad por cliente, consumo y ranking por servicio, cobranza, resultado empresa y cronograma global. El detalle operativo (movimientos recientes) queda colapsado en segundo plano y el respaldo/importación/restablecer vive en el botón **"Datos y respaldo"**.
**Filtros:** cliente, tipo y estado alcanzan a todo lo por servicio; Oficina y resultado empresa son de la empresa y no se filtran.
**Falta:**
- Filtro por responsable (requiere ese dato en M1).
**Aceptación:** Caso J (sin datos: ceros y N/D, sin NaN) ya en suite; filtros recalculan todo lo por servicio; números exactos del servicio 6 verificados en la sección `[ gerencial ]`.

## Orden de ejecución sugerido

M2 → M7 → M5/M6 → M3/M4 → M1/M10.

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
