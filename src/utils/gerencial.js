// Composición de indicadores para el Dashboard gerencial.
//
// Este módulo NO reimplementa fórmulas: reúne los helpers de `calculadora.js`
// y `finanzas.js` para que el panel y sus pruebas usen exactamente los mismos
// números. Todo es puro y devuelve 0/null (nunca NaN) cuando no hay base.

import {
  cobradoServicio,
  consumoPresupuesto,
  diasRestantes,
  hoyISO,
  porCobrar,
  proyeccionAsignaciones,
  rentabilidadServicio,
  sumarMontos,
} from './calculadora'
import { margenBruto, porcentajeEjecucion, redondear2 } from './finanzas'

// Análisis por servicio: consumo, rentabilidad, plazo y motivos de riesgo.
// Centraliza lo que antes vivía dentro del componente para poder probarlo.
export function analizarServicios({ servicios = [], registros = [], tareas = [], hoy = hoyISO() } = {}) {
  return servicios.map((servicio) => {
    const tareasServicio = tareas.filter((t) => t.servicio_id === servicio.id)
    const regsServicio = registros.filter((r) => r.servicio_id === servicio.id)
    const consumo = consumoPresupuesto(servicio, registros)
    const rent = rentabilidadServicio(servicio, regsServicio, tareasServicio, hoy)
    const dias = diasRestantes(servicio.fecha_fin_estimada)
    const motivos = []
    if (consumo.excedido) motivos.push('excedido')
    else if (rent.cpi != null && rent.cpi < 0.9) motivos.push('CPI crítico')
    if (dias !== null && dias < 0) motivos.push('plazo vencido')
    else if (dias !== null && dias <= 15) motivos.push('plazo cercano')
    return { servicio, consumo, rent, dias, motivos, margen: consumo.disponible }
  })
}

// KPIs de empresa (nivel gerencial). Mismas fórmulas que el panel base:
// margen = presupuesto − gastado; resultado empresa = margen − oficina.
export function kpisEmpresa({
  servicios = [],
  registros = [],
  cobros = [],
  costosOficina = [],
  analisis = [],
} = {}) {
  const presupuesto = redondear2(
    servicios.reduce((total, s) => total + (Number(s.presupuesto_asignado) || 0), 0),
  )
  const gastado = redondear2(sumarMontos(registros))
  const margenTotal = redondear2(presupuesto - gastado)
  const cobrado = redondear2(
    servicios.reduce((total, s) => total + cobradoServicio(cobros, s.id), 0),
  )
  const porCobrarTotal = redondear2(
    servicios.reduce((total, s) => total + porCobrar(s, cobros), 0),
  )
  const oficina = redondear2(sumarMontos(costosOficina))
  const resultadoEmpresa = redondear2(margenTotal - oficina)

  return {
    total: servicios.length,
    enCurso: servicios.filter((s) => s.estatus === 'En curso').length,
    enRiesgo: analisis.filter((a) => a.motivos.length > 0).length,
    presupuesto,
    gastado,
    margenTotal,
    margenPct: margenBruto(margenTotal, presupuesto),
    ejecucion: porcentajeEjecucion(gastado, presupuesto),
    cobrado,
    porCobrar: porCobrarTotal,
    oficina,
    resultadoEmpresa,
  }
}

// Rentabilidad consolidada por cliente. `margenProyectado` solo suma los
// servicios con proyección de cierre (requieren avance en cronograma).
export function rentabilidadPorCliente({
  servicios = [],
  registros = [],
  cobros = [],
  tareas = [],
  hoy = hoyISO(),
} = {}) {
  const porCliente = new Map()

  for (const servicio of servicios) {
    const clave = servicio.cliente || 'Sin cliente'
    const tareasServicio = tareas.filter((t) => t.servicio_id === servicio.id)
    const regsServicio = registros.filter((r) => r.servicio_id === servicio.id)
    const consumo = consumoPresupuesto(servicio, registros)
    const rent = rentabilidadServicio(servicio, regsServicio, tareasServicio, hoy)

    const fila = porCliente.get(clave) ?? {
      cliente: clave,
      servicios: 0,
      presupuesto: 0,
      gastado: 0,
      cobrado: 0,
      porCobrar: 0,
      margenProyectado: 0,
      serviciosConProyeccion: 0,
    }

    fila.servicios += 1
    fila.presupuesto = redondear2(fila.presupuesto + consumo.presupuesto)
    fila.gastado = redondear2(fila.gastado + consumo.gastado)
    fila.cobrado = redondear2(fila.cobrado + cobradoServicio(cobros, servicio.id))
    fila.porCobrar = redondear2(fila.porCobrar + porCobrar(servicio, cobros))
    if (rent.margenProyectado != null) {
      fila.margenProyectado = redondear2(fila.margenProyectado + rent.margenProyectado)
      fila.serviciosConProyeccion += 1
    }

    porCliente.set(clave, fila)
  }

  const filas = [...porCliente.values()]
  for (const fila of filas) {
    fila.tieneProyeccion = fila.serviciosConProyeccion > 0
    fila.margenPct = fila.tieneProyeccion
      ? margenBruto(fila.margenProyectado, fila.presupuesto)
      : null
  }
  return filas.sort((a, b) => b.margenProyectado - a.margenProyectado)
}

// Caja real por mes: cobrado vs egresado (obra + oficina). Serie continua
// entre el primer y el último mes con actividad; meses sin datos = 0.
export function flujoCajaMensualReal({ registros = [], cobros = [], costosOficina = [] } = {}) {
  const porMes = new Map()
  const asegurar = (mes) => {
    if (!mes || mes.length < 7) return null
    if (!porMes.has(mes)) {
      porMes.set(mes, { mes, cobrado: 0, egresoObra: 0, oficina: 0, margenReal: 0 })
    }
    return porMes.get(mes)
  }

  for (const r of registros) {
    const fila = asegurar((r.fecha || '').slice(0, 7))
    if (fila) fila.egresoObra = redondear2(fila.egresoObra + (Number(r.monto_calculado) || 0))
  }
  for (const c of cobros) {
    const fila = asegurar((c.fecha || '').slice(0, 7))
    if (fila) fila.cobrado = redondear2(fila.cobrado + (Number(c.monto) || 0))
  }
  for (const o of costosOficina) {
    const fila = asegurar((o.mes || '').slice(0, 7))
    if (fila) fila.oficina = redondear2(fila.oficina + (Number(o.monto_calculado) || 0))
  }

  const meses = [...porMes.keys()].sort()
  if (meses.length === 0) return []

  const filas = []
  let [anio, mes] = meses[0].split('-').map(Number)
  const [anioFin, mesFin] = meses[meses.length - 1].split('-').map(Number)
  while (anio < anioFin || (anio === anioFin && mes <= mesFin)) {
    const clave = `${anio}-${String(mes).padStart(2, '0')}`
    const fila = porMes.get(clave) ?? { mes: clave, cobrado: 0, egresoObra: 0, oficina: 0 }
    filas.push({
      ...fila,
      margenReal: redondear2(fila.cobrado - fila.egresoObra - fila.oficina),
    })
    mes += 1
    if (mes > 12) {
      mes = 1
      anio += 1
    }
  }
  return filas
}

// Personal proyectado por mes (meses aún no devengados), sumando servicios.
export function proyeccionMensualPersonal({
  asignaciones = [],
  servicios = [],
  registros = [],
} = {}) {
  const porMes = new Map()
  for (const servicio of servicios) {
    const { porMes: meses } = proyeccionAsignaciones(asignaciones, servicio, registros)
    for (const m of meses) {
      if (!m.estimado || m.monto <= 0) continue
      porMes.set(m.mes, redondear2((porMes.get(m.mes) || 0) + m.monto))
    }
  }
  return [...porMes.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([mes, monto]) => ({ mes, monto }))
}

// Proyección al cierre agregada: costo final y margen proyectado. Solo suma
// los servicios con proyección disponible; null si ninguno la tiene.
export function proyeccionCierre({ analisis = [] } = {}) {
  const conProyeccion = analisis.filter((a) => a.rent?.costoFinal != null)
  if (conProyeccion.length === 0) {
    return { servicios: 0, costoFinal: null, margenProyectado: null }
  }
  return {
    servicios: conProyeccion.length,
    costoFinal: redondear2(conProyeccion.reduce((s, a) => s + a.rent.costoFinal, 0)),
    margenProyectado: redondear2(
      conProyeccion.reduce((s, a) => s + (a.rent.margenProyectado ?? 0), 0),
    ),
  }
}
