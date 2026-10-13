import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { DataProvider, dataReducer, siguienteId } from '../src/context/DataContext'
import { COLECCIONES, ESTADO_INICIAL, TIPOS_SERVICIO, migrarPresupuestoATareas, tipoServicio } from '../src/data/mockData'
import {
  cargarEstado,
  guardarEstado,
  normalizarRespaldo,
  serializarRespaldo,
  validarRespaldo,
} from '../src/data/store'
import {
  cobrosDeFactura,
  enMes,
  enRango,
  esVigente,
  estadoFactura,
  flujoNetoCaja,
  margenBruto,
  porcentajeEjecucion,
  resultadoBruto,
  resultadoOperativoEstimado,
  resultadoPorServicio,
  saldoFactura,
  saldoPorCobrar,
  saldoPorPagar,
  soloVigentes,
} from '../src/utils/finanzas'
import { alertasServicio, asentamientoDe, avanceEfectivo, cobradoServicio, costoMensualAsignacion, costoPorTarea, costoSinTarea, costoSubarbol, cuentaComoManoDeObra, desglosePorTipo, desviacionDias, diasCalendarioRango, diasEstimadosTarea, diasRealesTarea, diferenciaPersonalAuto, esDomingo, estadoPresupuesto, horasPorMes, sumarMontos, mediaMovil, proyeccionFinanciera, registrosDeServicio, metricasCronograma, montoTarea, presupuestoTareas, proyeccionAsignaciones, gastoPorMes, indiceAvance, utilidadReal, valorizadoTarea } from '../src/utils/calculadora'
import {
  analizarServicios,
  avanceMetaIngreso,
  estadoEmpresa,
  flujoCajaMensualReal,
  kpisEmpresa,
  proyeccionMensualPersonal,
  rentabilidadPorCliente,
  variacionMensual,
} from '../src/utils/gerencial'
import { redondearMonto, formatearMoneda, normalizarEntradaMonto, formatearEntradaMonto, parsearEntradaMonto } from '../src/utils/formatters'
import { filtrarOpciones, normalizar } from '../src/components/ui/ComboBox'
import { resolverFacturaIngreso } from '../src/pages/servicio/IngresosServicio'
import App from '../src/App'

let fallos = 0
let pruebas = 0

function comprobar(descripcion, condicion, detalle = '') {
  pruebas += 1
  if (condicion) {
    console.log(`  OK    ${descripcion}`)
  } else {
    fallos += 1
    console.log(`  FALLO ${descripcion}${detalle ? ` -> ${detalle}` : ''}`)
  }
}

// ============================================================
//  1. Reducer
// ============================================================

console.log('\n[ reducer ]')

const conEquipo = dataReducer(ESTADO_INICIAL, {
  type: 'AGREGAR_ITEM',
  payload: { coleccion: 'equipos', item: { id: 99, nombre: 'Prueba', costo_por_hora: 10 } },
})
comprobar('AGREGAR_ITEM agrega al final', conEquipo.equipos.length === ESTADO_INICIAL.equipos.length + 1)
comprobar('las demás colecciones no se tocan', conEquipo.servicios === ESTADO_INICIAL.servicios)

const editado = dataReducer(conEquipo, {
  type: 'ACTUALIZAR_ITEM',
  payload: { coleccion: 'equipos', item: { id: 99, nombre: 'Prueba editada' } },
})
comprobar('ACTUALIZAR_ITEM hace merge parcial', editado.equipos.at(-1).nombre === 'Prueba editada')
comprobar('ACTUALIZAR_ITEM conserva el resto', editado.equipos.at(-1).costo_por_hora === 10)

// Ninguna colección restante usa `activo`: se prueba con un estado mínimo.
const alternado = dataReducer({ cosas: [{ id: 1, activo: true }, { id: 2, activo: true }] }, {
  type: 'ALTERNAR_ACTIVO',
  payload: { coleccion: 'cosas', id: 1 },
})
comprobar('ALTERNAR_ACTIVO invierte activo', alternado.cosas.find((p) => p.id === 1).activo === false)
comprobar('ALTERNAR_ACTIVO no toca otros', alternado.cosas.find((p) => p.id === 2).activo === true)

const sinServicio = dataReducer(ESTADO_INICIAL, {
  type: 'ELIMINAR_ITEM',
  payload: { coleccion: 'servicios', id: 6 },
})
const huerfanos = sinServicio.registros_servicio.filter((r) => r.servicio_id === 6)
comprobar('ELIMINAR_ITEM quita el servicio', !sinServicio.servicios.some((s) => s.id === 6))
comprobar('ELIMINAR_ITEM borra registros en cascada', huerfanos.length === 0, `quedan ${huerfanos.length}`)
comprobar(
  'ELIMINAR_ITEM borra tareas en cascada',
  !sinServicio.tareas.some((t) => t.servicio_id === 6),
)
comprobar('conserva las demás colecciones', sinServicio.personal.length === ESTADO_INICIAL.personal.length)

const sinTarea = dataReducer(ESTADO_INICIAL, {
  type: 'ELIMINAR_ITEM',
  payload: { coleccion: 'tareas', id: 14 },
})
comprobar(
  'ELIMINAR_ITEM borra subtareas en cascada',
  !sinTarea.tareas.some((t) => t.id === 14 || t.padre_id === 14),
)
comprobar('conserva las demás tareas', sinTarea.tareas.some((t) => t.id === 13))

const arbolPrueba = [
  { id: 91, servicio_id: 6, padre_id: null, nombre: 'Abuelo', fecha_inicio: '2026-01-01', fecha_fin: '2026-01-10', avance: 0 },
  { id: 92, servicio_id: 6, padre_id: 91, nombre: 'Hijo', fecha_inicio: '2026-01-01', fecha_fin: '2026-01-10', avance: 0 },
  { id: 93, servicio_id: 6, padre_id: 92, nombre: 'Nieto', fecha_inicio: '2026-01-01', fecha_fin: '2026-01-10', avance: 60 },
]
comprobar('avance recursivo nivel 3 = 60', avanceEfectivo(arbolPrueba[0], arbolPrueba) === 60, String(avanceEfectivo(arbolPrueba[0], arbolPrueba)))
comprobar('avance hoja intacto', avanceEfectivo(arbolPrueba[2], arbolPrueba) === 60)
const conArbol = { ...ESTADO_INICIAL, tareas: [...ESTADO_INICIAL.tareas, ...arbolPrueba] }
const sinAbuelo = dataReducer(conArbol, { type: 'ELIMINAR_ITEM', payload: { coleccion: 'tareas', id: 91 } })
comprobar('cascada multinivel borra todo el árbol', ![91, 92, 93].some((id) => sinAbuelo.tareas.some((t) => t.id === id)))

const restaurado = dataReducer(sinServicio, { type: 'RESTABLECER' })
comprobar('RESTABLECER vuelve a los mocks', restaurado.equipos.length === ESTADO_INICIAL.equipos.length)

// Vaciar todo (producción): cada colección queda en [] salvo config.
const vaciado = COLECCIONES.reduce(
  (est, c) =>
    c === 'config'
      ? est
      : dataReducer(est, { type: 'REEMPLAZAR_COLECCION', payload: { coleccion: c, items: [] } }),
  ESTADO_INICIAL,
)
comprobar(
  'vaciar todo deja colecciones vacías y conserva config',
  COLECCIONES.filter((c) => c !== 'config').every((c) => vaciado[c].length === 0) &&
    vaciado.config.length === ESTADO_INICIAL.config.length,
)

comprobar('siguienteId equipos = 26', siguienteId(ESTADO_INICIAL.equipos) === 26, String(siguienteId(ESTADO_INICIAL.equipos)))
comprobar('siguienteId arreglo vacío = 1', siguienteId([]) === 1, String(siguienteId([])))

// El id debe quedar siempre por encima del máximo, aunque se borre el último.
const sinUltimo = ESTADO_INICIAL.equipos.slice(0, -1)
comprobar('siguienteId tras borrado = 25', siguienteId(sinUltimo) === 25, String(siguienteId(sinUltimo)))

const desconocido = dataReducer(ESTADO_INICIAL, { type: 'NO_EXISTE' })
comprobar('acción desconocida devuelve el estado igual', desconocido === ESTADO_INICIAL)

// ============================================================
//  2. Cálculos de costos e ingresos
// ============================================================

console.log('\n[ calculadora ]')

const { registros_servicio: registros, servicios, cobros: cobrosSemilla } = ESTADO_INICIAL
const servicio6 = servicios.find((s) => s.id === 6)
comprobar('servicio 6 tiene presupuesto inicial = 120000', servicio6.presupuesto_asignado === 120000, String(servicio6.presupuesto_asignado))
const gastado6 = sumarMontos(registrosDeServicio(registros, 6))
const cobrado6 = cobradoServicio(cobrosSemilla, 6)

comprobar('gastado servicio 6 = 48866', gastado6 === 48866, String(gastado6))
comprobar('cobrado servicio 6 = 54000', cobrado6 === 54000, String(cobrado6))
comprobar('utilidad serv. 6 = 5134', utilidadReal(cobrado6, gastado6) === 5134, String(utilidadReal(cobrado6, gastado6)))
const estado6 = estadoPresupuesto(servicio6, registros, cobrosSemilla)
comprobar('presupuesto inicial = 120000', estado6.presupuesto === 120000, String(estado6.presupuesto))
comprobar('disponible = 71134', estado6.disponible === 71134, String(estado6.disponible))
comprobar('ejecución ≈ 40.72%', Math.abs(estado6.porcentaje - 40.72) < 0.01, estado6.porcentaje.toFixed(3))
comprobar('no excedido', estado6.excedido === false)
comprobar('cobrado en estado = 54000', estado6.cobrado === 54000, String(estado6.cobrado))

const desglose6 = desglosePorTipo(registrosDeServicio(registros, 6))
comprobar('desglose material = 30276', desglose6.material === 30276, String(desglose6.material))
comprobar('desglose personal = 1540', desglose6.personal === 1540, String(desglose6.personal))
comprobar('desglose gasto = 3500', desglose6.gasto === 3500, String(desglose6.gasto))
comprobar('desglose equipo = 13550', desglose6.equipo === 13550, String(desglose6.equipo))
comprobar('desglose suma el total', Object.values(desglose6).reduce((a, b) => a + b, 0) === gastado6)
comprobar('cascada: cobrado − tipos = utilidad', cobrado6 - Object.values(desglose6).reduce((a, b) => a + b, 0) === utilidadReal(cobrado6, gastado6))

comprobar('sumarMontos total = 48866', sumarMontos(registros) === 48866, String(sumarMontos(registros)))

const { tareas } = ESTADO_INICIAL
const tareas6 = tareas.filter((t) => t.servicio_id === 6)
const met6 = metricasCronograma(tareas6)
comprobar('cronograma serv. 6 = 9 tareas', met6.total === 9, String(met6.total))
comprobar('cronograma serv. 6 = 4 completadas', met6.completadas === 4, String(met6.completadas))
comprobar('avance global serv. 6 = 54', met6.avanceGlobal === 54, String(met6.avanceGlobal))
const metVacio = metricasCronograma([])
comprobar('cronograma vacío en ceros', metVacio.total === 0 && metVacio.avanceGlobal === 0)

const alertasSanas = alertasServicio({ estado: { excedido: false, presupuesto: 120000, disponible: 50000 }, dias: 60 })
comprobar('sin problemas no hay alertas', alertasSanas.length === 0, JSON.stringify(alertasSanas))
const alertasMal = alertasServicio({ estado: { excedido: true, presupuesto: 100, disponible: -10 }, dias: -5 })
const codigos = alertasMal.map((a) => a.codigo)
comprobar(
  'detecta excedido y plazo vencido',
  ['excedido', 'plazo-vencido'].every((c) => codigos.includes(c)),
  JSON.stringify(codigos),
)
const alertasCerca = alertasServicio({ estado: { excedido: false, presupuesto: 1000, disponible: 50 }, dias: 10 })
comprobar(
  'margen bajo y plazo cercano avisan',
  alertasCerca.some((a) => a.codigo === 'margen-bajo') && alertasCerca.some((a) => a.codigo === 'plazo-cercano'),
  JSON.stringify(alertasCerca.map((a) => a.codigo)),
)
comprobar('sin plazo no hay alertas', alertasServicio({ estado: { excedido: false, presupuesto: 0, disponible: 0 }, dias: null }).length === 0)

const mensual6 = gastoPorMes(registrosDeServicio(registros, 6))
comprobar('gasto mensual serv. 6 = 3 meses', mensual6.length === 3, JSON.stringify(mensual6.map((m) => m.mes)))
comprobar('julio serv. 6 = 20498', mensual6[0].monto === 20498, String(mensual6[0]?.monto))
comprobar('agosto serv. 6 = 23840', mensual6[1].monto === 23840, String(mensual6[1]?.monto))
comprobar('septiembre serv. 6 = 4528', mensual6[2].monto === 4528, String(mensual6[2]?.monto))
comprobar('gasto mensual vacío = []', gastoPorMes([]).length === 0)
comprobar('esDomingo detecta domingo', esDomingo('2026-10-04') === true)
comprobar('esDomingo descarta lunes', esDomingo('2026-10-05') === false)
comprobar('esDomingo con vacío es false', esDomingo('') === false)
comprobar(
  'personal en domingo no cuenta',
  cuentaComoManoDeObra({ tipo_registro: 'personal', fecha: '2026-10-04' }) === false,
)
comprobar(
  'mensual en domingo sí cuenta (régimen 30 días)',
  cuentaComoManoDeObra({ tipo_registro: 'personal', modalidad: 'mensual', fecha: '2026-10-04' }) === true,
)
comprobar(
  'personal en sábado sí cuenta',
  cuentaComoManoDeObra({ tipo_registro: 'personal', fecha: '2026-10-03' }) === true,
)
comprobar(
  'material en domingo sí cuenta',
  cuentaComoManoDeObra({ tipo_registro: 'material', fecha: '2026-10-04' }) === true,
)
console.log('\n[ asignaciones de personal ]')

const { asignaciones: asigs } = ESTADO_INICIAL
const servSeis = ESTADO_INICIAL.servicios.find((s) => s.id === 6)
comprobar('serv. 6 tiene 2 asignaciones', asigs.filter((a) => a.servicio_id === 6).length === 2)
comprobar('rango calendario 12→31 ago = 20 días', diasCalendarioRango('2026-08-12', '2026-08-31') === 20)
comprobar('mensual Elmer ago = 4000', costoMensualAsignacion(asigs[0], '2026-08', servSeis).monto === 4000, JSON.stringify(costoMensualAsignacion(asigs[0], '2026-08', servSeis)))
comprobar('mensual Ronald sep prorrateado = 2160', costoMensualAsignacion(asigs[1], '2026-09', servSeis).monto === 2160)
comprobar('mensual Ronald oct (baja) = 0', costoMensualAsignacion(asigs[1], '2026-10', servSeis).monto === 0)
comprobar('diciembre se recorta al fin de obra (20 días)', costoMensualAsignacion(asigs[0], '2026-12', servSeis).dias === 20)
comprobar('régimen 30 días: octubre completo = 6000', costoMensualAsignacion(asigs[0], '2026-10', servSeis).monto === 6000)
comprobar('régimen 30 días: febrero completo = 30 días', costoMensualAsignacion({ fecha_inicio: '2026-02-01', fecha_fin: null, horas_por_dia: 8, tarifa: 25 }, '2026-02', { fecha_inicio: '2026-02-01', fecha_fin_estimada: '2026-02-28' }).dias === 30)
const proyAsig6 = proyeccionAsignaciones(asigs, servSeis, ESTADO_INICIAL.registros_servicio)
comprobar('total inicio-fin con baja = 30896', proyAsig6.total === 30896, String(proyAsig6.total))
comprobar('sin devengar todo es proyectado', proyAsig6.gastado === 0 && proyAsig6.proyectado === 30896)
const sinBaja = asigs.map((a) => (a.id === 2 ? { ...a, fecha_fin: null } : a))
const proyAsigSinBaja = proyeccionAsignaciones(sinBaja, servSeis, ESTADO_INICIAL.registros_servicio)
comprobar('sin baja el total sería mayor (44576)', proyAsigSinBaja.total === 44576, String(proyAsigSinBaja.total))
comprobar('la baja baja el total', proyAsigSinBaja.total > proyAsig6.total)
comprobar('sin devengo devuelve null', asentamientoDe(1, ESTADO_INICIAL.registros_servicio, '2026-08') === null)
comprobar('cascada servicio borra asignaciones', !(sinServicio.asignaciones ?? []).some((a) => a.servicio_id === 6))

console.log('\n[ cobros ]')

const { cobros } = ESTADO_INICIAL
comprobar('serv. 6 tiene 2 cobros', cobros.filter((c) => c.servicio_id === 6).length === 2)
comprobar('cobrado serv. 6 = 54000', cobradoServicio(cobros, 6) === 54000, String(cobradoServicio(cobros, 6)))
comprobar('utilidad real = cobrado − gastado', utilidadReal(cobradoServicio(cobros, 6), gastado6) === 54000 - gastado6)
comprobar('cascada servicio borra cobros', !(sinServicio.cobros ?? []).some((c) => c.servicio_id === 6))

console.log('\n[ dashboard global ]')

const regsDash6 = registrosDeServicio(ESTADO_INICIAL.registros_servicio, 6)
const gastadoDash6 = sumarMontos(regsDash6)
comprobar('gastado serv. 6 = 48866', gastadoDash6 === 48866, String(gastadoDash6))
const oficinaTotal = sumarMontos(ESTADO_INICIAL.costos_oficina)
comprobar('oficina total = 23800', oficinaTotal === 23800, String(oficinaTotal))
comprobar('utilidad serv. 6 = 5134', 54000 - gastadoDash6 === 5134)
comprobar('resultado empresa = -18666', (54000 - gastadoDash6) - oficinaTotal === -18666)
const porMes6 = proyeccionAsignaciones(asigs, servSeis, ESTADO_INICIAL.registros_servicio).porMes
const pendientes6 = porMes6.filter((m) => m.estimado && m.monto > 0 && ['2026-08', '2026-09', '2026-10'].includes(m.mes))
comprobar('ago/oct proyectados suman 6736/8160/6000', JSON.stringify(pendientes6.map((m) => m.monto)) === '[6736,8160,6000]', JSON.stringify(pendientes6.map((m) => m.monto)))
const porConcepto = cobros.reduce((a, c) => ({ ...a, [c.concepto]: (a[c.concepto] || 0) + c.monto }), {})
comprobar('adelanto 24000 y valorización 30000', porConcepto.adelanto === 24000 && porConcepto['valorización'] === 30000)
comprobar('COLECCIONES trae asignaciones y cobros, sin partidas ni presupuestos', COLECCIONES.includes('asignaciones') && COLECCIONES.includes('cobros') && !COLECCIONES.includes('partidas') && !COLECCIONES.includes('valorizaciones') && !COLECCIONES.includes('presupuestos'))
const spi6 = indiceAvance(servicio6, 54, '2026-10-06')
comprobar('SPI serv. 6 ≈ 0.96', spi6 && Math.abs(spi6.spi - 0.96) < 0.01, String(spi6?.spi))
comprobar('sin plazo no hay SPI', indiceAvance({ fecha_inicio: '', fecha_fin_estimada: '' }, 50, '2026-10-06') === null)
comprobar('obra sin empezar no tiene SPI', indiceAvance({ fecha_inicio: '2026-12-01', fecha_fin_estimada: '2027-01-01' }, 0, '2026-10-06') === null)

const { costos_oficina: oficina } = ESTADO_INICIAL
const oficinaOct = oficina.filter((c) => c.mes === '2026-10').reduce((t, c) => t + c.monto_calculado, 0)
const oficinaSep = oficina.filter((c) => c.mes === '2026-09').reduce((t, c) => t + c.monto_calculado, 0)
comprobar('oficina oct = 17500', oficinaOct === 17500, String(oficinaOct))
comprobar('oficina sep = 6300', oficinaSep === 6300, String(oficinaSep))
const soloObra = ESTADO_INICIAL.personal.filter((p) => (p.ambito ?? 'Obra') !== 'Oficina')
comprobar('personal de obra > 0 y < total', soloObra.length > 0 && soloObra.length < ESTADO_INICIAL.personal.length, String(soloObra.length))
comprobar('sumarMontos vacío = 0', sumarMontos([]) === 0)

console.log('\n[ gerencial ]')

const analisis6 = analizarServicios({ servicios: [servicio6], registros, cobros: ESTADO_INICIAL.cobros })
comprobar('análisis serv. 6 = 1 servicio', analisis6.length === 1, String(analisis6.length))
comprobar('análisis serv. 6 gastado = 48866', analisis6[0].gastado === 48866, String(analisis6[0].gastado))
comprobar('análisis serv. 6 cobrado/utilidad = 54000/5134', analisis6[0].cobrado === 54000 && analisis6[0].utilidad === 5134, `${analisis6[0].cobrado}/${analisis6[0].utilidad}`)
comprobar('análisis serv. 6 disponible = 71134', analisis6[0].estado.disponible === 71134, String(analisis6[0].estado.disponible))

const kpis6 = kpisEmpresa({
  servicios: [servicio6],
  registros,
  cobros: ESTADO_INICIAL.cobros,
  costosOficina: ESTADO_INICIAL.costos_oficina,
  analisis: analisis6,
})
comprobar('kpi gastado = 48866', kpis6.gastado === 48866, String(kpis6.gastado))
comprobar('kpi utilidad = 5134', kpis6.utilidadServicios === 5134, String(kpis6.utilidadServicios))
comprobar('kpi cobrado = 54000', kpis6.cobrado === 54000, String(kpis6.cobrado))
comprobar('kpi resultado empresa = -18666', kpis6.resultadoEmpresa === -18666, String(kpis6.resultadoEmpresa))
comprobar('kpi servicios en curso = 1', kpis6.enCurso === 1 && kpis6.total === 1, `${kpis6.enCurso}/${kpis6.total}`)

const clientes6 = rentabilidadPorCliente({
  servicios: [servicio6],
  registros,
  cobros: ESTADO_INICIAL.cobros,
})
const filaCliente = clientes6[0] ?? {}
comprobar('utilidad cliente: gastado/cobrado', filaCliente.gastado === 48866 && filaCliente.cobrado === 54000)
comprobar('utilidad cliente: utilidad = 5134', filaCliente.utilidad === 5134, String(filaCliente.utilidad))
comprobar('utilidad cliente: utilidad % ≈ 9.51', filaCliente.utilidadPct != null && Math.abs(filaCliente.utilidadPct - 9.51) < 0.01, String(filaCliente.utilidadPct))

const caja = flujoCajaMensualReal({
  registros,
  cobros: ESTADO_INICIAL.cobros,
  costosOficina: ESTADO_INICIAL.costos_oficina,
})
const mesCaja = (m) => caja.find((f) => f.mes === m) ?? {}
comprobar('caja julio = 3502', mesCaja('2026-07').margenReal === 3502, String(mesCaja('2026-07').margenReal))
comprobar('caja agosto = -23840', mesCaja('2026-08').margenReal === -23840, String(mesCaja('2026-08').margenReal))
comprobar('caja septiembre = 19172', mesCaja('2026-09').margenReal === 19172, String(mesCaja('2026-09').margenReal))
comprobar('caja octubre = -17500', mesCaja('2026-10').margenReal === -17500, String(mesCaja('2026-10').margenReal))
comprobar('caja cubre julio a octubre (4 meses)', caja.length === 4 && caja[0].mes === '2026-07' && caja[3].mes === '2026-10', caja.map((f) => f.mes).join(','))
const varCaja = variacionMensual(caja, 'cobrado')
comprobar('variación cobrado sep→oct = -100%', varCaja != null && varCaja.diferencia === -30000 && varCaja.porcentaje === -100, JSON.stringify(varCaja))
comprobar('variación sube en positivo', variacionMensual([{ mes: 'a', x: 100 }, { mes: 'b', x: 150 }], 'x').porcentaje === 50)
comprobar('variación sin base es null', variacionMensual([{ mes: 'a', x: 0 }, { mes: 'b', x: 50 }], 'x').porcentaje === null)
comprobar('variación con 1 punto es null', variacionMensual([{ mes: 'a', x: 50 }], 'x') === null)
comprobar('variación vacía es null', variacionMensual([], 'x') === null)
const semVerde = estadoEmpresa({ resultadoEmpresa: 1000, enRiesgo: 0, ultimoMargenCaja: 500 })
comprobar('semáforo verde sin alertas', semVerde.nivel === 'verde', semVerde.nivel)
comprobar('semáforo rojo con resultado negativo', estadoEmpresa({ resultadoEmpresa: -1, enRiesgo: 0, ultimoMargenCaja: 500 }).nivel === 'rojo')
const semAmarillo = estadoEmpresa({ resultadoEmpresa: 1000, enRiesgo: 2, ultimoMargenCaja: -100 })
comprobar('semáforo amarillo con riesgo y caja', semAmarillo.nivel === 'amarillo' && semAmarillo.mensaje.includes('2 obra(s)'), semAmarillo.mensaje)
comprobar('semáforo amarillo solo por caja', estadoEmpresa({ resultadoEmpresa: 1000, enRiesgo: 0, ultimoMargenCaja: -100 }).nivel === 'amarillo')

const proyectado6 = proyeccionMensualPersonal({
  asignaciones: ESTADO_INICIAL.asignaciones,
  servicios: [servicio6],
  registros,
})
const mesProy = (m) => (proyectado6.find((f) => f.mes === m) ?? {}).monto
comprobar('proyección personal ago = 6736', mesProy('2026-08') === 6736, String(mesProy('2026-08')))
comprobar('proyección personal sep = 8160', mesProy('2026-09') === 8160, String(mesProy('2026-09')))
comprobar('proyección personal oct = 6000', mesProy('2026-10') === 6000, String(mesProy('2026-10')))

const sinMeta = avanceMetaIngreso({ cobrado: 54000, meta: 0 })
comprobar('meta sin definir no tiene porcentaje', sinMeta.definida === false && sinMeta.porcentaje === null)
comprobar('meta sin definir no tiene faltante', sinMeta.falta === null, String(sinMeta.falta))

const meta100 = avanceMetaIngreso({ cobrado: 54000, meta: 100000 })
comprobar('meta 100000: faltante = 46000', meta100.falta === 46000, String(meta100.falta))
comprobar('meta 100000: avance = 54%', meta100.porcentaje === 54 && meta100.cumplida === false, String(meta100.porcentaje))

const metaSuperada = avanceMetaIngreso({ cobrado: 120000, meta: 100000 })
comprobar('meta superada: cumplida hasta 120%', metaSuperada.cumplida === true && metaSuperada.falta === 0 && metaSuperada.porcentaje === 120, String(metaSuperada.porcentaje))

console.log('\n[ montos por tareas ]')

const { registros_servicio: regs } = ESTADO_INICIAL
const tareasTodas = ESTADO_INICIAL.tareas
const tareasServ6 = tareasTodas.filter((t) => t.servicio_id === 6)
comprobar('monto total serv. 6 = 120000', presupuestoTareas(tareasTodas, 6) === 120000, String(presupuestoTareas(tareasTodas, 6)))
comprobar('monto padre suma hijas (cimentación = 21600)', montoTarea(tareasServ6.find((t) => t.id === 14), tareasServ6) === 21600)
comprobar('monto hoja manual (excavación = 9600)', montoTarea(tareasServ6.find((t) => t.id === 15), tareasServ6) === 9600)
comprobar('valorizado cimentación = 21600', valorizadoTarea(tareasServ6.find((t) => t.id === 14), tareasServ6) === 21600)
comprobar('costo tarea excavación = 16310', costoPorTarea(regs, 6, 15) === 16310, String(costoPorTarea(regs, 6, 15)))
comprobar('costo subárbol cimentación = 38110', costoSubarbol(tareasServ6.find((t) => t.id === 14), tareasServ6, regs, 6) === 38110)
comprobar(
  'costo total = raíces + sin tarea',
  tareasServ6.filter((t) => t.padre_id == null).reduce((s, t) => s + costoSubarbol(t, tareasServ6, regs, 6), 0) + costoSinTarea(regs, 6) === sumarMontos(registrosDeServicio(regs, 6)),
)
const sinTarea15 = dataReducer(ESTADO_INICIAL, {
  type: 'ELIMINAR_ITEM',
  payload: { coleccion: 'tareas', id: 15 },
})
comprobar('borrar tarea no borra sus costos', sinTarea15.registros_servicio.length === regs.length)
comprobar(
  'borrar tarea deja costos sin tarea',
  [19, 22, 23].every((id) => sinTarea15.registros_servicio.find((x) => x.id === id).tarea_id == null),
)
const sinRaiz = dataReducer(ESTADO_INICIAL, {
  type: 'ELIMINAR_ITEM',
  payload: { coleccion: 'tareas', id: 14 },
})
comprobar(
  'borrar raíz borra sus subtareas',
  ![14, 15, 16].some((id) => sinRaiz.tareas.some((t) => t.id === id)),
)

console.log('\n[ productividad ]')

const porIdTarea = (id) => tareasServ6.find((t) => t.id === id)
comprobar('duración excavación = 16 d', diasEstimadosTarea(porIdTarea(15), tareasServ6) === 16)
comprobar('duración columnas = 36 d', diasEstimadosTarea(porIdTarea(18), tareasServ6) === 36)
comprobar('estimado padre suma hijas = 31 d', diasEstimadosTarea(porIdTarea(14), tareasServ6) === 31)
comprobar('estimado estructuras = 61 d', diasEstimadosTarea(porIdTarea(17), tareasServ6) === 61)
comprobar('días reales vaciado = 1', diasRealesTarea(porIdTarea(16), tareasServ6, regs, 6) === 1)
comprobar('días reales columnas = 1', diasRealesTarea(porIdTarea(18), tareasServ6, regs, 6) === 1)
comprobar('días reales sin registros = 0', diasRealesTarea(porIdTarea(13), tareasServ6, regs, 6) === 0)
comprobar('días reales padre junta hijas = 1', diasRealesTarea(porIdTarea(14), tareasServ6, regs, 6) === 1)
const estServ6 = tareasServ6.filter((t) => t.padre_id == null).reduce((s, t) => s + diasEstimadosTarea(t, tareasServ6), 0)
const realServ6 = tareasServ6.filter((t) => t.padre_id == null).reduce((s, t) => s + diasRealesTarea(t, tareasServ6, regs, 6), 0)
comprobar('servicio estimado/real = 173/2 d', estServ6 === 173 && realServ6 === 2, `${estServ6}/${realServ6}`)
const desvServ6 = desviacionDias(estServ6, realServ6)
comprobar('desviación −171 d', desvServ6.diferencia === -171, String(desvServ6.diferencia))
comprobar('desviación positiva = más días', desviacionDias(10, 12).diferencia === 2)
comprobar('sin estimado no hay %', desviacionDias(0, 5).porcentaje === null)
const horasMes6 = horasPorMes(ESTADO_INICIAL.registros_servicio, 6)
comprobar('horas por mes serv. 6 = ago 70 h', horasMes6.length === 1 && horasMes6[0].mes === '2026-08' && horasMes6[0].horas === 70, JSON.stringify(horasMes6))
comprobar('horas por mes vacío = []', horasPorMes([], 6).length === 0)
comprobar('media móvil 10/20/30/40 = 10/15/20/30', JSON.stringify(mediaMovil([10, 20, 30, 40])) === '[10,15,20,30]')
comprobar('media móvil corta promedia lo que hay', JSON.stringify(mediaMovil([10, 20])) === '[10,15]')
comprobar('media móvil vacía = []', mediaMovil([]).length === 0)

console.log('\n[ proyección financiera ]')

const proy6 = proyeccionFinanciera({ presupuesto: 120000, gastado: 48866, cobrado: 54000, avance: 54, spi: 0.96 })
comprobar('valor ganado = 64800', proy6.valorGanado === 64800, String(proy6.valorGanado))
comprobar('ritmo de gasto ≈ 1.33', proy6.cpi != null && Math.abs(proy6.cpi - 1.33) < 0.01, String(proy6.cpi))
comprobar('costo final ≈ 90492.59', proy6.costoFinal != null && Math.abs(proy6.costoFinal - 90492.59) < 0.01, String(proy6.costoFinal))
comprobar('utilidad proyectada ≈ 29507.41', proy6.utilidadProyectada != null && Math.abs(proy6.utilidadProyectada - 29507.41) < 0.01, String(proy6.utilidadProyectada))
comprobar('margen proyectado ≈ 24.59%', proy6.margenProyectadoPct != null && Math.abs(proy6.margenProyectadoPct - 24.59) < 0.01, String(proy6.margenProyectadoPct))
comprobar('cobro proyectado = 100000', proy6.cobroProyectado === 100000, String(proy6.cobroProyectado))
comprobar('faltante por facturar = 20000', proy6.faltanteCobro === 20000, String(proy6.faltanteCobro))
comprobar('semáforo verde', proy6.semaforo === 'verde', String(proy6.semaforo))
const proySinAvance = proyeccionFinanciera({ presupuesto: 120000, gastado: 0, cobrado: 0, avance: 0, spi: null })
comprobar('sin avance no hay proyección', proySinAvance.tieneProyeccion === false && proySinAvance.semaforo === null)
comprobar(
  'sobrecosto crítico da rojo',
  proyeccionFinanciera({ presupuesto: 1000, gastado: 2000, cobrado: 0, avance: 50, spi: 1 }).semaforo === 'rojo',
)
comprobar(
  'retraso de plazo da amarillo',
  proyeccionFinanciera({ presupuesto: 120000, gastado: 48866, cobrado: 54000, avance: 54, spi: 0.5 }).semaforo === 'amarillo',
)

console.log('\n[ migración a tareas ]')

const viejo = {
  partidas: [{ id: 2, servicio_id: 6, nombre: 'Cimentación', unidad: 'm3', metrado: 120, precio_unitario: 180 }],
  valorizaciones: [{ id: 9, partida_id: 2, servicio_id: 6, mes: '2026-08', metrado_ejecutado: 10 }],
  tareas: [{ id: 14, servicio_id: 6, padre_id: null, partida_id: 2, nombre: 'Cimentación', avance: 50 }],
  registros_servicio: [
    { id: 26, servicio_id: 6, partida_id: 2, tarea_id: null, monto_calculado: 16000 },
    { id: 20, servicio_id: 6, monto_calculado: 1200 },
  ],
}
const migrado = migrarPresupuestoATareas(viejo)
comprobar('migración: raíz hereda monto (21600)', migrado.tareas[0].monto === 21600, String(migrado.tareas[0].monto))
comprobar('migración: tarea sin partida_id', !('partida_id' in migrado.tareas[0]))
comprobar('migración: directo va a la raíz', migrado.registros_servicio[0].tarea_id === 14)
comprobar('migración: sin partida queda sin tarea', migrado.registros_servicio[1].tarea_id == null)
comprobar('migración: suelta partidas y valorizaciones', !('partidas' in migrado) && !('valorizaciones' in migrado))

// ============================================================
//  3. Formato
// ============================================================

console.log('\n[ formato ]')

comprobar('redondeo 3.005 -> 3.01', redondearMonto(3.005) === 3.01, String(redondearMonto(3.005)))
comprobar('redondeo 0.1+0.2 -> 0.3', redondearMonto(0.1 + 0.2) === 0.3, String(redondearMonto(0.1 + 0.2)))
comprobar('redondeo ignora basura', redondearMonto('abc') === 0)
comprobar('moneda formatea miles', formatearMoneda(48500).includes('48,500'), formatearMoneda(48500))
comprobar('entrada: agrupa miles', formatearEntradaMonto('1000000') === '1,000,000', formatearEntradaMonto('1000000'))
comprobar('entrada: conserva decimales', formatearEntradaMonto('1234.5') === '1,234.5', formatearEntradaMonto('1234.5'))
comprobar('entrada: lee comas de miles', normalizarEntradaMonto('1,234,567.89') === '1234567.89', normalizarEntradaMonto('1,234,567.89'))
comprobar('entrada: limita a 2 decimales', normalizarEntradaMonto('12.3456') === '12.34', normalizarEntradaMonto('12.3456'))
comprobar('entrada: quita ceros a la izquierda', normalizarEntradaMonto('007') === '7', normalizarEntradaMonto('007'))
comprobar('entrada: conserva el punto a medias', normalizarEntradaMonto('1000.') === '1000.', normalizarEntradaMonto('1000.'))
comprobar('entrada: sin dígitos queda vacío', normalizarEntradaMonto('abc') === '', normalizarEntradaMonto('abc'))
comprobar('entrada: parsea a número', parsearEntradaMonto('1,234.50') === 1234.5, String(parsearEntradaMonto('1,234.50')))
comprobar('entrada: parseo vacío = ""', parsearEntradaMonto('') === '', String(parsearEntradaMonto('')))

console.log('\n[ combobox ]')

const OPCIONES = [
  { valor: '1', etiqueta: 'Cimentación (m3)' },
  { valor: '2', etiqueta: 'Cobertura metálica (m2)' },
  { valor: '3', etiqueta: 'Acero de refuerzo' },
]
comprobar('normalizar quita tildes', normalizar('Cimentación') === 'cimentacion')
comprobar('vacío devuelve todo', filtrarOpciones(OPCIONES, '').length === 3)
comprobar('filtra sin tildes', filtrarOpciones(OPCIONES, 'cimentacion').length === 1)
comprobar('filtra sin mayúsculas', filtrarOpciones(OPCIONES, 'ACERO').length === 1)
comprobar('filtra parcial', filtrarOpciones(OPCIONES, 'er').length === 2)
comprobar('sin coincidencias = []', filtrarOpciones(OPCIONES, 'zzz').length === 0)

// ============================================================
//  4. Núcleo financiero centralizado (Casos A–F, H–J)
// ============================================================

console.log('\n[ finanzas ]')

// Caso A: servicio rentable.
comprobar('A bruto = 4500', resultadoBruto(10000, 5500) === 4500)
comprobar('A margen = 45%', margenBruto(4500, 10000) === 45)
// Caso B: servicio con pérdidas.
comprobar('B bruto = −1200', resultadoBruto(8000, 9200) === -1200)
comprobar('B margen = −15%', margenBruto(-1200, 8000) === -15)
// Caso C: factura 10000 + cobro 4000 (no son 14000 de ingresos).
comprobar('C facturado/cobrado/saldo', saldoPorCobrar(10000, 4000) === 6000 && 4000 + 6000 === 10000)
// Caso D: gasto sin pago no mueve caja.
comprobar('D saldo pendiente 1500 y caja 0', saldoPorPagar(1500, 0) === 1500 && flujoNetoCaja(0, 0) === 0)
// Caso E: pago parcial.
comprobar('E saldo 1200', saldoPorPagar(2000, 800) === 1200)
// Caso F: ejecución.
comprobar('F ejecución 115%', porcentajeEjecucion(11500, 10000) === 115)
// Caso H: anulados/duplicados no duplican.
const conRuido = [
  { id: 1, monto_calculado: 100 },
  { id: 2, monto_calculado: 100, estado: 'anulado' },
  { id: 3, monto_calculado: 200, duplicado_de: 1 },
]
comprobar('H vigentes excluyen anulado/duplicado', soloVigentes(conRuido).length === 1 && esVigente(conRuido[0]))
// Caso I: atribución por periodo.
comprobar('I mes exacto', enMes('2026-09-15', '2026-09') && !enMes('2026-10-01', '2026-09'))
comprobar('I rango inclusivo', enRango('2026-09-30', '2026-09-01', '2026-09-30') && !enRango('2026-10-01', '2026-09-01', '2026-09-30'))
// Caso J: sin datos no hay NaN ni ficticios.
comprobar('J ceros seguros', resultadoBruto(0, 0) === 0 && flujoNetoCaja(0, 0) === 0 && saldoPorCobrar(0, 0) === 0)
comprobar('J márgenes nulos sin base', margenBruto(0, 0) === null && porcentajeEjecucion(500, 0) === null)
// Operativo y por servicio.
comprobar('operativo resta indirectos', resultadoOperativoEstimado(4500, 1000, 500) === 3000)
const rps = resultadoPorServicio({ ingresos: 20000, directos: 12000, indirectos: 2000 })
comprobar('por servicio: bruto 8000, margen 40, operativo 6000', rps.resultadoBruto === 8000 && rps.margenBruto === 40 && rps.resultadoOperativo === 6000)

// ============================================================
//  5. Persistencia centralizada (Casos G, K)
// ============================================================

console.log('\n[ persistencia ]')

comprobar('guardar informa éxito', guardarEstado(ESTADO_INICIAL) === true)
const recargado = cargarEstado()
comprobar(
  'G recarga conserva colecciones y totales',
  COLECCIONES.every((c) => Array.isArray(recargado[c]) && recargado[c].length === ESTADO_INICIAL[c].length),
)
const serial = serializarRespaldo(ESTADO_INICIAL)
const valido = validarRespaldo(JSON.parse(serial))
comprobar('K respaldo válido pasa', valido.ok, JSON.stringify(valido.errores))
const normalizado = normalizarRespaldo(JSON.parse(serial))
comprobar('K normalizado conserva todo', normalizado && COLECCIONES.every((c) => normalizado[c].length === ESTADO_INICIAL[c].length))
comprobar('K inválido se rechaza sin tocar nada', validarRespaldo({ foo: 1 }).ok === false && validarRespaldo(null).ok === false && normalizarRespaldo({ foo: 1 }) === null)

// ============================================================
//  6. Personal automático y facturas (sin pagos ni cierre mensual)
// ============================================================

console.log('\n[ personal y facturas ]')
// Factura 10000, cobros 4000 + 6000 → saldo 0 (Caso F §24).
const facDemo = { id: 1, total: 10000, fecha_vencimiento: '2026-10-31', estado: 'emitida' }
const cobrosDemo = [
  { factura_id: 1, monto: 4000 },
  { factura_id: 1, monto: 6000 },
]
comprobar('cobros aplicados suman 10000', cobrosDeFactura(1, cobrosDemo).length === 2)
comprobar('F saldo pasa 6000 → 0', saldoFactura(facDemo, [{ factura_id: 1, monto: 4000 }]) === 6000 && saldoFactura(facDemo, cobrosDemo) === 0)
comprobar('factura cobrada con saldo 0', estadoFactura(facDemo, cobrosDemo, '2026-10-10') === 'cobrada')
comprobar('factura vencida sin cobros', estadoFactura({ ...facDemo, id: 2 }, [], '2026-11-05') === 'vencida')
comprobar('factura anulada no cuenta', estadoFactura({ ...facDemo, estado: 'anulada' }, [], '2026-11-05') === 'anulada')
// N° de factura opcional: vacío = adelanto, existente = vincular, nuevo = crear.
const facsRes = [{ id: 7, numero: 'F001-1', estado: 'emitida', total: 10000 }]
const cobrosRes = [{ factura_id: 7, monto: 4000 }]
comprobar('sin número es adelanto', resolverFacturaIngreso('', facsRes, cobrosRes, 500).accion === 'adelanto')
comprobar('número existente vincula', resolverFacturaIngreso('f001-1', facsRes, cobrosRes, 500).accion === 'vincular')
comprobar('número nuevo crea', resolverFacturaIngreso('F001-2', facsRes, cobrosRes, 500).accion === 'crear')
comprobar('exceso sobre saldo se bloquea', resolverFacturaIngreso('F001-1', facsRes, cobrosRes, 7000).accion === 'excede')
// Sincronización automática: meses devengados hasta hoy se crean solos.
const difDemo = diferenciaPersonalAuto(
  [{ id: 1, servicio_id: 6, personal_id: 1, tarea_id: null, horas_por_dia: 8, tarifa: 25, fecha_inicio: '2026-08-12', fecha_fin: null }],
  { id: 6, fecha_inicio: '2026-07-01', fecha_fin_estimada: '2026-12-20' },
  [],
  '2026-08',
)
comprobar('auto crea agosto devengado', difDemo.porCrear.length === 1 && difDemo.porCrear[0].monto_calculado === 4000, JSON.stringify(difDemo.porCrear))
// Tipos de servicio y colecciones nuevas vacías.
comprobar('tipos son Obra/Misceláneo/Contrato', JSON.stringify(TIPOS_SERVICIO) === JSON.stringify(['Obra', 'Misceláneo', 'Contrato']))
comprobar('tipo por defecto Obra', tipoServicio({}) === 'Obra' && tipoServicio({ tipo: 'Anual' }) === 'Anual')
comprobar(
  'colecciones nuevas existen y vacías',
  ['facturas'].every((c) => Array.isArray(ESTADO_INICIAL[c]) && ESTADO_INICIAL[c].length === 0),
)

// ============================================================
//  7. Respaldo de colecciones retiradas
// ============================================================

console.log('\n[ retiradas ]')
comprobar(
  'COLECCIONES sin presupuestos ni pagos',
  !COLECCIONES.includes('presupuestos') && !COLECCIONES.includes('pagos'),
)

// ============================================================
//  8. Render de rutas
// ============================================================

console.log('\n[ render ]')

const rutas = [
  { ruta: '/', etiqueta: 'Dashboard global', monto: true },
  { ruta: '/servicios', etiqueta: 'Servicios', monto: true },
  { ruta: '/servicios/6', etiqueta: 'Detalle /servicios/6', monto: true },
  { ruta: '/servicios/6/materiales', etiqueta: 'Panel materiales', monto: true },
  { ruta: '/servicios/6/personal', etiqueta: 'Panel personal', monto: true },
  { ruta: '/servicios/6/equipos', etiqueta: 'Panel equipos', monto: false },
  { ruta: '/servicios/6/gastos', etiqueta: 'Panel gastos', monto: true },
  { ruta: '/servicios/6/ingresos', etiqueta: 'Panel ingresos', monto: true },

  { ruta: '/servicios/6/cronograma', etiqueta: 'Panel cronograma', monto: false },
  { ruta: '/servicios/6/partidas', etiqueta: 'Panel partidas', monto: true },
  { ruta: '/servicios/6/opciones', etiqueta: 'Panel opciones', monto: false },
  { ruta: '/servicios/999', etiqueta: 'Detalle id inexistente', monto: false },
  { ruta: '/personal', etiqueta: 'Personal', monto: true },
  { ruta: '/equipos', etiqueta: 'Equipos', monto: false },
  { ruta: '/oficina', etiqueta: 'Oficina', monto: true },
  { ruta: '/almacen', etiqueta: 'Almacén redirige', monto: false },
  { ruta: '/materiales', etiqueta: 'Materiales redirige', monto: false },
  { ruta: '/ruta-inexistente', etiqueta: 'Fallback 404', monto: false },
]

for (const { ruta, etiqueta, monto } of rutas) {
  try {
    const html = renderToString(
      <MemoryRouter initialEntries={[ruta]}>
        <DataProvider>
          <App />
        </DataProvider>
      </MemoryRouter>,
    )

    const problemas = []
    if (!html.includes('PROMCOSER')) problemas.push('sin sidebar')
    if (html.length < 1500) problemas.push(`corto (${html.length})`)
    if (html.includes('undefined')) problemas.push('"undefined" en DOM')
    if (html.includes('NaN')) problemas.push('"NaN" en DOM')
    if (monto && !html.includes('S/')) problemas.push('sin moneda')

    comprobar(`${etiqueta} (${html.length}b)`, problemas.length === 0, problemas.join(', '))
  } catch (error) {
    comprobar(`${etiqueta} lanza error`, false, error.stack)
  }
}

// ============================================================

console.log(`\n${fallos === 0 ? 'TODO OK' : `${fallos} FALLO(S)`} — ${pruebas} pruebas`)
process.exit(fallos === 0 ? 0 : 1)