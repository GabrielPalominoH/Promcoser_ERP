# AGENTS.md — MVP_Mini_Erp_Promcoser

## Comandos
- `npm run dev` — Vite en `0.0.0.0:5200` (`vite.config.js`).
- `npm run build` — build cliente (`dist/`).
- `npm run verificar` — ÚNICA verificación. Hace `vite build --ssr scripts/verificar.jsx --outDir .verificar-dist` y luego `node .verificar-dist/verificar.js`. No hay jest/vitest/lint/typecheck.
- Convención vigente (`PLANIFICACION.md`): cerrar cada cambio con suite verde + build OK antes de push a `master` y manual actualizado.

## Entradas y estructura
- `src/main.jsx` → `BrowserRouter` + `DataProvider` → `src/App.jsx`.
- Rutas en `App.jsx`: `/` Dashboard gerencial (KPIs de empresa, meta de ingreso, obras en riesgo, evolución de caja real vs proyectada, rentabilidad por cliente y por servicio, cobranza, cronograma; el respaldo vive en el botón "Datos y respaldo" y los movimientos recientes quedan colapsados), `/servicios`, `/servicios/:servicioId` con 9 subrutas en `src/pages/servicio/` (Resumen, Materiales, Personal, Equipos, Gastos, Ingresos, Presupuesto, Cronograma, Partidas, Opciones; `/cobros` y `/facturacion` redirigen a `/ingresos`), más `/personal`, `/equipos`, `/oficina` globales. Sin Pagos ni cierre mensual.
- Lógica pura: `src/utils/calculadora.js` (árbol tareas, costos, `proyeccionAsignaciones`/`diferenciaPersonalAuto`/`mesesDevengadosAsignacion`), `src/utils/finanzas.js` (resultado/margen, saldos, flujo, desviación), `src/utils/gerencial.js` (compone calculadora+finanzas para el panel: `analizarServicios`, `kpisEmpresa`, `avanceMetaIngreso`, `rentabilidadPorCliente`, `flujoCajaMensualReal`, `proyeccionMensualPersonal`, `proyeccionCierre`; no reimplementa fórmulas), `src/utils/formatters.js` (PEN `S/`, céntimos).
- UI: `src/components/layout/` + `src/components/ui/` (`Card`, `Button`, `Field`, `ComboBox`, `Table`, `Modal`, `Aviso`).

## Estado y persistencia
- `src/context/DataContext.jsx`: reducer genérico `AGREGAR/ACTUALIZAR/ELIMINAR_ITEM`, `ALTERNAR_ACTIVO`, `REEMPLAZAR_COLECCION`, `RESTABLECER`. `siguienteId = max(id)+1`.
- `src/data/mockData.js` define `ESTADO_INICIAL`; `COLECCIONES = Object.keys(ESTADO_INICIAL)`. No hardcodear lista de colecciones en código nuevo.
- `src/data/store.js` es el ÚNICO acceso a `localStorage`. Clave `promcoser_mvp_v2` (+ migración `promcoser_mvp_v1`), `_v: 7`. Componentes no tocan `localStorage` (salvo preferencia visual del sidebar). `guardarEstado` retorna bool; `Layout` avisa si falla.
- Cascadas en `ELIMINAR_ITEM`: borrar servicio arrastra registros, tareas, asignaciones, facturas, cobros y presupuestos. Borrar asignación arrastra sus registros mensuales automáticos. Borrar tarea arrastra subtareas multinivel y deja sus costos con `tarea_id: null` (nunca se borran costos). Sin `pagos` ni `generarCierre`.
- Migraciones `migrarEstadoV1` y `migrarPresupuestoATareas` deben conservarse aunque el código ya no use `partidas/valorizaciones`.

## Reglas que rompen la suite si se ignoran
- `scripts/verificar.jsx` aserta números exactos (ej. servicio 6: gastado `48866`, desglose material `30276`/personal `1540`/gasto `3500`/equipo `13550`, mensual `20498/23840/4528`, proyección asignaciones `30896` en régimen 30 días; sección `[ gerencial ]`: KPI margen `71134`, resultado empresa `47334`, caja jul–oct `3502/-23840/19172/-17500`). Si cambias seeds o fórmulas, actualiza la suite.
- Chequeo SSR de rutas: HTML sin `undefined`/`NaN`, `>1500b`, con `PROMCOSER` y `S/` donde aplique.
- Negocio: monto padre = suma hijas (`montoTarea`); valorizado = monto × avance efectivo; registros `personal` diarios en domingo no cuentan salvo `modalidad: 'mensual'` (`cuentaComoManoDeObra`); costo personal directo automático desde asignaciones (`diferenciaPersonalAuto` sincroniza devengado hasta hoy en `PersonalServicio.jsx`); baja = `fecha_fin`.
- Finanzas en `finanzas.js`: ingresos = valorizado, PEN, redondeo a céntimos. `margenBruto`/`porcentajeEjecucion` retornan `null` sin base (no `NaN`/`0` ficticio).

## Convenciones UI / datos
- Vocabulario fijo: Personal, Equipos, Cobrado, Por cobrar, Utilidad real, Devengado, Dar de baja, Sin tarea asignada.
- `CampoComboBox` para selectores con búsqueda (normaliza tildes/minúsculas); `Select` nativo solo para 2–3 opciones fijas.
- `MODELO_DATOS.md` es la referencia de colecciones/relaciones; `PLANIFICACION.md` el roadmap por módulos (M1–M10, M8 Contratos eliminado).
- Seeds con 104 DNI en `mockData.js`: datos sensibles/ejemplo, no reproducir ni borrar sin autorización.
