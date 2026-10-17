# DOCUMENTACIÓN TÉCNICA DEL SISTEMA — PROMCOSER ERP

Documento exhaustivo que explica **cada** número que muestra el sistema: de dónde
sale, cómo se calcula y por qué da ese valor. Los ejemplos usan los datos de
ejemplo: tres obras —servicio 6 *Mejoramiento del servicio de agua potable y
alcantarillado – AA.HH. San Isidro (II Etapa)*, servicio 7 *Mejoramiento y
ampliación de pistas y veredas – Jr. Amazonas* y servicio 8 *Mantenimiento de
redes de agua potable – Sector Muyuna*— y están verificados contra la suite
(`npm run verificar`, 882 pruebas).

> **Verificación**: cada cifra de este documento puede reproducirse con la suite.
> Si cambias semillas o fórmulas, actualiza este documento y la suite.

---

## 1. Modelo de datos

Todo vive en `src/data/mockData.js` (`ESTADO_INICIAL`). Colecciones vivas
(sin `presupuestos`, `pagos` ni `partidas`):

| Colección | Qué guarda |
|---|---|
| `cargos` | Catálogo maestro de cargos (el personal se vincula por nombre) |
| `personal` | Fichas: nombre, apellido, cargo, DNI, `tarifa_por_hora`, `ambito` (Obra/Oficina) |
| `equipos` | Fichas: nombre, `costo_por_hora`, `propiedad` (Propio/Alquilado) |
| `servicios` | Obra: nombre, cliente, tipo, `presupuesto_asignado`, fechas, `avance`, estatus, y parámetros de alertas (`alerta_inactividad_dias`, `umbral_rendimiento_pct`, `dias_alerta_valorizacion_sin_cobro`) |
| `tareas` | Árbol del cronograma: `servicio_id`, `padre_id` (nullable = raíz), nombre, fechas, `avance` (caché derivado), `monto`; en las hojas `modo_medicion`, `metrado`, `unidad`, `precio_unitario`, `metrado_previo`/`costo_previo`/`valorizado_previo` y dependencias |
| `registros_servicio` | Libro único de costos: servicio, `tarea_id` (nullable), `tipo_registro` (material/personal/equipo/gasto), `referencia_id`, `cantidad_o_horas`, `monto_calculado`, `fecha`, `modalidad`, `asignacion_id` |
| `asignaciones` | Personal asignado a un servicio: `horas_por_dia`, `tarifa`, `fecha_inicio`, `fecha_fin` |
| `cobros` | Ingresos recibidos: servicio, `fecha`, `monto`, `concepto`, `documento`, `factura_id`, `valorizacion_id` (valorización que cancela, opcional) |
| `facturas` | Documentos de cobro: número, emisión, vencimiento, base/impuestos/total, estado, `notas_credito`, `valorizacion_id` (opcional) |
| `costos_oficina` | Gasto general: persona de ámbito Oficina, `mes`, monto |
| `config` | Documento único (id 1): empresa, moneda, `meta_ingreso` |
| `lineas_base` | Versión congelada del plan de un servicio (PV de la Curva S) |
| `lecturas_avance` | Lecturas de avance del EV con corte y valor ganado |
| `valorizaciones` | Valorizaciones de cobro del servicio (metrado, retenciones, adelantos, IGV) |
| `adelantos` | Adelantos directos/por materiales entregados al servicio |
| `modificaciones` | Adicional/deductivo contractual: tipo, número, fecha, estado, partidas (metrado × PU), historial |
| `ampliaciones_plazo` | Ampliación de plazo: días solicitados/aprobados/aplicados, motivo, estado, historial |
| `partes_diario` | Jornada de obra: fecha, clima, responsable, personal y equipos presentes, partidas con su `metrado_dia` (o `hitos`), `tolerancia_metrado`/`nota_exceso`, incidencias, observaciones y fotos |

### Relaciones que importan para el cálculo
- `servicio 1──N tareas` y `tareas 1──N tareas` (árbol multinivel vía `padre_id`).
- `tarea 1──N registros_servicio` (`tarea_id`; **`null` = sin tarea asignada**, se cuenta aparte).
- `servicio 1──N cobros` y `servicio 1──N facturas`; `factura 1──N cobros` (aplicaciones). `valorizaciones 1──N cobros` y `valorizaciones 1──N facturas` vía `valorizacion_id` (opcional, vínculo explícito).
- `personal 1──N asignaciones` → generan **registros mensuales automáticos** de tipo `personal` con `asignacion_id` (ver §4).
- `servicio 1──N modificaciones` (adicional/deductivo) y `servicio 1──N ampliaciones_plazo`; al aprobar un adicional sus partidas se materializan como tareas hoja.
- `servicio 1──N partes_diario`; sus filas referencian `tarea_id` (el metrado ejecutado del día) y el avance de la tarea se deriva de la suma de sus partes (ver §5.2).
- `borrar servicio` arrastra registros, tareas, asignaciones, facturas, cobros, líneas base, lecturas de avance, valorizaciones, adelantos, modificaciones, ampliaciones de plazo y partes diarios (cascada en `DataContext`).
- `esquema`: `_v: 17`; el historial de versiones está en el encabezado de `src/data/store.js`.

---

## 2. Datos de ejemplo (verificados hoja por hoja)

### Servicio 6 — "Mejoramiento del servicio de agua potable y alcantarillado – AA.HH. San Isidro (II Etapa)"
```
nombre_servicio     = Mejoramiento del servicio de agua potable y alcantarillado – AA.HH. San Isidro (II Etapa)
cliente             = Municipalidad Distrital de Salas
tipo                = Obra
presupuesto_asignado= 335,000.00
fecha_inicio        = 2026-06-01
fecha_fin_estimada  = 2026-12-20
avance              = 0   ← NO se usa: el avance sale del cronograma
estatus             = En curso
```

### Árbol de tareas (servicio 6)
| id | nombre | padre | inicio | fin | avance | monto | duración | modo |
|---|---|---|---|---|---|---|---|---|
| 13 | Obras preliminares y trazo | — | 01/06 | 15/06 | 100% | 15,000 | 15 d | costo |
| 14 | Redes de agua potable | — | 16/06 | 15/08 | 0 (auto) | 0 | — | — |
| 15 | Excavación y tendido de tubería PVC | 14 | 16/06 | 15/07 | 100% | 42,000 | 30 d | metrado |
| 16 | Pruebas hidráulicas y empalmes | 14 | 16/07 | 15/08 | 100% | 33,000 | 31 d | metrado |
| 17 | Redes de alcantarillado | — | 16/08 | 31/10 | 0 (auto) | 0 | — | — |
| 18 | Excavación e instalación de colectores | 17 | 16/08 | 30/09 | 85% | 58,000 | 46 d | metrado |
| 19 | Buzones y conexiones domiciliarias | 17 | 01/10 | 31/10 | 40% | 47,000 | 31 d | metrado |
| 20 | Reposición de pavimento y veredas | — | 01/11 | 05/12 | 0% | 62,000 | 35 d | metrado |
| 21 | Caseta de bombeo y equipamiento hidráulico | — | 15/11 | 20/12 | 0% | 78,000 | 36 d | metrado |

La columna **modo** es el modo de medición del avance (§5.1): solo las hojas lo
llevan; los padres (14 y 17) lo dejan vacío. Las hojas con metrado miden por
`metrado`; la 13, sin metrado pero con costos cargados, mide por `costo`.

**Montos automáticos**: las tareas con hijas (14 y 17) tienen `monto: 0` y
muestran la **suma de sus hijas**:
- Redes de agua potable (14) = 42,000 + 33,000 = **75,000**
- Redes de alcantarillado (17) = 58,000 + 47,000 = **105,000**
- Total montos = 15,000 + 75,000 + 105,000 + 62,000 + 78,000 = **335,000** ✓

### Registros del servicio 6 (libro único de costos)
| id | fecha | tipo | tarea | detalle | cant. | monto |
|---|---|---|---|---|---|---|
| 19 | 20/06 | material | 15 | Cemento Portland Tipo I | 260 | 10,010 |
| 20 | 28/06 | material | 15 | Tubería PVC 160 mm × 6 m | 90 | 8,100 |
| 21 | 03/06 | equipo | 13 | Equipo ref. 1 (100 h × 60) | 100 | 6,000 |
| 22 | 02/06 | gasto | 13 | Servicio de topografía y trazo | 1 | 3,500 |
| 23 | 05/06 | gasto | 13 | Flete de tubería y materiales | 1 | 1,800 |
| 24 | 22/06 | equipo | 15 | Equipo ref. 3 (60 h × 150) | 60 | 9,000 |
| 25 | 20/06 | personal | 15 | Persona ref. 25 (40 h × 25) | 40 h | 1,000 |
| 26 | 22/07 | material | 16 | Arena gruesa | 45 | 2,790 |
| 27 | 25/07 | equipo | 16 | Equipo ref. 23 (80 h × 80) | 80 | 6,400 |
| 28 | 10/07 | gasto | 15 | Eliminación de desmonte | 1 | 2,200 |
| 29 | 22/07 | personal | 16 | Persona ref. 14 (32 h × 25) | 32 h | 800 |
| 30 | 05/09 | material | 18 | Tubería PVC 200 mm × 6 m | 120 | 13,200 |
| 31 | 12/09 | equipo | 18 | Equipo ref. 6 (70 h × 150) | 70 | 10,500 |
| 32 | 08/09 | gasto | 18 | Alquiler de excavadora 320 | 1 | 8,000 |
| 33 | 12/09 | gasto | — | Movilidad del personal | 1 | 900 |
| 34 | 05/09 | personal | 18 | Persona ref. 9 (32 h × 25) | 32 h | 800 |
| 35 | 08/10 | material | 19 | Ladrillo KK 18 huecos | 3,500 | 4,725 |
| 36 | 06/10 | equipo | 19 | Equipo ref. 1 (40 h × 60) | 40 | 2,400 |
| 37 | 10/10 | material | 19 | Cemento Portland Tipo I | 120 | 4,620 |
| 38 | 08/10 | personal | 19 | Persona ref. 12 (24 h × 25) | 24 h | 600 |

**Total gastado** = 10010+8100+6000+3500+1800+9000+1000+2790+6400+2200+800+13200
+10500+8000+900+800+4725+2400+4620+600 = **97,345.00** ✓ (29.06 % del presupuesto).

### Cobros (ingresos) y facturas
| id | fecha | monto | concepto | factura |
|---|---|---|---|---|
| 1 | 05/06 | 50,250 | adelanto | — (sin factura) |
| 2 | 10/08 | 60,000 | valorización N°1 | F001-000101 (aplicado, saldo 0) |
| 3 | 10/10 | 45,000 | valorización N°2 | F001-000102 (aplicado, saldo 0) |

**Total cobrado = 155,250.00**.

| factura | emisión | vencimiento | total | estado | saldo |
|---|---|---|---|---|---|
| F001-000101 | 08/08 | 08/09 | 60,000 | emitida (cobrada: cobro 2 la cancela) | 0 |
| F001-000102 | 05/10 | 05/11 | 45,000 | emitida (cobrada: cobro 3 la cancela) | 0 |
| F001-000103 | 12/10 | 12/11 | 52,500 | emitida (pendiente) | 52,500 |

Regla de coherencia: ningún cobro aplicado excede el saldo de su factura
(`resolverFacturaIngreso`); los adelantos no tienen factura.

### Asignaciones (motor del costo personal)
| id | servicio | persona | tarea | h/día | tarifa | inicio | fin |
|---|---|---|---|---|---|---|---|
| 1 | 6 | 26 (Damian C. Cayo Gutierrez, capataz) | 15 | 8 | 40 | 16/06 | vigente |
| 2 | 6 | 3 (Ronald M. Alvarado Agreda, ayudante) | 18 | 8 | 18 | 16/08 | 30/09 (baja) |
| 3 | 6 | 17 (Miguel Á. Cabrera Barranca, operario) | 19 | 8 | 25 | 01/10 | 31/10 (baja) |

Detalle mensual de cada una en §4.

### Costos de oficina
6 registros: sep 6,300 (4500+1800) y oct 17,500 (4500+3200+1800+8000)
= **23,800.00** total.

### Servicio 7 — "Mejoramiento y ampliación de pistas y veredas – Jr. Amazonas"
Obra pensada para **ejercitar los casos difíciles**: arrastra retraso y
sobrecosto desde marzo, de modo que el gráfico combinado del panel tenga
columnas y las dos líneas con valores reales.

```
nombre_servicio     = Mejoramiento y ampliación de pistas y veredas – Jr. Amazonas
cliente             = Municipalidad Provincial de Chachapoyas
tipo                = Obra
presupuesto_asignado= 180,000.00
fecha_inicio        = 2026-03-02
fecha_fin_estimada  = 2026-10-25
estatus             = En curso
```

**Árbol de tareas (servicio 7)** — todas raíz (sin jerarquía):
| id | nombre | inicio | fin | avance | monto | duración |
|---|---|---|---|---|---|---|
| 22 | Trabajos preliminares y trazo | 02/03 | 20/03 | 100 % | 18,000 | 19 d |
| 23 | Movimiento de tierras | 21/03 | 30/06 | 100 % | 52,000 | 102 d |
| 24 | Pavimento rígido (losas) | 01/07 | 15/10 | 45 % | 80,000 | 107 d |
| 25 | Señalización y áreas verdes | 16/10 | 25/10 | 0 % | 30,000 | 10 d |

Suma de montos = 18,000+52,000+80,000+30,000 = **180,000.00** ✓ (igual al
presupuesto). Avance global (`metricasCronograma.avanceGlobal`, ponderado por
duración) = **71 %** a la fecha de corte (14/10/2026): las tareas 22 y 23 están
al 100 %, la 24 al 45 % y la 25 (que recién empieza el 16/10) al 0 %.

**Registros del servicio 7** (libro único de costos, ids 39–47):
| id | fecha | tipo | tarea | detalle | cantidad | monto |
|---|---|---|---|---|---|---|
| 39 | 20/09 | material | 24 | Concreto premezclado f'c=210 | 250 m³ | 60,000 |
| 40 | 25/08 | material | 24 | Acero de refuerzo fy=4200 | 3,600 kg | 36,000 |
| 41 | 10/05 | material | 23 | Base granular | 400 m³ | 24,000 |
| 42 | 15/03 | material | 22 | Agregados y cemento para trazo | 120 | 7,000 |
| 43 | 25/09 | equipo | 24 | Mezcladora de concreto (equipo 23, 80/h) | 175 h | 14,000 |
| 44 | 30/08 | equipo | 24 | Camioneta CNS-898 (equipo 1, 60/h) | 200 h | 12,000 |
| 45 | 05/07 | gasto | 24 | Alquiler de volquete | 1 | 9,000 |
| 46 | 10/09 | personal | 24 | Persona 12, 25/h | 240 h | 6,000 |
| 47 | 01/06 | gasto | 23 | Eliminación de desmonte | 1 | 7,000 |

**Total gastado = 60,000+36,000+24,000+7,000+14,000+12,000+9,000+6,000+7,000
= 175,000.00** → 97.2 % de los 180,000 presupuestados, pero contra un avance del
71 %: por eso el desfase de costo es alto.

Gasto por mes (`gastoPorMes`, serie continua):
| mes | monto | de dónde |
|---|---|---|
| mar | 7,000 | reg. 42 |
| abr | 0 | mes intermedio |
| may | 24,000 | reg. 41 |
| jun | 7,000 | reg. 47 |
| jul | 9,000 | reg. 45 |
| ago | 48,000 | reg. 40 (36,000) + reg. 44 (12,000) |
| sep | 80,000 | reg. 39 (60,000) + reg. 43 (14,000) + reg. 46 (6,000) |
| oct | 0 | sin registros |

Suma = 7,000+24,000+7,000+9,000+48,000+80,000 = **175,000.00** ✓.

**Cobros y facturas (servicio 7)**:
| id | fecha | monto | concepto | factura |
|---|---|---|---|---|
| 4 | 20/04 | 98,000 | adelanto | — (sin factura) |
| 5 | 15/08 | 60,000 | valorización N°1 | F002-000201 (aplicado, saldo 0) |

**Total cobrado = 158,000.00**.

| factura | emisión | vencimiento | total | estado | saldo |
|---|---|---|---|---|---|
| F002-000201 | 12/08 | 12/09 | 60,000 | emitida (cobrada: cobro 5 la cancela) | 0 |

Utilidad real del servicio 7 = 158,000 − 175,000 = **−17,000.00** (pérdida: gastó
más de lo que cobró). Es la obra que empuja el resultado de la empresa hacia
abajo y la que marca 🟡 en el semáforo (plazo cercano: vence el 25/10).

### Servicio 8 — "Mantenimiento de redes de agua potable – Sector Muyuna"
Obra **sana**: dentro de plazo y con gasto por debajo del valor ganado. Sirve de
contrapeso para que el desfase de costo promedio de la cartera no sea uniforme.

```
nombre_servicio     = Mantenimiento de redes de agua potable – Sector Muyuna
cliente             = Municipalidad Distrital de la Banda de Shilcayo
tipo                = Misceláneo
presupuesto_asignado= 95,000.00
fecha_inicio        = 2026-08-01
fecha_fin_estimada  = 2027-02-28
estatus             = En curso
```

**Árbol de tareas (servicio 8)** — todas raíz:
| id | nombre | inicio | fin | avance | monto | duración |
|---|---|---|---|---|---|---|
| 26 | Inspección y limpieza de reservorios | 01/08 | 15/09 | 100 % | 22,000 | 46 d |
| 27 | Reparación de tuberías y válvulas | 16/09 | 20/12 | 100 % | 43,000 | 96 d |
| 28 | Rehabilitación de cámaras de bombeo | 21/12 | 28/02/27 | 0 % | 30,000 | 70 d |

Suma de montos = 22,000+43,000+30,000 = **95,000.00** ✓.

**Registros del servicio 8** (ids 48–51):
| id | fecha | tipo | tarea | detalle | cantidad | monto |
|---|---|---|---|---|---|---|
| 48 | 20/08 | material | 26 | Cemento y mortero | 180 | 9,000 |
| 49 | 05/10 | material | 27 | Tubería PVC y accesorios | 90 | 12,000 |
| 50 | 28/08 | equipo | 26 | Mezcladora de concreto (equipo 23, 80/h) | 62.5 h | 5,000 |
| 51 | 30/09 | personal | 27 | Persona 9, 25/h | 240 h | 6,000 |

**Total gastado = 9,000+12,000+5,000+6,000 = 32,000.00** (33.7 % del presupuesto,
muy por debajo de su avance: por eso su desfase de costo es 0).

Gasto por mes:
| mes | monto | de dónde |
|---|---|---|
| ago | 14,000 | reg. 48 (9,000) + reg. 50 (5,000) |
| sep | 6,000 | reg. 51 |
| oct | 12,000 | reg. 49 |
| nov–feb | 0 | sin registros (aún) |

**Cobros y facturas (servicio 8)**:
| id | fecha | monto | concepto | factura |
|---|---|---|---|---|
| 6 | 05/08 | 30,000 | adelanto | — (sin factura) |

**Total cobrado = 30,000.00**.

| factura | emisión | vencimiento | total | estado | saldo |
|---|---|---|---|---|---|
| F003-000301 | 08/10 | 08/11 | 35,000 | emitida (pendiente) | 35,000 |

Utilidad real del servicio 8 = 30,000 − 32,000 = **−2,000.00** (levemente
negativa a la fecha porque el gasto va adelantado al cobro; no es sobrecosto).

### Cartera completa (3 obras) — totales que usan el panel y la suite
| servicio | presupuesto | gastado | cobrado | utilidad real |
|---|---|---|---|---|
| 6 — Agua potable San Isidro | 335,000.00 | 97,345.00 | 155,250.00 | +57,905.00 |
| 7 — Pistas y veredas Jr. Amazonas | 180,000.00 | 175,000.00 | 158,000.00 | −17,000.00 |
| 8 — Redes Muyuna | 95,000.00 | 32,000.00 | 30,000.00 | −2,000.00 |
| **Total** | **610,000.00** | **304,345.00** | **343,250.00** | **+38,905.00** |

Estos totales son la base del §8 (resultado empresa y caja) y del gráfico
combinado del panel (§9), cuya fórmula vive en §3.4.

---

## 3. Fórmulas maestras (dónde viven y qué calculan)

Toda la lógica vive en `src/utils/`; las pantallas **no recalculan**.

### 3.1 `calculadora.js` — el corazón
| Función | Fórmula | Ejemplo serv. 6 |
|---|---|---|
| `sumarMontos(registros)` | Σ `monto_calculado` | 97,345 |
| `desglosePorTipo(registros)` | Σ por `tipo_registro` | material 43,445 / personal 3,200 / equipo 34,300 / gasto 16,400 |
| `registrosDeServicio(regs, id)` | filtra `servicio_id === id` | 20 registros |
| `montoTarea(t, tareas)` | hoja: `monto`; padre: Σ hijas (recursivo) | Redes de agua 75,000 |
| `avanceEfectivo(t, tareas)` | hoja: `avance`; padre: promedio ponderado por duración de hijas | ver §5 |
| `avancePorMetrado/Hitos/Tiempo/Costo` (§5.1) | avance según el `modo_medicion` de cada hoja | 600/600 → 100 % |
| `valorizadoTarea(t, tareas)` | `montoTarea × avanceEfectivo / 100` | Tendido PVC 42,000 |
| `costoPorTarea(regs, id, tarea)` | Σ montos con `tarea_id === tarea` | Tendido PVC 30,310 |
| `costoSubarbol(t, tareas, regs, id)` | propio + Σ `costoSubarbol(hijas)` | Redes de agua 40,300 |
| `costoSinTarea(regs, id)` | Σ con `tarea_id == null` | 900 (movilidad) |
| `presupuestoTareas(tareas, id)` | Σ `montoTarea` de raíces | 335,000 |
| `estadoPresupuesto(s, regs, cobros)` | `{presupuesto, gastado, disponible, porcentaje, excedido, cobrado}` | 335,000 / 97,345 / 237,655 / 29.06 % / false / 155,250 |
| `horasPorMes(regs, id)` | Σ `cantidad_o_horas` de personal por mes, serie continua con ceros | jun–oct: 40/32/0/32/24 |
| `metricasCronograma(tareas)` | conteos por estado + avance global ponderado por duración | 9 / 4 / 66 % |
| `indiceAvance(servicio, avance)` | SPI = avance ÷ esperado por tiempo transcurrido | 0.99 |
| `gastoPorMes(regs)` | Σ `monto_calculado` por mes, serie continua | jun 39,410 / jul 12,190 / ago 0 / sep 33,400 / oct 12,345 |
| `proyeccionAsignaciones(asig, serv, regs)` | costo mensual devengado + proyectado (ver §4) | total 71,824 |
| `diferenciaPersonalAuto(...)` | qué registros mensuales crear/actualizar/eliminar | sincroniza asentamiento |
| `diasEstimadosTarea(t, tareas)` | duración `fin − inicio + 1`; padre Σ hijas | Tendido PVC 30 d |
| `diasRealesTarea(t, tareas, regs, id)` | fechas distintas con registros de personal (subárbol) | Colectores 1 d |
| `desviacionDias(est, real)` | `{diferencia: real − est, porcentaje}` | ver §6 |
| `utilidadReal(cobrado, gastado)` | `cobrado − gastado` | 57,905 |
| `cobradoServicio(cobros, id)` | Σ `monto` del servicio | 155,250 |
| `alertasServicio({estado, dias})` | excedido / margen-bajo / plazo | [] |
| `proyeccionFinanciera({...})` | ver §7 | utilidad proy. 187,507.58 |
| `mediaMovil(valores, 3)` | promedio de los últimos 3 | ver §9.1 |

### 3.2 `finanzas.js`
| Función | Fórmula | Uso |
|---|---|---|
| `resultadoBruto(ing, costo)` | `ing − costo` | núcleo |
| `margenBruto(res, ing)` | `res ÷ ing × 100`, `null` si ing = 0 | KPIs |
| `porcentajeEjecucion(costo, base)` | `costo ÷ base × 100`, `null` si base = 0 | tablas |
| `saldoFactura(f, cobros)` | `total − aplicado − notas_credito` | Ingresos |
| `estadoFactura(f, cobros, hoy)` | anulada / cobrada / parcial / emitida / vencida | Ingresos |
| `distribuirIndirectos` | **RETIRADO** (la oficina no se atribuye por servicio) | — |

### 3.3 `gerencial.js` (compone, no reimplementa)
| Función | Compone |
|---|---|
| `analizarServicios` | `sumarMontos` + `estadoPresupuesto` + `utilidadReal` + `diasRestantes` → motivos de riesgo (excedido, plazo) |
| `kpisEmpresa` | gastado = Σ registros; cobrado = Σ `cobradoServicio`; utilidad = `utilidadReal(cobrado, gastado)`; oficina = Σ costos_oficina; **resultado = utilidad − oficina** |
| `rentabilidadPorCliente` | agrupa por cliente: gastado, cobrado, utilidad, `utilidadPct = margenBruto(utilidad, cobrado)` |
| `flujoCajaMensualReal` | por mes: cobrado (cobros), egresoObra (registros), oficina (costos), `margenReal = cobrado − egresoObra − oficina` |
| `proyeccionMensualPersonal` | `proyeccionAsignaciones` por servicio, solo meses estimados |
| `variacionMensual(serie, campo)` | mes actual vs. anterior; `null` si < 2 puntos o base 0 |
| `estadoEmpresa` | rojo si resultado < 0; amarillo si obras en riesgo o caja del mes < 0; verde si no |
| `avanceMetaIngreso` | logrado ÷ meta; `null` si no hay meta |
| `desfaseMensualProyectos(...)` | serie mensual de cartera (volumen + desfases) para el gráfico combinado; ver §3.4 |

### 3.4 `desfaseMensualProyectos` — el motor del gráfico combinado
`desfaseMensualProyectos({ servicios, tareas, registros, hoy })` devuelve la serie
mensual que consume el **Gráfico combinado de columnas y líneas con doble eje Y**
del panel (ver §9). Ventana: del mes de la obra más antigua al de la que termina
más tarde; `hoy` por defecto es la fecha del sistema.

```
serie[i] = {
  mes,           // 'YYYY-MM'
  activos,       // obras cuyo [fecha_inicio, fecha_fin] cubre algún día del mes
  evaluables,    // obras activas con avance esperado > 0 hasta el corte
  conRetraso,    // evaluables cuyo avance real + 0.5 pts < avance esperado
  desfaseTiempo, // conRetraso ÷ evaluables × 100   (null si evaluables = 0 o mes futuro)
  desfaseCosto,  // promedio por obra de max(0, (AC − EV) ÷ EV × 100)  (null sin base o mes futuro)
}
maxVolumen = max(activos)   // techo del eje Y derecho
mesHoy     = 'YYYY-MM'      // mes del corte
```

- **Volumen** (columnas, eje derecho): nº de obras con actividad planificada en
  el mes. Es un entero; el eje va de 0 a `maxVolumen`.
- **Desfase de tiempo** (línea, eje izquierdo 0–100 %): % de obras activas que,
  al cierre del mes, iban por detrás de su avance esperado. El avance **esperado**
  de cada mes se reconstruye prorrateando el `avance` actual de cada tarea dentro
  de su ventana `[fecha_inicio, min(corte, fecha_fin)]`; el avance **real** se lee
  del mismo modo pero solo hasta el corte. La tolerancia de 0.5 pts evita marcar
  retrasos por redondeo.
- **Desfase de costo** (línea, eje izquierdo 0–100 %): sobrecosto medio de las
  obras activas, con `AC` = gasto acumulado a la fecha y `EV` = valor ganado
  (`monto × avance`). Se **recorta a 0** cuando la obra gasta por debajo de lo
  ganado, y se **promedia por obra** (no se suman montos) para que una obra muy
  económica no tape el sobrecosto de otra.
- Los meses **futuros** (posteriores a `mesHoy`) no tienen desfase: son `null` y
  la línea se corta en el gráfico en lugar de inventar 0.

Ejemplo con las semillas (corte 14/10/2026): `maxVolumen = 3`; volumen
`1,1,1,2,2,3,3,3,2,2,1,1`; desfase de tiempo jun 50 % / ago 33.33 % / oct 66.67 %;
desfase de costo sep 14.16 % / oct 12.39 % (hasta julio es 0 %; en agosto apenas
0.26 % por un pequeño exceso del serv. 8, y en septiembre–octubre lo empuja el
sobrecosto del serv. 7). Ver la tabla completa en §9.2.

---

## 4. Costo de personal automático (el mecanismo más sutil)

Las **asignaciones** no generan un gasto directo al crearse: generan un
**registro mensual automático** por cada mes devengado.

La asignación se crea desde el panel del servicio (**Personal → "Asignar
personal"**, un botón que abre `ModalAsignacion`, igual que "Registrar
ingreso"): persona (excluye personal de Oficina), tarea opcional, horas por
día, tarifa (sugerida de la ficha), desde y hasta. La validación de fechas es
inline (`setError`); si la persona ya está vigente en otra obra en ese periodo,
se avisa que las horas se comparten (cada servicio calcula lo suyo, no se
duplican).

### Cómo se calcula un mes (`costoMensualAsignacion`)
```
diasReales  = desde el más tardío de (inicio mes, asignacion.fecha_inicio,
              servicio.fecha_inicio) hasta el más temprano de (fin mes,
              asignacion.fecha_fin, servicio.fecha_fin_estimada)
cubreMesCompleto = desde ≤ inicioMes y hasta ≥ finMes
dias  = cubreMesCompleto ? 30 : min(diasReales, 30)      ← régimen de 30 días
horas = dias × horas_por_dia
monto = horas × tarifa
```

### Caso asignación 1 (Damian, persona 26, tarea 15, 8 h/día, S/ 40, desde 16/06, vigente)
| Mes | Días contados | Horas | Monto |
|---|---|---|---|
| jun 2026 | 15 (16/06→30/06) | 120 | **S/ 4,800** |
| jul 2026 | 30 (cubre el mes) | 240 | **S/ 9,600** |
| ago 2026 | 30 (cubre el mes) | 240 | **S/ 9,600** |
| sep 2026 | 30 (cubre el mes) | 240 | **S/ 9,600** |
| oct 2026 | 30 (cubre el mes) | 240 | **S/ 9,600** |
| nov 2026 | 30 (cubre el mes) | 240 | **S/ 9,600** |
| dic 2026 | 20 (recortado al fin de obra 20/12) | 160 | **S/ 6,400** |

Subtotal asignación 1 = 4,800 + 9,600×5 + 6,400 = **59,200**.

### Caso asignación 2 (Ronald, persona 3, tarea 18, 8 h/día, S/ 18, 16/08 → baja 30/09)
| Mes | Días contados | Horas | Monto |
|---|---|---|---|
| ago 2026 | 16 (16/08→31/08) | 128 | **S/ 2,304** |
| sep 2026 | 30 (01/09→30/09, cubre el mes) | 240 | **S/ 4,320** |
| oct 2026 en adelante | 0 (baja) | — | S/ 0 |

Subtotal asignación 2 = **6,624**.

### Caso asignación 3 (Miguel, persona 17, tarea 19, 8 h/día, S/ 25, 01/10 → baja 31/10)
| Mes | Días contados | Horas | Monto |
|---|---|---|---|
| oct 2026 | 30 (01/10→31/10, cubre el mes) | 240 | **S/ 6,000** |
| nov 2026 en adelante | 0 (baja) | — | S/ 0 |

Subtotal asignación 3 = **6,000**.

**Total inicio-fin con bajas** = 59,200 + 6,624 + 6,000 = **71,824**.
Sin las bajas, Ronald y Miguel seguirían hasta el 20/12: Ronald 2,304+4,320+4,320
+4,320+2,880 = 18,144; Miguel 6,000+6,000+4,000 = 16,000; total
59,200 + 18,144 + 16,000 = **93,344** (verificado en suite).

### Por qué el gastado por personal es solo S/ 3,200
El gastado **solo cuenta los registros existentes** (devengado). Las semillas traen
cuatro registros manuales de personal (40 h × 25 = 1,000; 32 h × 25 = 800;
32 h × 25 = 800; 24 h × 25 = 600 = **3,200**). La proyección inicio-fin
(S/ 71,824) es **lo que faltaría**: las asignaciones crean sus registros mensuales
automáticos al sincronizar (`diferenciaPersonalAuto` en `PersonalServicio.jsx`), y
esos sí subirían el gastado. Por eso la suite dice "sin devengar todo es
proyectado" (gastado 0, proyectado 71,824). Los registros manuales usan personas
distintas a las asignadas para no duplicar costos tras la sincronización.

---

## 5. Avance del cronograma (ponderado por duración)

`avanceEfectivo` es **recursivo**:
- Hoja (sin hijas): su propio `avance`.
- Padre: promedio ponderado de las hijas por **duración** (`fin − inicio + 1`).

### Cálculo del avance global (servicio 6)
`metricasCronograma` pondera **cada una de las 9 tareas** por su duración:

| id | avance efectivo | duración | aporte (avance × días) |
|---|---|---|---|
| 13 | 100 % | 15 | 1,500 |
| 14 | 100 % (hijas al 100 %) | 61 | 6,100 |
| 15 | 100 % | 30 | 3,000 |
| 16 | 100 % | 31 | 3,100 |
| 17 | 67 % (ponderado de sus hijas) | 77 | 5,159 |
| 18 | 85 % | 46 | 3,910 |
| 19 | 40 % | 31 | 1,240 |
| 20 | 0 % | 35 | 0 |
| 21 | 0 % | 36 | 0 |
| **Total** | | **362 d** | **24,009** |

Avance global = 24,009 ÷ 362 = 66.32 → **66 %** ✓

Nota: el ponderado usa las 9 tareas (362 días), mientras que la productividad
(§6) solo cuenta las **raíces** (224 días). Son dos agregaciones distintas a
propósito: el avance mide trabajo por tarea, la productividad mide plazo por obra.

Detalle del avance de **Redes de alcantarillado** (17), ponderado por duración de
hijas: (85 % × 46 d + 40 % × 31 d) ÷ 77 d = (3,910 + 1,240) ÷ 77 = 66.88 → **67 %**.

### SPI (`indiceAvance`)
```
diasTotales        = fecha_fin_estimada − fecha_inicio = 20/12/2026 − 01/06/2026 = 202 d
diasTranscurridos  = hoy − fecha_inicio (la suite fija hoy = 14/10/2026) = 135 d
esperado           = min(100, 135 ÷ 202 × 100) = 66.83 %
SPI                = avanceGlobal ÷ esperado = 66 ÷ 66.83 = 0.9876 ≈ 0.99
```
La suite usa `indiceAvance(servicio6, 66, '2026-10-14')` → **0.99**.

### 5.1 Modo de medición del avance (Fase A)

Cada tarea **hoja** declara cómo se mide su avance (`modo_medicion`); los padres
no lo declaran porque su avance se sigue derivando de sus hijas. La lógica pura
vive en `src/utils/avance.js`:

| modo | avance |
|---|---|
| `metrado` | metrado ejecutado acumulado ÷ metrado contratado × 100 |
| `hitos` | suma de los pesos de los `pasos` cumplidos (los pesos suman 100) |
| `tiempo` | días laborables transcurridos ÷ duración × 100, con el calendario de obra y corte a "hoy" |
| `costo` | costo ejecutado ÷ monto de la partida × 100 |
| `manual` | el avance se fija a mano y exige `nota_justificacion` (la excepción se marca en el Gantt y en Partidas) |

Todos los cálculos recortan a 0–100 con dos decimales y devuelven 0 cuando falta
la base (sin metrado, sin presupuesto, sin pasos, sin fecha de corte), nunca un
`NaN`. **Asignación inicial** (aditiva, no toca ningún avance): con metrado →
`metrado`; sin metrado pero con `hito` → `hitos`; sin metrado con costos
vinculados → `costo`; el resto → `manual`. `normalizarModoMedicion` aplica esa
regla al cargar (idempotente: si no falta nada devuelve el mismo objeto) y
genera los `pasos` que reproducen el avance de una tarea migrada a `hitos`
(`pasosQueReproducenAvance`).

En esta fase el número autoritativo sigue siendo `tarea.avance`: la migración no
lo altera (la suite verifica que, al normalizar, el avance global del servicio
demo no cambia) y estos cálculos se conectan como fuente única de verdad en la
Fase C. La UI ofrece el modo en el modal de tarea (selector con búsqueda, solo
hojas), la justificación obligatoria en modo `manual`, la insignia `manual` en
el Gantt y la columna "Modo" en Partidas.

### 5.2 Captura del avance en el parte diario (Fase B)

El parte diario deja de teclear el avance en %: cada fila de partida registra el
**metrado ejecutado del día** (`metrado_dia`) con la unidad de la tarea, o los
pasos cumplidos si la partida se mide por `hitos`. La lógica pura vive en
`src/utils/partesDiario.js`:

| Cálculo | Función | Qué devuelve |
|---|---|---|
| Acumulado | `metradoEjecutadoAcumulado(partes, tareaId)` | suma de los `metrado_dia` de todos los partes (sin tope) |
| Estado de la fila | `estadoFilaMetrado({tarea, metradoDia, acumuladoOtros, tolerancia})` | contratado, acumulado, saldo por ejecutar, % resultante, rendimiento del día y tope |
| Validación en vivo | `evaluarFilasMetrado({filas, tareas, partes, parteId, tolerancia})` | una evaluación por fila (al editar un parte pasado excluye el propio parte para no contar dos veces) |
| Derivado de la tarea | `avanceDePartes({tarea, partes})` | metrado ÷ contratado, o los pesos de los pasos cumplidos, o el `avance_dia` legado |
| Sincronización | `recalcularAvanceTareas({partes, tareas, servicioId})` | cambios de `tarea.avance` de las tareas que aparecen en algún parte |

Reglas:

- El **acumulado no debe superar el metrado contratado + tolerancia** (5 % por
  defecto, editable en el parte y guardada en `tolerancia_metrado`). Si lo
  supera, el formulario avisa y exige una `nota_exceso` para poder guardar.
- Solo se pueden elegir **partidas hoja**: en modo `metrado` para el metrado y
  en modo `hitos` para marcar pasos (`partidasMedibles`).
- Marcar un paso guarda **quién y cuándo** (`cumplido_por`, `fecha_cumplimiento`)
  en la tarea; es idempotente (un paso ya cumplido no se re-fecha).
- Se pueden **ver y editar partes de fechas pasadas**: los acumulados se
  recalculan y `tarea.avance` se resincroniza al guardar.
- **Migración** (`migrarPartesAMetrado`, idempotente): los `avance_dia` de una
  tarea con metrado pasan a `metrado_dia = % × metrado ÷ 100` (el % se reproduce
  exacto); los de tareas sin metrado quedan como registro legado de solo lectura.
- El flag `avance_por_partes` queda **deprecado**: `normalizarModoMedicion` lo
  retira y deja la tarea en `metrado` (si tiene metrado) o en `manual` con nota.
- La semilla demo **no trae partes**, así que el avance global del servicio 6
  (47 %) no cambia al normalizar ni al registrar un parte de otra partida. La
  versión de esquema sube a `_v: 14` por el cambio de forma del parte.

---

## 6. Productividad: días estimados vs. reales

**Estimado** = duración planificada (`fin − inicio + 1`), siempre sincronizado
con las fechas (no hay campo manual).

| tarea | estimado | real (fechas con personal) |
|---|---|---|
| 15 Tendido PVC | 30 d | 1 (20/06) |
| 16 Pruebas hidráulicas | 31 d | 1 (22/07) |
| 18 Colectores | 46 d | 1 (05/09) |
| 19 Buzones | 31 d | 1 (08/10) |
| 14 Redes de agua (padre) | 61 d | 2 (junta hijas 15 y 16) |
| 17 Redes de alcantarillado (padre) | 77 d | 2 (junta hijas 18 y 19) |
| **Servicio (raíces)** | **224 d** | **4 d** (20/06, 22/07, 05/09, 08/10) |

`desviacionDias(224, 4)` → diferencia **−220**, porcentaje **1.79 %**.

---

## 7. Proyección financiera (el bloque "estimado")

Todo en `proyeccionFinanciera({presupuesto, gastado, cobrado, avance, spi})`:

| Métrica | Fórmula | Resultado serv. 6 |
|---|---|---|
| Valor ganado | `presupuesto × avance/100` | 335,000 × 0.66 = **221,100.00** |
| Ritmo de gasto (CPI) | `valorGanado ÷ gastado` | 221,100 ÷ 97,345 = **2.27** |
| Costo final estimado | `gastado ÷ (avance/100)` | 97,345 ÷ 0.66 = **147,492.42** |
| Utilidad proyectada | `presupuesto − costoFinal` | 335,000 − 147,492.42 = **187,507.58** |
| Margen proyectado % | `utilidadProy ÷ presupuesto × 100` | **55.97 %** |
| Cobro proyectado | `cobrado ÷ (avance/100)` | 155,250 ÷ 0.66 = **235,227.27** |
| Faltante por facturar | `presupuesto − cobroProyectado` | **99,772.73** |

**Semáforo** (reglas explícitas):
- 🔴 rojo si `utilidadProyectada ≤ 0` o `CPI < 0.9`.
- 🟡 amarillo si `CPI < 1` o `SPI < 0.9` o `utilidadProyectada < 10 % del presupuesto`.
- 🟢 verde en otro caso.
Serv. 6: utilidad +187,507, CPI 2.27, SPI 0.99 → **🟢 verde**.

---

## 8. Resultado empresa y semáforo ejecutivo

Con las **tres obras** de la cartera:
```
gastadoTotal      = 97,345 + 175,000 + 32,000 = 304,345
cobradoTotal      = 155,250 + 158,000 + 30,000 = 343,250
utilidadServicios = cobradoTotal − gastadoTotal = 343,250 − 304,345 = 38,905
oficina           = Σ costos_oficina = 23,800
resultadoEmpresa  = 38,905 − 23,800 = 15,105.00   ← positivo con estas semillas
```

Detalle por obra en §2 (cartera completa). Ojo: la utilidad de servicios baja de
57,905 (solo serv. 6) a 38,905 al incorporar el servicio 7, que pierde 17,000.

**Semáforo del Dashboard** (`estadoEmpresa`): 🟡 "Atención requerida" porque,
aunque el resultado es positivo, **hay 1 obra en riesgo** (el servicio 7 vence el
25/10 y estamos a 11 días): *"Hay señales para mirar: 1 obra(s) en riesgo."*
Reglas: resultado < 0 → 🔴; si no, obras en riesgo o caja del último mes < 0 → 🟡;
si no, 🟢. La caja de octubre es positiva (+3,155), así que no añade motivo.

### Caja real por mes (`flujoCajaMensualReal`)
`margenReal = cobrado − egresoObra − oficina`, desde el primer mes con actividad
de cartera (marzo) hasta el mes del corte (octubre):

| mes | cobrado | egreso obra | oficina | margen |
|---|---|---|---|---|
| mar 2026 | 0 | 7,000 | 0 | **−7,000** |
| abr 2026 | 98,000 | 0 | 0 | **+98,000** |
| may 2026 | 0 | 24,000 | 0 | **−24,000** |
| jun 2026 | 50,250 | 46,410 | 0 | **+3,840** |
| jul 2026 | 0 | 21,190 | 0 | **−21,190** |
| ago 2026 | 150,000 | 62,000 | 0 | **+88,000** |
| sep 2026 | 0 | 119,400 | 6,300 | **−125,700** |
| oct 2026 | 45,000 | 24,345 | 17,500 | **+3,155** |

El egreso de obra por mes es la suma de los tres servicios (p. ej. jun =
39,410 serv. 6 + 7,000 serv. 7; ago = 0 + 48,000 + 14,000; sep = 33,400 + 80,000
+ 6,000). El cobrado de agosto (150,000) suma las tres valorizaciones/adelantos
del mes (60,000 serv. 6 + 60,000 serv. 7 + 30,000 serv. 8).

Verificado en la suite: caja mar–oct =
`-7000/98000/-24000/3840/-21190/88000/-125700/3155`, **8 meses**. Los meses sin
cobro (mar, may, jul, sep) cierran en rojo: es el efecto normal de obras que
cobran por valorizaciones espaciadas.

---

## 9. Recorrido por pantalla

### Dashboard principal (`/`)
Pensado para decidir, de arriba hacia abajo: ¿cómo va la empresa?, ¿qué obra necesita atención?,
¿cómo terminará la cartera?, ¿alcanza la caja?

1. **Encabezado con filtros** (cliente / tipo / estado): alcanzan a todo lo que es por obra;
   oficina y resultado empresa no se filtran.
2. **Semáforo** → `estadoEmpresa`, con el número de obras con riesgo ampliado (ver 4).
3. **5 KPIs**: Resultado empresa (utilidad de obras − oficina, con tendencia), Cobrado (con % de la
   meta si existe; la meta se define en Configuración → Empresa), Gastado (% del presupuesto vigente
   de la cartera), Avance de la cartera (EV ÷ presupuesto, con SPI y CPI) y Obras (en curso / con riesgo).
4. **Obras con riesgo**: además de `analizarServicios` (presupuesto excedido, plazo vencido o
   cercano) marca **atraso** (SPI < 0.9) y **sobrecosto proyectado** (EAC > presupuesto vigente),
   con ejecución, avance, SPI, CPI y días al fin; debajo, las partidas que vencen en 15 días.
5. **Alertas de partidas** (fuente única `alertasCentro`), filtro por obra, 6 visibles y "Ver todas".
6. **Cartera de obras**: una tabla, una fila por obra ordenada por riesgo, con presupuesto,
   gastado y % de ejecución (la marca en la barra es el avance), cobrado, utilidad real y margen,
   avance, SPI, CPI y costo final estimado (EAC); fila de total; exporta CSV. El desempeño por obra
   sale de `evmCartera().porServicio` (mismas cifras que la Curva S de cada obra).
7. **Desempeño de la cartera**: SPI, CPI, costo final estimado y desviación al cierre; Curva S
   consolidada (PV acumulado que nunca baja; AC y EV solo hasta hoy) y el gráfico de retraso y
   sobrecosto por mes (`desfaseMensualProyectos`, §3.4 y §9.2).
8. **Flujo de caja**: tabla mensual de cobrado, egresos de obra, oficina, neto y saldo acumulado,
   más los meses siguientes con el costo de personal ya comprometido; exporta Excel.
9. **Estructura del gasto** (por tipo) y **Horas-hombre** (plan vs real).
10. **Utilidad por cliente**: solo aparece si algún cliente tiene más de una obra.
11. **Programación**: lo que inicia en 3 semanas y la ruta crítica **pendiente**.

Se retiraron por redundantes o de poco valor para decidir: la tarjeta de meta con formulario,
"Resultado empresa" repetido, Gasto por servicio, Ranking de utilidad, Cobros por concepto,
Cronograma global, Movimientos recientes y los contadores de personal/equipos registrados.

### Resumen del servicio (`/servicios/:id`)
1. **Encabezado**: nombre de la obra, estado, cliente, tipo, plazo y días restantes; Reporte
   mensual (PDF), Imprimir y Editar. Debajo, las alertas de la obra que no son de partidas.
2. **5 KPIs**: Presupuesto vigente (con la variación por modificaciones), Gastado (% ejecutado y
   saldo), Cobrado (% del presupuesto), Utilidad real (margen sobre lo cobrado) y Avance (SPI, CPI,
   tareas atrasadas).
3. **Desempeño y proyección** (un solo bloque): semáforo, SPI, CPI, desviación de plazo (EV − PV),
   costo final estimado y utilidad proyectada (`proyeccionFinanciera` + `curvaServicio`), barra de
   costo final contra presupuesto y cuánto falta facturar según lo avanzado.
4. **Alertas de partidas**.
5. **Valorizado contra costo por partida** (qué trabajo deja margen) y **Cascada de utilidad**.
6. **Gasto mensual** con media de 3 meses y **Mano de obra** (HH planificadas, registradas, costo por
   HH y horas por mes).

Se retiraron: la curva de gasto acumulado (ya está en la Curva S), el conteo de movimientos, el
bloque "Productividad (días de personal)" (comparaba duración planificada con días con registros y
daba lecturas engañosas) y el bloque separado de control de avance (se unió a Desempeño).

### Partidas
Mismo árbol del Cronograma con columnas: Modo (cómo se mide el avance de cada
hoja), Monto (sumable), Valorizado, Avance, Costo (subárbol), Margen
(valorizado − costo), Días est., Días reales, Desv., HH est., HH real y HH/und.
En el árbol, "Modo" muestra la insignia del modo de cada hoja (los padres, "—";
el tooltip explica el origen del avance).
Más "sin tarea asignada" en el total para que nada se pierda.

### Modificaciones (`/servicios/:id/modificaciones`)
Sección **Contrato**. Gestiona adicionales, deductivos y ampliaciones de plazo
(`src/utils/modificaciones.js`, colecciones `modificaciones` y
`ampliaciones_plazo`).

1. **Cabecera**: presupuesto original, presupuesto vigente (original + adicionales
   aprobados − deductivos aprobados), variación y plazo ampliado (días
   aprobados) con la fecha fin vigente.
2. **Adicionales y deductivos**: N°, tipo, fecha, descripción, importe
   (metrado × PU), estado (`borrador`/`presentado`/`aprobado`/`rechazado`) y
   documento de sustento. Alta/edición con modal y editor de partidas;
   búsqueda + filtro por estado.
3. **Ampliaciones de plazo**: N°, fecha de solicitud, motivo, días
   solicitados/aprobados y estado.
4. **Efecto de aprobar**: un **adicional** materializa sus partidas como tareas
   hoja (entran al Cronograma, Curva S, EVM y Valorizaciones); una **ampliación**
   desplaza `fecha_fin_estimada` por los días aprobados y recalcula el cronograma
   con el motor CPM. Salir de aprobado revierte el efecto (las tareas generadas
   se retiran y los costos quedan sin tarea, nunca se borran).
5. **Historial** de cambios de estado con fecha en el detalle de cada registro.

El presupuesto vigente se refleja en Resumen, Curva S, Valorizaciones y
Dashboard vía `servicioConPresupuestoVigente`, conservando el original para
mostrar la variación. Los ejemplos sembrados están **sin aprobar** a propósito
para no mover las cifras de la línea base.

### Cronograma, Curva S y Línea base
- **Cronograma** (`/servicios/:id/cronograma`): árbol de tareas con Gantt (arrastre y
  redimensionado respetando calendario y grupos), dependencias FS/SS/FF/SF, motor CPM
  (`cpm.js`: ES/EF/LS/LF, holgura y ruta crítica; solo asesora, aplica con "Reprogramar"),
  calendario laboral por obra (`servicio.calendario`), look-ahead de 3–6 semanas, desvío
  contra la línea base, histograma de recursos y red PERT. Importa y exporta Excel
  (`importacion.js`: plantilla N° · Tarea · Inicio · Fin · Hito · Metrado · Unidad ·
  P. Unit. · Valorizado previo · Monto · Predecesoras · Avance).
- **Línea base** (`/linea-base`, `lineaBase.js`): copia inmutable del cronograma congelada
  en una fecha, más **lecturas de avance** firmadas por corte.
- **Curva S** (`/curva-s`, `curvaS.js`): PV (línea base), AC (costo real) y EV (avance ×
  presupuesto, o lecturas si existen) con SPI/CPI/EAC; granularidad mensual, semanal,
  cada 4 o 2 días y diaria. El panel de cartera (`cartera.js`) suma las curvas de todas las obras.

### Parte diario (`/servicios/:id/parte-diario`)
Una jornada por parte: clima, responsable, personal y equipos presentes, partidas con su
**metrado ejecutado del día** (o hitos cumplidos), incidencias, observaciones y fotos
(binarios en IndexedDB, metadata en el parte). Es el único lugar donde se teclea el
progreso: el avance de cada hoja se deriva de la suma de sus partes (§5.2). Imprimible
(`Imprimir / PDF`).

### Valorizaciones (`/servicios/:id/valorizaciones`)
Por periodo: metrado acumulado a la fecha de corte menos lo ya valorizado, por el precio
unitario; sobre el bruto se descuentan la amortización de adelantos (directo y de
materiales) y el fondo de garantía, y luego IGV y detracción hasta el **neto**. Antes de
cerrar se puede ajustar el metrado por partida. La primera valorización parte de
`valorizado_previo`. El cobro se vincula con `cobros.valorizacion_id` (el texto del concepto
es solo respaldo). Imprimible y exportable a Excel.

### Centro de alertas (campana del encabezado)
`alertasCentro.js` es la fuente única de la campana, el Resumen y el Dashboard. Tipos:
partida vencida, sin partes, bajo rendimiento, presupuesto excedido, margen bajo, plazo
vencido, plazo próximo, factura vencida y valorización sin cobrar. Cada alerta guarda su
**causa** y su **medida**; al descartarla o posponerla reaparece solo si cambia la causa,
sube la gravedad o la medida cruza el escalón de su tipo: **+7 días** (partida vencida,
sin partes, plazo vencido, **plazo próximo**, factura vencida, valorización sin cobrar),
**+10 puntos** de desvío de rendimiento y **±10 %** en montos (presupuesto excedido y
margen bajo). Los umbrales de inactividad, rendimiento y valorización sin cobro son por obra.

### Acceso y roles
Al abrir el sistema se pide **correo y clave** (`Login.jsx`: marca y formulario sobre una ilustración propia de obra, `public/login-obra.svg`, sin dependencias externas). Los usuarios y la sesión viven en
`localStorage` (`src/data/auth.js`), separados de los datos de negocio: no entran al respaldo. La clave
se guarda como sal + SHA-256 iterado (20 000 rondas). La sesión dura 8 horas y tras 5 intentos fallidos
se bloquea 60 s. Hay un administrador inicial; el administrador crea, edita, desactiva y elimina usuarios
y restablece claves en **Configuración → Usuarios y roles**, y siempre debe quedar al menos uno activo.
Cada usuario tiene además un **cargo** descriptivo (opcional) que se muestra bajo su nombre.

### Módulo Configuración (`/configuracion`)
Se abre con la tarjeta del usuario al pie del sidebar (avatar, nombre y cargo; sin cargo, el rol).

| Sección | Quién | Qué hace |
|---|---|---|
| Mi cuenta | Todos | Editar nombre y cargo propios; cambiar la clave (actual + nueva repetida) |
| Apariencia | Todos | Tema claro u oscuro (preferencia del navegador) |
| Usuarios y roles | Administrador | Crear usuarios con rol y cargo, editar, restablecer claves, activar/desactivar, eliminar; matriz de roles |
| Empresa | Administrador | Nombre de la empresa (cabecera de reportes) y meta de ingreso |
| Datos y respaldo | Administrador | Último respaldo, espacio usado, exportar, importar, restablecer ejemplo y vaciar (con doble clic) |

La sección se elige con `?seccion=`; una sección no permitida cae en Mi cuenta.

| Rol | Puede |
|---|---|
| Administrador | Todo, incluidos usuarios, respaldos, importar, vaciar y configuración |
| Gerencia | Solo lectura de todo (Dashboard, finanzas, obras) |
| Residente de obra | Cronograma, partidas, parte diario, personal asignado, materiales, equipos y gastos; no edita los datos de la obra ni ve Ingresos, Dashboard ni Oficina |
| Administración | Ingresos, facturas, valorizaciones, gastos, oficina, fichas de personal/equipos/cargos; lee el resto |

La **barra superior** (`BarraSuperior.jsx`) muestra la fecha y la campana de alertas; gerencia ve
además la franja *Modo solo lectura*. **Cerrar sesión** está al pie del sidebar, bajo la tarjeta del usuario. Al
entrar, cada rol arranca en su inicio (`inicioDeRol`: Dashboard, o Servicios para el residente).

Los permisos se aplican en dos capas: **rutas y menús** (lo vedado no se muestra y redirige) y
**escrituras** (`DataContext` rechaza las acciones que el rol no puede hacer y muestra un aviso). Los
registros mensuales automáticos del personal se permiten siempre porque los genera el sistema. Es un
control de uso: sin servidor, quien abra las herramientas del navegador puede saltárselo.

### Exportación e impresión
Sin librerías: Excel (.xlsx) con `excel.js` + `exportaciones.js`, y HTML imprimible /
"Guardar como PDF" con `reportes.js` (parte diario, valorización, reporte mensual de obra,
reporte del Resumen). Todos reutilizan las fórmulas de las pantallas.

### Catálogos globales
`/cargos` (catálogo de cargos; renombrar uno arrastra el nombre a las fichas de personal) y
`/unidades` (unidades de medida fijas, ordenadas para metrado de obra).

### 9.1 Datos exactos de cada gráfico del Resumen (servicio 6)

**Curva de gasto acumulado** (de `gastoPorMes`: jun 39,410 / jul 12,190 / ago 0 /
sep 33,400 / oct 12,345):
| mes | gasto del mes | acumulado |
|---|---|---|
| jun 2026 | 39,410 | 39,410 |
| jul 2026 | 12,190 | 51,600 |
| ago 2026 | 0 | 51,600 |
| sep 2026 | 33,400 | 85,000 |
| oct 2026 | 12,345 | 97,345 |

**Tendencia de gasto mensual + media móvil de 3** (`mediaMovil`):
| mes | barra (gasto) | línea MM3 |
|---|---|---|
| jun | 39,410 | 39,410.00 (promedia lo que hay: 1 mes) |
| jul | 12,190 | 25,800.00 ((39410+12190) ÷ 2) |
| ago | 0 | 17,200.00 ((39410+12190+0) ÷ 3) |
| sep | 33,400 | 15,196.67 ((12190+0+33400) ÷ 3) |
| oct | 12,345 | 15,248.33 ((0+33400+12345) ÷ 3) |

Lectura: la línea ámbar (MM3) cae hasta agosto y se estabiliza cerca de S/ 15.2 k;
agosto sin gasto arrastra el promedio y septiembre lo recupera.

**Horas hombre por mes** (`horasPorMes`, solo tipo personal):
| mes | horas | de dónde |
|---|---|---|
| jun 2026 | 40 h | reg. 25 (40 h, tarea 15) |
| jul 2026 | 32 h | reg. 29 (32 h, tarea 16) |
| ago 2026 | 0 h | mes intermedio (sin registros) |
| sep 2026 | 32 h | reg. 34 (32 h, tarea 18) |
| oct 2026 | 24 h | reg. 38 (24 h, tarea 19) |

La serie es continua (incluye el cero de agosto) para que la tendencia no mienta.

**Valorizado contra costo por trabajo** (una fila por tarea raíz):
| trabajo | valorizado (monto × avance) | costo (subárbol) | lectura |
|---|---|---|---|
| Obras preliminares (13) | 15,000 × 100 % = 15,000 | 11,300 | margen 3,700 |
| Redes de agua (14) | 75,000 × 100 % = 75,000 | 40,300 (15: 30,310 + 16: 9,990) | margen 34,700 |
| Redes de alcantarillado (17) | 105,000 × 67 % = 70,350 | 44,845 (18: 32,500 + 19: 12,345) | margen 25,505 |
| Reposición de pavimento (20) | 62,000 × 0 % = 0 | 0 | pendiente |
| Caseta de bombeo (21) | 78,000 × 0 % = 0 | 0 | pendiente |

Ninguna barra de costo supera a su valorizado: la obra avanza por delante del
gasto. La escala máxima del gráfico es 75,000 (valorizado de Redes de agua).

### 9.2 Datos exactos del gráfico combinado del panel (cartera)

Serie de `desfaseMensualProyectos` con las tres obras y corte 14/10/2026
(`maxVolumen = 3`, eje izquierdo fijo 0–100 %). El gráfico muestra un **resumen
compacto** ("Situación de la cartera · oct 2026") con tres fichas (volumen,
desfase de tiempo, desfase de costo) —que reemplazan la leyenda— y, debajo, un
gráfico combinado más corto y centrado (sin distorsionar el tooltip): columnas
detrás (eje derecho) y líneas delante (eje izquierdo 0–100 %):

| mes | volumen (barras) | evaluables | con retraso | desfase tiempo (línea) | desfase costo (línea) |
|---|---|---|---|---|---|
| mar 2026 | 1 | 1 | 0 | 0.00 % | 0.00 % |
| abr 2026 | 1 | 1 | 0 | 0.00 % | 0.00 % |
| may 2026 | 1 | 1 | 0 | 0.00 % | 0.00 % |
| jun 2026 | 2 | 2 | 1 | 50.00 % | 0.00 % |
| jul 2026 | 2 | 2 | 1 | 50.00 % | 0.00 % |
| ago 2026 | 3 | 3 | 1 | 33.33 % | 0.26 % |
| sep 2026 | 3 | 3 | 1 | 33.33 % | 14.16 % |
| oct 2026 | 3 | 3 | 2 | 66.67 % | 12.39 % |
| nov 2026 | 2 | — | — | — (futuro) | — (futuro) |
| dic 2026 | 2 | — | — | — (futuro) | — (futuro) |
| ene 2027 | 1 | — | — | — (futuro) | — (futuro) |
| feb 2027 | 1 | — | — | — (futuro) | — (futuro) |

**Volumen** (por qué cambia): la ventana de cada obra es serv. 7 = 02/03–25/10,
serv. 6 = 01/06–20/12, serv. 8 = 01/08–28/02/27. Entonces mar–may = 1 (solo el 7),
jun–jul = 2 (entran con el 6), ago–oct = 3 (entra el 8), nov = 2 (sale el 7),
dic = 2 (sigue el 6 hasta el 20), ene–feb = 1 (solo el 8).

**Desfase de tiempo**: junio 50 % (1 de 2) porque el serv. 6, recién iniciado,
iba al 12.4 % real frente a un 14.4 % esperado (el serv. 7, en cambio, iba al
50.8 % real vs. 50.6 % plan, justo en línea). En octubre sube a 66.67 % (2 de 3):
el serv. 7 va muy atrasado (70.9 % real vs. 95.4 % plan, su pavimento está al
45 %) y el serv. 6 también queda algo corto (62.5 % real vs. 66.8 % plan); el
serv. 8 va justo por encima de su plan. Baja a 33.33 % en agosto–septiembre
(1 de 3) porque en ambas fechas solo el serv. 7 queda rezagado.

**Desfase de costo**: 0 hasta julio (todas las obras gastan dentro de lo ganado).
Sube en agosto (0.26 %), septiembre (14.16 %) y octubre (12.39 %): lo empuja el
**servicio 7**, que a octubre acumula 175,000 de gasto contra un valor ganado de
180,000 × 70.88 % ≈ 127,580 → sobrecosto de (175,000 − 127,580) / 127,580 ≈
37.2 %; el serv. 6 y el serv. 8 van por debajo de su valor ganado (0 %), así que
el **promedio por obra** de los tres da 12.39 %. Si se sumaran montos en vez de
promediar, la obra 8 (muy holgada) taparía el problema de la 7: por eso se
promedia por proyecto.

Estos números están fijados en la suite (`[ combo cartera ]`), de modo que el
gráfico no puede desviarse sin que la verificación lo detecte.

### 9.3 Filtros de las listas

Toda lista con registros tiene un filtro para encontrar cosas rápido. Los
módulos globales (**Servicios**, **Personal**, **Equipos**) ya lo traían en el
catálogo; el resto se completó con el mismo lenguaje visual (caja de búsqueda
con lupa y, donde aplica, un selector), piezas reutilizables en
`src/components/ui/FiltroBusqueda.jsx` (`Buscador`, `BarraFiltros`,
`SelectFiltro`) y normalización sin tildes/mayúsculas (`textoCoincide`, reusa
`normalizar` de `ComboBox`).

| Lista | Buscador | Selector |
|---|---|---|
| Materiales, Gastos, Equipos (paneles) | concepto/equipo, tarea, documento, fecha, monto | Con / sin tarea |
| Asignaciones (personal del servicio) | persona, cargo, tarea | Vigentes / de baja |
| Costo mensual automático | mes | Pagado / proyectado |
| Ingresos y facturas | concepto, documento, n.º de factura, estado | Ingresos / facturas |
| Partidas | nombre de tarea | — |
| Cronograma (Gantt) | nombre de tarea | — |
| Utilidad por servicio (Oficina) | servicio, cliente | — |
| Servicios, Personal, Equipos (global) | catálogo (`CatalogoCRUD`) | — |
| Dashboard | cliente, tipo, estado (global) | cliente/tipo/estado |

Reglas de comportamiento:

- El filtro aparece **solo si la lista tiene datos**; si está vacía, no se
  muestra nada (no estorba).
- El contador "**X de Y**" aparece solo cuando hay un filtro activo.
- Los **totales del pie** reflejan lo visible: al filtrar, el "Total" suma las
  filas mostradas; al quitar el filtro vuelve al total completo.
- En árboles (**Partidas**, **Cronograma**) la búsqueda **expande** los grupos
  colapsados y **conserva los ancestros** de cada coincidencia para no romper la
  jerarquía ni la numeración (1, 1.1, 1.1.1…). En Partidas el total se oculta
  mientras hay búsqueda (el árbol parcial no representa el total del servicio).
- Si una búsqueda no arropa nada, la tabla muestra "Ningún… coincide con el
  filtro." en vez del mensaje de lista vacía.

`scripts/verificar.jsx` fija estos filtros con la sección de render (`filtro en
materiales`, `gastos`, `equipos`, `personal`, `ingresos`, `partidas`,
`cronograma`, `oficina`): si alguien quita un buscador, la suite falla.

---

## 10. Reglas de integridad (por qué los números cuadran siempre)

1. **Monto padre = Σ hijas** (`montoTarea`): imposible descuadrar el presupuesto.
2. **Un solo libro de costos**: materiales, personal, equipos y gastos viven en
   `registros_servicio`; toda pantalla suma esa misma colección.
3. **Costos sin tarea**: `costoSinTarea` los muestra aparte; nunca se pierden ni
   se borran al eliminar una tarea (`tarea_id → null`).
4. **Personal**: los registros mensuales automáticos evitan el doble conteo; el
   gastado solo sube con registros reales (devengados).
5. **Domingos**: registros personales diarios en domingo no cuentan
   (`cuentaComoManoDeObra`), salvo `modalidad: 'mensual'`.
6. **Redondeo**: céntimos (`redondear2`), nunca `NaN`; métricas sin base devuelven
   `null` ("—"), no ceros ficticios.
7. **Por cobrar retirado**: el resultado se mide sobre lo cobrado; las facturas
   son registro documental con sus propios saldos.
8. **Avance con un solo escritor**: `tarea.avance` es un caché derivado
   (`recalcularAvances`); el parte diario es el único punto de captura.
9. **Valorización sin doble cobro**: solo se cobra el metrado acumulado menos lo ya
   valorizado (`valorizado_previo` incluido).
10. **Alertas sin ruido**: un descarte solo se anula por cambio de causa, mayor gravedad o
    medida que cruza el escalón del tipo.

---

## 11. Verificación (cómo reproducir todo este documento)

```
npm run verificar   # 838 pruebas: reducer, calculadora, asignaciones, cobros,
                    # gerencial, combo de cartera, montos por tareas,
                    # productividad, proyección financiera, formato,
                    # persistencias, rutas SSR, filtros de listas, modal
                    # de asignación de personal, parte diario y centro de alertas
npm run build       # build cliente
```

Secciones clave de `scripts/verificar.jsx`:
- `[ calculadora ]`: gastado serv. 6 97,345, mensual `39410/12190/0/33400/12345`, desgloses.
- `[ asignaciones de personal ]`: 4,800 / 4,320 / 71,824.
- `[ gerencial ]`: KPI utilidad 57,905 (serv. 6), resultado empresa **15,105**, caja
  mar–oct `-7000/98000/-24000/3840/-21190/88000/-125700/3155` (**8 meses**),
  variación, semáforo (🟡 por 1 obra en riesgo).
- `[ combo cartera ]`: 12 meses mar–feb, volumen máximo 3, serie `1,1,1,2,2,3,3,3,2,2,1,1`,
  desfase tiempo (jun 50 / ago 33.33 / oct 66.67), desfase costo (sep 14.16 / oct 12.39),
  meses futuros sin desfase y sin NaN.
- `[ montos por tareas ]`: 335,000, Redes de agua 75,000, Tendido PVC 30,310.
- `[ productividad ]`: duraciones, 224/4 días, desviaciones.
- `[ proyección financiera ]`: 221,100 / 2.27 / 147,492.42 / 187,507.58 / verde.
- `[ personal y facturas ]`: factura 101 y 102 cobradas (saldo 0), 103 pendiente 52,500.
- `[ centro de alertas ]`: 7 alertas en el demo (2 vencidas, 3 sin partes, 1 margen bajo, 1 plazo próximo); causa/medida con escalones, vínculo explícito valorización→cobro, umbral configurable por obra y migración de descartes sin pérdida.
