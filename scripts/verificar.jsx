import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { DataProvider, dataReducer, siguienteId } from '../src/context/DataContext'
import { ESTADO_INICIAL } from '../src/data/mockData'
import { consumoPresupuesto, desglosePorTipo, sumarMontos, registrosDeServicio, metricasCronograma, rentabilidadServicio, gastoPorMes, indiceAvance } from '../src/utils/calculadora'
import { redondearMonto, formatearMoneda } from '../src/utils/formatters'
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

const conMaterial = dataReducer(ESTADO_INICIAL, {
  type: 'AGREGAR_ITEM',
  payload: { coleccion: 'materiales', item: { id: 99, nombre: 'Prueba', unidad_medida: 'kg', costo_unitario: 10, activo: true } },
})
comprobar('AGREGAR_ITEM agrega al final', conMaterial.materiales.length === ESTADO_INICIAL.materiales.length + 1)
comprobar('las demás colecciones no se tocan', conMaterial.servicios === ESTADO_INICIAL.servicios)

const editado = dataReducer(conMaterial, {
  type: 'ACTUALIZAR_ITEM',
  payload: { coleccion: 'materiales', item: { id: 99, nombre: 'Prueba editada' } },
})
comprobar('ACTUALIZAR_ITEM hace merge parcial', editado.materiales.at(-1).nombre === 'Prueba editada')
comprobar('ACTUALIZAR_ITEM conserva el resto', editado.materiales.at(-1).costo_unitario === 10)

const alternado = dataReducer(ESTADO_INICIAL, {
  type: 'ALTERNAR_ACTIVO',
  payload: { coleccion: 'materiales', id: 1 },
})
comprobar('ALTERNAR_ACTIVO invierte activo', alternado.materiales.find((p) => p.id === 1).activo === false)
comprobar('ALTERNAR_ACTIVO no toca otros', alternado.materiales.find((p) => p.id === 2).activo === true)

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

const restaurado = dataReducer(sinServicio, { type: 'RESTABLECER' })
comprobar('RESTABLECER vuelve a los mocks', restaurado.materiales.length === ESTADO_INICIAL.materiales.length)

comprobar('siguienteId materiales = 9', siguienteId(ESTADO_INICIAL.materiales) === 9, String(siguienteId(ESTADO_INICIAL.materiales)))
comprobar('siguienteId equipos = 26', siguienteId(ESTADO_INICIAL.equipos) === 26, String(siguienteId(ESTADO_INICIAL.equipos)))
comprobar('siguienteId arreglo vacío = 1', siguienteId([]) === 1, String(siguienteId([])))

// El id debe quedar siempre por encima del máximo, aunque se borre el último.
const sinUltimo = ESTADO_INICIAL.materiales.slice(0, -1)
comprobar('siguienteId tras borrado = 8', siguienteId(sinUltimo) === 8, String(siguienteId(sinUltimo)))

const desconocido = dataReducer(ESTADO_INICIAL, { type: 'NO_EXISTE' })
comprobar('acción desconocida devuelve el estado igual', desconocido === ESTADO_INICIAL)

// ============================================================
//  2. Cálculos de presupuesto
// ============================================================

console.log('\n[ calculadora ]')

const { registros_servicio: registros, servicios } = ESTADO_INICIAL
const servicio6 = servicios.find((s) => s.id === 6)
const consumo6 = consumoPresupuesto(servicio6, registros)

comprobar('consumo servicio 6 = 35316', consumo6.gastado === 35316, String(consumo6.gastado))
comprobar('presupuesto = 120000', consumo6.presupuesto === 120000)
comprobar('disponible = 84684', consumo6.disponible === 84684, String(consumo6.disponible))
comprobar('porcentaje correcto', Math.abs(consumo6.porcentaje - 29.43) < 0.01, consumo6.porcentaje.toFixed(3))
comprobar('no excedido', consumo6.excedido === false)

const excedido = consumoPresupuesto({ id: 6, presupuesto_asignado: 100 }, registros)
comprobar('detecta presupuesto excedido', excedido.excedido === true && excedido.disponible === -35216, String(excedido.disponible))
comprobar('excedido no corta el porcentaje', excedido.porcentaje > 100, String(excedido.porcentaje))

const cero = consumoPresupuesto({ id: 98, presupuesto_asignado: 0 }, registros)
comprobar('presupuesto 0 no divide entre cero', cero.porcentaje === 0 && cero.excedido === false)

const desglose6 = desglosePorTipo(registrosDeServicio(registros, 6))
comprobar('desglose material = 30276', desglose6.material === 30276, String(desglose6.material))
comprobar('desglose personal = 1540', desglose6.personal === 1540, String(desglose6.personal))
comprobar('desglose gasto = 3500', desglose6.gasto === 3500, String(desglose6.gasto))
comprobar('desglose equipo = 0', desglose6.equipo === 0, String(desglose6.equipo))
comprobar('desglose suma el total', Object.values(desglose6).reduce((a, b) => a + b, 0) === consumo6.gastado)

comprobar('sumarMontos total = 35316', sumarMontos(registros) === 35316, String(sumarMontos(registros)))

const { tareas } = ESTADO_INICIAL
const tareas6 = tareas.filter((t) => t.servicio_id === 6)
const met6 = metricasCronograma(tareas6)
comprobar('cronograma serv. 6 = 9 tareas', met6.total === 9, String(met6.total))
comprobar('cronograma serv. 6 = 4 completadas', met6.completadas === 4, String(met6.completadas))
comprobar('avance global serv. 6 = 54', met6.avanceGlobal === 54, String(met6.avanceGlobal))
const metVacio = metricasCronograma([])
comprobar('cronograma vacío en ceros', metVacio.total === 0 && metVacio.avanceGlobal === 0)

const rent6 = rentabilidadServicio(servicio6, registros, tareas6)
comprobar('margen serv. 6 = 84684', rent6.margen === 84684, String(rent6.margen))
comprobar('margen % serv. 6 ≈ 70.57', Math.abs(rent6.margenPct - 70.57) < 0.01, rent6.margenPct.toFixed(2))
comprobar('valor ganado serv. 6 = 64800', Math.abs(rent6.valorGanado - 64800) < 0.01, String(rent6.valorGanado))
comprobar('CPI serv. 6 ≈ 1.83', Math.abs(rent6.cpi - 1.83) < 0.01, String(rent6.cpi))
comprobar('costo final serv. 6 = 65400', Math.abs(rent6.costoFinal - 65400) < 0.01, String(rent6.costoFinal))
comprobar('margen proyectado serv. 6 = 54600', Math.abs(rent6.margenProyectado - 54600) < 0.01, String(rent6.margenProyectado))
const rentSinAvance = rentabilidadServicio(servicio6, registros, [])
comprobar('sin tareas no hay CPI ni proyección', rentSinAvance.cpi === null && rentSinAvance.margenProyectado === null)

const mensual6 = gastoPorMes(registrosDeServicio(registros, 6))
comprobar('gasto mensual serv. 6 = 3 meses', mensual6.length === 3, JSON.stringify(mensual6.map((m) => m.mes)))
comprobar('julio serv. 6 = 13748', mensual6[0].monto === 13748, String(mensual6[0]?.monto))
comprobar('agosto serv. 6 = 19040', mensual6[1].monto === 19040, String(mensual6[1]?.monto))
comprobar('septiembre serv. 6 = 2528', mensual6[2].monto === 2528, String(mensual6[2]?.monto))
comprobar('gasto mensual vacío = []', gastoPorMes([]).length === 0)
const spi6 = indiceAvance(servicio6, 54, '2026-10-06')
comprobar('SPI serv. 6 ≈ 0.96', spi6 && Math.abs(spi6.spi - 0.96) < 0.01, String(spi6?.spi))
comprobar('sin plazo no hay SPI', indiceAvance({ fecha_inicio: '', fecha_fin_estimada: '' }, 50, '2026-10-06') === null)
comprobar('obra sin empezar no tiene SPI', indiceAvance({ fecha_inicio: '2026-12-01', fecha_fin_estimada: '2027-01-01' }, 0, '2026-10-06') === null)

const { costos_oficina: oficina } = ESTADO_INICIAL
const oficinaOct = oficina.filter((c) => c.mes === '2026-10').reduce((t, c) => t + c.monto_calculado, 0)
const oficinaSep = oficina.filter((c) => c.mes === '2026-09').reduce((t, c) => t + c.monto_calculado, 0)
comprobar('oficina oct = 17500', oficinaOct === 17500, String(oficinaOct))
comprobar('oficina sep = 6300', oficinaSep === 6300, String(oficinaSep))
comprobar('empresa oct = 67184', consumo6.disponible - oficinaOct === 67184)
const soloObra = ESTADO_INICIAL.personal.filter((p) => (p.ambito ?? 'Obra') !== 'Oficina')
comprobar('personal de obra > 0 y < total', soloObra.length > 0 && soloObra.length < ESTADO_INICIAL.personal.length, String(soloObra.length))
comprobar('sumarMontos vacío = 0', sumarMontos([]) === 0)

// ============================================================
//  3. Formato
// ============================================================

console.log('\n[ formato ]')

comprobar('redondeo 3.005 -> 3.01', redondearMonto(3.005) === 3.01, String(redondearMonto(3.005)))
comprobar('redondeo 0.1+0.2 -> 0.3', redondearMonto(0.1 + 0.2) === 0.3, String(redondearMonto(0.1 + 0.2)))
comprobar('redondeo ignora basura', redondearMonto('abc') === 0)
comprobar('moneda formatea miles', formatearMoneda(48500).includes('48,500'), formatearMoneda(48500))

// ============================================================
//  4. Render de rutas
// ============================================================

console.log('\n[ render ]')

const rutas = [
  { ruta: '/', etiqueta: 'Raíz redirige a servicios', monto: false },
  { ruta: '/servicios', etiqueta: 'Servicios', monto: true },
  { ruta: '/servicios/6', etiqueta: 'Detalle /servicios/6', monto: true },
  { ruta: '/servicios/6/materiales', etiqueta: 'Panel materiales', monto: true },
  { ruta: '/servicios/6/personal', etiqueta: 'Panel personal', monto: true },
  { ruta: '/servicios/6/equipos', etiqueta: 'Panel equipos', monto: false },
  { ruta: '/servicios/6/gastos', etiqueta: 'Panel gastos', monto: true },
  { ruta: '/servicios/6/opciones', etiqueta: 'Panel opciones', monto: false },
  { ruta: '/servicios/999', etiqueta: 'Detalle id inexistente', monto: false },
  { ruta: '/personal', etiqueta: 'Personal', monto: true },
  { ruta: '/equipos', etiqueta: 'Equipos', monto: false },
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