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
  desfaseMensualProyectos,
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
comprobar('servicio 6 tiene presupuesto inicial = 335000', servicio6.presupuesto_asignado === 335000, String(servicio6.presupuesto_asignado))
const gastado6 = sumarMontos(registrosDeServicio(registros, 6))
const cobrado6 = cobradoServicio(cobrosSemilla, 6)

comprobar('gastado servicio 6 = 97345', gastado6 === 97345, String(gastado6))
comprobar('cobrado servicio 6 = 155250', cobrado6 === 155250, String(cobrado6))
comprobar('utilidad serv. 6 = 57905', utilidadReal(cobrado6, gastado6) === 57905, String(utilidadReal(cobrado6, gastado6)))
const estado6 = estadoPresupuesto(servicio6, registros, cobrosSemilla)
comprobar('presupuesto inicial = 335000', estado6.presupuesto === 335000, String(estado6.presupuesto))
comprobar('disponible = 237655', estado6.disponible === 237655, String(estado6.disponible))
comprobar('ejecución ≈ 29.06%', Math.abs(estado6.porcentaje - 29.06) < 0.01, estado6.porcentaje.toFixed(3))
comprobar('no excedido', estado6.excedido === false)
comprobar('cobrado en estado = 155250', estado6.cobrado === 155250, String(estado6.cobrado))

const desglose6 = desglosePorTipo(registrosDeServicio(registros, 6))
comprobar('desglose material = 43445', desglose6.material === 43445, String(desglose6.material))
comprobar('desglose personal = 3200', desglose6.personal === 3200, String(desglose6.personal))
comprobar('desglose gasto = 16400', desglose6.gasto === 16400, String(desglose6.gasto))
comprobar('desglose equipo = 34300', desglose6.equipo === 34300, String(desglose6.equipo))
comprobar('desglose suma el total', Object.values(desglose6).reduce((a, b) => a + b, 0) === gastado6)
comprobar('cascada: cobrado − tipos = utilidad', cobrado6 - Object.values(desglose6).reduce((a, b) => a + b, 0) === utilidadReal(cobrado6, gastado6))

comprobar('sumarMontos total = 304345', sumarMontos(registros) === 304345, String(sumarMontos(registros)))

const { tareas } = ESTADO_INICIAL
const tareas6 = tareas.filter((t) => t.servicio_id === 6)
const met6 = metricasCronograma(tareas6)
comprobar('cronograma serv. 6 = 9 tareas', met6.total === 9, String(met6.total))
comprobar('cronograma serv. 6 = 4 completadas', met6.completadas === 4, String(met6.completadas))
comprobar('avance global serv. 6 = 66', met6.avanceGlobal === 66, String(met6.avanceGlobal))
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
comprobar('gasto mensual serv. 6 = 5 meses', mensual6.length === 5 && mensual6[0].mes === '2026-06' && mensual6[4].mes === '2026-10', JSON.stringify(mensual6.map((m) => m.mes)))
comprobar('junio serv. 6 = 39410', mensual6[0].monto === 39410, String(mensual6[0]?.monto))
comprobar('julio serv. 6 = 12190', mensual6[1].monto === 12190, String(mensual6[1]?.monto))
comprobar('agosto serv. 6 = 0 (mes intermedio)', mensual6[2].monto === 0, String(mensual6[2]?.monto))
comprobar('septiembre serv. 6 = 33400', mensual6[3].monto === 33400, String(mensual6[3]?.monto))
comprobar('octubre serv. 6 = 12345', mensual6[4].monto === 12345, String(mensual6[4]?.monto))
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
comprobar('serv. 6 tiene 3 asignaciones', asigs.filter((a) => a.servicio_id === 6).length === 3)
comprobar('rango calendario 16→30 jun = 15 días', diasCalendarioRango('2026-06-16', '2026-06-30') === 15)
comprobar('mensual capataz jun = 4800 (15 días)', costoMensualAsignacion(asigs[0], '2026-06', servSeis).monto === 4800, JSON.stringify(costoMensualAsignacion(asigs[0], '2026-06', servSeis)))
comprobar('mensual ayudante sep completo = 4320', costoMensualAsignacion(asigs[1], '2026-09', servSeis).monto === 4320)
comprobar('mensual operario nov (baja) = 0', costoMensualAsignacion(asigs[2], '2026-11', servSeis).monto === 0)
comprobar('diciembre se recorta al fin de obra (20 días)', costoMensualAsignacion(asigs[0], '2026-12', servSeis).dias === 20)
comprobar('régimen 30 días: julio completo = 9600', costoMensualAsignacion(asigs[0], '2026-07', servSeis).monto === 9600)
comprobar('régimen 30 días: febrero completo = 30 días', costoMensualAsignacion({ fecha_inicio: '2026-02-01', fecha_fin: null, horas_por_dia: 8, tarifa: 25 }, '2026-02', { fecha_inicio: '2026-02-01', fecha_fin_estimada: '2026-02-28' }).dias === 30)
const proyAsig6 = proyeccionAsignaciones(asigs, servSeis, ESTADO_INICIAL.registros_servicio)
comprobar('total inicio-fin con bajas = 71824', proyAsig6.total === 71824, String(proyAsig6.total))
comprobar('sin devengar todo es proyectado', proyAsig6.gastado === 0 && proyAsig6.proyectado === 71824)
const sinBaja = asigs.map((a) => (a.id === 2 || a.id === 3 ? { ...a, fecha_fin: null } : a))
const proyAsigSinBaja = proyeccionAsignaciones(sinBaja, servSeis, ESTADO_INICIAL.registros_servicio)
comprobar('sin baja el total sería mayor (93344)', proyAsigSinBaja.total === 93344, String(proyAsigSinBaja.total))
comprobar('la baja baja el total', proyAsigSinBaja.total > proyAsig6.total)
comprobar('sin devengo devuelve null', asentamientoDe(1, ESTADO_INICIAL.registros_servicio, '2026-06') === null)
comprobar('cascada servicio borra asignaciones', !(sinServicio.asignaciones ?? []).some((a) => a.servicio_id === 6))

console.log('\n[ cobros ]')

const { cobros } = ESTADO_INICIAL
comprobar('serv. 6 tiene 3 cobros', cobros.filter((c) => c.servicio_id === 6).length === 3)
comprobar('cobrado serv. 6 = 155250', cobradoServicio(cobros, 6) === 155250, String(cobradoServicio(cobros, 6)))
comprobar('utilidad real = cobrado − gastado', utilidadReal(cobradoServicio(cobros, 6), gastado6) === 155250 - gastado6)
comprobar('cascada servicio borra cobros', !(sinServicio.cobros ?? []).some((c) => c.servicio_id === 6))

console.log('\n[ dashboard global ]')

const regsDash6 = registrosDeServicio(ESTADO_INICIAL.registros_servicio, 6)
const gastadoDash6 = sumarMontos(regsDash6)
comprobar('gastado serv. 6 = 97345', gastadoDash6 === 97345, String(gastadoDash6))
const oficinaTotal = sumarMontos(ESTADO_INICIAL.costos_oficina)
comprobar('oficina total = 23800', oficinaTotal === 23800, String(oficinaTotal))
comprobar('utilidad serv. 6 = 57905', 155250 - gastadoDash6 === 57905)
const gastadoTotal = sumarMontos(ESTADO_INICIAL.registros_servicio)
const cobradoTotal = ESTADO_INICIAL.servicios.reduce(
  (total, s) => total + cobradoServicio(ESTADO_INICIAL.cobros, s.id),
  0,
)
comprobar(
  'resultado empresa = 15105',
  (cobradoTotal - gastadoTotal) - oficinaTotal === 15105,
  String((cobradoTotal - gastadoTotal) - oficinaTotal),
)
const porMes6 = proyeccionAsignaciones(asigs, servSeis, ESTADO_INICIAL.registros_servicio).porMes
const pendientes6 = porMes6.filter((m) => m.estimado && m.monto > 0 && ['2026-08', '2026-09', '2026-10'].includes(m.mes))
comprobar('ago/sep/oct proyectados suman 11904/13920/15600', JSON.stringify(pendientes6.map((m) => m.monto)) === '[11904,13920,15600]', JSON.stringify(pendientes6.map((m) => m.monto)))
const porConcepto = cobros
  .filter((c) => c.servicio_id === 6)
  .reduce((a, c) => ({ ...a, [c.concepto]: (a[c.concepto] || 0) + c.monto }), {})
comprobar('adelanto 50250 y valorizaciones 60000/45000', porConcepto.adelanto === 50250 && porConcepto['valorización N°1'] === 60000 && porConcepto['valorización N°2'] === 45000)
comprobar('COLECCIONES trae asignaciones y cobros, sin partidas ni presupuestos', COLECCIONES.includes('asignaciones') && COLECCIONES.includes('cobros') && !COLECCIONES.includes('partidas') && !COLECCIONES.includes('valorizaciones') && !COLECCIONES.includes('presupuestos'))
const spi6 = indiceAvance(servicio6, 66, '2026-10-14')
comprobar('SPI serv. 6 ≈ 0.99', spi6 && Math.abs(spi6.spi - 0.99) < 0.01, String(spi6?.spi))
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
comprobar('análisis serv. 6 gastado = 97345', analisis6[0].gastado === 97345, String(analisis6[0].gastado))
comprobar('análisis serv. 6 cobrado/utilidad = 155250/57905', analisis6[0].cobrado === 155250 && analisis6[0].utilidad === 57905, `${analisis6[0].cobrado}/${analisis6[0].utilidad}`)
comprobar('análisis serv. 6 disponible = 237655', analisis6[0].estado.disponible === 237655, String(analisis6[0].estado.disponible))

const kpis6 = kpisEmpresa({
  servicios: [servicio6],
  registros: regsDash6,
  cobros: ESTADO_INICIAL.cobros,
  costosOficina: ESTADO_INICIAL.costos_oficina,
  analisis: analisis6,
})
comprobar('kpi gastado = 97345', kpis6.gastado === 97345, String(kpis6.gastado))
comprobar('kpi utilidad = 57905', kpis6.utilidadServicios === 57905, String(kpis6.utilidadServicios))
comprobar('kpi cobrado = 155250', kpis6.cobrado === 155250, String(kpis6.cobrado))
comprobar('kpi resultado empresa = 34105', kpis6.resultadoEmpresa === 34105, String(kpis6.resultadoEmpresa))
comprobar('kpi servicios en curso = 1', kpis6.enCurso === 1 && kpis6.total === 1, `${kpis6.enCurso}/${kpis6.total}`)

const clientes6 = rentabilidadPorCliente({
  servicios: [servicio6],
  registros,
  cobros: ESTADO_INICIAL.cobros,
})
const filaCliente = clientes6[0] ?? {}
comprobar('utilidad cliente: gastado/cobrado', filaCliente.gastado === 97345 && filaCliente.cobrado === 155250)
comprobar('utilidad cliente: utilidad = 57905', filaCliente.utilidad === 57905, String(filaCliente.utilidad))
comprobar('utilidad cliente: utilidad % ≈ 37.30', filaCliente.utilidadPct != null && Math.abs(filaCliente.utilidadPct - 37.3) < 0.01, String(filaCliente.utilidadPct))

const caja = flujoCajaMensualReal({
  registros,
  cobros: ESTADO_INICIAL.cobros,
  costosOficina: ESTADO_INICIAL.costos_oficina,
})
const mesCaja = (m) => caja.find((f) => f.mes === m) ?? {}
comprobar('caja junio = 3840', mesCaja('2026-06').margenReal === 3840, String(mesCaja('2026-06').margenReal))
comprobar('caja julio = -21190', mesCaja('2026-07').margenReal === -21190, String(mesCaja('2026-07').margenReal))
comprobar('caja agosto = 88000', mesCaja('2026-08').margenReal === 88000, String(mesCaja('2026-08').margenReal))
comprobar('caja septiembre = -125700', mesCaja('2026-09').margenReal === -125700, String(mesCaja('2026-09').margenReal))
comprobar('caja octubre = 3155', mesCaja('2026-10').margenReal === 3155, String(mesCaja('2026-10').margenReal))
comprobar('caja cubre marzo a octubre (8 meses)', caja.length === 8 && caja[0].mes === '2026-03' && caja[7].mes === '2026-10', caja.map((f) => f.mes).join(','))
const varCaja = variacionMensual(caja.slice(3, 5), 'cobrado')
comprobar('variación cobrado jun→jul = -100%', varCaja != null && varCaja.diferencia === -50250 && varCaja.porcentaje === -100, JSON.stringify(varCaja))
const varUltima = variacionMensual(caja.slice(-2), 'cobrado')
comprobar('variación sep→oct sin base es null', varUltima != null && varUltima.diferencia === 45000 && varUltima.porcentaje === null, JSON.stringify(varUltima))
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
comprobar('proyección personal ago = 11904', mesProy('2026-08') === 11904, String(mesProy('2026-08')))
comprobar('proyección personal sep = 13920', mesProy('2026-09') === 13920, String(mesProy('2026-09')))
comprobar('proyección personal oct = 15600', mesProy('2026-10') === 15600, String(mesProy('2026-10')))

const sinMeta = avanceMetaIngreso({ cobrado: 155250, meta: 0 })
comprobar('meta sin definir no tiene porcentaje', sinMeta.definida === false && sinMeta.porcentaje === null)
comprobar('meta sin definir no tiene faltante', sinMeta.falta === null, String(sinMeta.falta))

const meta100 = avanceMetaIngreso({ cobrado: 155250, meta: 250000 })
comprobar('meta 250000: faltante = 94750', meta100.falta === 94750, String(meta100.falta))
comprobar('meta 250000: avance = 62.1%', meta100.porcentaje === 62.1 && meta100.cumplida === false, String(meta100.porcentaje))

const metaSuperada = avanceMetaIngreso({ cobrado: 300000, meta: 250000 })
comprobar('meta superada: cumplida hasta 120%', metaSuperada.cumplida === true && metaSuperada.falta === 0 && metaSuperada.porcentaje === 120, String(metaSuperada.porcentaje))

console.log('\n[ combo cartera ]')

const combo = desfaseMensualProyectos({
  servicios: ESTADO_INICIAL.servicios,
  tareas: ESTADO_INICIAL.tareas,
  registros: ESTADO_INICIAL.registros_servicio,
  hoy: '2026-10-14',
})
comprobar('combo: 12 meses (mar 2026–feb 2027)', combo.serie.length === 12 && combo.serie[0].mes === '2026-03' && combo.serie[11].mes === '2027-02', combo.serie.map((f) => f.mes).join(','))
comprobar('combo: volumen máximo = 3', combo.maxVolumen === 3, String(combo.maxVolumen))
comprobar(
  'combo: volumen 1,1,1,2,2,3,3,3,2,2,1,1',
  JSON.stringify(combo.serie.map((f) => f.activos)) === '[1,1,1,2,2,3,3,3,2,2,1,1]',
  JSON.stringify(combo.serie.map((f) => f.activos)),
)
const cMes = (m) => combo.serie.find((f) => f.mes === m) ?? {}
comprobar('combo: desfase tiempo jun = 50%', cMes('2026-06').desfaseTiempo === 50, String(cMes('2026-06').desfaseTiempo))
comprobar('combo: desfase tiempo ago = 33.33%', cMes('2026-08').desfaseTiempo === 33.33, String(cMes('2026-08').desfaseTiempo))
comprobar('combo: desfase tiempo oct = 66.67%', cMes('2026-10').desfaseTiempo === 66.67, String(cMes('2026-10').desfaseTiempo))
comprobar('combo: desfase costo sep = 14.16%', cMes('2026-09').desfaseCosto === 14.16, String(cMes('2026-09').desfaseCosto))
comprobar('combo: desfase costo oct = 12.39%', cMes('2026-10').desfaseCosto === 12.39, String(cMes('2026-10').desfaseCosto))
comprobar(
  'combo: meses futuros sin desfase',
  combo.serie.slice(8).every((f) => f.desfaseTiempo === null && f.desfaseCosto === null),
)
comprobar(
  'combo: ningún valor es NaN',
  combo.serie.every((f) => [f.desfaseTiempo, f.desfaseCosto].every((v) => v === null || Number.isFinite(v))),
)
const comboUna = desfaseMensualProyectos({
  servicios: [servicio6],
  tareas: ESTADO_INICIAL.tareas,
  registros,
  hoy: '2026-10-14',
})
comprobar('combo: una sola obra deja volumen 1', comboUna.maxVolumen === 1 && comboUna.serie.every((f) => f.activos === 1))
comprobar('combo: sin servicios = serie vacía', desfaseMensualProyectos({ servicios: [], tareas: [], registros: [] }).serie.length === 0)

console.log('\n[ montos por tareas ]')

const { registros_servicio: regs } = ESTADO_INICIAL
const tareasTodas = ESTADO_INICIAL.tareas
const tareasServ6 = tareasTodas.filter((t) => t.servicio_id === 6)
comprobar('monto total serv. 6 = 335000', presupuestoTareas(tareasTodas, 6) === 335000, String(presupuestoTareas(tareasTodas, 6)))
comprobar('monto padre suma hijas (redes de agua = 75000)', montoTarea(tareasServ6.find((t) => t.id === 14), tareasServ6) === 75000)
comprobar('monto hoja manual (tendido PVC = 42000)', montoTarea(tareasServ6.find((t) => t.id === 15), tareasServ6) === 42000)
comprobar('valorizado redes de agua = 75000', valorizadoTarea(tareasServ6.find((t) => t.id === 14), tareasServ6) === 75000)
comprobar('costo tarea tendido PVC = 30310', costoPorTarea(regs, 6, 15) === 30310, String(costoPorTarea(regs, 6, 15)))
comprobar('costo subárbol redes de agua = 40300', costoSubarbol(tareasServ6.find((t) => t.id === 14), tareasServ6, regs, 6) === 40300)
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
  [19, 20, 24, 25, 28].every((id) => sinTarea15.registros_servicio.find((x) => x.id === id).tarea_id == null),
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
comprobar('duración tendido PVC = 30 d', diasEstimadosTarea(porIdTarea(15), tareasServ6) === 30)
comprobar('duración colectores = 46 d', diasEstimadosTarea(porIdTarea(18), tareasServ6) === 46)
comprobar('estimado padre suma hijas = 61 d', diasEstimadosTarea(porIdTarea(14), tareasServ6) === 61)
comprobar('estimado alcantarillado = 77 d', diasEstimadosTarea(porIdTarea(17), tareasServ6) === 77)
comprobar('días reales pruebas hidráulicas = 1', diasRealesTarea(porIdTarea(16), tareasServ6, regs, 6) === 1)
comprobar('días reales colectores = 1', diasRealesTarea(porIdTarea(18), tareasServ6, regs, 6) === 1)
comprobar('días reales sin registros = 0', diasRealesTarea(porIdTarea(13), tareasServ6, regs, 6) === 0)
comprobar('días reales padre junta hijas = 2', diasRealesTarea(porIdTarea(14), tareasServ6, regs, 6) === 2)
const estServ6 = tareasServ6.filter((t) => t.padre_id == null).reduce((s, t) => s + diasEstimadosTarea(t, tareasServ6), 0)
const realServ6 = tareasServ6.filter((t) => t.padre_id == null).reduce((s, t) => s + diasRealesTarea(t, tareasServ6, regs, 6), 0)
comprobar('servicio estimado/real = 224/4 d', estServ6 === 224 && realServ6 === 4, `${estServ6}/${realServ6}`)
const desvServ6 = desviacionDias(estServ6, realServ6)
comprobar('desviación −220 d', desvServ6.diferencia === -220, String(desvServ6.diferencia))
comprobar('desviación positiva = más días', desviacionDias(10, 12).diferencia === 2)
comprobar('sin estimado no hay %', desviacionDias(0, 5).porcentaje === null)
const horasMes6 = horasPorMes(ESTADO_INICIAL.registros_servicio, 6)
comprobar('horas por mes serv. 6 = jun–oct 40/32/0/32/24', JSON.stringify(horasMes6) === JSON.stringify([{ mes: '2026-06', horas: 40 }, { mes: '2026-07', horas: 32 }, { mes: '2026-08', horas: 0 }, { mes: '2026-09', horas: 32 }, { mes: '2026-10', horas: 24 }]), JSON.stringify(horasMes6))
comprobar('horas por mes vacío = []', horasPorMes([], 6).length === 0)
comprobar('media móvil 10/20/30/40 = 10/15/20/30', JSON.stringify(mediaMovil([10, 20, 30, 40])) === '[10,15,20,30]')
comprobar('media móvil corta promedia lo que hay', JSON.stringify(mediaMovil([10, 20])) === '[10,15]')
comprobar('media móvil vacía = []', mediaMovil([]).length === 0)

console.log('\n[ proyección financiera ]')

const proy6 = proyeccionFinanciera({ presupuesto: 335000, gastado: 97345, cobrado: 155250, avance: 66, spi: 0.99 })
comprobar('valor ganado = 221100', proy6.valorGanado === 221100, String(proy6.valorGanado))
comprobar('ritmo de gasto ≈ 2.27', proy6.cpi != null && Math.abs(proy6.cpi - 2.27) < 0.01, String(proy6.cpi))
comprobar('costo final ≈ 147492.42', proy6.costoFinal != null && Math.abs(proy6.costoFinal - 147492.42) < 0.01, String(proy6.costoFinal))
comprobar('utilidad proyectada ≈ 187507.58', proy6.utilidadProyectada != null && Math.abs(proy6.utilidadProyectada - 187507.58) < 0.01, String(proy6.utilidadProyectada))
comprobar('margen proyectado ≈ 55.97%', proy6.margenProyectadoPct != null && Math.abs(proy6.margenProyectadoPct - 55.97) < 0.01, String(proy6.margenProyectadoPct))
comprobar('cobro proyectado ≈ 235227.27', proy6.cobroProyectado != null && Math.abs(proy6.cobroProyectado - 235227.27) < 0.01, String(proy6.cobroProyectado))
comprobar('faltante por facturar ≈ 99772.73', proy6.faltanteCobro != null && Math.abs(proy6.faltanteCobro - 99772.73) < 0.01, String(proy6.faltanteCobro))
comprobar('semáforo verde', proy6.semaforo === 'verde', String(proy6.semaforo))
const proySinAvance = proyeccionFinanciera({ presupuesto: 335000, gastado: 0, cobrado: 0, avance: 0, spi: null })
comprobar('sin avance no hay proyección', proySinAvance.tieneProyeccion === false && proySinAvance.semaforo === null)
comprobar(
  'sobrecosto crítico da rojo',
  proyeccionFinanciera({ presupuesto: 1000, gastado: 2000, cobrado: 0, avance: 50, spi: 1 }).semaforo === 'rojo',
)
comprobar(
  'retraso de plazo da amarillo',
  proyeccionFinanciera({ presupuesto: 335000, gastado: 97345, cobrado: 155250, avance: 66, spi: 0.5 }).semaforo === 'amarillo',
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
// Tipos de servicio y facturas semilla con sus saldos.
comprobar('tipos son Obra/Misceláneo/Contrato', JSON.stringify(TIPOS_SERVICIO) === JSON.stringify(['Obra', 'Misceláneo', 'Contrato']))
comprobar('tipo por defecto Obra', tipoServicio({}) === 'Obra' && tipoServicio({ tipo: 'Anual' }) === 'Anual')
const facsSeed = ESTADO_INICIAL.facturas.filter((f) => f.servicio_id === 6)
comprobar('facturas semilla = 3', facsSeed.length === 3, String(facsSeed.length))
comprobar('factura 101 cobrada (saldo 0)', saldoFactura(facsSeed[0], ESTADO_INICIAL.cobros) === 0)
comprobar('factura 102 cobrada (saldo 0)', saldoFactura(facsSeed[1], ESTADO_INICIAL.cobros) === 0)
comprobar('factura 103 pendiente 52500', saldoFactura(facsSeed[2], ESTADO_INICIAL.cobros) === 52500)
comprobar('cascada servicio borra facturas', !(sinServicio.facturas ?? []).some((f) => f.servicio_id === 6))

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

const htmlsRuta = {}

for (const { ruta, etiqueta, monto } of rutas) {
  try {
    const html = renderToString(
      <MemoryRouter initialEntries={[ruta]}>
        <DataProvider>
          <App />
        </DataProvider>
      </MemoryRouter>,
    )
    htmlsRuta[ruta] = html

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

// Filtros de las listas: cada lista con datos debe mostrar su buscador.
// Los módulos globales (Servicios, Personal, Equipos) ya lo traen en el
// catálogo; aquí se cubren los paneles por servicio y Oficina.
const filtrosEsperados = [
  { ruta: '/servicios/6/materiales', etiqueta: 'materiales', textos: ['Buscar en materiales…', 'Con o sin tarea'] },
  { ruta: '/servicios/6/gastos', etiqueta: 'gastos', textos: ['Buscar en gastos…'] },
  { ruta: '/servicios/6/equipos', etiqueta: 'equipos', textos: ['Buscar en equipos…'] },
  {
    ruta: '/servicios/6/personal',
    etiqueta: 'personal',
    textos: ['Buscar por persona, cargo o tarea…', 'Buscar por mes…'],
  },
  {
    ruta: '/servicios/6/ingresos',
    etiqueta: 'ingresos',
    textos: ['Buscar por concepto, documento o factura…', 'Solo facturas'],
  },
  { ruta: '/servicios/6/partidas', etiqueta: 'partidas', textos: ['Buscar tarea…'] },
  { ruta: '/servicios/6/cronograma', etiqueta: 'cronograma', textos: ['Buscar tarea…'] },
  { ruta: '/oficina', etiqueta: 'oficina', textos: ['Buscar por servicio o cliente…'] },
]
for (const { ruta, etiqueta, textos } of filtrosEsperados) {
  const html = htmlsRuta[ruta] ?? ''
  const faltan = textos.filter((texto) => !html.includes(texto))
  comprobar(`filtro en ${etiqueta}`, faltan.length === 0, `falta: ${faltan.join(', ')}`)
}

// Asignar personal con botón + modal (como "Registrar ingreso"): el panel
// muestra el botón y ya no un formulario fijo incrustado.
const htmlPersonalPanel = htmlsRuta['/servicios/6/personal'] ?? ''
comprobar(
  'personal: botón "Asignar personal" (modal, no formulario fijo)',
  htmlPersonalPanel.includes('Asignar personal') &&
    !htmlPersonalPanel.includes('asi-persona'),
)

// Chequeo específico del gráfico combinado de doble eje en el panel principal.
const htmlDash = renderToString(
  <MemoryRouter initialEntries={['/']}>
    <DataProvider>
      <App />
    </DataProvider>
  </MemoryRouter>,
)
comprobar(
  'dashboard: incluye el gráfico combinado (doble eje)',
  htmlDash.includes('columnas y líneas con doble eje Y') &&
    htmlDash.includes('aria-label="Gráfico combinado'),
)
comprobar(
  'dashboard: gráfico con resumen de cartera y sin valores rotos',
  htmlDash.includes('Situación de la cartera') &&
    htmlDash.includes('Desfase de tiempo') &&
    htmlDash.includes('Desfase de costo') &&
    !htmlDash.includes('NaN') &&
    !htmlDash.includes('>null<'),
)

// ============================================================

console.log(`\n${fallos === 0 ? 'TODO OK' : `${fallos} FALLO(S)`} — ${pruebas} pruebas`)
process.exit(fallos === 0 ? 0 : 1)