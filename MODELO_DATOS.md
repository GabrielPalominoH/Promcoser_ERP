# Modelo de datos — PROMCOSER ERP

Documento técnico breve: colecciones, relaciones y reglas. Todo vive en
`localStorage` (`promcoser_mvp_v2`), sin backend.

## Colecciones (`src/data/mockData.js` → `ESTADO_INICIAL`)

| Colección | Clave | Contenido |
|---|---|---|
| `personal` | `id` | Ficha: nombre, apellido, cargo, DNI, tarifa/hora, ámbito (Obra/Oficina) |
| `equipos` | `id` | Ficha: nombre, costo/hora |
| `servicios` | `id` | Obra: nombre, cliente, monto contratado, inicio, fin estimado, avance, estatus |
| `tareas` | `id` | Cronograma + presupuesto: servicio, padre (árbol), nombre, fechas, avance %, monto |
| `registros_servicio` | `id` | Libro único de costos: servicio, tarea?, tipo, referencia/nombre, cantidad, monto, fecha, modalidad, asignación? |
| `asignaciones` | `id` | Personal asignado: servicio, persona, tarea?, horas/día, tarifa, inicio, fin? (vacío = vigente) |
| `costos_oficina` | `id` | Gasto general: persona (ámbito Oficina), mes, monto. Sin servicio |
| `cobros` | `id` | Ingresos: servicio, fecha, monto, concepto, documento? |
| `facturas` | `id` | Facturación (Etapa 5): servicio, número, emisión, vencimiento, importes, estado, saldo (vacía) |
| `pagos` | `id` | Pagos a obligaciones (Etapa 5): fecha, importe, origen, medio (vacía) |
| `movimientos_caja` | `id` | Caja real: fecha, tipo entrada/salida, importe, concepto, referencia (vacía) |
| `tareos` | `id` | Horas por día (Etapa 3): fecha, trabajador, servicio, tarea, horas normales/extras, tarifa, estado (vacía) |
| `config` | `id` | Configuración: empresa PROMCOSER, moneda PEN, regla de indirectos |
| `presupuestos` | `id` | Presupuesto por categoría: servicio, categoría, monto, inicial/adicional, motivo, fecha |

| `cierres` | `id` | Cierres mensuales: mes, estado, responsable, snapshot congelado |

## Relaciones

```
servicios 1──N tareas (servicio_id; padre_id → árbol)
servicios 1──N registros_servicio (servicio_id)
tareas 1──N registros_servicio (tarea_id, nullable; null = sin tarea)
personal 1──N registros_servicio (referencia_id, solo tipo personal)
equipos 1──N registros_servicio (referencia_id, solo tipo equipo)
personal 1──N asignaciones (personal_id) N──1 servicios (servicio_id)
tareas 1──N asignaciones (tarea_id, nullable)
asignaciones 1──N registros_servicio (asignacion_id; solo meses asentados, modalidad mensual)
personal 1──N costos_oficina (personal_id; gasto general, sin servicio)
servicios 1──N cobros (servicio_id)
servicios 1──N facturas (servicio_id); facturas 1──N cobros (factura_id, opcional)
servicios 1──N pagos (servicio_id); registros(gasto) 1──N pagos (gasto_id, opcional)
servicios 1──N presupuestos (servicio_id)

```

## Reglas de negocio (dónde viven)

- **Monto del padre = suma de hijas** (`montoTarea`). Hojas: monto manual editable en Partidas.
- **Valorizado = monto × avance efectivo** (`valorizadoTarea`). Sin metrados.
- **Costo de fila = propio + descendientes** (`costoSubarbol`). Costos sin tarea van al aviso, nunca se pierden.
- **Borrados** (`DataContext ELIMINAR_ITEM`): servicio arrastra registros, tareas, asignaciones y cobros; tarea arrastra subtareas y deja costos sin tarea; asignación con asentados no se puede eliminar (solo baja).
- **Personal**: la proyección (`proyeccionAsignaciones`) es calculada inicio→fin; el gasto nace solo al **asentar** el mes (un registro por asignación vigente, prorrateado por vigencia, `modalidad: 'mensual'` para que siempre cuente). Baja = `fecha_fin`; lo asentado no cambia.
- **Cobros**: cobrado, por cobrar (contratado − cobrado) y utilidad real (cobrado − gastado). Margen teórico (valorizado − costo) se conserva como medida de eficiencia.
- **Resultado empresa** = margen de servicios − gasto de oficina.
- **Registros diarios viejos en domingo no cuentan** (`cuentaComoManoDeObra`); mensuales siempre.

## Migraciones guardadas

- `migrarPresupuestoATareas`: del esquema con `partidas/valorizaciones` al actual (una sola vez al cargar; luego se re-guardia migrado).
- `migrarEstadoV1`: del esquema `promcoser_mvp_v1` (rellena avance, fin estimada, costo/hora).
- Se conservan aunque el código ya no use esos campos: protegen navegadores con datos antiguos.

## Persistencia (Etapa 2)

- Único acceso a `localStorage`: `src/data/store.js` (`cargarEstado`,
  `guardarEstado` con informe de fallo, `validar/normalizar/serializarRespaldo`,
  `siguienteId`). Los componentes no tocan `localStorage` (salvo preferencia
  visual del sidebar). Si el guardado falla, `Layout` muestra alerta y pide
  exportar respaldo.
- Versión de esquema `_v: 3`; respaldos de versión mayor se rechazan; lo
  inválido no destruye lo guardado.
- Finanzas centralizadas en `src/utils/finanzas.js` (resultado/margen bruto,
  desviación, ejecución, saldos, flujo, vigencia, periodos). Política: PEN,
  céntimos, ingresos reconocidos = valorizado salvo criterio formal.

## Convenciones de UI

- Vocabulario único: Personal, Equipos, Cobrado, Por cobrar, Utilidad real, Asentar, Dar de baja, Sin tarea asignada.
- Selectores de datos con búsqueda (`CampoComboBox`); listas de 2–3 opciones fijas con `Select` nativo.
- Contadores en sidebars; sin texto libre donde hay lista válida.
