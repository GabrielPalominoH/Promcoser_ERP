import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { DataProvider, dataReducer, siguienteId } from '../src/context/DataContext'
import { ESTADO_INICIAL, migrarPresupuestoATareas } from '../src/data/mockData'
import { agruparPersonalPorMes, alertasServicio, asentamientoDe, avanceEfectivo, coberturaTareo, consumoPresupuesto, costoMensualAsignacion, costoPorTarea, costoSinTarea, costoSubarbol, cuentaComoManoDeObra, desglosePorTipo, diasCalendarioRango, diasLaborables, esDomingo, fechasDelMes, fechasHastaFinDeMes, fechasLaborables, fechasLaborablesMes, sumarMontos, registrosDeServicio, metricasCronograma, montoTarea, presupuestoTareas, proyeccionAsignaciones, rentabilidadServicio, gastoPorMes, indiceAvance, proyeccionLaboral, valorizadoTarea } from '../src/utils/calculadora'
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
  coberturaIncompleta: 0,
})
comprobar('sin problemas no hay alertas', alertasSanas.length === 0, JSON.stringify(alertasSanas))
const alertasMal = alertasServicio({
  servicio: servicio6,
  consumo: { excedido: true, presupuesto: 100, disponible: -10 },
  dias: -5,
  rentabilidad: { cpi: 0.7 },
  coberturaIncompleta: 2,
})
const codigos = alertasMal.map((a) => a.codigo)
comprobar(
  'detecta excedido, cpi, plazo y tareo',
  ['excedido', 'cpi-critico', 'plazo-vencido', 'tareo-incompleto'].every((c) => codigos.includes(c)),
  JSON.stringify(codigos),
)
const alertasMargen = alertasServicio({
  servicio: servicio6,
  consumo: { excedido: false, presupuesto: 1000, disponible: 50 },
  dias: 10,
  rentabilidad: { cpi: null },
  coberturaIncompleta: 0,
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
comprobar('fechasDelMes octubre da 31 días', fechasDelMes('2026-10').length === 31 && fechasDelMes('2026-10')[0] === '2026-10-01')
comprobar('fechasDelMes vacío da []', fechasDelMes('').length === 0)
comprobar(
  'personal en sábado sí cuenta',
  cuentaComoManoDeObra({ tipo_registro: 'personal', fecha: '2026-10-03' }) === true,
)
comprobar(
  'material en domingo sí cuenta',
  cuentaComoManoDeObra({ tipo_registro: 'material', fecha: '2026-10-04' }) === true,
)
comprobar('octubre 2026 tiene 27 laborables', diasLaborables('2026-10') === 27, String(diasLaborables('2026-10')))
comprobar('febrero 2026 tiene 24 laborables', diasLaborables('2026-02') === 24, String(diasLaborables('2026-02')))
comprobar('mes vacío da 0', diasLaborables('') === 0)
const semana = fechasLaborables('2026-10-05', '2026-10-11')
comprobar('rango lun-dom salta el domingo (6 días)', semana.length === 6 && !semana.includes('2026-10-11'), JSON.stringify(semana))
comprobar('rango invertido da []', fechasLaborables('2026-10-11', '2026-10-05').length === 0)
comprobar('rango de un día da [ese día]', JSON.stringify(fechasLaborables('2026-10-06', '2026-10-06')) === '["2026-10-06"]')
const octMes = fechasLaborablesMes('2026-10')
comprobar('mes octubre da 27 fechas sin domingos', octMes.length === 27 && octMes[0] === '2026-10-01' && !octMes.includes('2026-10-04'), `${octMes.length}`)
comprobar('desde 15/07 hasta fin de mes da 17 fechas', fechasHastaFinDeMes('2026-07-15').length === 17 && fechasHastaFinDeMes('2026-07-15')[0] === '2026-07-15', String(fechasHastaFinDeMes('2026-07-15').length))
const personal6 = registrosDeServicio(registros, 6).filter((r) => r.tipo_registro === 'personal')
const proy6 = proyeccionLaboral(personal6, '2026-12-20', '2026-10-06', '2026-07-01')
comprobar('proyección serv. 6 = 6 meses (jul-dic)', proy6.porMes.length === 6, JSON.stringify(proy6.porMes.map((m) => m.mes)))
comprobar('ritmo serv. 6 = 1540', proy6.ritmo === 1540, String(proy6.ritmo))
comprobar('agosto es real', proy6.porMes.find((m) => m.mes === '2026-08')?.estimado === false)
comprobar('noviembre es estimado', proy6.porMes.find((m) => m.mes === '2026-11')?.estimado === true)
comprobar('diciembre prorrateado ≈ 969.63', Math.abs(proy6.porMes.find((m) => m.mes === '2026-12')?.monto - 969.63) < 0.01, String(proy6.porMes.find((m) => m.mes === '2026-12')?.monto))
comprobar('noviembre estimado con 70 h', proy6.porMes.find((m) => m.mes === '2026-11')?.horas === 70, String(proy6.porMes.find((m) => m.mes === '2026-11')?.horas))
comprobar('diciembre prorratea horas ≈ 44.07', Math.abs(proy6.porMes.find((m) => m.mes === '2026-12')?.horas - 44.07) < 0.01, String(proy6.porMes.find((m) => m.mes === '2026-12')?.horas))
comprobar('julio vacío se estima con ritmo', proy6.porMes.find((m) => m.mes === '2026-07')?.monto === 1540, String(proy6.porMes.find((m) => m.mes === '2026-07')?.monto))
comprobar('septiembre vacío se estima con ritmo', proy6.porMes.find((m) => m.mes === '2026-09')?.monto === 1540, String(proy6.porMes.find((m) => m.mes === '2026-09')?.monto))
comprobar('meses estimados serv. 6 = 5', proy6.mesesRestantes === 5, String(proy6.mesesRestantes))
comprobar('costo proyectado serv. 6 ≈ 7129.63', Math.abs(proy6.costoProyectado - 7129.63) < 0.01, String(proy6.costoProyectado))
comprobar('proyección vacía en ceros', proyeccionLaboral([], '2026-12-20', '2026-10-06', '2026-07-01').costoProyectado === 0)
const regJun = [{ fecha: '2026-06-05', cantidad_o_horas: 40, monto_calculado: 1540 }]
const proyMitad = proyeccionLaboral(regJun, '2026-08-10', '2026-07-10', '2026-07-15')
comprobar('inicio a mitad de mes se prorratea', Math.abs(proyMitad.porMes.find((m) => m.mes === '2026-08')?.monto - 473.85) < 0.01, String(proyMitad.porMes.find((m) => m.mes === '2026-08')?.monto))
const regSinCosto = [
  { fecha: '2026-08-05', cantidad_o_horas: 70, monto_calculado: 1540 },
  { fecha: '2026-09-03', cantidad_o_horas: 20, monto_calculado: 0 },
]
const proyCalc = proyeccionLaboral(regSinCosto, '2026-12-20', '2026-10-06', '2026-07-01')
comprobar('mes con horas y costo 0 se estima (20h × 22 = 440)', proyCalc.porMes.find((m) => m.mes === '2026-09')?.monto === 440, String(proyCalc.porMes.find((m) => m.mes === '2026-09')?.monto))
comprobar('mes estimado lleva marca calc.', proyCalc.porMes.find((m) => m.mes === '2026-09')?.calculado === true)
const regTodoCero = [
  { fecha: '2026-08-05', cantidad_o_horas: 70, monto_calculado: 0 },
  { fecha: '2026-09-03', cantidad_o_horas: 20, monto_calculado: 0 },
]
const proyRef = proyeccionLaboral(regTodoCero, '2026-12-20', '2026-10-06', '2026-07-01', 25)
comprobar('sin meses con costo usa tarifa de referencia (20h × 25 = 500)', proyRef.porMes.find((m) => m.mes === '2026-09')?.monto === 500, String(proyRef.porMes.find((m) => m.mes === '2026-09')?.monto))
comprobar('sin tarifa de referencia queda en 0', proyeccionLaboral(regTodoCero, '2026-12-20', '2026-10-06', '2026-07-01').porMes.find((m) => m.mes === '2026-09')?.monto === 0)
const demoAgrup = [
  { id: 1, servicio_id: 6, tipo_registro: 'personal', referencia_id: 1, cantidad_o_horas: 8, monto_calculado: 200, fecha: '2026-08-04' },
  { id: 2, servicio_id: 6, tipo_registro: 'personal', referencia_id: 1, cantidad_o_horas: 8, monto_calculado: 200, fecha: '2026-08-05' },
  { id: 3, servicio_id: 6, tipo_registro: 'personal', referencia_id: 3, cantidad_o_horas: 6, monto_calculado: 108, fecha: '2026-08-06' },
  { id: 4, servicio_id: 6, tipo_registro: 'gasto', referencia_id: null, cantidad_o_horas: 1, monto_calculado: 50, fecha: '2026-08-06' },
]
const demoPersonal = [
  { id: 1, nombre: 'Ana', apellido: 'Paz', cargo: 'Oficial' },
  { id: 3, nombre: 'Luis', apellido: 'Rey', cargo: 'Ayudante' },
]
const gruposDemo = agruparPersonalPorMes(demoAgrup, demoPersonal)
comprobar('agrupa por persona y mes (2 grupos)', gruposDemo.length === 2, JSON.stringify(gruposDemo.map((g) => g.clave)))
comprobar(
  'grupo Ana agosto: 2 días, 16 h, S/ 400',
  gruposDemo[0].dias === 2 && gruposDemo[0].horas === 16 && gruposDemo[0].monto === 400,
  JSON.stringify(gruposDemo[0]),
)
comprobar('ignora registros que no son personal', !gruposDemo.some((g) => g.monto === 50))
comprobar('agrupado vacío = []', agruparPersonalPorMes([], []).length === 0)
const cobDemo = coberturaTareo(
  [
    { referencia_id: 1, fecha: '2026-08-04', cantidad_o_horas: 8, monto_calculado: 200 },
    { referencia_id: 1, fecha: '2026-08-05', cantidad_o_horas: 8, monto_calculado: 200 },
  ],
  [{ id: 1, nombre: 'Ana', apellido: 'Paz', cargo: 'Oficial' }],
  '2026-08-01',
  '2026-08-31',
)
comprobar('cobertura 2/26 días incompleta', cobDemo.length === 1 && cobDemo[0].diasRegistrados === 2 && cobDemo[0].diasEsperados === 26 && cobDemo[0].completo === false, JSON.stringify(cobDemo[0]))
comprobar('cobertura vacía = []', coberturaTareo([], [], '2026-08-01', '2026-08-31').length === 0)

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
//  4. Render de rutas
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