import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { DataProvider, dataReducer, siguienteId } from '../src/context/DataContext'
import { ESTADO_INICIAL } from '../src/data/mockData'
import { consumoPresupuesto, desglosePorTipo, sumarMontos, registrosDeServicio, metricasCronograma } from '../src/utils/calculadora'
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
  payload: { coleccion: 'servicios', id: 1 },
})
const huerfanos = sinServicio.registros_servicio.filter((r) => r.servicio_id === 1)
comprobar('ELIMINAR_ITEM quita el servicio', !sinServicio.servicios.some((s) => s.id === 1))
comprobar('ELIMINAR_ITEM borra registros en cascada', huerfanos.length === 0, `quedan ${huerfanos.length}`)
comprobar('conserva registros de otros servicios', sinServicio.registros_servicio.some((r) => r.servicio_id === 2))

const sinTarea = dataReducer(ESTADO_INICIAL, {
  type: 'ELIMINAR_ITEM',
  payload: { coleccion: 'tareas', id: 2 },
})
comprobar(
  'ELIMINAR_ITEM borra subtareas en cascada',
  !sinTarea.tareas.some((t) => t.id === 2 || t.padre_id === 2),
)
comprobar('conserva tareas de otros servicios', sinTarea.tareas.some((t) => t.servicio_id === 2))

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
const servicio1 = servicios.find((s) => s.id === 1)
const consumo1 = consumoPresupuesto(servicio1, registros)

comprobar('consumo servicio 1 = 13238', consumo1.gastado === 13238, String(consumo1.gastado))
comprobar('presupuesto = 48500', consumo1.presupuesto === 48500)
comprobar('disponible = 35262', consumo1.disponible === 35262, String(consumo1.disponible))
comprobar('porcentaje correcto', Math.abs(consumo1.porcentaje - 27.294) < 0.01, consumo1.porcentaje.toFixed(3))
comprobar('no excedido', consumo1.excedido === false)

const excedido = consumoPresupuesto({ id: 1, presupuesto_asignado: 100 }, registros)
comprobar('detecta presupuesto excedido', excedido.excedido === true && excedido.disponible === -13138, String(excedido.disponible))
comprobar('excedido no corta el porcentaje', excedido.porcentaje > 100, String(excedido.porcentaje))

const cero = consumoPresupuesto({ id: 98, presupuesto_asignado: 0 }, registros)
comprobar('presupuesto 0 no divide entre cero', cero.porcentaje === 0 && cero.excedido === false)

const desglose1 = desglosePorTipo(registrosDeServicio(registros, 1))
comprobar('desglose material = 11888', desglose1.material === 11888, String(desglose1.material))
comprobar('desglose personal = 0', desglose1.personal === 0, String(desglose1.personal))
comprobar('desglose gasto = 1350', desglose1.gasto === 1350, String(desglose1.gasto))
comprobar('desglose equipo = 0', desglose1.equipo === 0, String(desglose1.equipo))
comprobar('desglose suma el total', Object.values(desglose1).reduce((a, b) => a + b, 0) === consumo1.gastado)

// 13238 (serv. 1) + 5650.5 (serv. 2) + 12110 (serv. 4) + 1942 (serv. 5)
comprobar('sumarMontos total = 32940.5', sumarMontos(registros) === 32940.5, String(sumarMontos(registros)))

const { tareas } = ESTADO_INICIAL
const met1 = metricasCronograma(tareas.filter((t) => t.servicio_id === 1))
comprobar('cronograma serv. 1 = 7 tareas', met1.total === 7, String(met1.total))
comprobar('cronograma serv. 1 = 1 completada', met1.completadas === 1, String(met1.completadas))
comprobar('avance global serv. 1 = 39', met1.avanceGlobal === 39, String(met1.avanceGlobal))
const metVacio = metricasCronograma([])
comprobar('cronograma vacío en ceros', metVacio.total === 0 && metVacio.avanceGlobal === 0)
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
  { ruta: '/servicios/1', etiqueta: 'Detalle /servicios/1', monto: true },
  { ruta: '/servicios/1/materiales', etiqueta: 'Panel materiales', monto: true },
  { ruta: '/servicios/1/equipos', etiqueta: 'Panel equipos', monto: false },
  { ruta: '/servicios/1/gastos', etiqueta: 'Panel gastos', monto: true },
  { ruta: '/servicios/1/opciones', etiqueta: 'Panel opciones', monto: false },
  { ruta: '/servicios/1/cronograma', etiqueta: 'Panel cronograma', monto: false },
  { ruta: '/servicios/5/cronograma', etiqueta: 'Cronograma sin tareas', monto: false },
  { ruta: '/servicios/999', etiqueta: 'Detalle id inexistente', monto: false },
  { ruta: '/personal', etiqueta: 'Personal', monto: false },
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