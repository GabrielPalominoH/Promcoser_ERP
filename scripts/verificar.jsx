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
  desviacionCategoria,
  desviacionPresupuesto,
  distribuirIndirectos,
  enMes,
  enRango,
  esVigente,
  estadoFactura,
  flujoMes,
  flujoNetoCaja,
  generarCierre,
  horasMes,
  margenBruto,
  mesCerrado,
  porcentajeEjecucion,
  presupuestoPorCategoria,
  realPorCategoria,
  resultadoBruto,
  resultadoOperativoEstimado,
  resultadoPorServicio,
  saldoFactura,
  saldoGasto,
  saldoPorCobrar,
  saldoPorPagar,
  soloVigentes,
} from '../src/utils/finanzas'
import { alertasServicio, asentamientoDe, avanceEfectivo, cobradoServicio, consumoPresupuesto, costoMensualAsignacion, costoPorTarea, costoSinTarea, costoSubarbol, cuentaComoManoDeObra, desglosePorTipo, diasCalendarioRango, esDomingo, sumarMontos, registrosDeServicio, metricasCronograma, montoTarea, porCobrar, presupuestoTareas, proyeccionAsignaciones, rentabilidadServicio, gastoPorMes, indiceAvance, utilidadReal, valorizadoTarea } from '../src/utils/calculadora'
import { redondearMonto, formatearMoneda } from '../src/utils/formatters'
import { filtrarOpciones, normalizar } from '../src/components/ui/ComboBox'
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

comprobar('siguienteId equipos = 26', siguienteId(ESTADO_INICIAL.equipos) === 26, String(siguienteId(ESTADO_INICIAL.equipos)))
comprobar('siguienteId arreglo vacío = 1', siguienteId([]) === 1, String(siguienteId([])))

// El id debe quedar siempre por encima del máximo, aunque se borre el último.
const sinUltimo = ESTADO_INICIAL.equipos.slice(0, -1)
comprobar('siguienteId tras borrado = 25', siguienteId(sinUltimo) === 25, String(siguienteId(sinUltimo)))

const desconocido = dataReducer(ESTADO_INICIAL, { type: 'NO_EXISTE' })
comprobar('acción desconocida devuelve el estado igual', desconocido === ESTADO_INICIAL)

// ============================================================
//  2. Cálculos de presupuesto
// ============================================================

console.log('\n[ calculadora ]')

const { registros_servicio: registros, servicios } = ESTADO_INICIAL
const servicio6 = servicios.find((s) => s.id === 6)
const consumo6 = consumoPresupuesto(servicio6, registros)

comprobar('consumo servicio 6 = 48866', consumo6.gastado === 48866, String(consumo6.gastado))
comprobar('presupuesto = 120000', consumo6.presupuesto === 120000)
comprobar('disponible = 71134', consumo6.disponible === 71134, String(consumo6.disponible))
comprobar('porcentaje correcto', Math.abs(consumo6.porcentaje - 40.72) < 0.01, consumo6.porcentaje.toFixed(3))
comprobar('no excedido', consumo6.excedido === false)

const excedido = consumoPresupuesto({ id: 6, presupuesto_asignado: 100 }, registros)
comprobar('detecta presupuesto excedido', excedido.excedido === true && excedido.disponible === -48766, String(excedido.disponible))
comprobar('excedido no corta el porcentaje', excedido.porcentaje > 100, String(excedido.porcentaje))

const cero = consumoPresupuesto({ id: 98, presupuesto_asignado: 0 }, registros)
comprobar('presupuesto 0 no divide entre cero', cero.porcentaje === 0 && cero.excedido === false)

const desglose6 = desglosePorTipo(registrosDeServicio(registros, 6))
comprobar('desglose material = 30276', desglose6.material === 30276, String(desglose6.material))
comprobar('desglose personal = 1540', desglose6.personal === 1540, String(desglose6.personal))
comprobar('desglose gasto = 3500', desglose6.gasto === 3500, String(desglose6.gasto))
comprobar('desglose equipo = 13550', desglose6.equipo === 13550, String(desglose6.equipo))
comprobar('desglose suma el total', Object.values(desglose6).reduce((a, b) => a + b, 0) === consumo6.gastado)

comprobar('sumarMontos total = 48866', sumarMontos(registros) === 48866, String(sumarMontos(registros)))

const { tareas } = ESTADO_INICIAL
const tareas6 = tareas.filter((t) => t.servicio_id === 6)
const met6 = metricasCronograma(tareas6)
comprobar('cronograma serv. 6 = 9 tareas', met6.total === 9, String(met6.total))
comprobar('cronograma serv. 6 = 4 completadas', met6.completadas === 4, String(met6.completadas))
comprobar('avance global serv. 6 = 54', met6.avanceGlobal === 54, String(met6.avanceGlobal))
const metVacio = metricasCronograma([])
comprobar('cronograma vacío en ceros', metVacio.total === 0 && metVacio.avanceGlobal === 0)

const rent6 = rentabilidadServicio(servicio6, registros, tareas6)
comprobar('margen serv. 6 = 71134', rent6.margen === 71134, String(rent6.margen))
comprobar('margen % serv. 6 ≈ 59.28', Math.abs(rent6.margenPct - 59.28) < 0.01, rent6.margenPct.toFixed(2))
comprobar('valor ganado serv. 6 = 64800', Math.abs(rent6.valorGanado - 64800) < 0.01, String(rent6.valorGanado))
comprobar('CPI serv. 6 ≈ 1.33', Math.abs(rent6.cpi - 1.33) < 0.01, String(rent6.cpi))
comprobar('costo final ≈ 90492.59', Math.abs(rent6.costoFinal - 90492.59) < 0.01, String(rent6.costoFinal))
comprobar('margen proyectado ≈ 29507.41', Math.abs(rent6.margenProyectado - 29507.41) < 0.01, String(rent6.margenProyectado))
const rentSinAvance = rentabilidadServicio(servicio6, registros, [])
comprobar('sin tareas no hay CPI ni proyección', rentSinAvance.cpi === null && rentSinAvance.margenProyectado === null)
const alertasSanas = alertasServicio({
  servicio: servicio6,
  consumo: { excedido: false, presupuesto: 120000, disponible: 50000 },
  dias: 60,
  rentabilidad: { cpi: 1.2 },
})
comprobar('sin problemas no hay alertas', alertasSanas.length === 0, JSON.stringify(alertasSanas))
const alertasMal = alertasServicio({
  servicio: servicio6,
  consumo: { excedido: true, presupuesto: 100, disponible: -10 },
  dias: -5,
  rentabilidad: { cpi: 0.7 },
})
const codigos = alertasMal.map((a) => a.codigo)
comprobar(
  'detecta excedido, cpi y plazo',
  ['excedido', 'cpi-critico', 'plazo-vencido'].every((c) => codigos.includes(c)),
  JSON.stringify(codigos),
)
const alertasMargen = alertasServicio({
  servicio: servicio6,
  consumo: { excedido: false, presupuesto: 1000, disponible: 50 },
  dias: 10,
  rentabilidad: { cpi: null },
})
comprobar(
  'margen bajo y plazo cercano avisan',
  alertasMargen.some((a) => a.codigo === 'margen-bajo') && alertasMargen.some((a) => a.codigo === 'plazo-cercano'),
  JSON.stringify(alertasMargen.map((a) => a.codigo)),
)

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
const proyAsig6 = proyeccionAsignaciones(asigs, servSeis, ESTADO_INICIAL.registros_servicio)
comprobar('total inicio-fin con baja = 31096', proyAsig6.total === 31096, String(proyAsig6.total))
comprobar('sin asentar todo es proyectado', proyAsig6.gastado === 0 && proyAsig6.proyectado === 31096)
const sinBaja = asigs.map((a) => (a.id === 2 ? { ...a, fecha_fin: null } : a))
const proyAsigSinBaja = proyeccionAsignaciones(sinBaja, servSeis, ESTADO_INICIAL.registros_servicio)
comprobar('sin baja el total sería mayor (44920)', proyAsigSinBaja.total === 44920, String(proyAsigSinBaja.total))
comprobar('la baja baja el total', proyAsigSinBaja.total > proyAsig6.total)
comprobar('sin asentamiento devuelve null', asentamientoDe(1, ESTADO_INICIAL.registros_servicio, '2026-08') === null)
comprobar('cascada servicio borra asignaciones', !(sinServicio.asignaciones ?? []).some((a) => a.servicio_id === 6))

console.log('\n[ cobros ]')

const { cobros } = ESTADO_INICIAL
comprobar('serv. 6 tiene 2 cobros', cobros.filter((c) => c.servicio_id === 6).length === 2)
comprobar('cobrado serv. 6 = 54000', cobradoServicio(cobros, 6) === 54000, String(cobradoServicio(cobros, 6)))
comprobar('por cobrar serv. 6 = 66000', porCobrar(servSeis, cobros) === 66000, String(porCobrar(servSeis, cobros)))
const gastado6 = sumarMontos(registrosDeServicio(ESTADO_INICIAL.registros_servicio, 6))
comprobar('utilidad real = cobrado − gastado', utilidadReal(cobradoServicio(cobros, 6), gastado6) === 54000 - gastado6)
comprobar('sobrepago da negativo', porCobrar({ id: 7, presupuesto_asignado: 1000 }, [{ servicio_id: 7, monto: 1500 }]) === -500)
comprobar('cascada servicio borra cobros', !(sinServicio.cobros ?? []).some((c) => c.servicio_id === 6))

console.log('\n[ dashboard global ]')

const regsDash6 = registrosDeServicio(ESTADO_INICIAL.registros_servicio, 6)
const gastadoDash6 = sumarMontos(regsDash6)
comprobar('gastado serv. 6 = 48866', gastadoDash6 === 48866, String(gastadoDash6))
const oficinaTotal = sumarMontos(ESTADO_INICIAL.costos_oficina)
comprobar('oficina total = 23800', oficinaTotal === 23800, String(oficinaTotal))
comprobar('resultado empresa = 47334', 120000 - gastadoDash6 - oficinaTotal === 47334)
const porMes6 = proyeccionAsignaciones(asigs, servSeis, ESTADO_INICIAL.registros_servicio).porMes
const pendientes6 = porMes6.filter((m) => m.estimado && m.monto > 0 && ['2026-08', '2026-09', '2026-10'].includes(m.mes))
comprobar('ago/oct pendientes suman 6736/8160/6200', JSON.stringify(pendientes6.map((m) => m.monto)) === '[6736,8160,6200]', JSON.stringify(pendientes6.map((m) => m.monto)))
const porConcepto = cobros.reduce((a, c) => ({ ...a, [c.concepto]: (a[c.concepto] || 0) + c.monto }), {})
comprobar('adelanto 24000 y valorización 30000', porConcepto.adelanto === 24000 && porConcepto['valorización'] === 30000)
comprobar('COLECCIONES trae asignaciones y cobros, sin partidas', COLECCIONES.includes('asignaciones') && COLECCIONES.includes('cobros') && !COLECCIONES.includes('partidas') && !COLECCIONES.includes('valorizaciones'))
const spi6 = indiceAvance(servicio6, 54, '2026-10-06')
comprobar('SPI serv. 6 ≈ 0.96', spi6 && Math.abs(spi6.spi - 0.96) < 0.01, String(spi6?.spi))
comprobar('sin plazo no hay SPI', indiceAvance({ fecha_inicio: '', fecha_fin_estimada: '' }, 50, '2026-10-06') === null)
comprobar('obra sin empezar no tiene SPI', indiceAvance({ fecha_inicio: '2026-12-01', fecha_fin_estimada: '2027-01-01' }, 0, '2026-10-06') === null)

const { costos_oficina: oficina } = ESTADO_INICIAL
const oficinaOct = oficina.filter((c) => c.mes === '2026-10').reduce((t, c) => t + c.monto_calculado, 0)
const oficinaSep = oficina.filter((c) => c.mes === '2026-09').reduce((t, c) => t + c.monto_calculado, 0)
comprobar('oficina oct = 17500', oficinaOct === 17500, String(oficinaOct))
comprobar('oficina sep = 6300', oficinaSep === 6300, String(oficinaSep))
comprobar('empresa oct = 53634', consumo6.disponible - oficinaOct === 53634)
const soloObra = ESTADO_INICIAL.personal.filter((p) => (p.ambito ?? 'Obra') !== 'Oficina')
comprobar('personal de obra > 0 y < total', soloObra.length > 0 && soloObra.length < ESTADO_INICIAL.personal.length, String(soloObra.length))
comprobar('sumarMontos vacío = 0', sumarMontos([]) === 0)

console.log('\n[ presupuesto por tareas ]')

const { registros_servicio: regs } = ESTADO_INICIAL
const tareasTodas = ESTADO_INICIAL.tareas
const tareasServ6 = tareasTodas.filter((t) => t.servicio_id === 6)
comprobar('presupuesto serv. 6 = 120000', presupuestoTareas(tareasTodas, 6) === 120000, String(presupuestoTareas(tareasTodas, 6)))
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
comprobar('migración: raíz hereda presupuesto (21600)', migrado.tareas[0].monto === 21600, String(migrado.tareas[0].monto))
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
// Caso F: desviación y ejecución.
comprobar('F desviación 1500', desviacionPresupuesto(11500, 10000) === 1500)
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
//  6. Etapas 3–5: tareo, facturas, pagos, caja, cierre
// ============================================================

console.log('\n[ etapas 3-5 ]')

// Tareo: importe con extras y tarifa snapshot.
const tareoDemo = { horas_normales: 8, horas_extras: 2, tarifa_hora: 25, tarifa_extra: 37.5 }
comprobar(
  'tareo 8×25 + 2×37.5 = 275',
  tareoDemo.horas_normales * tareoDemo.tarifa_hora + tareoDemo.horas_extras * tareoDemo.tarifa_extra === 275,
)
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
// Pagos: gasto 2000, pago 800 → saldo 1200 (Caso E §24).
comprobar('saldo gasto 2000 − 800 = 1200', saldoGasto(2000, 9, [{ gasto_id: 9, monto: 800 }]) === 1200)
// Caja: cobros + entradas − pagos − salidas.
comprobar(
  'flujo mes = 10000 + 500 − 6000 − 200',
  flujoMes('2026-10', [{ fecha: '2026-10-05', monto: 10000 }], [{ fecha: '2026-10-06', monto: 6000 }], [{ fecha: '2026-10-07', tipo: 'entrada', monto: 500 }, { fecha: '2026-10-08', tipo: 'salida', monto: 200 }]) === 4300,
)
// Horas: tareo aprobado manda; si no, registros.
const horasTar = horasMes('2026-10', [], [{ fecha: '2026-10-05', horas_normales: 8, horas_extras: 2, tarifa_hora: 25, tarifa_extra: 37.5, estado: 'aprobado' }])
comprobar('horas de tareo aprobado (10 h, 275)', horasTar.total === 10 && horasTar.costo === 275 && horasTar.fuente === 'tareo')
const horasReg = horasMes('2026-10', [{ tipo_registro: 'personal', fecha: '2026-10-05', cantidad_o_horas: 8, monto_calculado: 200 }], [])
comprobar('horas de registros sin tareo', horasReg.total === 8 && horasReg.fuente === 'registros')
// Cierre: snapshot + mes cerrado bloquea.
const cierreDemo = generarCierre('2026-10', {
  servicios: [{ id: 6, nombre_servicio: 'Demo' }],
  registros_servicio: [{ servicio_id: 6, fecha: '2026-10-05', monto_calculado: 100 }],
  facturas: [{ id: 1, servicio_id: 6, fecha_emision: '2026-10-02', total: 1000 }],
  cobros: [{ servicio_id: 6, fecha: '2026-10-06', monto: 400 }],
  pagos: [{ servicio_id: 6, fecha: '2026-10-07', monto: 60 }],
  tareos: [],
})
comprobar(
  'cierre congela totales',
  cierreDemo.facturado === 1000 && cierreDemo.cobrado === 400 && cierreDemo.gastado === 100 && cierreDemo.pagado === 60 && cierreDemo.flujo === 340 && cierreDemo.resultado === 900,
  JSON.stringify(cierreDemo),
)
comprobar('mes cerrado detectado', mesCerrado('2026-10', [{ mes: '2026-10', estado: 'cerrado' }]) && !mesCerrado('2026-10', [{ mes: '2026-10', estado: 'reabierto' }]))
// Tipos de servicio y colecciones nuevas vacías.
comprobar('tipos incluyen Obra/Misceláneo/Anual/Contrato', ['Obra', 'Misceláneo', 'Anual', 'Contrato'].every((t) => TIPOS_SERVICIO.includes(t)))
comprobar('tipo por defecto Obra', tipoServicio({}) === 'Obra' && tipoServicio({ tipo: 'Anual' }) === 'Anual')
comprobar(
  'colecciones nuevas existen y vacías',
  ['facturas', 'pagos', 'movimientos_caja', 'tareos', 'cierres'].every((c) => Array.isArray(ESTADO_INICIAL[c]) && ESTADO_INICIAL[c].length === 0),
)

// ============================================================
//  7. Presupuesto e indirectos
// ============================================================

console.log('\n[ presupuesto e indirectos ]')

const pptoDemo = [
  { servicio_id: 6, categoria: 'Mano de obra', monto: 40000, version: 'inicial' },
  { servicio_id: 6, categoria: 'Mano de obra', monto: 5000, version: 'adicional' },
  { servicio_id: 6, categoria: 'Materiales', monto: 30000, version: 'inicial' },
]
const ppto = presupuestoPorCategoria(pptoDemo, 6)
comprobar('vigente suma inicial + adicional', ppto.porCategoria['Mano de obra'].vigente === 45000)
comprobar('totales 70000/5000/75000', ppto.inicialTotal === 70000 && ppto.adicionalTotal === 5000 && ppto.vigenteTotal === 75000)
const equiposDemo = [
  { id: 1, propiedad: 'Propio' },
  { id: 2, propiedad: 'Alquilado' },
]
const regsDemo = [
  { servicio_id: 6, tipo_registro: 'personal', monto_calculado: 1000 },
  { servicio_id: 6, tipo_registro: 'equipo', referencia_id: 1, monto_calculado: 500 },
  { servicio_id: 6, tipo_registro: 'equipo', referencia_id: 2, monto_calculado: 300 },
  { servicio_id: 6, tipo_registro: 'material', monto_calculado: 200 },
  { servicio_id: 6, tipo_registro: 'gasto', categoria: 'Transporte', monto_calculado: 100 },
  { servicio_id: 6, tipo_registro: 'gasto', monto_calculado: 50 },
]
const real = realPorCategoria(regsDemo, 6, equiposDemo)
comprobar(
  'real mapea categorías',
  real.porCategoria['Mano de obra'] === 1000 &&
    real.porCategoria['Equipos propios'] === 500 &&
    real.porCategoria['Equipos alquilados'] === 300 &&
    real.porCategoria['Materiales'] === 200 &&
    real.porCategoria['Transporte y movilización'] === 100 &&
    real.sinCategoria === 50,
  JSON.stringify(real),
)
const desv = desviacionCategoria(10000, 11500)
comprobar('desviación 1500 y ejecución 115%', desv.desviacion === 1500 && desv.ejecucion === 115 && desv.excedida)
comprobar('ejecución N/D sin presupuesto', desviacionCategoria(0, 500).ejecucion === null)
const dist = distribuirIndirectos(1000, [
  { servicio_id: 6, base: 3 },
  { servicio_id: 7, base: 1 },
])
comprobar(
  'prorrateo exacto 750/250',
  dist.distribuido.find((d) => d.servicio_id === 6).monto === 750 &&
    dist.distribuido.find((d) => d.servicio_id === 7).monto === 250 &&
    dist.sinDistribuir === 0,
  JSON.stringify(dist),
)
comprobar('sin regla queda separado', distribuirIndirectos(1000, []).sinDistribuir === 1000)
comprobar('cascada servicio borra presupuestos', !(dataReducer(ESTADO_INICIAL, { type: 'ELIMINAR_ITEM', payload: { coleccion: 'servicios', id: 6 } }).presupuestos ?? []).some((p) => p.servicio_id === 6))

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
  { ruta: '/servicios/6/cobros', etiqueta: 'Panel cobros', monto: true },
  { ruta: '/servicios/6/facturacion', etiqueta: 'Panel facturación', monto: true },
  { ruta: '/servicios/6/pagos', etiqueta: 'Panel pagos', monto: true },
  { ruta: '/servicios/6/presupuesto', etiqueta: 'Panel presupuesto', monto: true },
  { ruta: '/caja', etiqueta: 'Caja', monto: true },
  { ruta: '/cierre', etiqueta: 'Cierre', monto: true },
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