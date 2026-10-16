import { readFileSync } from 'node:fs'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { DataProvider, dataReducer, siguienteId } from '../src/context/DataContext'
import { COLECCIONES, ESTADO_INICIAL, TIPOS_SERVICIO, migrarPresupuestoATareas, tipoServicio } from '../src/data/mockData'
import { UNIDADES } from '../src/data/unidades'
import { CATALOGO_CARGOS, CATALOGO_PERSONAL } from '../src/config/catalogos'
import { FormularioCatalogo } from '../src/components/crud/CatalogoCRUD'
import { mismoCargo, opcionesCargo, personasConCargo, puedeEliminarCargo } from '../src/utils/cargos'
import { esPersonalActivo, personalAsignable, puedeEliminarPersonal } from '../src/utils/personal'
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
import { alertasServicio, asentamientoDe, avanceEfectivo, avanceGlobalTareas, cobradoServicio, costoMensualAsignacion, costoPorTarea, costoSinTarea, costoSubarbol, cuentaComoManoDeObra, desglosePorTipo, desviacionDias, diasCalendarioRango, diasEstimadosTarea, diasRealesTarea, diferenciaPersonalAuto, esDomingo, estadoPresupuesto, horasPorMes, sumarMontos, mediaMovil, proyeccionFinanciera, registrosDeServicio, metricasCronograma, montoTarea, presupuestoTareas, proyeccionAsignaciones, gastoPorMes, indiceAvance, utilidadReal, valorizadoTarea } from '../src/utils/calculadora'
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
import { redondearMonto, formatearMoneda, formatearFecha, normalizarEntradaMonto, formatearEntradaMonto, parsearEntradaMonto } from '../src/utils/formatters'
import { curvaServicio } from '../src/utils/curvaS'
import {
  armarLectura,
  armarLineaBase,
  compararConLineaBase,
  instantaneaTareas,
  lineaBaseVigente,
  presupuestoLineaBase,
  siguienteVersionLineaBase,
} from '../src/utils/lineaBase'
import {
  basePrecio,
  calcularValorizacion,
  configValorizacion,
  partidasValorizables,
  resumenValorizaciones,
  saldoAdelantos,
  siguienteNumero,
} from '../src/utils/valorizaciones'
import {
  desviacionHoras,
  horasPlanTarea,
  horasRealesMensual,
  horasRealesTarea,
  productividadHH,
  resumenHorasServicio,
  serieHorasHombre,
} from '../src/utils/horasHombre'
import { programar } from '../src/utils/cpm'
import { controlCPMCartera, evmCartera } from '../src/utils/cartera'
import {
  aplicarTransicion,
  desplazarFechaFin,
  diasAmpliados,
  diasAplicados,
  esAprobada,
  importeModificacion,
  importePartida,
  partidasATareas,
  presupuestoVigente,
  resumenModificaciones,
  servicioConPresupuestoVigente,
  siguienteNumero as siguienteNumeroModificacion,
  totalAprobado,
} from '../src/utils/modificaciones'
import {
  CLIMAS,
  agruparPartesPorMes,
  avanceAcumulado,
  avanceDiarioPorTarea,
  diasDelMes,
  horasEquipos,
  horasPersonal,
  matrizCalendario,
  mesDeFecha,
  parteDeFecha,
  partesDeServicio,
  personalPresenteSugerido,
  recalcularAvanceTareas,
  resumenParte,
  resumenPeriodo,
} from '../src/utils/partesDiario'
import { htmlParteDiario, htmlValorizacion, htmlReporteMensualObra, imprimirHTML } from '../src/utils/reportes'
import { crc32, zipStore, columnaLetra, hojaXML, libroXLSX } from '../src/utils/excel'
import {
  libroCronograma,
  libroValorizaciones,
  libroCostosPorPartida,
  libroFlujoCaja,
} from '../src/utils/exportaciones'
import { descargarBlob, descargarXLSX, descargarLibro } from '../src/utils/descargas'
import { escalarDimensiones } from '../src/data/fotos'
import { filtrarOpciones, normalizar } from '../src/components/ui/ComboBox'
import { resolverFacturaIngreso } from '../src/pages/servicio/IngresosServicio'
import { RedPERT } from '../src/pages/servicio/RedPERT'
import { calendarioDe } from '../src/utils/calendario'
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
comprobar(
  'avance global serv. 6 = 47 (valorizado, solo hojas)',
  met6.avanceGlobal === 47,
  String(met6.avanceGlobal),
)
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
comprobar(
  'COLECCIONES trae asignaciones, cobros y control de obra, sin partidas ni presupuestos',
  COLECCIONES.includes('asignaciones') &&
    COLECCIONES.includes('cobros') &&
    COLECCIONES.includes('lineas_base') &&
    COLECCIONES.includes('lecturas_avance') &&
    COLECCIONES.includes('valorizaciones') &&
    COLECCIONES.includes('adelantos') &&
    !COLECCIONES.includes('partidas') &&
    !COLECCIONES.includes('presupuestos'),
)
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
// Respaldo de un esquema anterior (v8, sin `cargos`): se acepta y el catálogo
// semilla rellena la colección nueva.
const respaldoV8 = { ...JSON.parse(serial), _v: 8 }
delete respaldoV8.cargos
const validadoV8 = validarRespaldo(respaldoV8)
comprobar('K respaldo v8 sin cargos se acepta', validadoV8.ok, JSON.stringify(validadoV8.errores))
comprobar(
  'K respaldo v8 rellena los cargos semilla',
  normalizarRespaldo(respaldoV8)?.cargos.length === ESTADO_INICIAL.cargos.length,
)
// Un respaldo de un esquema anterior (v9, sin las colecciones de control de
// obra) se acepta y el semilla rellena línea base, lecturas y valorizaciones.
const respaldoV9 = { ...JSON.parse(serial), _v: 9 }
delete respaldoV9.cargos
delete respaldoV9.lineas_base
delete respaldoV9.lecturas_avance
delete respaldoV9.valorizaciones
delete respaldoV9.adelantos
comprobar('K respaldo v9 sin control de obra se acepta', validarRespaldo(respaldoV9).ok)
const normV9 = normalizarRespaldo(respaldoV9)
comprobar(
  'K respaldo v9 rellena línea base y valorizaciones',
  normV9?.lineas_base.length === ESTADO_INICIAL.lineas_base.length &&
    Array.isArray(normV9?.valorizaciones),
)
// Un respaldo de un esquema anterior (v10, sin modificaciones) se acepta y el
// semilla rellena las colecciones nuevas vacías.
const respaldoV10 = { ...JSON.parse(serial), _v: 10 }
delete respaldoV10.modificaciones
delete respaldoV10.ampliaciones_plazo
comprobar('K respaldo v10 sin modificaciones se acepta', validarRespaldo(respaldoV10).ok)
const normV10 = normalizarRespaldo(respaldoV10)
comprobar(
  'K respaldo v10 rellena modificaciones vacías',
  Array.isArray(normV10?.modificaciones) &&
    normV10.modificaciones.length === ESTADO_INICIAL.modificaciones.length &&
    Array.isArray(normV10?.ampliaciones_plazo),
)
// Un respaldo de un esquema anterior (v11, sin parte diario) se acepta y el
// semilla rellena la colección nueva vacía.
const respaldoV11 = { ...JSON.parse(serial), _v: 11 }
delete respaldoV11.partes_diario
comprobar('K respaldo v11 sin partes se acepta', validarRespaldo(respaldoV11).ok)
const normV11 = normalizarRespaldo(respaldoV11)
comprobar(
  'K respaldo v11 rellena partes vacíos',
  Array.isArray(normV11?.partes_diario) && normV11.partes_diario.length === 0,
)
// Un respaldo del esquema actual (v12) incompleto sí se rechaza.
const respaldoV12 = { ...JSON.parse(serial), _v: 12 }
delete respaldoV12.cargos
comprobar('K respaldo v12 incompleto se rechaza', validarRespaldo(respaldoV12).ok === false)

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
//  7.1 Catálogo de cargos (vínculo por nombre con personal)
// ============================================================

console.log('\n[ cargos ]')

const cargosSeed = ESTADO_INICIAL.cargos
comprobar('cargos semilla = 48 (uno por cargo en uso)', cargosSeed.length === 48, String(cargosSeed.length))
comprobar(
  'cargos semilla activos, con unidad HH y categoría',
  cargosSeed.every((c) => c.activo === true && c.unidad === 'HH' && c.nombre && c.categoria),
)
comprobar(
  'todo cargo del personal existe en el catálogo',
  ESTADO_INICIAL.personal.every((p) => cargosSeed.some((c) => mismoCargo(c.nombre, p.cargo))),
)
// Vínculo por nombre: sin tildes, sin mayúsculas y sin espacios sobrantes.
comprobar('vínculo tolera tildes y mayúsculas', mismoCargo('OFICIAL ', 'oficial') && !mismoCargo('', ''))
comprobar(
  'personas ligadas a Oficial = 10',
  personasConCargo(ESTADO_INICIAL.personal, 'Oficial').length === 10,
  String(personasConCargo(ESTADO_INICIAL.personal, 'Oficial').length),
)
// Guarda de borrado: con personal ligado no se puede; sin personal sí.
const bloqueado = puedeEliminarCargo(ESTADO_INICIAL.personal, 'Oficial')
comprobar(
  'no se borra un cargo con personal ligado',
  bloqueado.ok === false && bloqueado.total === 10 && bloqueado.motivo.includes('No se puede eliminar'),
)
comprobar('sí se borra un cargo sin personal ligado', puedeEliminarCargo(ESTADO_INICIAL.personal, 'Cargo inexistente').ok === true)
comprobar(
  'CATALOGO_CARGOS bloquea el borrado del cargo en uso',
  CATALOGO_CARGOS.bloquearEliminar({ id: 26, nombre: 'Oficial' }, ESTADO_INICIAL) !== null &&
    CATALOGO_CARGOS.bloquearEliminar({ id: 999, nombre: 'Cargo nuevo' }, ESTADO_INICIAL) === null,
)
// Renombrar un cargo arrastra el nombre a las fichas de personal vinculadas.
const cambiosPersonal = []
CATALOGO_CARGOS.alActualizar(
  { id: 26, nombre: 'Oficial' },
  { id: 26, nombre: 'Oficial de obra' },
  { estado: ESTADO_INICIAL, actualizarItem: (coleccion, item) => cambiosPersonal.push({ coleccion, ...item }) },
)
comprobar(
  'renombrar el cargo arrastra al personal ligado',
  cambiosPersonal.length === 10 &&
    cambiosPersonal.every((c) => c.coleccion === 'personal' && c.cargo === 'Oficial de obra'),
)
const sinRenombre = []
CATALOGO_CARGOS.alActualizar(
  { id: 26, nombre: 'Oficial' },
  { id: 26, nombre: 'OFICIAL' },
  { estado: ESTADO_INICIAL, actualizarItem: (coleccion, item) => sinRenombre.push(item) },
)
comprobar('un cambio que no renombra no arrastra nada', sinRenombre.length === 0)

// ============================================================
//  7.2 Personal: cargo elegido del catálogo + estado Activo/Inactivo
// ============================================================

console.log('\n[ personal: cargo y estado ]')

// El cargo de cada ficha coincide EXACTAMENTE con un nombre del catálogo (el
// catálogo se construyó a partir de los cargos en uso), por eso el selector
// del formulario puede ofrecer esos nombres sin ambigüedad.
comprobar(
  'cada cargo del personal coincide exactamente con el catálogo',
  ESTADO_INICIAL.personal.every((p) => cargosSeed.some((c) => c.nombre === p.cargo)),
)

// El campo `cargo` del formulario de Personal es un selector alimentado por
// el módulo Cargos: 48 opciones activas para una ficha nueva.
const campoCargo = CATALOGO_PERSONAL.campos.find((campo) => campo.name === 'cargo')
const opcionesNueva = campoCargo.opciones(ESTADO_INICIAL, null)
comprobar(
  'el cargo del personal se elige del catálogo (48 opciones)',
  campoCargo.tipo === 'combo' && opcionesNueva.length === 48,
  `${campoCargo.tipo} · ${opcionesNueva.length}`,
)

// Un cargo desactivado sale del selector…
const cargosConInactivo = cargosSeed.map((c) =>
  c.nombre === 'Oficial' ? { ...c, activo: false } : c,
)
const opcionesSinOficial = opcionesCargo(cargosConInactivo, null)
comprobar(
  'un cargo desactivado sale del selector de cargos',
  opcionesSinOficial.length === 47 && !opcionesSinOficial.some((o) => o.valor === 'Oficial'),
  String(opcionesSinOficial.length),
)
// …pero el cargo guardado en la ficha se conserva al editarla (no se pierde).
const opcionesConservando = opcionesCargo(cargosConInactivo, 'Oficial')
comprobar(
  'el cargo de una ficha se conserva aunque el cargo esté inactivo',
  opcionesConservando.length === 48 &&
    opcionesConservando[0].valor === 'Oficial' &&
    opcionesConservando[0].etiqueta.includes('no activo'),
)

// Estado: la semilla trae 104 fichas activas y el catálogo lleva íconos.
comprobar(
  'personal semilla = 104 fichas activas',
  ESTADO_INICIAL.personal.length === 104 &&
    ESTADO_INICIAL.personal.every((p) => p.activo === true),
  String(ESTADO_INICIAL.personal.length),
)
comprobar(
  'el catálogo Personal trae estado con íconos',
  CATALOGO_PERSONAL.tieneActivo === true &&
    CATALOGO_PERSONAL.editarIcono === true &&
    CATALOGO_PERSONAL.activoIcono === true,
)

// --- Regla de borrado: solo fichas sin ligas -----------------------------
// El botón Eliminar vive dentro del modal de edición y la guarda sale de
// `bloquearEliminar` (que llama a `puedeEliminarPersonal`).
comprobar(
  'el catálogo Personal elimina dentro del modal de edición',
  CATALOGO_PERSONAL.eliminarEnEdicion === true &&
    typeof CATALOGO_PERSONAL.bloquearEliminar === 'function',
)

const fichaDe = (id) => ESTADO_INICIAL.personal.find((p) => p.id === id)
const puedePersonal = (id) => puedeEliminarPersonal(ESTADO_INICIAL, fichaDe(id))

// Ligas reales de la semilla: asignaciones (26, 3, 17), registros de costo
// (25, 14, 9, 12) y costos de oficina (54, 15, 33, 62).
const casoAsignacion = puedePersonal(26)
const casoRegistro = puedePersonal(9)
const casoOficina = puedePersonal(54)
comprobar(
  'no se elimina personal con asignación en obra',
  casoAsignacion.ok === false &&
    casoAsignacion.total === 1 &&
    casoAsignacion.motivo.includes('1 asignación en obra'),
  casoAsignacion.motivo,
)
comprobar(
  'no se elimina personal con registro de costo en un servicio',
  casoRegistro.ok === false &&
    casoRegistro.total === 2 &&
    casoRegistro.motivo.includes('2 registros de costo'),
  casoRegistro.motivo,
)
comprobar(
  'no se elimina personal con costo de oficina',
  casoOficina.ok === false &&
    casoOficina.total === 2 &&
    casoOficina.motivo.includes('2 costos de oficina'),
  casoOficina.motivo,
)
// Ficha sin ninguna liga (el id 1 no aparece en ninguna colección) → sí.
comprobar('sí se elimina personal sin ninguna liga', puedePersonal(1).ok === true)
// El motivo nombra a la persona y ofrece la alternativa (desactivar).
comprobar(
  'el motivo del bloqueo nombra a la persona y sugiere desactivar',
  casoAsignacion.motivo.includes(fichaDe(26).nombre) &&
    casoAsignacion.motivo.includes('desactívala') &&
    casoAsignacion.total > 0,
)
// La guarda se aplica desde la configuración del catálogo.
comprobar(
  'CATALOGO_PERSONAL bloquea el borrado solo si hay ligas',
  CATALOGO_PERSONAL.bloquearEliminar(fichaDe(26), ESTADO_INICIAL) !== null &&
    CATALOGO_PERSONAL.bloquearEliminar({ id: 999, nombre: 'Ficha', apellido: 'Nueva' }, ESTADO_INICIAL) === null,
)

// `activo` ausente cuenta como activo (datos antiguos sin migración).
comprobar(
  'personal sin campo activo cuenta como activo',
  esPersonalActivo({ id: 1 }) === true && esPersonalActivo({ id: 2, activo: false }) === false,
)

// `personalAsignable` excluye desactivados y filtra por ámbito.
comprobar(
  'personal asignable excluye desactivados y respeta el ámbito',
  personalAsignable(
    [
      { id: 1, activo: true, ambito: 'Obra' },
      { id: 2, activo: false, ambito: 'Obra' },
      { id: 3, ambito: 'Obra' },
      { id: 4, activo: true, ambito: 'Oficina' },
    ],
    'Obra',
  )
    .map((p) => p.id)
    .join(',') === '1,3',
)
comprobar(
  'personal asignable de Oficina = 15',
  personalAsignable(ESTADO_INICIAL.personal, 'Oficina').length === 15,
  String(personalAsignable(ESTADO_INICIAL.personal, 'Oficina').length),
)

// El reducer alterna estado: activo -> inactivo, activo -> inactivo,
// inactivo -> activo, y una ficha SIN el campo se desactiva al primer clic.
const trasDesactivar = dataReducer(ESTADO_INICIAL, {
  type: 'ALTERNAR_ACTIVO',
  payload: { coleccion: 'personal', id: 1 },
})
comprobar(
  'alternar activo desactiva una ficha activa',
  trasDesactivar.personal.find((p) => p.id === 1).activo === false,
)
const sinCampoActivo = { ...ESTADO_INICIAL, personal: [{ id: 1, nombre: 'Prueba' }] }
comprobar(
  'alternar activo sobre una ficha sin el campo la desactiva',
  dataReducer(sinCampoActivo, {
    type: 'ALTERNAR_ACTIVO',
    payload: { coleccion: 'personal', id: 1 },
  }).personal[0].activo === false,
)
comprobar(
  'alternar activo reactiva una ficha inactiva',
  dataReducer(trasDesactivar, {
    type: 'ALTERNAR_ACTIVO',
    payload: { coleccion: 'personal', id: 1 },
  }).personal.find((p) => p.id === 1).activo === true,
)

// El formulario de alta de Personal usa el selector de cargo (combo) del
// módulo Cargos y no un campo de texto libre.
const htmlFormPersonal = renderToString(
  <FormularioCatalogo
    config={CATALOGO_PERSONAL}
    item={null}
    estado={ESTADO_INICIAL}
    onCancelar={() => {}}
    onGuardar={() => {}}
  />,
)
comprobar(
  'personal: el formulario elige el cargo con un selector con búsqueda',
  htmlFormPersonal.includes('role="combobox"') &&
    htmlFormPersonal.includes('Escribe para buscar en Cargos…') &&
    htmlFormPersonal.includes('Registrar personal'),
)
comprobar(
  'personal: el formulario no muestra valores rotos',
  !htmlFormPersonal.includes('undefined') && !htmlFormPersonal.includes('NaN'),
)
// Al editar una ficha con cargo inactivo, el formulario conserva el valor.
const htmlFormPersonalInactivo = renderToString(
  <FormularioCatalogo
    config={CATALOGO_PERSONAL}
    item={{ id: 1, nombre: 'Andrea', apellido: 'Cueto', cargo: 'Cargo retirado', dni: '12345678', tarifa_por_hora: 30, ambito: 'Oficina' }}
    estado={ESTADO_INICIAL}
    onCancelar={() => {}}
    onGuardar={() => {}}
  />,
)
// Al editar una ficha con cargo fuera del catálogo, el formulario debe
// renderizar sin romperse (el valor se conserva en la primera opción; ver la
// prueba pura de `opcionesCargo`).
comprobar(
  'personal: editar con un cargo fuera del catálogo no rompe el formulario',
  !htmlFormPersonalInactivo.includes('undefined') && !htmlFormPersonalInactivo.includes('NaN'),
)

// ============================================================
//  7.9 Curva S / Valor ganado (EVM): PV, AC y EV
// ============================================================

console.log('\n[ curva S ]')

// Corte de control: la obra del servicio 6 va de jun a dic 2026.
const CURVA_HOY = '2026-10-15'
const curva6 = curvaServicio({ servicio: servicio6, tareas: tareas6, registros, hoy: CURVA_HOY })
comprobar('curva S: presupuesto (BAC) = 335000', curva6.presupuesto === 335000, String(curva6.presupuesto))
comprobar('curva S: avance actual = 47', curva6.avance === 47, String(curva6.avance))
comprobar('curva S: PV a hoy = 170741.94', curva6.pv === 170741.94, String(curva6.pv))
comprobar('curva S: AC a hoy = 97345', curva6.ac === 97345, String(curva6.ac))
comprobar('curva S: EV a hoy = 157450', curva6.ev === 157450, String(curva6.ev))
comprobar('curva S: SV = EV − PV = -13291.94', curva6.sv === -13291.94, String(curva6.sv))
comprobar('curva S: CV = EV − AC = 60105', curva6.cv === 60105, String(curva6.cv))
comprobar('curva S: SPI = 0.92 (en plazo)', curva6.spi === 0.92, String(curva6.spi))
comprobar('curva S: CPI = 1.62 (eficiente)', curva6.cpi === 1.62, String(curva6.cpi))
comprobar('curva S: EAC = 207117.02', curva6.eac === 207117.02, String(curva6.eac))
comprobar('curva S: ETC = 109772.02', curva6.etc === 109772.02, String(curva6.etc))
comprobar('curva S: VAC = 127882.98', curva6.vac === 127882.98, String(curva6.vac))
comprobar('curva S: semáforo verde (obra bajo control)', curva6.semaforo === 'verde', String(curva6.semaforo))
comprobar(
  'curva S: la serie mensual cubre jun→dic 2026',
  curva6.periodos.length === 7 &&
    curva6.periodos[0].clave === '2026-06' &&
    curva6.periodos[6].clave === '2026-12',
  JSON.stringify(curva6.periodos.map((m) => m.clave)),
)
comprobar(
  'curva S: granularidad por defecto = mensual e índice de hoy en oct',
  curva6.granularidad === 'mensual' && curva6.periodos[curva6.indiceHoy].clave === '2026-10',
  String(curva6.granularidad),
)
// El plan acumulado crece mes a mes y cierra exactamente en el presupuesto.
comprobar('curva S: PV jun = 36000', curva6.periodos[0].pv === 36000, String(curva6.periodos[0].pv))
comprobar('curva S: PV jul = 74032.26', curva6.periodos[1].pv === 74032.26, String(curva6.periodos[1].pv))
comprobar('curva S: PV ago = 110173.91', curva6.periodos[2].pv === 110173.91, String(curva6.periodos[2].pv))
comprobar('curva S: PV sep = 148000', curva6.periodos[3].pv === 148000, String(curva6.periodos[3].pv))
comprobar('curva S: PV del mes actual = el mismo de "PV a hoy"', curva6.periodos[4].pv === 170741.94, String(curva6.periodos[4].pv))
comprobar('curva S: PV cierra en el presupuesto al fin del plazo', curva6.periodos[6].pv === 335000, String(curva6.periodos[6].pv))
comprobar('curva S: el mes actual trae EV de hoy', curva6.periodos[4].ev === 157450 && curva6.periodos[4].ac === 97345)
comprobar(
  'curva S: los meses futuros no tienen costo real ni ganado medido',
  curva6.periodos[5].ac === null && curva6.periodos[5].ev === null && curva6.periodos[6].ac === null,
)
comprobar(
  'curva S: la proyección cierra en el presupuesto (EV) y en el EAC (AC)',
  curva6.periodos[6].evProy === 335000 && curva6.periodos[6].acProy === 207117.02,
  JSON.stringify([curva6.periodos[6].evProy, curva6.periodos[6].acProy]),
)
comprobar(
  'curva S: sin servicio no hay datos (todo vacío, nunca NaN)',
  curvaServicio({ servicio: null }).hayDatos === false && curvaServicio({ servicio: null }).periodos.length === 0,
)

// --- Granularidad de la serie: semanal (7 d), 4 días, 2 días y diario. ---
// El rango del servicio 6 va del 01-jun al 20-dic 2026 (203 días calendario),
// por lo que el número de puntos depende de cada paso.
const curvaSemanal = curvaServicio({ servicio: servicio6, tareas: tareas6, registros, hoy: CURVA_HOY, granularidad: 'semanal' })
const curva4d = curvaServicio({ servicio: servicio6, tareas: tareas6, registros, hoy: CURVA_HOY, granularidad: '4d' })
const curva2d = curvaServicio({ servicio: servicio6, tareas: tareas6, registros, hoy: CURVA_HOY, granularidad: '2d' })
const curvaDiaria = curvaServicio({ servicio: servicio6, tareas: tareas6, registros, hoy: CURVA_HOY, granularidad: 'diario' })
comprobar(
  'curva S: el rango jun→dic 2026 tiene 203 días (fechaMin/fechaMax)',
  curvaDiaria.periodos.length === 203,
  String(curvaDiaria.periodos.length),
)
comprobar('curva S: granularidad semanal = 29 tramos de 7 días', curvaSemanal.periodos.length === 29, String(curvaSemanal.periodos.length))
comprobar('curva S: granularidad 4 días = 51 tramos', curva4d.periodos.length === 51, String(curva4d.periodos.length))
comprobar('curva S: granularidad 2 días = 102 tramos', curva2d.periodos.length === 102, String(curva2d.periodos.length))
comprobar(
  'curva S: los valores a hoy no cambian con la granularidad',
  curvaSemanal.pv === 170741.94 &&
    curva4d.pv === 170741.94 &&
    curva2d.pv === 170741.94 &&
    curvaDiaria.pv === 170741.94 &&
    curvaDiaria.ev === 157450 &&
    curvaDiaria.ac === 97345,
)
comprobar(
  'curva S: en diario el punto de hoy cae exactamente en 2026-10-15',
  curvaDiaria.periodos[curvaDiaria.indiceHoy].clave === '2026-10-15',
  curvaDiaria.periodos[curvaDiaria.indiceHoy].clave,
)
comprobar(
  'curva S: la serie diaria arranca el 01-jun y cierra el 20-dic',
  curvaDiaria.periodos[0].clave === '2026-06-01' &&
    curvaDiaria.periodos[202].clave === '2026-12-20' &&
    curvaDiaria.periodos[202].pv === 335000,
  JSON.stringify([curvaDiaria.periodos[0].clave, curvaDiaria.periodos[202].clave, curvaDiaria.periodos[202].pv]),
)
comprobar(
  'curva S: una granularidad inválida cae a mensual',
  curvaServicio({ servicio: servicio6, tareas: tareas6, registros, hoy: CURVA_HOY, granularidad: 'raro' }).granularidad === 'mensual',
)
comprobar(
  'curva S: la serie fina trae etiqueta de rango y del día',
  curvaSemanal.periodos[0].etiqueta === '01/06/2026 – 07/06/2026' && curvaDiaria.periodos[136].corta === '15/10',
  JSON.stringify([curvaSemanal.periodos[0].etiqueta, curvaDiaria.periodos[136].corta]),
)

// Sin cronograma, el plan se reparte lineal sobre el plazo del servicio.
const servSinTareas = {
  id: 999,
  presupuesto_asignado: 100000,
  fecha_inicio: '2026-01-01',
  fecha_fin_estimada: '2026-12-31',
}
const curvaLineal = curvaServicio({ servicio: servSinTareas, tareas: [], registros: [], hoy: '2026-07-01' })
comprobar(
  'curva S: sin tareas el plan cae al trazo lineal del plazo',
  curvaLineal.pv != null && curvaLineal.pv > 40000 && curvaLineal.pv < 60000,
  String(curvaLineal.pv),
)

// ============================================================
//  7.10 Coherencia del avance (F1): una sola definición de "avance"
// ============================================================

console.log('\n[ control de avance ]')

// El avance global solo cuenta HOJAS y pondera por monto (valorizado): un
// padre de resumen no vuelve a sumar su valor.
const hojaA = {
  id: 1,
  servicio_id: 1,
  padre_id: 10,
  nombre: 'A',
  fecha_inicio: '2026-01-01',
  fecha_fin: '2026-01-31',
  monto: 30000,
  avance: 100,
}
const hojaB = {
  id: 2,
  servicio_id: 1,
  padre_id: 10,
  nombre: 'B',
  fecha_inicio: '2026-01-01',
  fecha_fin: '2026-01-31',
  monto: 70000,
  avance: 50,
}
const padreResumen = {
  id: 10,
  servicio_id: 1,
  padre_id: null,
  nombre: 'P',
  fecha_inicio: '2026-01-01',
  fecha_fin: '2026-01-31',
  monto: 0,
  avance: 100,
}
comprobar(
  'avance global ponderado por monto = 65 (ignora al padre)',
  avanceGlobalTareas([hojaA, hojaB, padreResumen]) === 65,
  String(avanceGlobalTareas([hojaA, hojaB, padreResumen])),
)
// Sin montos, el peso cae a la duración (fin − inicio + 1).
const sinMontoA = { id: 3, servicio_id: 2, nombre: 'A', fecha_inicio: '2026-01-01', fecha_fin: '2026-01-09', avance: 100 }
const sinMontoB = { id: 4, servicio_id: 2, nombre: 'B', fecha_inicio: '2026-01-01', fecha_fin: '2026-01-19', avance: 0 }
comprobar(
  'avance global sin montos usa la duración = 32',
  avanceGlobalTareas([sinMontoA, sinMontoB]) === 32,
  String(avanceGlobalTareas([sinMontoA, sinMontoB])),
)
comprobar('avance global sin tareas = 0', avanceGlobalTareas([]) === 0 && avanceGlobalTareas(null) === 0)

// ============================================================
//  7.11 Línea base y lecturas de avance (F2)
// ============================================================

console.log('\n[ línea base ]')

const tareasPlan9 = [
  {
    id: 1,
    servicio_id: 9,
    padre_id: null,
    nombre: 'A',
    fecha_inicio: '2026-01-01',
    fecha_fin: '2026-01-31',
    monto: 50000,
    avance: 100,
  },
  {
    id: 2,
    servicio_id: 9,
    padre_id: null,
    nombre: 'B',
    fecha_inicio: '2026-02-01',
    fecha_fin: '2026-02-28',
    monto: 50000,
    avance: 0,
  },
]
const serv9 = {
  id: 9,
  presupuesto_asignado: 100000,
  fecha_inicio: '2026-01-01',
  fecha_fin_estimada: '2026-02-28',
}
const linea9 = armarLineaBase({
  servicio: serv9,
  tareas: tareasPlan9,
  lineasBase: [],
  fecha: '2026-01-01',
  nota: 'Plan original',
})
comprobar(
  'línea base: versión 1 y presupuesto = suma de raíces',
  linea9.version === 1 && linea9.presupuesto === 100000 && linea9.tareas.length === 2,
  JSON.stringify([linea9.version, linea9.presupuesto, linea9.tareas.length]),
)
comprobar('línea base: sin base, la siguiente versión es 1', siguienteVersionLineaBase(9, []) === 1)
const linea9v2 = armarLineaBase({ servicio: serv9, tareas: tareasPlan9, lineasBase: [linea9] })
comprobar('línea base: la siguiente versión es 2', linea9v2.version === 2, String(linea9v2.version))
comprobar(
  'línea base vigente = la de mayor versión',
  lineaBaseVigente(9, [linea9, linea9v2])?.version === 2,
)
comprobar(
  'instantánea de tareas solo trae campos de plan',
  instantaneaTareas(tareasPlan9).every((t) => t.servicio_id === 9 && t.monto != null),
)

// Comparación cronograma vivo vs. línea base.
const tareasReprog = [
  { id: 1, servicio_id: 9, nombre: 'A', fecha_inicio: '2026-01-03', fecha_fin: '2026-02-02', monto: 55000, avance: 100 },
  { id: 2, servicio_id: 9, nombre: 'B', fecha_inicio: '2026-02-01', fecha_fin: '2026-02-28', monto: 45000, avance: 0 },
  { id: 3, servicio_id: 9, nombre: 'C', fecha_inicio: '2026-03-01', fecha_fin: '2026-03-10', monto: 10000, avance: 0 },
]
const comp9 = compararConLineaBase({ tareas: tareasReprog, lineaBase: linea9 })
comprobar('comparación: desvío de inicio +2 días', comp9.filas[0].desvio_inicio === 2, String(comp9.filas[0].desvio_inicio))
comprobar('comparación: desvío de fin +2 días', comp9.filas[0].desvio_fin === 2, String(comp9.filas[0].desvio_fin))
comprobar('comparación: desvío de monto +5000', comp9.filas[0].desvio_monto === 5000, String(comp9.filas[0].desvio_monto))
comprobar('comparación: desvío de monto −5000', comp9.filas[1].desvio_monto === -5000, String(comp9.filas[1].desvio_monto))
comprobar('comparación: nueva tarea C fuera del plan', comp9.nuevasTareas === 1 && comp9.nuevas[0].id === 3)
comprobar('comparación: 2 tareas del plan presentes', comp9.realTareas === 2, String(comp9.realTareas))

const lect9 = armarLectura({ servicio: serv9, tareas: tareasPlan9, fecha: '2026-01-31', avance: 50, nota: 'Corte' })
comprobar(
  'lectura: guarda fecha, avance y avance por tarea',
  lect9.fecha === '2026-01-31' && lect9.avance === 50 && lect9.tareas.length === 2 && lect9.tareas[0].avance === 100,
  JSON.stringify([lect9.fecha, lect9.avance, lect9.tareas.length]),
)

// La línea base sembrada del servicio 6 existe y su PV coincide con el vivo.
const base6 = lineaBaseVigente(6, ESTADO_INICIAL.lineas_base)
comprobar('línea base: el servicio 6 trae una versión sembrada', base6?.version === 1, String(base6?.version))
comprobar('línea base: presupuesto de la línea base del servicio 6 = 335000', presupuestoLineaBase(base6) === 335000)
const curvaBase6 = curvaServicio({ servicio: servicio6, tareas: tareas6, registros, hoy: CURVA_HOY, lineaBase: base6 })
comprobar(
  'línea base: el PV sale de la línea base (v1)',
  curvaBase6.usaLineaBase === true && curvaBase6.versionLineaBase === 1 && curvaBase6.pv === 170741.94,
  JSON.stringify([curvaBase6.usaLineaBase, curvaBase6.versionLineaBase, curvaBase6.pv]),
)

// Con lecturas, el EV histórico sale del corte firmado.
const lecturas6 = [armarLectura({ servicio: servicio6, tareas: tareas6, fecha: '2026-08-31', avance: 30, nota: 'Corte ago' })]
const curvaLect6 = curvaServicio({ servicio: servicio6, tareas: tareas6, registros, hoy: CURVA_HOY, lecturas: lecturas6 })
comprobar('lecturas: la curva reporta 1 lectura', curvaLect6.lecturas === 1, String(curvaLect6.lecturas))
comprobar(
  'lecturas: el EV de agosto sale del snapshot (30 % = 100500)',
  curvaLect6.periodos[2].ev === 100500,
  String(curvaLect6.periodos[2].ev),
)

// ============================================================
//  7.12 Valorizaciones de obra (F3)
// ============================================================

console.log('\n[ valorizaciones ]')

comprobar(
  'valorizaciones: IGV por defecto 18 %, detracción y fondo en 0',
  configValorizacion({}).igv_pct === 18 &&
    configValorizacion({}).detraccion_pct === 0 &&
    configValorizacion({}).fondo_garantia_pct === 0,
)

const servV1 = { id: 100, presupuesto_asignado: 100000, igv_pct: 18, detraccion_pct: 12, fondo_garantia_pct: 0 }
const tareasV1 = [
  { id: 101, servicio_id: 100, nombre: 'A', monto: 60000, avance: 100 },
  { id: 102, servicio_id: 100, nombre: 'B', monto: 40000, avance: 50 },
]
comprobar(
  'valorizaciones: partidas valorizables = hojas del servicio',
  partidasValorizables(tareasV1, 100).length === 2,
)
const val1 = calcularValorizacion({ servicio: servV1, tareas: tareasV1, valorizaciones: [], adelantos: [] })
comprobar('valorización 1: número correlativo = 1', val1.numero === 1, String(val1.numero))
comprobar('valorización 1: bruto = 80000', val1.bruta === 80000, String(val1.bruta))
comprobar('valorización 1: IGV 18 % = 14400', val1.igv === 14400, String(val1.igv))
comprobar('valorización 1: total = 94400', val1.total === 94400, String(val1.total))
comprobar('valorización 1: detracción 12 % = 11328', val1.detraccion === 11328, String(val1.detraccion))
comprobar('valorización 1: neto = 83072', val1.neto === 83072, String(val1.neto))

// Segunda valorización: solo el metrado nuevo del periodo.
const tareasV2 = [
  { id: 101, servicio_id: 100, nombre: 'A', monto: 60000, avance: 100 },
  { id: 102, servicio_id: 100, nombre: 'B', monto: 40000, avance: 100 },
]
comprobar(
  'valorización: siguiente número = 2',
  siguienteNumero([val1], 100) === 2,
  String(siguienteNumero([val1], 100)),
)
const val2 = calcularValorizacion({ servicio: servV1, tareas: tareasV2, valorizaciones: [val1], adelantos: [] })
comprobar('valorización 2: bruto del periodo = 20000', val2.bruta === 20000, String(val2.bruta))
comprobar('valorización 2: neto = 20768', val2.neto === 20768, String(val2.neto))

// Partidas con metrado × precio unitario.
const servV2 = { id: 200, presupuesto_asignado: 60000, igv_pct: 0, detraccion_pct: 0, fondo_garantia_pct: 0 }
const tareasMetrado = [{ id: 201, servicio_id: 200, nombre: 'Muro', monto: 60000, metrado: 100, precio_unitario: 600, avance: 50 }]
const valM = calcularValorizacion({ servicio: servV2, tareas: tareasMetrado, valorizaciones: [], adelantos: [] })
comprobar('valorización: metrado × PU gobierna el importe = 30000', valM.bruta === 30000, String(valM.bruta))
comprobar('valorización: ítem mide por metrado', valM.items[0].mide === 'metrado' && valM.items[0].metrado_acumulado === 50)

// Adelanto directo (20 % del contrato) y fondo de garantía 10 %.
const servV3 = { id: 300, presupuesto_asignado: 100000, igv_pct: 18, detraccion_pct: 0, fondo_garantia_pct: 10 }
const adelantosV3 = [{ id: 1, servicio_id: 300, tipo: 'directo', monto: 20000, fecha: '2026-01-01' }]
const tareasV3 = [{ id: 301, servicio_id: 300, nombre: 'A', monto: 100000, avance: 80 }]
const valA = calcularValorizacion({ servicio: servV3, tareas: tareasV3, valorizaciones: [], adelantos: adelantosV3 })
comprobar('valorización: amortiza adelanto directo (80 % → 16000)', valA.amort_directo === 16000, String(valA.amort_directo))
comprobar('valorización: fondo de garantía 10 % = 8000', valA.retencion === 8000, String(valA.retencion))
comprobar('valorización: subtotal = 56000', valA.subtotal === 56000, String(valA.subtotal))
comprobar('valorización: total con IGV = 66080', valA.total === 66080, String(valA.total))
const saldoV3 = saldoAdelantos({ servicio: servV3, valorizaciones: [valA], adelantos: adelantosV3 })
comprobar(
  'valorización: saldo del adelanto = 4000',
  saldoV3.directo.total === 20000 && saldoV3.directo.amortizado === 16000 && saldoV3.directo.saldo === 4000,
  JSON.stringify(saldoV3.directo),
)
const resumenV3 = resumenValorizaciones({ servicio: servV3, valorizaciones: [valA], adelantos: adelantosV3 })
comprobar(
  'valorización: resumen acumulado del servicio',
  resumenV3.cantidad === 1 && resumenV3.bruta === 80000 && resumenV3.neto === 66080,
  JSON.stringify([resumenV3.cantidad, resumenV3.bruta, resumenV3.neto]),
)

// ============================================================
//  7.12b Modificaciones contractuales (adicionales, deductivos y
//        ampliaciones de plazo)
// ============================================================

console.log('\n[ modificaciones ]')

comprobar(
  'modificaciones: importe de partida = metrado × PU; 0 sin base (nunca NaN)',
  importePartida({ metrado: 120, precio_unitario: 95 }) === 11400 &&
    importePartida({}) === 0 &&
    importePartida({ metrado: 5 }) === 0 &&
    Number.isFinite(importePartida({ metrado: 'x', precio_unitario: 1 })),
)
comprobar(
  'modificaciones: importe total = suma de partidas',
  importeModificacion({
    partidas: [
      { metrado: 2, precio_unitario: 10 },
      { metrado: 3, precio_unitario: 10 },
    ],
  }) === 50,
)

const servMod = { id: 500, presupuesto_asignado: 100000, fecha_fin_estimada: '2026-12-20' }
const modAdic = {
  id: 900,
  servicio_id: 500,
  tipo: 'adicional',
  numero: 1,
  fecha: '2026-05-01',
  estado: 'aprobado',
  partidas: [{ nombre: 'Extra', unidad: 'm³', metrado: 10, precio_unitario: 100 }],
  historial: [],
}
const modDed = {
  id: 910,
  servicio_id: 500,
  tipo: 'deductivo',
  numero: 1,
  fecha: '2026-05-02',
  estado: 'aprobado',
  partidas: [{ nombre: 'Menos', unidad: 'm²', metrado: 5, precio_unitario: 100 }],
  historial: [],
}
const modBorrador = { ...modAdic, id: 920, numero: 2, estado: 'borrador' }

comprobar('modificaciones: esAprobada solo con estado aprobado', esAprobada(modAdic) && !esAprobada(modBorrador))
comprobar(
  'modificaciones: totalAprobado ignora no aprobados y filtra servicio/tipo',
  totalAprobado([modAdic, modBorrador], 500, 'adicional') === 1000 &&
    totalAprobado([modAdic, modBorrador], 500, 'deductivo') === 0,
)
comprobar(
  'modificaciones: presupuesto vigente = original + adic. − ded.',
  presupuestoVigente(servMod, [modAdic, modDed]) === 100500 &&
    presupuestoVigente(servMod, [modBorrador]) === 100000,
)
const servVigMod = servicioConPresupuestoVigente(servMod, [modAdic, modDed])
comprobar(
  'modificaciones: servicio vigente conserva el original aparte',
  servVigMod.presupuesto_asignado === 100500 && servVigMod.presupuesto_original === 100000,
)

// Adicional aprobado → tareas hoja valorizables (metrado × PU), con la marca
// que permite reconciliarlas. Un deductivo o un no aprobado no materializa.
const tareasAdic = partidasATareas({ servicio: servMod, modificacion: modAdic })
comprobar(
  'modificaciones: adicional aprobado materializa una tarea hoja',
  tareasAdic.length === 1 &&
    tareasAdic[0].monto === 1000 &&
    tareasAdic[0].metrado === 10 &&
    tareasAdic[0].precio_unitario === 100 &&
    tareasAdic[0].modificacion_id === 900,
)
comprobar(
  'modificaciones: deductivo y no aprobado no materializan tareas',
  partidasATareas({ servicio: servMod, modificacion: modDed }).length === 0 &&
    partidasATareas({ servicio: servMod, modificacion: modBorrador }).length === 0,
)
const tareasValMod = [
  { id: 1, servicio_id: 500, nombre: 'Base', monto: 100000, avance: 0 },
  { ...tareasAdic[0], id: 2, avance: 100 },
]
const valMod = calcularValorizacion({
  servicio: servMod,
  tareas: tareasValMod,
  valorizaciones: [],
  adelantos: [],
})
comprobar(
  'modificaciones: la partida adicional aprobada se valoriza',
  valMod.bruta === 1000 && partidasValorizables(tareasValMod, 500).length === 2,
)

// Plazo: solo las ampliaciones aprobadas suman y desplazan la fecha fin.
const ampAprobada = {
  id: 1,
  servicio_id: 500,
  numero: 1,
  dias_solicitados: 20,
  dias_aprobados: 15,
  dias_aplicados: 15,
  estado: 'aprobado',
  historial: [],
}
const ampPresentada = {
  id: 2,
  servicio_id: 500,
  numero: 2,
  dias_solicitados: 10,
  dias_aprobados: 10,
  estado: 'presentado',
  historial: [],
}
comprobar(
  'modificaciones: días ampliados = solo aprobadas',
  diasAmpliados([ampAprobada, ampPresentada], 500) === 15,
)
comprobar(
  'modificaciones: días aplicados y desplazamiento de la fecha fin',
  diasAplicados([ampAprobada, ampPresentada], 500) === 15 &&
    desplazarFechaFin('2026-12-20', 15) === '2027-01-04',
)

const resumenMod = resumenModificaciones({
  servicio: { ...servMod, fecha_fin_estimada: '2027-01-04' },
  modificaciones: [modAdic, modDed, modBorrador],
  ampliaciones: [ampAprobada, ampPresentada],
})
comprobar(
  'modificaciones: resumen compone importes, variación y plazo',
  resumenMod.original === 100000 &&
    resumenMod.vigente === 100500 &&
    resumenMod.variacion === 500 &&
    resumenMod.adicionales === 1000 &&
    resumenMod.deductivos === 500 &&
    resumenMod.plazoAprobado === 15 &&
    resumenMod.aprobados === 2 &&
    resumenMod.borradores === 1,
)
comprobar(
  'modificaciones: resumen reconstruye la fecha fin original restando lo aplicado',
  resumenMod.fechaFinVigente === '2027-01-04' && resumenMod.fechaFinOriginal === '2026-12-20',
)

// Numeración correlativa por servicio y transiciones con historial.
comprobar(
  'modificaciones: siguiente número = max + 1 del servicio',
  siguienteNumeroModificacion([modAdic, modDed, modBorrador], 500) === 3 &&
    siguienteNumeroModificacion([], 500) === 1,
)
const trans1 = aplicarTransicion(
  { id: 1, estado: 'borrador', historial: [{ estado: 'borrador', fecha: '2026-01-01' }] },
  'aprobado',
  '2026-02-01',
)
comprobar(
  'modificaciones: la transición agrega el estado al historial',
  trans1.estado === 'aprobado' && trans1.historial.length === 2 && trans1.historial[1].fecha === '2026-02-01',
)
comprobar(
  'modificaciones: repetir el mismo estado no duplica el historial',
  aplicarTransicion(trans1, 'aprobado', '2026-03-01').historial.length === 2,
)

// Los ejemplos sembrados están sin aprobar a propósito: no mueven la línea base.
comprobar(
  'modificaciones: la semilla sin aprobar no altera el presupuesto del servicio 6',
  presupuestoVigente(servicio6, ESTADO_INICIAL.modificaciones) === 335000 &&
    diasAplicados(ESTADO_INICIAL.ampliaciones_plazo, 6) === 0,
)

// ============================================================
//  7.12c Parte diario de obra (clima, personal, equipos, partidas y fotos)
// ============================================================

console.log('\n[ parte diario ]')

comprobar(
  'parte diario: catálogo de climas no vacío',
  CLIMAS.length >= 4 && CLIMAS.includes('Lluvia intensa'),
)
comprobar(
  'parte diario: mesDeFecha y diasDelMes',
  mesDeFecha('2026-10-15') === '2026-10' &&
    diasDelMes('2026-10').length === 31 &&
    diasDelMes('2026-02').length === 28,
)
// 2026-10-01 es jueves (getDay=4), así que la primera fila trae 4 huecos.
const semanasOct = matrizCalendario('2026-10')
comprobar(
  'parte diario: matriz del calendario (2026-10 en 5 semanas)',
  semanasOct.length === 5 &&
    semanasOct[0].length === 7 &&
    semanasOct[0][0] === null &&
    semanasOct[0][4] === '2026-10-01' &&
    semanasOct[4][6] === '2026-10-31',
)

const partesDemo = [
  {
    id: 1,
    servicio_id: 500,
    fecha: '2026-10-01',
    clima: 'Soleado',
    responsable: 'Ing. A',
    personal: [
      { personal_id: 1, horas: 8 },
      { personal_id: 2, horas: 4 },
    ],
    equipos: [{ equipo_id: 1, horas: 6 }],
    partidas: [
      { tarea_id: 10, avance_dia: 20 },
      { tarea_id: 11, avance_dia: 10 },
    ],
    fotos: [{ id: 'f1', tamano: 1024 }],
    incidencias: '',
    observaciones: '',
  },
  {
    id: 2,
    servicio_id: 500,
    fecha: '2026-10-02',
    clima: 'Lluvia ligera',
    responsable: 'Ing. A',
    personal: [{ personal_id: 1, horas: 8 }],
    equipos: [],
    partidas: [{ tarea_id: 10, avance_dia: 30 }],
    fotos: [],
    incidencias: 'Paro por lluvia',
    observaciones: '',
  },
  {
    id: 3,
    servicio_id: 501,
    fecha: '2026-10-01',
    clima: 'Nublado',
    responsable: 'Ing. B',
    personal: [],
    equipos: [],
    partidas: [{ tarea_id: 10, avance_dia: 5 }],
    fotos: [],
  },
]

comprobar(
  'parte diario: partesDeServicio filtra por servicio',
  partesDeServicio(partesDemo, 500).length === 2 && partesDeServicio(partesDemo, 999).length === 0,
)
comprobar(
  'parte diario: parteDeFecha encuentra por servicio y fecha',
  parteDeFecha(partesDemo, 500, '2026-10-02')?.id === 2 &&
    parteDeFecha(partesDemo, 500, '2026-10-03') === null,
)
comprobar(
  'parte diario: avanceDiarioPorTarea suma solo las partidas del conjunto dado',
  avanceDiarioPorTarea(partesDeServicio(partesDemo, 500), 10) === 50 &&
    avanceDiarioPorTarea(partesDemo, 10) === 55,
)
comprobar(
  'parte diario: avanceAcumulado acota a 100',
  avanceAcumulado(
    [
      { partidas: [{ tarea_id: 10, avance_dia: 80 }] },
      { partidas: [{ tarea_id: 10, avance_dia: 40 }] },
    ],
    10,
  ) === 100,
)
comprobar(
  'parte diario: horas de personal y equipos',
  horasPersonal(partesDemo[0]) === 12 && horasEquipos(partesDemo[0]) === 6,
)
const resParte = resumenParte(partesDemo[0])
comprobar(
  'parte diario: resumen del parte',
  resParte.personal === 2 &&
    resParte.equipos === 1 &&
    resParte.partidas === 2 &&
    resParte.fotos === 1 &&
    resParte.avanceTotal === 30 &&
    resParte.horasPersonal === 12,
)
const resPer = resumenPeriodo(partesDeServicio(partesDemo, 500), '2026-10-01', '2026-10-02')
comprobar(
  'parte diario: resumen de período por rango de fechas',
  resPer.cantidad === 2 && resPer.horasPersonal === 20 && resPer.partidas === 3,
)
comprobar(
  'parte diario: agrupar por mes',
  Object.keys(agruparPartesPorMes(partesDemo)).join(',') === '2026-10' &&
    agruparPartesPorMes(partesDemo)['2026-10'].length === 3,
)

// El avance real de una tarea se deriva de sus partes (sin duplicar datos).
const tareasRec = [
  { id: 10, servicio_id: 500, avance: 0 },
  { id: 11, servicio_id: 500, avance: 5 },
  { id: 12, servicio_id: 500, avance: 90 },
]
const cambiosRec = recalcularAvanceTareas({
  partes: partesDeServicio(partesDemo, 500),
  tareas: tareasRec,
  servicioId: 500,
})
const cambio10 = cambiosRec.find((c) => c.id === 10)
comprobar(
  'parte diario: recalcular deriva el avance de las tareas con partes y no toca las demás',
  cambio10?.avance === 50 &&
    cambio10?.avance_por_partes === true &&
    cambiosRec.find((c) => c.id === 12) === undefined,
)
const cambioSinPartes = recalcularAvanceTareas({
  partes: [],
  tareas: [{ id: 10, servicio_id: 500, avance: 50, avance_por_partes: true }],
  servicioId: 500,
})
comprobar(
  'parte diario: sin partes, la tarea gobernada por partes vuelve a 0',
  cambioSinPartes.length === 1 && cambioSinPartes[0].avance === 0,
)

// Personal sugerido = asignaciones vigentes ese día (referenciadas por id).
const asignDemo = [
  { id: 1, servicio_id: 500, personal_id: 1, fecha_inicio: '2026-10-01', fecha_fin: '2026-10-05', horas_por_dia: 8, tarea_id: 10 },
  { id: 2, servicio_id: 500, personal_id: 2, fecha_inicio: '2026-10-10', fecha_fin: '2026-10-20', horas_por_dia: 6, tarea_id: 11 },
  { id: 3, servicio_id: 501, personal_id: 3, fecha_inicio: '2026-10-01', fecha_fin: '2026-10-31', horas_por_dia: 8 },
]
const personalDemo = [
  { id: 1, nombre: 'Ana', apellido: 'Pérez', cargo: 'Operario' },
  { id: 2, nombre: 'Luis', apellido: 'Gómez', cargo: 'Oficial' },
]
const sugerido = personalPresenteSugerido({
  asignaciones: asignDemo,
  personal: personalDemo,
  servicio: { id: 500 },
  fecha: '2026-10-02',
})
comprobar(
  'parte diario: personal sugerido = asignaciones vigentes del servicio',
  sugerido.length === 1 &&
    sugerido[0].personal_id === 1 &&
    sugerido[0].nombre === 'Ana Pérez' &&
    sugerido[0].horas === 8 &&
    sugerido[0].tarea_id === 10,
)
comprobar(
  'parte diario: sin asignación vigente no sugiere a nadie',
  personalPresenteSugerido({
    asignaciones: asignDemo,
    personal: personalDemo,
    servicio: { id: 500 },
    fecha: '2026-10-07',
  }).length === 0,
)

// Compresión de fotos: escalado puro para el canvas.
const escGrande = escalarDimensiones(3200, 1600, 1600)
comprobar(
  'parte diario: escalar respeta el lado máximo conservando la proporción',
  escGrande.ancho === 1600 && escGrande.alto === 800,
)
comprobar(
  'parte diario: escalar no agranda imágenes pequeñas ni entra en NaN',
  escalarDimensiones(800, 600, 1600).ancho === 800 &&
    escalarDimensiones(0, 0).ancho === 0,
)

// HTML de impresión (PDF de un día): puro, sin undefined ni NaN.
const htmlPd = htmlParteDiario({
  servicio: { nombre_servicio: 'Obra Demo', cliente: 'Cliente X' },
  parte: partesDemo[0],
  refs: {
    personal: personalDemo,
    equipos: [{ id: 1, nombre: 'Excavadora' }],
    tareas: [
      { id: 10, nombre: 'Excavación', unidad: 'm3', metrado: 500 },
      { id: 11, nombre: 'Relleno', unidad: 'm3', metrado: 200 },
    ],
  },
  partes: partesDemo,
  generado: '15/10/2026',
})
comprobar(
  'parte diario: el HTML para PDF trae obra, fecha y contenido, sin undefined/NaN',
  htmlPd.includes('Obra Demo') &&
    htmlPd.includes('01/10/2026') &&
    htmlPd.includes('Excavación') &&
    htmlPd.includes('Excavadora') &&
    htmlPd.includes('Acumulado') &&
    !htmlPd.includes('undefined') &&
    !htmlPd.includes('NaN'),
)
const htmlPdVacio = htmlParteDiario({
  servicio: {},
  parte: { fecha: '2026-10-01', partidas: [] },
  refs: {},
})
comprobar(
  'parte diario: el HTML admite un parte sin partidas ni referencias',
  htmlPdVacio.includes('Sin partidas ejecutadas.') &&
    !htmlPdVacio.includes('undefined') &&
    !htmlPdVacio.includes('NaN'),
)

// La semilla arranca vacía para no mover la línea base del servicio 6.
comprobar(
  'parte diario: la semilla arranca vacía y no altera el avance del servicio 6',
  Array.isArray(ESTADO_INICIAL.partes_diario) &&
    ESTADO_INICIAL.partes_diario.length === 0 &&
    recalcularAvanceTareas({
      partes: ESTADO_INICIAL.partes_diario,
      tareas: ESTADO_INICIAL.tareas,
      servicioId: 6,
    }).length === 0,
)

// ============================================================
//  7.13 Horas-hombre (HH): planificadas vs reales
// ============================================================

console.log('\n[ horas-hombre ]')

const servHH6 = ESTADO_INICIAL.servicios.find((s) => s.id === 6)
const hh6 = resumenHorasServicio({
  tareas: ESTADO_INICIAL.tareas,
  asignaciones: ESTADO_INICIAL.asignaciones,
  registros: ESTADO_INICIAL.registros_servicio,
  servicio: servHH6,
})
comprobar('HH servicio 6: planificadas = 856', hh6.plan === 856, String(hh6.plan))
comprobar('HH servicio 6: reales = 128', hh6.real === 128, String(hh6.real))
comprobar(
  'HH servicio 6: desviación = -728 h',
  hh6.desviacion.diferencia === -728,
  String(hh6.desviacion.diferencia),
)
comprobar(
  'HH servicio 6: 14.95% de lo planificado',
  hh6.desviacion.porcentaje === 14.95,
  String(hh6.desviacion.porcentaje),
)

// Horas planificadas = días de solape entre la asignación y la ventana de la
// tarea × horas por día; reales = registros de personal.
const tareaHH15 = ESTADO_INICIAL.tareas.find((t) => t.id === 15)
comprobar(
  'HH plan de la tarea 15 = 240',
  horasPlanTarea(tareaHH15, ESTADO_INICIAL.tareas, ESTADO_INICIAL.asignaciones, servHH6) === 240,
)
comprobar(
  'HH reales de la tarea 15 = 40',
  horasRealesTarea(tareaHH15, ESTADO_INICIAL.tareas, ESTADO_INICIAL.registros_servicio, 6) === 40,
)
const padreHH14 = ESTADO_INICIAL.tareas.find((t) => t.id === 14)
comprobar(
  'HH del padre 14 = suma de sus hijas (240)',
  horasPlanTarea(padreHH14, ESTADO_INICIAL.tareas, ESTADO_INICIAL.asignaciones, servHH6) === 240,
)

comprobar(
  'desviacionHoras sin plan: porcentaje null',
  desviacionHoras(0, 10).diferencia === 10 && desviacionHoras(0, 10).porcentaje === null,
)
comprobar(
  'desviacionHoras normal (+20 h, 120%)',
  desviacionHoras(100, 120).diferencia === 20 && desviacionHoras(100, 120).porcentaje === 120,
)
comprobar('productividadHH 50 und / 10 h = 5', productividadHH(50, 10) === 5)
comprobar('productividadHH sin horas = null', productividadHH(50, 0) === null)

// El domingo no genera mano de obra diaria (2026-10-11 es domingo).
const regDomingo = {
  id: 501,
  servicio_id: 99,
  tipo_registro: 'personal',
  fecha: '2026-10-11',
  cantidad_o_horas: 8,
  modalidad: 'diaria',
}
const regLunes = {
  id: 502,
  servicio_id: 99,
  tipo_registro: 'personal',
  fecha: '2026-10-12',
  cantidad_o_horas: 8,
  modalidad: 'diaria',
}
comprobar('HH reales ignoran el domingo', horasRealesMensual([regDomingo, regLunes], 99)[0].horas === 8)

const serieHueco = serieHorasHombre({
  registros: [regLunes, { ...regLunes, id: 503, fecha: '2026-12-12', cantidad_o_horas: 4 }],
})
comprobar(
  'serie HH rellena los meses intermedios con cero',
  serieHueco.length === 3 && serieHueco[1].mes === '2026-11' && serieHueco[1].real === 0,
  JSON.stringify(serieHueco),
)

const serieHHCartera = serieHorasHombre({
  asignaciones: ESTADO_INICIAL.asignaciones,
  servicios: ESTADO_INICIAL.servicios,
  registros: ESTADO_INICIAL.registros_servicio,
})
comprobar('HH cartera: 7 meses', serieHHCartera.length === 7, String(serieHHCartera.length))
comprobar(
  'HH cartera: plan total = 2088 h',
  serieHHCartera.reduce((s, m) => s + m.plan, 0) === 2088,
  String(serieHHCartera.reduce((s, m) => s + m.plan, 0)),
)
comprobar(
  'HH cartera: real total = 608 h',
  serieHHCartera.reduce((s, m) => s + m.real, 0) === 608,
  String(serieHHCartera.reduce((s, m) => s + m.real, 0)),
)

// ============================================================
//  7.14 CPM: red de dependencias, holguras y ruta crítica
// ============================================================

console.log('\n[ cpm ]')

const cpm6 = programar({ tareas: ESTADO_INICIAL.tareas, servicio: servHH6 })
comprobar('CPM servicio 6: red válida (sin ciclos)', cpm6.valido === true)
comprobar('CPM servicio 6: inicio = 2026-06-01', cpm6.inicio === '2026-06-01', cpm6.inicio)
comprobar('CPM servicio 6: fin = 2026-12-11', cpm6.fin === '2026-12-11', cpm6.fin)
comprobar(
  'CPM servicio 6: ruta crítica 13→15→16→18→19→21',
  JSON.stringify(cpm6.rutaCritica) === JSON.stringify([13, 15, 16, 18, 19, 21]),
  JSON.stringify(cpm6.rutaCritica),
)
comprobar(
  'CPM: duración de la tarea 13 = 13 días laborables',
  cpm6.porTarea[13].duracion === 13,
  String(cpm6.porTarea[13].duracion),
)
comprobar(
  'CPM: la tarea 20 tiene 5 días de holgura',
  cpm6.porTarea[20].holgura === 5,
  String(cpm6.porTarea[20].holgura),
)
comprobar(
  'CPM: la tarea 19 es crítica y sin holgura',
  cpm6.porTarea[19].critica === true && cpm6.porTarea[19].holgura === 0,
)
comprobar(
  'CPM: el padre 14 resume el tramo de sus hijas',
  cpm6.porTarea[14].resumen === true &&
    cpm6.porTarea[14].inicio === '2026-06-16' &&
    cpm6.porTarea[14].fin === '2026-08-15',
  JSON.stringify(cpm6.porTarea[14]),
)

const servCPM7 = ESTADO_INICIAL.servicios.find((s) => s.id === 7)
const cpm7 = programar({ tareas: ESTADO_INICIAL.tareas, servicio: servCPM7 })
comprobar(
  'CPM servicio 7: cadena crítica 22→23→24→25',
  JSON.stringify(cpm7.rutaCritica) === JSON.stringify([22, 23, 24, 25]),
  JSON.stringify(cpm7.rutaCritica),
)
comprobar('CPM servicio 7: fin = 2026-10-24', cpm7.fin === '2026-10-24', cpm7.fin)

// FS con holgura (lag) y una tarea sin predecesoras anclada a su fecha manual.
const cpmP = { id: 1, servicio_id: 5, nombre: 'P', fecha_inicio: '2026-01-05', fecha_fin: '2026-01-09' }
const cpmS = {
  id: 2,
  servicio_id: 5,
  nombre: 'S',
  fecha_inicio: '2026-01-20',
  fecha_fin: '2026-01-23',
  predecesoras: [{ id: 1, tipo: 'FS', lag: 2 }],
}
const cpmHito = {
  id: 3,
  servicio_id: 5,
  nombre: 'H',
  fecha_inicio: '2026-01-30',
  fecha_fin: '2026-01-30',
  hito: true,
  predecesoras: [{ id: 2, tipo: 'FS', lag: 0 }],
}
const cpmFS = programar({ tareas: [cpmP, cpmS, cpmHito], servicio: { id: 5 } })
comprobar('CPM: sin predecesoras se ancla a su fecha manual', cpmFS.porTarea[1].es === '2026-01-05')
comprobar(
  'CPM: FS con holgura arranca el 2026-01-13',
  cpmFS.porTarea[2].es === '2026-01-13',
  cpmFS.porTarea[2].es,
)
comprobar(
  'CPM: el hito no tiene duración',
  cpmFS.porTarea[3].duracion === 0 && cpmFS.porTarea[3].hito === true,
)

// Detección de ciclos: dos tareas que se preceden mutuamente.
const cpmA = {
  id: 1,
  servicio_id: 1,
  nombre: 'A',
  fecha_inicio: '2026-01-01',
  fecha_fin: '2026-01-05',
  predecesoras: [{ id: 2, tipo: 'FS', lag: 0 }],
}
const cpmB = {
  id: 2,
  servicio_id: 1,
  nombre: 'B',
  fecha_inicio: '2026-01-06',
  fecha_fin: '2026-01-10',
  predecesoras: [{ id: 1, tipo: 'FS', lag: 0 }],
}
const cpmCiclo = programar({ tareas: [cpmA, cpmB], servicio: { id: 1 } })
comprobar(
  'CPM: detecta ciclos de dependencias',
  cpmCiclo.valido === false && cpmCiclo.ciclos.length === 2,
  JSON.stringify(cpmCiclo.ciclos),
)

// ============================================================
//  7.15 Cartera: valor ganado y control agregados
// ============================================================

console.log('\n[ cartera ]')

// El corte va fijo (CURVA_HOY): el PV se prorratea día a día, así que sin
// inyectar la fecha la prueba dependería del reloj de la máquina y dejaría de
// ser determinista (el resto de valores esperados se calculan para ese corte).
const evmCart = evmCartera({
  servicios: ESTADO_INICIAL.servicios,
  tareas: ESTADO_INICIAL.tareas,
  registros: ESTADO_INICIAL.registros_servicio.filter(cuentaComoManoDeObra),
  lineasBase: ESTADO_INICIAL.lineas_base ?? [],
  lecturas: ESTADO_INICIAL.lecturas_avance ?? [],
  hoy: CURVA_HOY,
})
comprobar('cartera EVM: presupuesto = 610000', evmCart.presupuesto === 610000, String(evmCart.presupuesto))
comprobar('cartera EVM: AC = 304345', evmCart.ac === 304345, String(evmCart.ac))
comprobar('cartera EVM: EV = 328250', evmCart.ev === 328250, String(evmCart.ev))
comprobar('cartera EVM: PV = 356179.44', evmCart.pv === 356179.44, String(evmCart.pv))
comprobar('cartera EVM: SPI = 0.92', evmCart.spi === 0.92, String(evmCart.spi))
comprobar('cartera EVM: CPI = 1.08', evmCart.cpi === 1.08, String(evmCart.cpi))
comprobar('cartera EVM: avance valorizado = 53.81%', evmCart.avance === 53.81, String(evmCart.avance))
comprobar(
  'cartera EVM: 12 periodos y corte de hoy en el 8.º',
  evmCart.serie.length === 12 && evmCart.indiceHoy === 7,
  `${evmCart.serie.length}/${evmCart.indiceHoy}`,
)

const ctrlCart = controlCPMCartera({
  servicios: ESTADO_INICIAL.servicios,
  tareas: ESTADO_INICIAL.tareas,
  hoy: '2026-10-15',
})
comprobar(
  'control cartera: 13 actividades críticas',
  ctrlCart.totalCriticas === 13,
  String(ctrlCart.totalCriticas),
)
comprobar(
  'control cartera: look-ahead de 3 semanas hasta 2026-11-05',
  ctrlCart.limite === '2026-11-05',
  ctrlCart.limite,
)
comprobar(
  'control cartera: 2 actividades por iniciar',
  ctrlCart.totalProximas === 2,
  String(ctrlCart.totalProximas),
)

// ============================================================
//  7.16 Metrado: partidas con unidad de medida
// ============================================================

console.log('\n[ metrado ]')

// Catálogo fijo (no CRUD): debe incluir las unidades clásicas de metrado.
const siglasUnidades = UNIDADES.map((u) => u.sigla).join(',')
comprobar(
  'unidades: incluye und, pto y Glb',
  siglasUnidades.includes('und') && siglasUnidades.includes('pto') && siglasUnidades.includes('Glb'),
  siglasUnidades,
)
comprobar('unidades: 23 unidades de medida', UNIDADES.length === 23, String(UNIDADES.length))

// La unidad acompaña al metrado; sin unidad el metrado no dice nada.
const partidaM3 = {
  id: 1,
  servicio_id: 6,
  nombre: 'Cimentación',
  monto: 0,
  unidad: 'm³',
  metrado: 120,
  precio_unitario: 180,
  avance: 100,
}
comprobar('metrado: monto = metrado × precio unitario', 120 * 180 === 21600)
comprobar('basePrecio: con metrado mide por metrado', basePrecio(partidaM3).mide === 'metrado')
comprobar(
  'basePrecio: base y precio salen del metrado',
  basePrecio(partidaM3).base === 120 && basePrecio(partidaM3).precio === 180,
)
comprobar(
  'basePrecio: sin metrado mide por monto',
  basePrecio({ id: 2, servicio_id: 6, nombre: 'Global', monto: 5000 }).mide === 'monto',
)

// La valorización trae la unidad de la partida en cada ítem.
const vz6 = calcularValorizacion({
  servicio: { id: 6 },
  tareas: ESTADO_INICIAL.tareas,
  valorizaciones: [],
  adelantos: [],
})
const item15 = vz6.items.find((i) => i.tarea_id === 15)
const item13 = vz6.items.find((i) => i.tarea_id === 13)
comprobar('valorización: ítem 15 con unidad m³', item15?.unidad === 'm³', String(item15?.unidad))
comprobar(
  'valorización: ítem 15 mide por metrado (600 m³ × 70)',
  item15?.mide === 'metrado' && item15?.metrado_base === 600 && item15?.precio_unitario === 70,
  JSON.stringify(item15),
)
comprobar(
  'valorización: ítem 15 periodo e importe',
  item15?.metrado_periodo === 600 && item15?.importe === 42000,
  JSON.stringify({ p: item15?.metrado_periodo, i: item15?.importe }),
)
comprobar(
  'valorización: ítem 13 (Glb) mide por monto',
  item13?.mide === 'monto' && item13?.metrado_base === 15000,
  JSON.stringify(item13),
)

// ============================================================
//  7.17 Red PERT / CPM: diagrama de red
// ============================================================

console.log('\n[ red pert ]')

const servicioRedPERT = ESTADO_INICIAL.servicios.find((s) => s.id === 6)
const calendarioRedPERT = calendarioDe(servicioRedPERT)
const cpmRedPERT = programar({
  tareas: ESTADO_INICIAL.tareas,
  servicio: servicioRedPERT,
  calendario: calendarioRedPERT,
})
const htmlRedPERT = renderToString(
  <RedPERT
    servicio={servicioRedPERT}
    tareas={ESTADO_INICIAL.tareas}
    cpm={cpmRedPERT}
    calendario={calendarioRedPERT}
  />,
)

comprobar(
  'red pert: resumen con ruta crítica y duración total',
  htmlRedPERT.includes('Ruta crítica') &&
    htmlRedPERT.includes('Obras preliminares y trazo') &&
    htmlRedPERT.includes('días laborables') &&
    htmlRedPERT.includes('Actividades críticas'),
)
comprobar(
  'red pert: nodos con tiempos y holgura (tarea 20 con holg. 5 d)',
  htmlRedPERT.includes('Holg. 5 d') && htmlRedPERT.includes('Crítica'),
)
comprobar(
  'red pert: flechas etiquetadas y marcadores de dependencia crítica',
  htmlRedPERT.includes('pert-flecha') && htmlRedPERT.includes('pert-flecha-critica'),
)
comprobar(
  'red pert: sin valores rotos en el SVG',
  !htmlRedPERT.includes('NaN') && !htmlRedPERT.includes('undefined'),
)

// ============================================================
//  7.18 Reportes y exportación (Fase 3): .xlsx sin librerías y PDF vía
//       el diálogo de impresión del navegador.
// ============================================================

console.log('\n[ reportes y exportación ]')

const serv6 = ESTADO_INICIAL.servicios.find((s) => s.id === 6)

// --- escritor .xlsx (ZIP store + OOXML mínimo) ---------------------------
comprobar(
  'xlsx: CRC-32 de control (123456789 = CBF43926)',
  crc32('123456789') === 0xcbf43926,
  crc32('123456789').toString(16),
)

const zipPrueba = zipStore([{ nombre: 'a.txt', contenido: 'hola' }])
const finZip = zipPrueba.length
comprobar(
  'xlsx: el ZIP abre con cabecera local PK\\x03\\x04',
  zipPrueba[0] === 0x50 && zipPrueba[1] === 0x4b && zipPrueba[2] === 0x03 && zipPrueba[3] === 0x04,
)
comprobar(
  'xlsx: el ZIP cierra con el directorio central PK\\x05\\x06',
  zipPrueba[finZip - 22] === 0x50 &&
    zipPrueba[finZip - 21] === 0x4b &&
    zipPrueba[finZip - 20] === 0x05 &&
    zipPrueba[finZip - 19] === 0x06,
)
comprobar(
  'xlsx: numeración de columnas (1=A, 26=Z, 27=AA, 28=AB)',
  columnaLetra(1) === 'A' &&
    columnaLetra(26) === 'Z' &&
    columnaLetra(27) === 'AA' &&
    columnaLetra(28) === 'AB',
)
comprobar(
  'xlsx: escapa los caracteres prohibidos del XML',
  hojaXML([['a & b < c > d " e \' f']]).includes('a &amp; b &lt; c &gt; d &quot; e &apos; f'),
)
comprobar(
  'xlsx: estilos (cabecera negrita, moneda y porcentaje como número)',
  hojaXML([[{ v: 'Total', negrita: true }]]).includes('s="1"') &&
    hojaXML([[{ v: 1234.5, tipo: 'moneda' }]]).includes('s="2"') &&
    hojaXML([[{ v: 1234.5, tipo: 'moneda' }]]).includes('<v>1234.5</v>') &&
    hojaXML([[{ v: 0.29, tipo: 'porcentaje' }]]).includes('s="4"'),
)

// Como el ZIP va sin comprimir, el XML viaja legible dentro de los bytes.
const textoDe = (bytes) => new TextDecoder('utf-8').decode(bytes)

// --- exportación: cronograma ---------------------------------------------
const libroCron = libroCronograma({
  servicio: serv6,
  tareas: ESTADO_INICIAL.tareas,
  generado: '2026-10-16',
})
const textoCron = textoDe(libroXLSX({ hojas: libroCron.hojas }))
comprobar(
  'xlsx cronograma: cabecera con empresa, obra, cliente y fecha de emisión',
  textoCron.includes('PROMCOSER') &&
    textoCron.includes(serv6.nombre_servicio) &&
    textoCron.includes(serv6.cliente) &&
    textoCron.includes('16/10/2026'),
  serv6.nombre_servicio,
)
comprobar(
  'xlsx cronograma: trae las tareas y el monto del servicio (335000)',
  textoCron.includes('Obras preliminares y trazo') &&
    textoCron.includes('<v>335000</v>') &&
    textoCron.includes('Predecesoras'),
)
comprobar(
  'xlsx: incluye las partes del paquete OOXML y la hoja nombrada',
  textoCron.includes('xl/workbook.xml') &&
    textoCron.includes('xl/styles.xml') &&
    textoCron.includes('[Content_Types].xml') &&
    textoCron.includes('sheet name="Cronograma"'),
)
comprobar(
  'xlsx: el nombre de hoja no repite y el archivo lleva el id del servicio',
  libroCron.nombre.endsWith('-6') &&
    libroXLSX({ hojas: [{ nombre: 'Muy largo '.repeat(5), filas: [] }] }).length > 0,
)

// --- exportación: costos por partida -------------------------------------
const libroCostos = libroCostosPorPartida({
  servicio: serv6,
  tareas: ESTADO_INICIAL.tareas,
  registros: ESTADO_INICIAL.registros_servicio,
  generado: '2026-10-16',
})
const textoCostos = textoDe(libroXLSX({ hojas: libroCostos.hojas }))
comprobar(
  'xlsx costos por partida: monto, valorizado, costo y margen',
  textoCostos.includes('Monto (S/)') &&
    textoCostos.includes('Valorizado (S/)') &&
    textoCostos.includes('Costo (S/)') &&
    textoCostos.includes('Margen (S/)') &&
    textoCostos.includes('<v>335000</v>'),
)

// --- exportación: valorizaciones (dos hojas) -----------------------------
const libroVal = libroValorizaciones({
  servicio: servV1,
  valorizaciones: [val1],
  generado: '2026-10-16',
})
const textoVal = textoDe(libroXLSX({ hojas: libroVal.hojas }))
comprobar(
  'xlsx valorizaciones: hojas de resumen y detalle',
  libroVal.hojas.length === 2 &&
    libroVal.hojas[0].nombre === 'Valorizaciones' &&
    libroVal.hojas[1].nombre === 'Detalle' &&
    textoVal.includes('sheet name="Valorizaciones"') &&
    textoVal.includes('sheet name="Detalle"'),
)
comprobar(
  'xlsx valorizaciones: bruto y neto del periodo (80000 / 83072)',
  textoVal.includes('<v>80000</v>') && textoVal.includes('<v>83072</v>'),
)

// --- exportación: flujo de caja ------------------------------------------
const flujoDemo = [
  { mes: '2026-01', cobrado: 1000, egresoObra: 400, oficina: 100, margenReal: 500 },
  { mes: '2026-02', cobrado: 2000, egresoObra: 500, oficina: 200, margenReal: 1300 },
]
const textoCaja = textoDe(
  libroXLSX({ hojas: libroFlujoCaja({ flujo: flujoDemo, generado: '2026-10-16' }).hojas }),
)
comprobar(
  'xlsx flujo de caja: meses y totales (cobrado 3000, margen 1800)',
  textoCaja.includes('ene 2026') &&
    textoCaja.includes('feb 2026') &&
    textoCaja.includes('<v>3000</v>') &&
    textoCaja.includes('<v>1800</v>'),
)

// --- reportes HTML (PDF vía impresión) -----------------------------------
const htmlVal = htmlValorizacion({
  servicio: { ...servV1, nombre_servicio: 'Obra Valorizada', cliente: 'Cliente V' },
  valorizacion: val1,
  generado: '16/10/2026',
})
comprobar(
  'reporte: la valorización (PDF) trae obra, neto, IGV y detracción',
  htmlVal.includes('Obra Valorizada') &&
    htmlVal.includes('Cliente V') &&
    htmlVal.includes('Neto a pagar') &&
    htmlVal.includes('IGV') &&
    htmlVal.includes('Detracción') &&
    !htmlVal.includes('undefined') &&
    !htmlVal.includes('NaN'),
)

const htmlMes = htmlReporteMensualObra({
  servicio: serv6,
  mes: '2026-05',
  tareas: ESTADO_INICIAL.tareas,
  registros: ESTADO_INICIAL.registros_servicio,
  cobros: ESTADO_INICIAL.cobros,
  valorizaciones: ESTADO_INICIAL.valorizaciones,
  modificaciones: ESTADO_INICIAL.modificaciones,
  personal: ESTADO_INICIAL.personal,
  materiales: ESTADO_INICIAL.materiales,
  equipos: ESTADO_INICIAL.equipos,
  generado: '16/10/2026',
})
comprobar(
  'reporte: el reporte mensual trae obra, periodo y secciones',
  htmlMes.includes(serv6.nombre_servicio) &&
    htmlMes.includes('may 2026') &&
    htmlMes.includes('Avance del cronograma') &&
    htmlMes.includes('Costos del mes por tipo') &&
    htmlMes.includes('Valorizaciones del mes') &&
    htmlMes.includes('Movimientos del mes') &&
    !htmlMes.includes('undefined') &&
    !htmlMes.includes('NaN'),
  serv6.nombre_servicio,
)

// En SSR/pruebas (sin DOM) la impresión y las descargas no revientan.
comprobar('reporte: imprimirHTML no hace nada sin DOM (SSR)', imprimirHTML(htmlMes) === false)
comprobar(
  'exportación: las descargas no hacen nada sin DOM (SSR)',
  descargarBlob(null, 'x') === false &&
    descargarXLSX(libroXLSX({ hojas: libroCron.hojas }), 'x') === false &&
    descargarLibro(libroCron) === false,
)

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
  { ruta: '/servicios/6/curva-s', etiqueta: 'Panel curva S', monto: true },
  { ruta: '/servicios/6/linea-base', etiqueta: 'Panel línea base', monto: true },
  { ruta: '/servicios/6/partidas', etiqueta: 'Panel partidas', monto: true },
  { ruta: '/servicios/6/valorizaciones', etiqueta: 'Panel valorizaciones', monto: true },
  { ruta: '/servicios/6/modificaciones', etiqueta: 'Panel modificaciones', monto: true },
  { ruta: '/servicios/6/parte-diario', etiqueta: 'Panel parte diario', monto: false },
  { ruta: '/servicios/6/opciones', etiqueta: 'Panel opciones', monto: false },
  { ruta: '/servicios/999', etiqueta: 'Detalle id inexistente', monto: false },
  { ruta: '/personal', etiqueta: 'Personal', monto: true },
  { ruta: '/cargos', etiqueta: 'Cargos', monto: false },
  { ruta: '/equipos', etiqueta: 'Equipos', monto: false },
  { ruta: '/oficina', etiqueta: 'Oficina', monto: true },
  { ruta: '/unidades', etiqueta: 'Unidades de medida', monto: false },
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

// Sin barra superior: el módulo lo indica el sidebar y el control de menú
// vive dentro del propio sidebar (riel de 64px en móvil, cajón al abrirlo).
const htmlInicioSeguro = htmlsRuta['/'] ?? ''
const htmlPersonalSeguro = htmlsRuta['/personal'] ?? ''
const htmlPanelSeguro = htmlsRuta['/servicios/6'] ?? ''
const htmlServiciosSeguro = htmlsRuta['/servicios'] ?? ''
comprobar(
  'layout: no queda header superior',
  !htmlInicioSeguro.includes('Control Maestro de Servicios') &&
    !htmlInicioSeguro.includes('Sistema de control interno') &&
    !htmlPersonalSeguro.includes('Control Maestro de Servicios') &&
    !htmlPanelSeguro.includes('PROMCOSER · Panel del servicio'),
)
comprobar(
  'layout: el control de menú está dentro del sidebar',
  htmlPersonalSeguro.includes('aria-label="Alternar menú lateral"') &&
    htmlPersonalSeguro.includes('w-16') &&
    htmlPersonalSeguro.includes('pl-16'),
)
comprobar(
  'layout: el panel del servicio conserva la marca en su sidebar',
  htmlPanelSeguro.includes('aria-label="Alternar menú lateral"') &&
    htmlPanelSeguro.includes('Volver'),
)

// Configuración: botón siempre presente al pie del sidebar (panel general y
// de servicio); abre un modal para elegir el tema claro u oscuro.
comprobar(
  'configuración: botón al pie del sidebar en ambos paneles',
  htmlInicioSeguro.includes('aria-label="Abrir configuración"') &&
    htmlPersonalSeguro.includes('Configuración') &&
    htmlPanelSeguro.includes('aria-label="Abrir configuración"'),
)

// La vista previa del tema debe ser independiente del tema activo: usa
// hexadecimales explícitos y NO las utilidades bg-white / bg-slate-200, que el
// tema oscuro redefine a tonos oscuros bajo :root[data-tema='oscuro'] (por eso
// la vista previa del tema claro se veía oscura estando en oscuro).
const fuenteConfiguracion = readFileSync('src/components/layout/ConfiguracionModal.jsx', 'utf8')
comprobar(
  'configuración: la vista previa del tema claro usa colores fijos (hex)',
  fuenteConfiguracion.includes('bg-[#ffffff]') &&
    fuenteConfiguracion.includes('bg-[#e2e8f0]') &&
    !fuenteConfiguracion.includes('bg-white') &&
    !fuenteConfiguracion.includes('bg-slate-200'),
)

// El listado de Servicios se muestra como cuadrícula de tarjetas (cada una
// abre el servicio), no como tabla.
comprobar(
  'servicios: listado en tarjetas (sin tabla, con consumo y enlace a cada servicio)',
  htmlServiciosSeguro.includes('Abrir servicio') &&
    htmlServiciosSeguro.includes('Consumo') &&
    htmlServiciosSeguro.includes('/servicios/6') &&
    !htmlServiciosSeguro.includes('<table'),
)

// Fase 3: botones de exportación a Excel en las pantallas con datos tabulares
// y el botón del reporte mensual en el resumen del servicio.
const htmlCronogramaSSR = htmlsRuta['/servicios/6/cronograma'] ?? ''
const htmlValorizacionesSSR = htmlsRuta['/servicios/6/valorizaciones'] ?? ''
const htmlPartidasSSR = htmlsRuta['/servicios/6/partidas'] ?? ''
comprobar(
  'exportación: botón Excel en cronograma, valorizaciones, partidas y dashboard',
  htmlCronogramaSSR.includes('Exportar Excel') &&
    htmlValorizacionesSSR.includes('Exportar Excel') &&
    htmlPartidasSSR.includes('Exportar Excel') &&
    htmlInicioSeguro.includes('Exportar Excel'),
)
comprobar(
  'reporte: botón «Reporte mensual (PDF)» en el resumen del servicio',
  htmlPanelSeguro.includes('Reporte mensual (PDF)'),
)

// Módulo Curva S: en el sidebar del servicio y con las tres variables del
// valor ganado (PV, AC, EV) más el gráfico acumulado.
const htmlCurvaS = htmlsRuta['/servicios/6/curva-s'] ?? ''
comprobar(
  'curva S: el módulo aparece en el sidebar del servicio',
  htmlPanelSeguro.includes('href="/servicios/6/curva-s"') && htmlPanelSeguro.includes('Curva S'),
)
comprobar(
  'curva S: muestra PV, AC, EV y el gráfico de la curva',
  htmlCurvaS.includes('Costo planificado') &&
    htmlCurvaS.includes('Costo real') &&
    htmlCurvaS.includes('Valor ganado') &&
    htmlCurvaS.includes('aria-label="Curva S') &&
    htmlCurvaS.includes('SPI') &&
    htmlCurvaS.includes('CPI'),
)
comprobar(
  'curva S: trae el selector de granularidad (mensual, semanal, diario)',
  htmlCurvaS.includes('aria-label="Granularidad de la curva"') &&
    htmlCurvaS.includes('Mensual') &&
    htmlCurvaS.includes('Semanal') &&
    htmlCurvaS.includes('4 días') &&
    htmlCurvaS.includes('2 días') &&
    htmlCurvaS.includes('Diario'),
)

// Módulo Línea base: línea base vigente del servicio 6 (sembrada), su
// comparación contra el cronograma vivo y las lecturas de avance.
const htmlLineaBase = htmlsRuta['/servicios/6/linea-base'] ?? ''
comprobar(
  'línea base: aparece en el sidebar del servicio',
  htmlPanelSeguro.includes('href="/servicios/6/linea-base"') &&
    htmlPanelSeguro.includes('Línea base'),
)
comprobar(
  'línea base: muestra la versión vigente, la comparación y las lecturas',
  htmlLineaBase.includes('Línea base') &&
    htmlLineaBase.includes('Versión vigente') &&
    htmlLineaBase.includes('v1') &&
    htmlLineaBase.includes('Comparación cronograma vs. línea base') &&
    htmlLineaBase.includes('Lecturas de avance'),
)
comprobar(
  'línea base: las listas traen buscador',
  htmlLineaBase.includes('Buscar versión…') && htmlLineaBase.includes('Buscar partida…'),
)

// Módulo Valorizaciones: resumen del cobro, amortización de adelantos,
// condiciones del contrato (IGV, detracción, fondo de garantía).
const htmlValorizaciones = htmlsRuta['/servicios/6/valorizaciones'] ?? ''
comprobar(
  'valorizaciones: aparece en el sidebar del servicio',
  htmlPanelSeguro.includes('href="/servicios/6/valorizaciones"') &&
    htmlPanelSeguro.includes('Valorizaciones'),
)
comprobar(
  'valorizaciones: resumen, adelantos y condiciones del contrato',
  htmlValorizaciones.includes('Valorizaciones') &&
    htmlValorizaciones.includes('Bruto acumulado') &&
    htmlValorizaciones.includes('Neto acumulado') &&
    htmlValorizaciones.includes('Adelantos y amortización') &&
    htmlValorizaciones.includes('Condiciones del contrato') &&
    htmlValorizaciones.includes('IGV') &&
    htmlValorizaciones.includes('Detracción') &&
    htmlValorizaciones.includes('Fondo de garantía'),
)

// Módulo Parte diario: jornada (clima, personal, equipos, partidas) con
// calendario y vista de lista.
const htmlPanelParteDiario = htmlsRuta['/servicios/6/parte-diario'] ?? ''
comprobar(
  'parte diario: aparece en el sidebar del servicio',
  htmlPanelSeguro.includes('href="/servicios/6/parte-diario"') &&
    htmlPanelSeguro.includes('Parte diario'),
)
comprobar(
  'parte diario: resumen, vista de lista y alta con modal',
  htmlPanelParteDiario.includes('Parte diario de obra') &&
    htmlPanelParteDiario.includes('Nuevo parte') &&
    htmlPanelParteDiario.includes('Sin partes registrados') &&
    htmlPanelParteDiario.includes('Ver calendario'),
)

// Módulo Unidades: catálogo estático + mockup ilustrativo de Materiales con UM.
// Es solo visual (demo): no usa DataContext ni escribe en localStorage.
const htmlUnidades = htmlsRuta['/unidades'] ?? ''
comprobar(
  'unidades: catálogo de unidades de medida (siglas m², m³, ml, gl)',
  htmlUnidades.includes('Unidades de medida') &&
    htmlUnidades.includes('Metro cuadrado') &&
    htmlUnidades.includes('Metro cúbico') &&
    htmlUnidades.includes('Metro lineal') &&
    htmlUnidades.includes('Galón') &&
    htmlUnidades.includes('Hora-hombre'),
)
comprobar(
  'unidades: mockup de Materiales con UM marcado como demo visual',
  htmlUnidades.includes('demo visual') &&
    htmlUnidades.includes('Mockup: Materiales con UM') &&
    htmlUnidades.includes('No guarda cambios') &&
    htmlUnidades.includes('Agregar material'),
)

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

// Cronograma: motor CPM a la vista (reprogramar, calendario, ruta crítica) y
// columnas de horas-hombre en Partidas.
const htmlCronograma = htmlsRuta['/servicios/6/cronograma'] ?? ''
comprobar(
  'cronograma: reprogramar (CPM), calendario y leyenda de ruta crítica',
  htmlCronograma.includes('Reprogramar (CPM)') &&
    htmlCronograma.includes('Calendario') &&
    htmlCronograma.includes('Ruta crítica') &&
    htmlCronograma.includes('Hito'),
)
const htmlPartidas = htmlsRuta['/servicios/6/partidas'] ?? ''
comprobar(
  'partidas: columnas de horas-hombre (HH est., HH real, HH/und)',
  htmlPartidas.includes('HH est.') && htmlPartidas.includes('HH real') && htmlPartidas.includes('HH/und'),
)

// Metrado de la partida: columnas UM y Metrado ej., y unidades sembradas.
comprobar(
  'partidas: columnas UM y Metrado ej. con unidades sembradas',
  htmlPartidas.includes('>UM<') &&
    htmlPartidas.includes('Metrado ej.') &&
    htmlPartidas.includes('m³') &&
    htmlPartidas.includes('>Glb<'),
)
comprobar(
  'cronograma: muestra el metrado de la partida',
  htmlCronograma.includes('Metrado de la partida (m³)') &&
    htmlCronograma.includes('>600<!-- --> <!-- -->m³<!-- --> · <!-- -->100<!-- -->%'),
)

// Asignar personal con botón + modal (como "Registrar ingreso"): el panel
// muestra el botón y ya no un formulario fijo incrustado.
const htmlPersonalPanel = htmlsRuta['/servicios/6/personal'] ?? ''
comprobar(
  'personal: botón "Asignar personal" (modal, no formulario fijo)',
  htmlPersonalPanel.includes('Asignar personal') &&
    !htmlPersonalPanel.includes('asi-persona'),
)

// Materiales: el gasto se registra con botón + modal (como Personal) y cada
// línea se mide con su unidad (UM) y su metrado, igual que las partidas.
const htmlMateriales = htmlsRuta['/servicios/6/materiales'] ?? ''
comprobar(
  'materiales: botón "Agregar material" (modal, no formulario fijo)',
  htmlMateriales.includes('Agregar material') && !htmlMateriales.includes('mat-nombre'),
)
comprobar(
  'materiales: tabla con columnas UM y Metrado y las unidades sembradas',
  htmlMateriales.includes('>UM<') &&
    htmlMateriales.includes('Metrado') &&
    htmlMateriales.includes('bls') &&
    htmlMateriales.includes('m³'),
)

// Equipos: igual que Materiales, el uso se registra con botón + modal y cada
// línea se mide con su unidad (UM) y su metrado.
const htmlEquipos = htmlsRuta['/servicios/6/equipos'] ?? ''
comprobar(
  'equipos: botón "Agregar uso de equipo" (modal, no formulario fijo)',
  htmlEquipos.includes('Agregar uso de equipo') && !htmlEquipos.includes('eq-busqueda'),
)
comprobar(
  'equipos: tabla con columnas UM y Metrado y la unidad hm sembrada',
  htmlEquipos.includes('>UM<') &&
    htmlEquipos.includes('Metrado') &&
    htmlEquipos.includes('hm'),
)

// Catálogo de cargos: buscador, columnas propias y acciones del CRUD.
const htmlCargos = htmlsRuta['/cargos'] ?? ''
comprobar(
  'cargos: catálogo con buscador, columnas y alta',
  htmlCargos.includes('Buscar por cargo, unidad o categoría…') &&
    htmlCargos.includes('Personas') &&
    htmlCargos.includes('Oficial') &&
    htmlCargos.includes('HH') &&
    htmlCargos.includes('Nuevo registro'),
)
comprobar(
  'cargos: aparece en el sidebar con su enlace',
  htmlCargos.includes('href="/cargos"') && htmlCargos.includes('Cargos'),
)
// El borrado vive dentro del modal de edición, no en la fila.
comprobar('cargos: eliminar vive en el modal de edición, no en la fila', !htmlCargos.includes('Eliminar'))
// Activar/Desactivar es un ícono con tooltip, no un botón de texto.
comprobar(
  'cargos: activar/desactivar es un ícono',
  htmlCargos.includes('title="Desactivar"') && !htmlCargos.includes('Desactivar</button>'),
)

// Catálogo de personal: buscador, columna de Estado y acciones con íconos.
const htmlPersonal = htmlsRuta['/personal'] ?? ''
comprobar(
  'personal: catálogo con buscador, Estado y alta',
  htmlPersonal.includes('Buscar por nombre, apellido, cargo, DNI, ámbito o estado…') &&
    htmlPersonal.includes('Estado') &&
    htmlPersonal.includes('Activo') &&
    htmlPersonal.includes('Nuevo registro'),
)
comprobar(
  'personal: editar y activar/desactivar son íconos',
  htmlPersonal.includes('title="Editar"') &&
    htmlPersonal.includes('title="Desactivar"') &&
    !htmlPersonal.includes('Desactivar</button>'),
)
comprobar(
  'personal: el contador distingue activos',
  htmlPersonal.includes('personas') && htmlPersonal.includes('activos'),
)
comprobar(
  'personal: el Eliminar vive en el modal, no en la fila',
  !htmlPersonal.includes('Eliminar'),
)
comprobar(
  'personal: la columna de acciones reserva su ancho (tabla fija)',
  htmlPersonal.includes('w-28'),
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

// Control de proyecto (P6): valor ganado de cartera, curva S consolidada,
// histograma de horas-hombre, look-ahead y ruta crítica.
comprobar(
  'dashboard: sección "Control de proyecto (P6)" con HH y ruta crítica',
  htmlDash.includes('Control de proyecto (P6)') &&
    htmlDash.includes('Curva S consolidada de la cartera') &&
    htmlDash.includes('Histograma de horas-hombre') &&
    htmlDash.includes('Look-ahead') &&
    htmlDash.includes('Ruta crítica'),
)

// ============================================================

console.log(`\n${fallos === 0 ? 'TODO OK' : `${fallos} FALLO(S)`} — ${pruebas} pruebas`)
process.exit(fallos === 0 ? 0 : 1)