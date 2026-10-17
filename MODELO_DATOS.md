# Modelo de datos — PROMCOSER ERP

Documento técnico breve: colecciones, relaciones y reglas. Todo vive en
`localStorage` (`promcoser_mvp_v2`, esquema `_v: 17`), sin backend; solo los binarios de las fotos del parte diario van a IndexedDB (`src/data/fotos.js`).

## Colecciones (`src/data/mockData.js` → `ESTADO_INICIAL`)

| Colección | Clave | Contenido |
|---|---|---|
| `cargos` | `id` | Catálogo maestro de cargos; el personal se vincula por **nombre** (sin `cargo_id`), y renombrar un cargo arrastra el nombre a las fichas |
| `personal` | `id` | Ficha: nombre, apellido, cargo, DNI, tarifa/hora, ámbito (Obra/Oficina), `activo` (desactivar en vez de borrar si ya está ligado) |
| `equipos` | `id` | Ficha: nombre, costo/hora |
| `servicios` | `id` | Obra: nombre, cliente, tipo, presupuesto inicial, inicio, fin estimado, avance, estatus, y `calendario` opcional (`dias_laborables` y `feriados`, base de la duración en días laborables y del CPM), y parámetros opcionales de alertas (`alerta_inactividad_dias`, `umbral_rendimiento_pct`, `dias_alerta_valorizacion_sin_cobro`; 3 / 70 / 30 por defecto) |
| `tareas` | `id` | Cronograma + montos: servicio, padre (árbol), nombre, fechas, avance %, monto, y en cada hoja el modo de medición del avance (`modo_medicion`, con `pasos`/`nota_justificacion` cuando aplica) |
| `registros_servicio` | `id` | Libro único de costos: servicio, tarea?, tipo, referencia/nombre, cantidad, monto, fecha, modalidad, asignación? |
| `asignaciones` | `id` | Personal asignado: servicio, persona, tarea?, horas/día, tarifa, inicio, fin? (vacío = vigente). El costo mensual se genera automático |
| `costos_oficina` | `id` | Gasto general: persona (ámbito Oficina), mes, monto. Sin servicio |
| `cobros` | `id` | Ingresos (módulo Ingresos en UI): servicio, fecha, monto, concepto, documento?, factura?, `valorizacion_id`? (valorización que cancela) |
| `facturas` | `id` | Facturación: servicio, número, emisión, vencimiento, importes, estado, saldo, `valorizacion_id`? (valorización que cancela) |
| `config` | `id` | Configuración: empresa PROMCOSER, moneda PEN, meta de ingreso (`meta_ingreso`) |
| `lineas_base` | `id` | Copia inmutable del cronograma de un servicio (fechas, montos, metrados) congelada en una fecha; de aquí sale el PV de la Curva S |
| `lecturas_avance` | `id` | Cortes de avance firmados ("a tal fecha la obra iba al X %"); cuando existen, el EV histórico sale de ellas |
| `valorizaciones` | `id` | Valorización de obra por periodo: metrado acumulado por partida menos lo ya valorizado, deducciones (adelantos, fondo de garantía), IGV, detracción y neto; `valorizado_previo` por hoja |
| `adelantos` | `id` | Adelantos directos y de materiales del servicio; se amortizan en las valorizaciones |
| `modificaciones` | `id` | Adicional/deductivo contractual: servicio, tipo, número, fecha, descripción, estado, documento, partidas (metrado × PU) e historial de estados |
| `ampliaciones_plazo` | `id` | Ampliación de plazo: servicio, número, fecha de solicitud, días solicitados/aprobados/aplicados, motivo, estado, documento e historial |
| `partes_diario` | `id` | Jornada de obra: servicio, fecha, clima, responsable, personal/equipos presentes (por id), partidas con su **metrado ejecutado del día** (`metrado_dia`, o `hitos` con los pasos marcados; `avance_dia` solo en filas legado), tolerancia de metrado y `nota_exceso`, incidencias, observaciones y fotos (metadata) |


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
servicios 1──N valorizaciones / lineas_base / lecturas_avance / adelantos (servicio_id)
valorizaciones 1──N cobros (valorizacion_id, opcional; se elige al registrar el cobro)
valorizaciones 1──N facturas (valorizacion_id, opcional; cuando el cobro crea la factura)
servicios 1──N modificaciones (servicio_id; adicional/deductivo)
servicios 1──N ampliaciones_plazo (servicio_id)
modificaciones 1──N tareas (servicio_id; al aprobar un adicional sus partidas se materializan como tareas hoja marcadas con modificacion_id)
servicios 1──N partes_diario (servicio_id)
tareas 1──N partes_diario (tarea_id dentro de `partidas`, nullable)
personal 1──N partes_diario (personal_id dentro de `personal`)
equipos 1──N partes_diario (equipo_id dentro de `equipos`)

```

## Reglas de negocio (dónde viven)

- **Monto del padre = suma de hijas** (`montoTarea`). Hojas: monto manual editable en Partidas.
- **Días estimados del padre = suma de hijas** (`diasEstimadosTarea`). Hoja: duración planificada (fin − inicio + 1 día, sale de las fechas del Cronograma).
- **Días reales = fechas distintas con registros de personal propios + descendientes** (`diasRealesTarea`). Desviación = reales − estimados (`desviacionDias`, % `null` sin estimado).
- **Valorizado = monto × avance efectivo** (`valorizadoTarea`). Sin metrados.
- **Modo de medición del avance** (`src/utils/avance.js`, solo hojas): cada tarea hoja declara `modo_medicion` — `metrado` (ejecutado ÷ contratado), `hitos` (suma de los pesos de los `pasos` cumplidos; los pesos suman 100), `tiempo` (días laborables transcurridos ÷ duración, con el calendario de obra y corte a "hoy"), `costo` (costo ejecutado ÷ monto de la partida) o `manual` (excepción: el avance se fija a mano y exige `nota_justificacion`). Los padres no llevan modo: su avance se sigue derivando de las hijas (`avanceEfectivo`). La asignación inicial es aditiva y no altera ningún avance: con metrado → `metrado`; hito sin metrado → `hitos`; sin metrado con costos vinculados → `costo`; el resto → `manual`. `tarea.avance` es un **caché derivado**: `recalcularAvances` lo recalcula por modo al cargar/restaurar y tras cada cambio, y `metrado_previo`/`costo_previo` guardan lo ejecutado antes del sistema para que ningún avance ya registrado se mueva.
- **Parte diario = captura del avance** (`src/utils/partesDiario.js`): cada fila de partida guarda el **metrado ejecutado del día** (`metrado_dia`, en la unidad de la tarea) o los `hitos` (ids de los pasos cumplidos ese día, con quién y cuándo). El avance de la tarea se deriva de la suma de todos sus partes (`metradoEjecutadoAcumulado` ÷ metrado contratado; `avanceDePartes` respeta el modo: metrado, hitos o el `avance_dia` legado) y `recalcularAvanceTareas` lo sincroniza al guardar (solo las tareas que aparecen en algún parte). El acumulado no debe superar el metrado contratado más una tolerancia (5 % por defecto, `tolerancia_metrado` en el parte); si lo supera, el parte exige `nota_exceso`. Los partes anteriores a la Fase B (avance diario en %) se migran con pérdida cero a `metrado_dia` cuando la tarea tiene metrado; los de tareas sin metrado quedan como registro legado de solo lectura.
- **Valorización** (`src/utils/valorizaciones.js`): por partida, importe = (metrado acumulado a la fecha de corte − ya valorizado) × PU; sobre el bruto se descuentan la amortización de adelantos y el fondo de garantía, luego IGV y detracción hasta el neto. `valorizado_previo` (por defecto igual a `metrado_previo`) es lo cobrado antes del sistema: la primera valorización solo cobra la diferencia. Antes de cerrarla se puede ajustar el metrado a valorizar por partida.
- **Línea base y Curva S** (`lineaBase.js`, `curvaS.js`): PV sale de la línea base congelada, AC del costo real y EV del avance (o de las lecturas firmadas); SPI/CPI/EAC sobre esas tres series.
- **Alertas de partidas** (`alertas.js`): vencida (cualquier modo), inactividad y rendimiento (solo modo metrado); los umbrales son por obra.
- **Costo de fila = propio + descendientes** (`costoSubarbol`). Costos sin tarea van al aviso, nunca se pierden.
- **Borrados** (`DataContext ELIMINAR_ITEM`): servicio arrastra registros, tareas, asignaciones, facturas, cobros, modificaciones y ampliaciones de plazo; tarea arrastra subtareas y deja costos sin tarea; asignación arrastra sus meses automáticos.
- **Personal**: costo directo automático desde asignaciones (`diferenciaPersonalAuto` + `proyeccionAsignaciones`); el devengado hasta hoy vive en registros mensuales (`modalidad: 'mensual'` para que siempre cuente). Baja = `fecha_fin`; lo devengado se conserva.
- **Equipos**: el costo es el uso registrado por servicio; sin proyección.
- **Cobros (= Ingresos en UI)**: cobrado y utilidad real (cobrado − gastado). Las facturas son registro documental con saldo y estado propios. En Partidas, el margen por tarea (valorizado − costo) se conserva como medida de avance.
- **Cobro de una valorización** (`estadoCobroValorizacion`): primero el vínculo explícito (`cobros.valorizacion_id` / `facturas.valorizacion_id`, elegido al registrar el cobro, o `cobrada`/`cobro_id` de la propia valorización); el texto del concepto ("valorización N° 3") queda solo como respaldo. Si no hay vínculo y la obra tiene cobros, la alerta lo advierte en su mensaje ("No se pudo confirmar el cobro"). El umbral de días sin cobrar es configurable por obra (`dias_alerta_valorizacion_sin_cobro`).
- **Centro de alertas** (`src/utils/alertasCentro.js`, fuente única): la campana del encabezado, el Resumen y el Dashboard leen las mismas alertas. Cada alerta guarda su **causa** (datos estables: tipo, ids, fechas) y su **medida** (valor que crece), más `meta` por compatibilidad. Al descartar se persisten causa, medida y gravedad original: la alerta reaparece solo si **cambia la causa**, **sube la gravedad** o **la medida empeora más allá del escalón de su tipo** (+7 días en atrasos, días sin partes y plazo próximo; +10 % en montos; 10 puntos de desvío); un día más, o cualquier cambio menor, no la reactiva. El estado del usuario vive en `alertasEstado = { pospuestas, descartadas }` dentro del estado: no es una colección de `ESTADO_INICIAL`.
- **Control contra el presupuesto inicial** (`estadoPresupuesto`): gastado, disponible, % de ejecución, excedido y cobrado por servicio. Sin proyecciones: solo lectura para Resumen, Servicios y Dashboard.
- **Sin módulo de pagos, de presupuestos ni de cierre mensual**: no hay `pagos`, `presupuestos` ni `generarCierre`; el panel gerencial no tiene un Resultado del mes contable, solo una evolución de caja real vs proyectada (ver `src/utils/gerencial.js`).
- **Resultado empresa** = utilidad de servicios − gasto de oficina.
- **Registros diarios viejos en domingo no cuentan** (`cuentaComoManoDeObra`); mensuales siempre.
- **Modificaciones contractuales** (`src/utils/modificaciones.js`): presupuesto vigente = original + adicionales aprobados − deductivos aprobados; solo el estado `aprobado` altera el contrato (con historial fechado). Al aprobar un adicional, sus partidas se materializan como tareas hoja (monto = metrado × PU) y entran al cronograma, Curva S, EVM y valorizaciones. Al aprobar una ampliación se desplaza `fecha_fin_estimada` por los días aprobados y se recalcula el cronograma con CPM. `servicioConPresupuestoVigente` inyecta el vigente en Resumen, Curva S, Valorizaciones y Dashboard, conservando el original.

## Migraciones guardadas

- `migrarPresupuestoATareas`: del esquema con `partidas/valorizaciones` al actual (una sola vez al cargar; luego se re-guardia migrado).
- `migrarEstadoV1`: del esquema `promcoser_mvp_v1` (rellena avance, fin estimada, costo/hora).
- `migrarPartesAMetrado`: del parte diario en % (`avance_dia`) al metrado del día (`metrado_dia = % × metrado ÷ 100`), idempotente; las filas de tareas sin metrado se conservan como legado.
- `migrarVinculoValorizacion`: agrega `valorizacion_id: null` a los cobros y facturas que no lo tengan (esquema v17), idempotente y **sin cambiar ningún importe**.
- `normalizarModoMedicion`: asigna el `modo_medicion` de cada hoja y retira el flag `avance_por_partes` (deprecado: metrado si la tarea lo tiene, si no `manual` con nota).
- `migrarAvancePrevio` / `migrarValorizadoPrevio`: rellenan `metrado_previo`/`costo_previo` y `valorizado_previo` sin mover ningún avance ni cobro (esquemas v15 y v16).
- `normalizarEstadoAlertas`: normaliza el estado de alertas pospuestas/descartadas guardado.
- Se conservan aunque el código ya no use esos campos: protegen navegadores con datos antiguos.

## Persistencia (Etapa 2)

- Único acceso a `localStorage`: `src/data/store.js` (`cargarEstado`,
  `guardarEstado` con informe de fallo, `validar/normalizar/serializarRespaldo`,
  `siguienteId`). Los componentes no tocan `localStorage` (salvo preferencia
  visual del sidebar). Si el guardado falla, `Layout` muestra alerta y pide
  exportar respaldo.
- Versión de esquema `_v: 17`; respaldos de versión mayor se rechazan; lo
  inválido no destruye lo guardado. Los respaldos anteriores se rellenan con
  las colecciones nuevas vacías (`modificaciones`, `ampliaciones_plazo`,
  `partes_diario`) y se normalizan (idempotente: no toca ningún avance
  guardado): `modo_medicion` de cada tarea hoja, el metrado del parte diario
  (`normalizarModoMedicion` + `migrarPartesAMetrado`), el vínculo
  valorización→cobro (`migrarVinculoValorizacion`) y el estado del centro de
  alertas (`normalizarEstadoAlertas`).
- Finanzas centralizadas en `src/utils/finanzas.js` (resultado/margen bruto,
  saldos, flujo, vigencia, periodos). Política: PEN,
  céntimos, resultado = cobrado − gastado.

## Usuarios y sesión (fuera del respaldo)

`src/data/auth.js` guarda en `localStorage` la lista de usuarios (`promcoser_usuarios_v1`: id, nombre, cargo (descriptivo, opcional), correo, rol, activo, sal y resumen SHA-256 iterado de la clave; nunca la clave en texto), la sesión (`promcoser_sesion`, 8 h) y el bloqueo por intentos fallidos (5 fallos → 60 s). Roles: `administrador`, `gerencia` (solo lectura), `residente` (opera la obra) y `administracion` (finanzas); la matriz vive en `src/utils/permisos.js`. Los usuarios **no viajan en el respaldo** ni en "Restablecer"/"Vaciar todo".

## Preferencias de operación (no son datos de negocio)

`store.js` guarda aparte, sin entrar al respaldo: `promcoser_inicializado` (ya se eligió cómo empezar),
`promcoser_ultimo_respaldo` (fecha del último respaldo descargado; el sistema avisa a los 7 días o si
el almacenamiento supera ~4 MB) y las preferencias visuales (tema, sidebar).

## Convenciones de UI

- Vocabulario único: Personal, Equipos, Ingresos, Cobrado, Utilidad real, Devengado, Dar de baja, Sin tarea asignada.
- Selectores de datos con búsqueda (`CampoComboBox`); listas de 2–3 opciones fijas con `Select` nativo.
- Contadores en sidebars; sin texto libre donde hay lista válida.
