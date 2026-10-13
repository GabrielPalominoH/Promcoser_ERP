# DOCUMENTACIÓN TÉCNICA DEL SISTEMA — PROMCOSER ERP

Documento exhaustivo que explica **cada** número que muestra el sistema: de dónde
sale, cómo se calcula y por qué da ese valor. Todos los ejemplos usan los datos
de ejemplo (servicio 6, *Construcción de almacén industrial*) y están verificados
contra la suite (`npm run verificar`, 237 pruebas).

> **Verificación**: cada cifra de este documento puede reproducirse con la suite.
> Si cambias semillas o fórmulas, actualiza este documento y la suite.

---

## 1. Modelo de datos

Todo vive en `src/data/mockData.js` (`ESTADO_INICIAL`). Colecciones vivas
(sin `presupuestos`, `pagos`, `partidas`, `valorizaciones`):

| Colección | Qué guarda |
|---|---|
| `personal` | Fichas: nombre, apellido, cargo, DNI, `tarifa_por_hora`, `ambito` (Obra/Oficina) |
| `equipos` | Fichas: nombre, `costo_por_hora`, `propiedad` (Propio/Alquilado) |
| `servicios` | Obra: nombre, cliente, tipo, `presupuesto_asignado`, fechas, `avance`, estatus |
| `tareas` | Árbol del cronograma: `servicio_id`, `padre_id` (nullable = raíz), nombre, fechas, `avance`, `monto` |
| `registros_servicio` | Libro único de costos: servicio, `tarea_id` (nullable), `tipo_registro` (material/personal/equipo/gasto), `referencia_id`, `cantidad_o_horas`, `monto_calculado`, `fecha`, `modalidad`, `asignacion_id` |
| `asignaciones` | Personal asignado a un servicio: `horas_por_dia`, `tarifa`, `fecha_inicio`, `fecha_fin` |
| `cobros` | Ingresos recibidos: servicio, `fecha`, `monto`, `concepto`, `documento`, `factura_id` |
| `facturas` | Documentos de cobro: número, emisión, vencimiento, base/impuestos/total, estado, `notas_credito` |
| `costos_oficina` | Gasto general: persona de ámbito Oficina, `mes`, monto |
| `config` | Documento único (id 1): empresa, moneda, `meta_ingreso` |

### Relaciones que importan para el cálculo
- `servicio 1──N tareas` y `tareas 1──N tareas` (árbol multinivel vía `padre_id`).
- `tarea 1──N registros_servicio` (`tarea_id`; **`null` = sin tarea asignada**, se cuenta aparte).
- `servicio 1──N cobros` y `servicio 1──N facturas`; `factura 1──N cobros` (aplicaciones).
- `personal 1──N asignaciones` → generan **registros mensuales automáticos** de tipo `personal` con `asignacion_id` (ver §4).
- `borrar servicio` arrastra registros, tareas, asignaciones, facturas y cobros (cascada en `DataContext`).

---

## 2. Datos de ejemplo (verificados hoja por hoja)

### Servicio 6 — "Construcción de almacén industrial"
```
nombre_servicio     = Construcción de almacén industrial
cliente             = Logística del Pacífico S.A.C.
tipo                = Obra
presupuesto_asignado= 120,000.00
fecha_inicio        = 2026-07-01
fecha_fin_estimada  = 2026-12-20
avance              = 0   ← NO se usa: el avance sale del cronograma
estatus             = En curso
```

### Árbol de tareas (servicio 6)
| id | nombre | padre | inicio | fin | avance | monto | duración |
|---|---|---|---|---|---|---|---|
| 13 | Obras preliminares | — | 01/07 | 15/07 | 100% | 8,000 | 15 d |
| 14 | Cimentación | — | 16/07 | 15/08 | 100% | 0 | — |
| 15 | Excavación | 14 | 16/07 | 31/07 | 100% | 9,600 | 16 d |
| 16 | Vaciado de cimientos | 14 | 01/08 | 15/08 | 100% | 12,000 | 15 d |
| 17 | Estructuras | — | 16/08 | 15/10 | 60% | 0 | — |
| 18 | Columnas y vigas | 17 | 16/08 | 20/09 | 70% | 21,000 | 36 d |
| 19 | Losa aligerada | 17 | 21/09 | 15/10 | 30% | 18,900 | 25 d |
| 20 | Cobertura y cerramientos | — | 16/10 | 20/11 | 0% | 26,000 | 36 d |
| 21 | Acabados y entrega | — | 21/11 | 20/12 | 0% | 24,500 | 30 d |

**Montos automáticos**: las tareas con hijas (14 y 17) tienen `monto: 0` y
muestran la **suma de sus hijas**:
- Cimentación (14) = 9,600 + 12,000 = **21,600**
- Estructuras (17) = 21,000 + 18,900 = **39,900**
- Total montos = 8,000 + 21,600 + 39,900 + 26,000 + 24,500 = **120,000** ✓

### Registros del servicio 6 (libro único de costos)
| id | fecha | tipo | tarea | detalle | cant. | monto |
|---|---|---|---|---|---|---|
| 19 | 08/07 | material | 15 | Cemento Portland Tipo I | 200 | 7,700 |
| 20 | 09/07 | gasto | — | Flete de materiales | 1 | 1,200 |
| 21 | 15/07 | material | 18 | Acero de refuerzo ½" | 120 | 2,988 |
| 22 | 20/07 | equipo | 15 | Equipo ref. 11 (45 h) | 45 | 6,750 |
| 23 | 22/07 | material | 15 | Arena gruesa | 30 | 1,860 |
| 24 | 01/08 | gasto | 18 | Alquiler de andamios | 1 | 1,500 |
| 25 | 05/08 | equipo | 16 | Equipo ref. 23 (60 h) | 60 | 4,800 |
| 26 | 10/08 | material | 14 | Ladrillo Kingsize | 5,000 | 16,000 |
| 27 | 02/09 | equipo | 20 | Equipo ref. 24 (25 h) | 25 | 2,000 |
| 28 | 05/09 | material | 21 | Pintura acrílica | 18 | 1,728 |
| 29 | 12/09 | gasto | — | Movilidad del personal | 1 | 800 |
| 30 | 12/08 | personal | 16 | Persona ref. 1 | 40 h | 1,000 |
| 31 | 13/08 | personal | 18 | Persona ref. 3 | 30 h | 540 |

**Total gastado** = 7700+1200+2988+6750+1860+1500+4800+16000+2000+1728+800+1000+540
= **48,866.00** ✓ (40.72 % del presupuesto)

### Cobros (ingresos)
| id | fecha | monto | concepto |
|---|---|---|---|
| 1 | 05/07 | 24,000 | adelanto |
| 2 | 10/09 | 30,000 | valorización |

**Total cobrado = 54,000.00**. `facturas`: vacía (0 registros).

### Asignaciones (motor del costo personal)
| id | servicio | persona | tarea | h/día | tarifa | inicio | fin |
|---|---|---|---|---|---|---|---|
| 1 | 6 | 1 | 16 | 8 | 25 | 12/08 | vigente |
| 2 | 6 | 3 | 18 | 8 | 18 | 13/08 | 15/09 (baja) |

### Costos de oficina
6 registros: sep 6,300 (4500+1800) y oct 17,500 (4500+3200+1800+8000)
= **23,800.00** total.

---

## 3. Fórmulas maestras (dónde viven y qué calculan)

Toda la lógica vive en `src/utils/`; las pantallas **no recalculan**.

### 3.1 `calculadora.js` — el corazón
| Función | Fórmula | Ejemplo serv. 6 |
|---|---|---|
| `sumarMontos(registros)` | Σ `monto_calculado` | 48,866 |
| `desglosePorTipo(registros)` | Σ por `tipo_registro` | material 30,276 / personal 1,540 / equipo 13,550 / gasto 3,500 |
| `registrosDeServicio(regs, id)` | filtra `servicio_id === id` | 13 registros |
| `montoTarea(t, tareas)` | hoja: `monto`; padre: Σ hijas (recursivo) | Cimentación 21,600 |
| `avanceEfectivo(t, tareas)` | hoja: `avance`; padre: promedio ponderado por duración de hijas | ver §5 |
| `valorizadoTarea(t, tareas)` | `montoTarea × avanceEfectivo / 100` | Excavación 9,600 |
| `costoPorTarea(regs, id, tarea)` | Σ montos con `tarea_id === tarea` | Excavación 16,310 |
| `costoSubarbol(t, tareas, regs, id)` | propio + Σ `costoSubarbol(hijas)` | Cimentación 38,110 |
| `costoSinTarea(regs, id)` | Σ con `tarea_id == null` | 2,000 (fletes + movilidad) |
| `presupuestoTareas(tareas, id)` | Σ `montoTarea` de raíces | 120,000 |
| `estadoPresupuesto(s, regs, cobros)` | `{presupuesto, gastado, disponible, porcentaje, excedido, cobrado}` | 120,000 / 48,866 / 71,134 / 40.72 % / false / 54,000 |
| `horasPorMes(regs, id)` | Σ `cantidad_o_horas` de personal por mes, serie continua con ceros | ago: 70 h |
| `metricasCronograma(tareas)` | conteos por estado + avance global ponderado por duración | 9 / 4 / 54 % |
| `indiceAvance(servicio, avance)` | SPI = avance ÷ esperado por tiempo transcurrido | 0.96 |
| `gastoPorMes(regs)` | Σ `monto_calculado` por mes, serie continua | jul 20,498 / ago 23,840 / sep 4,528 |
| `proyeccionAsignaciones(asig, serv, regs)` | costo mensual devengado + proyectado (ver §4) | total 30,896 |
| `diferenciaPersonalAuto(...)` | qué registros mensuales crear/actualizar/eliminar | sincroniza asentamiento |
| `diasEstimadosTarea(t, tareas)` | duración `fin − inicio + 1`; padre Σ hijas | Excavación 16 d |
| `diasRealesTarea(t, tareas, regs, id)` | fechas distintas con registros de personal (subárbol) | Vaciado 1 d |
| `desviacionDias(est, real)` | `{diferencia: real − est, porcentaje}` | ver §6 |
| `utilidadReal(cobrado, gastado)` | `cobrado − gastado` | 5,134 |
| `cobradoServicio(cobros, id)` | Σ `monto` del servicio | 54,000 |
| `alertasServicio({estado, dias})` | excedido / margen-bajo / plazo | [] |
| `proyeccionFinanciera({...})` | ver §7 | utilidad proy. 29,507.41 |
| `mediaMovil(valores, 3)` | promedio de los últimos 3 | — |

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
| `proyeccionMensualPersonal` | `proyeccionAsignaciones` por servicio, solo meses futuros estimados |
| `variacionMensual(serie, campo)` | mes actual vs. anterior; `null` si < 2 puntos o base 0 |
| `estadoEmpresa` | rojo si resultado < 0; amarillo si obras en riesgo o caja del mes < 0; verde si no |
| `avanceMetaIngreso` | logrado ÷ meta; `null` si no hay meta |

---

## 4. Costo de personal automático (el mecanismo más sutil)

Las **asignaciones** no generan un gasto directo al crearse: generan un
**registro mensual automático** por cada mes devengado.

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

### Caso asignación 1 (Elmer, persona 1, tarea 16, 8 h/día, S/ 25, desde 12/08, vigente)
| Mes | Días contados | Horas | Monto |
|---|---|---|---|
| jul 2026 | 0 (empieza el 12/08) | — | S/ 0 |
| ago 2026 | 20 (12/08→31/08) | 160 | **S/ 4,000** |
| sep 2026 | 30 (cubre el mes) | 240 | **S/ 6,000** |
| oct 2026 | 30 (cubre el mes) | 240 | **S/ 6,000** |
| nov 2026 | 30 (cubre el mes) | 240 | **S/ 6,000** |
| dic 2026 | 20 (recortado al fin de obra 20/12) | 160 | **S/ 4,000** |

### Caso asignación 2 (Ronald, persona 3, tarea 18, 8 h/día, S/ 18, 13/08 → baja 15/09)
| Mes | Días contados | Horas | Monto |
|---|---|---|---|
| jul 2026 | 0 (empieza el 13/08) | — | S/ 0 |
| ago 2026 | 19 (13/08→31/08) | 152 | **S/ 2,736** |
| sep 2026 | 15 (01/09→15/09, fecha de baja) | 120 | **S/ 2,160** |
| oct 2026 en adelante | 0 (baja) | — | S/ 0 |

**Totales**: Elmer 26,000 + Ronald 4,896 = **30,896** (= "total inicio-fin con baja").
Sin la baja, Ronald seguiría hasta el 20/12: 2,736 + 4,320 + 4,320 + 4,320 + 2,880
= 18,576, y el total sería **44,576** (verificado en suite).

### Por qué el gastado por personal es solo S/ 1,540
El gastado **solo cuenta los registros existentes** (devengado). Las semillas traen
dos registros manuales de personal (40 h × 25 = 1,000 y 30 h × 18 = 540 =
**1,540**). La proyección inicio-fin (S/ 30,896) es **lo que faltaría**: las
asignaciones crean sus registros mensuales automáticos al sincronizar
(`diferenciaPersonalAuto` en `PersonalServicio.jsx`), y esos sí subirían el gastado.
Por eso la suite dice "sin devengar todo es proyectado" (gastado 0, proyectado 30,896).

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
| 14 | 100 % (hijas al 100 %) | 31 | 3,100 |
| 15 | 100 % | 16 | 1,600 |
| 16 | 100 % | 15 | 1,500 |
| 17 | 54 % (ponderado de sus hijas) | 61 | 3,294 |
| 18 | 70 % | 36 | 2,520 |
| 19 | 30 % | 25 | 750 |
| 20 | 0 % | 36 | 0 |
| 21 | 0 % | 30 | 0 |
| **Total** | | **265 d** | **14,264** |

Avance global = 14,264 ÷ 265 = 53.83 → **54 %** ✓

Nota: el ponderado usa las 9 tareas (265 días), mientras que la productividad
(§6) solo cuenta las **raíces** (173 días). Son dos agregaciones distintas a
propósito: el avance mide trabajo por tarea, la productividad mide plazo por obra.

Detalle del avance de **Estructuras** (17), ponderado por duración de hijas:
(70 % × 36 d + 30 % × 25 d) ÷ 61 d = (2,520 + 750) ÷ 61 = 53.57 → **54 %** (redondeo).

### SPI (`indiceAvance`)
```
diasTotales        = fecha_fin_estimada − fecha_inicio = 20/12/2026 − 01/07/2026 = 172 d
diasTranscurridos  = hoy − fecha_inicio (la suite fija hoy = 06/10/2026) = 97 d
esperado           = min(100, 97 ÷ 172 × 100) = 56.40 %
SPI                = avanceGlobal ÷ esperado = 54 ÷ 56.40 = 0.957 ≈ 0.96
```
La suite usa `indiceAvance(servicio6, 54, '2026-10-06')` → **0.96**.

---

## 6. Productividad: días estimados vs. reales

**Estimado** = duración planificada (`fin − inicio + 1`), siempre sincronizado
con las fechas (no hay campo manual).

| tarea | estimado | real (fechas con personal) |
|---|---|---|
| 15 Excavación | 16 d | 0 |
| 16 Vaciado | 15 d | 1 (12/08) |
| 18 Columnas y vigas | 36 d | 1 (13/08) |
| 14 Cimentación (padre) | 31 d | 1 (junta hijas) |
| 17 Estructuras (padre) | 61 d | 1 |
| **Servicio (raíces)** | **173 d** | **2 d** (12 y 13/08) |

`desviacionDias(173, 2)` → diferencia **−171**, porcentaje **1.16 %**.

---

## 7. Proyección financiera (el bloque "estimado")

Todo en `proyeccionFinanciera({presupuesto, gastado, cobrado, avance, spi})`:

| Métrica | Fórmula | Resultado serv. 6 |
|---|---|---|
| Valor ganado | `presupuesto × avance/100` | 120,000 × 0.54 = **64,800.00** |
| Ritmo de gasto (CPI) | `valorGanado ÷ gastado` | 64,800 ÷ 48,866 = **1.33** |
| Costo final estimado | `gastado ÷ (avance/100)` | 48,866 ÷ 0.54 = **90,492.59** |
| Utilidad proyectada | `presupuesto − costoFinal` | 120,000 − 90,492.59 = **29,507.41** |
| Margen proyectado % | `utilidadProy ÷ presupuesto × 100` | **24.59 %** |
| Cobro proyectado | `cobrado ÷ (avance/100)` | 54,000 ÷ 0.54 = **100,000.00** |
| Faltante por facturar | `presupuesto − cobroProyectado` | **20,000.00** |

**Semáforo** (reglas explícitas):
- 🔴 rojo si `utilidadProyectada ≤ 0` o `CPI < 0.9`.
- 🟡 amarillo si `SPI < 0.9` o `utilidadProyectada < 10 % del presupuesto`.
- 🟢 verde en otro caso.
Serv. 6: utilidad +29,507, CPI 1.33, SPI 0.96 → **🟢 verde**.

---

## 8. Resultado empresa y semáforo ejecutivo

```
utilidadServicios = cobradoTotal − gastadoTotal = 54,000 − 48,866 = 5,134
oficina           = Σ costos_oficina = 23,800
resultadoEmpresa  = 5,134 − 23,800 = −18,666.00   ← negativo esperado con seeds
```

**Semáforo del Dashboard** (`estadoEmpresa`): 🔴 "Empresa en rojo" porque el
resultado es negativo. Con utilidad suficiente para cubrir oficina pasaría a
🟡/🟢. (Es el comportamiento deseado: con una sola obra en curso y oficina
completa, el sistema avisa.)

### Caja real por mes (`flujoCajaMensualReal`)
`margenReal = cobrado − egresoObra − oficina`:

| mes | cobrado | egreso obra | oficina | margen |
|---|---|---|---|---|
| jul 2026 | 24,000 | 20,498 | 0 | **+3,502** |
| ago 2026 | 0 | 23,840 | 0 | **−23,840** |
| sep 2026 | 30,000 | 4,528 | 6,300 | **+19,172** |
| oct 2026 | 0 | 0 | 17,500 | **−17,500** |

Verificado en la suite: caja jul–oct = `3502/-23840/19172/-17500`, 4 meses.

---

## 9. Recorrido por pantalla

### Dashboard principal (`/`)
1. **Semáforo ejecutivo** → `estadoEmpresa` (🔴/🟡/🟢 + motivo).
2. **Meta de ingreso** → `avanceMetaIngreso` (cobrado empresa vs. meta configurable).
3. **4 StatCards** (Resultado / Gastado / Cobrado / Servicios) con tendencia
   `variacionMensual` sobre la serie de caja y "¿Cómo se calcula?".
4. **Obras en riesgo** → `analizarServicios.motivos` (excedido, plazo vencido/cercano).
5. **Caja real por mes**, **Proyección de personal por mes**, **Utilidad por cliente**,
   **Gasto por servicio**, **Cobros por concepto**, **Cronograma global**.
6. **Movimientos recientes** colapsado (detalle operativo).
7. **Datos y respaldo**: exportar / importar / restablecer ejemplo / vaciar todo.

### Resumen del servicio (`/servicios/:id`)
1. Fechas y días restantes (`diasRestantes`).
2. Alertas (`alertasServicio`).
3. **Dinero**: presupuesto inicial, cobrado, gastado (con % de ejecución),
   saldo disponible, utilidad real.
4. **Métricas**: movimientos por tipo, avance del cronograma, **cascada de utilidad**
   (`cobrado − materiales − personal − equipos − gastos = utilidad`).
5. **Tendencias** (cuadrícula 2×2): curva de gasto acumulado, gasto mensual con
   media móvil, horas hombre por mes, valorizado vs. costo por trabajo.
6. **Productividad**: días estimados vs. reales.
7. **Proyección financiera** con semáforo.
8. **Ritmo de avance** (SPI).

### Partidas
Mismo árbol del Cronograma con columnas: Monto (sumable), Valorizado, Avance,
Costo (subárbol), Margen (valorizado − costo), Días est., Días reales, Desv.
Más "sin tarea asignada" en el total para que nada se pierda.

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

---

## 11. Verificación (cómo reproducir todo este documento)

```
npm run verificar   # 237 pruebas: reducer, calculadora, asignaciones, cobros,
                    # gerencial, montos por tareas, productividad, proyección
                    # financiera, formato, persistencias, rutas SSR
npm run build       # build cliente
```

Secciones clave de `scripts/verificar.jsx`:
- `[ calculadora ]`: gastado 48,866, desgloses, ejecución 40.72 %, presupuesto 120,000.
- `[ asignaciones de personal ]`: 4,000 / 6,000 / 30,896.
- `[ gerencial ]`: KPI utilidad 5,134, resultado empresa −18,666, caja, variación,
  semáforo.
- `[ montos por tareas ]`: 120,000, Cimentación 21,600, Excavación 16,310.
- `[ productividad ]`: duraciones, 173/2 días, desviaciones.
- `[ proyección financiera ]`: 64,800 / 1.33 / 90,492.59 / 29,507.41 / verde.
