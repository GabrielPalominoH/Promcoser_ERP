# Modelo de datos — PROMCOSER ERP

Documento técnico breve: colecciones, relaciones y reglas. Todo vive en
`localStorage` (`promcoser_mvp_v2`), sin backend.

## Colecciones (`src/data/mockData.js` → `ESTADO_INICIAL`)

| Colección | Clave | Contenido |
|---|---|---|
| `personal` | `id` | Ficha: nombre, apellido, cargo, DNI, tarifa/hora, ámbito (Obra/Oficina) |
| `equipos` | `id` | Ficha: nombre, costo/hora |
| `servicios` | `id` | Obra: nombre, cliente, tipo, presupuesto inicial, inicio, fin estimado, avance, estatus |
| `tareas` | `id` | Cronograma + montos: servicio, padre (árbol), nombre, fechas, avance %, monto, y en cada hoja el modo de medición del avance (`modo_medicion`, con `pasos`/`nota_justificacion` cuando aplica) |
| `registros_servicio` | `id` | Libro único de costos: servicio, tarea?, tipo, referencia/nombre, cantidad, monto, fecha, modalidad, asignación? |
| `asignaciones` | `id` | Personal asignado: servicio, persona, tarea?, horas/día, tarifa, inicio, fin? (vacío = vigente). El costo mensual se genera automático |
| `costos_oficina` | `id` | Gasto general: persona (ámbito Oficina), mes, monto. Sin servicio |
| `cobros` | `id` | Ingresos (módulo Ingresos en UI): servicio, fecha, monto, concepto, documento? |
| `facturas` | `id` | Facturación: servicio, número, emisión, vencimiento, importes, estado, saldo |
| `config` | `id` | Configuración: empresa PROMCOSER, moneda PEN y meta de ingreso (`meta_ingreso`) |
| `modificaciones` | `id` | Adicional/deductivo contractual: servicio, tipo, número, fecha, descripción, estado, documento, partidas (metrado × PU) e historial de estados |
| `ampliaciones_plazo` | `id` | Ampliación de plazo: servicio, número, fecha de solicitud, días solicitados/aprobados/aplicados, motivo, estado, documento e historial |


## Relaciones

```
servicios 1──N tareas (servicio_id; padre_id → árbol)
servicios 1──N registros_servicio (servicio_id)
tareas 1──N registros_servicio (tarea_id, nullable; null = sin tarea)
personal 1──N registros_servicio (referencia_id, solo tipo personal)
equipos 1──N registros_servicio (referencia_id, solo tipo equipo)
personal 1──N asignaciones (personal_id) N──1 servicios (servicio_id)
tareas 1──N asignaciones (tarea_id, nullable)
asignaciones 1──N registros_servicio (asignacion_id; meses devengados automáticos, modalidad mensual)
personal 1──N costos_oficina (personal_id; gasto general, sin servicio)
servicios 1──N cobros (servicio_id)
servicios 1──N facturas (servicio_id); facturas 1──N cobros (factura_id, opcional)
servicios 1──N modificaciones (servicio_id; adicional/deductivo)
servicios 1──N ampliaciones_plazo (servicio_id)
modificaciones 1──N tareas (servicio_id; al aprobar un adicional sus partidas se materializan como tareas hoja marcadas con modificacion_id)

```

## Reglas de negocio (dónde viven)

- **Monto del padre = suma de hijas** (`montoTarea`). Hojas: monto manual editable en Partidas.
- **Días estimados del padre = suma de hijas** (`diasEstimadosTarea`). Hoja: duración planificada (fin − inicio + 1 día, sale de las fechas del Cronograma).
- **Días reales = fechas distintas con registros de personal propios + descendientes** (`diasRealesTarea`). Desviación = reales − estimados (`desviacionDias`, % `null` sin estimado).
- **Valorizado = monto × avance efectivo** (`valorizadoTarea`). Sin metrados.
- **Modo de medición del avance** (`src/utils/avance.js`, solo hojas): cada tarea hoja declara `modo_medicion` — `metrado` (ejecutado ÷ contratado), `hitos` (suma de los pesos de los `pasos` cumplidos; los pesos suman 100), `tiempo` (días laborables transcurridos ÷ duración, con el calendario de obra y corte a "hoy"), `costo` (costo ejecutado ÷ monto de la partida) o `manual` (excepción: el avance se fija a mano y exige `nota_justificacion`). Los padres no llevan modo: su avance se sigue derivando de las hijas (`avanceEfectivo`). La asignación inicial es aditiva y no altera ningún avance: con metrado → `metrado`; hito sin metrado → `hitos`; sin metrado con costos vinculados → `costo`; el resto → `manual`. El número autoritativo sigue siendo `tarea.avance`; los cálculos por modo se conectan como fuente única en la Fase C.
- **Costo de fila = propio + descendientes** (`costoSubarbol`). Costos sin tarea van al aviso, nunca se pierden.
- **Borrados** (`DataContext ELIMINAR_ITEM`): servicio arrastra registros, tareas, asignaciones, facturas, cobros, modificaciones y ampliaciones de plazo; tarea arrastra subtareas y deja costos sin tarea; asignación arrastra sus meses automáticos.
- **Personal**: costo directo automático desde asignaciones (`diferenciaPersonalAuto` + `proyeccionAsignaciones`); el devengado hasta hoy vive en registros mensuales (`modalidad: 'mensual'` para que siempre cuente). Baja = `fecha_fin`; lo devengado se conserva.
- **Equipos**: el costo es el uso registrado por servicio; sin proyección.
- **Cobros (= Ingresos en UI)**: cobrado y utilidad real (cobrado − gastado). Las facturas son registro documental con saldo y estado propios. En Partidas, el margen por tarea (valorizado − costo) se conserva como medida de avance.
- **Control contra el presupuesto inicial** (`estadoPresupuesto`): gastado, disponible, % de ejecución, excedido y cobrado por servicio. Sin proyecciones: solo lectura para Resumen, Servicios y Dashboard.
- **Sin módulo de pagos, de presupuestos ni de cierre mensual**: no hay `pagos`, `presupuestos` ni `generarCierre`; el panel gerencial no tiene un Resultado del mes contable, solo una evolución de caja real vs proyectada (ver `src/utils/gerencial.js`).
- **Resultado empresa** = utilidad de servicios − gasto de oficina.
- **Registros diarios viejos en domingo no cuentan** (`cuentaComoManoDeObra`); mensuales siempre.
- **Modificaciones contractuales** (`src/utils/modificaciones.js`): presupuesto vigente = original + adicionales aprobados − deductivos aprobados; solo el estado `aprobado` altera el contrato (con historial fechado). Al aprobar un adicional, sus partidas se materializan como tareas hoja (monto = metrado × PU) y entran al cronograma, Curva S, EVM y valorizaciones. Al aprobar una ampliación se desplaza `fecha_fin_estimada` por los días aprobados y se recalcula el cronograma con CPM. `servicioConPresupuestoVigente` inyecta el vigente en Resumen, Curva S, Valorizaciones y Dashboard, conservando el original.

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
- Versión de esquema `_v: 13`; respaldos de versión mayor se rechazan; lo
  inválido no destruye lo guardado. Los respaldos anteriores se rellenan con
  las colecciones nuevas vacías (`modificaciones`, `ampliaciones_plazo`,
  `partes_diario`) y se normaliza el `modo_medicion` de cada tarea hoja
  (`normalizarModoMedicion`, idempotente: no toca ningún avance guardado).
- Finanzas centralizadas en `src/utils/finanzas.js` (resultado/margen bruto,
  saldos, flujo, vigencia, periodos). Política: PEN,
  céntimos, resultado = cobrado − gastado.

## Convenciones de UI

- Vocabulario único: Personal, Equipos, Ingresos, Cobrado, Utilidad real, Pago, Pagado, Dar de baja, Sin tarea asignada.
- Selectores de datos con búsqueda (`CampoComboBox`); listas de 2–3 opciones fijas con `Select` nativo.
- Contadores en sidebars; sin texto libre donde hay lista válida.
