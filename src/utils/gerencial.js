// Composición de indicadores para el Dashboard gerencial.
//
// Este módulo NO reimplementa fórmulas: reúne los helpers de `calculadora.js`
// y `finanzas.js` para que el panel y sus pruebas usen exactamente los mismos
// números. Todo es puro y devuelve 0/null (nunca NaN) cuando no hay base.

import {
  cobradoServicio,
  diasRestantes,
  estadoPresupuesto,
  proyeccionAsignaciones,
  sumarMontos,
  utilidadReal,
} from './calculadora'
import { margenBruto, redondear2 } from './finanzas'

// Análisis por servicio: gastado, cobrado, utilidad, estado del presupuesto
// inicial y plazo. Centraliza lo que antes vivía dentro del componente para
// poder probarlo.
export function analizarServicios({ servicios = [], registros = [], cobros = [] } = {}) {
  return servicios.map((servicio) => {
    const regsServicio = registros.filter((r) => r.servicio_id === servicio.id)
    const gastado = redondear2(sumarMontos(regsServicio))
    const cobrado = redondear2(cobradoServicio(cobros, servicio.id))
    const utilidad = redondear2(utilidadReal(cobrado, gastado))
    const estado = estadoPresupuesto(servicio, registros, cobros)
    const dias = diasRestantes(servicio.fecha_fin_estimada)
    const motivos = []
    if (estado.excedido) motivos.push('excedido')
    if (dias !== null && dias < 0) motivos.push('plazo vencido')
    else if (dias !== null && dias <= 15) motivos.push('plazo cercano')
    return { servicio, gastado, cobrado, utilidad, estado, dias, motivos }
  })
}

// KPIs de empresa (nivel gerencial). Mismas fórmulas que el panel base:
// utilidad = cobrado − gastado; resultado empresa = utilidad − oficina.
export function kpisEmpresa({
  servicios = [],
  registros = [],
  cobros = [],
  costosOficina = [],
  analisis = [],
} = {}) {
  const gastado = redondear2(sumarMontos(registros))
  const cobrado = redondear2(
    servicios.reduce((total, s) => total + cobradoServicio(cobros, s.id), 0),
  )
  const utilidadServicios = redondear2(utilidadReal(cobrado, gastado))
  const oficina = redondear2(sumarMontos(costosOficina))
  const resultadoEmpresa = redondear2(utilidadServicios - oficina)

  return {
    total: servicios.length,
    enCurso: servicios.filter((s) => s.estatus === 'En curso').length,
    enRiesgo: analisis.filter((a) => a.motivos.length > 0).length,
    gastado,
    cobrado,
    utilidadServicios,
    oficina,
    resultadoEmpresa,
  }
}

// Utilidad consolidada por cliente (cobrado − gastado). Sin cobros no hay
// porcentaje: se devuelve null en vez de 0/NaN.
export function rentabilidadPorCliente({
  servicios = [],
  registros = [],
  cobros = [],
} = {}) {
  const porCliente = new Map()

  for (const servicio of servicios) {
    const regsServicio = registros.filter((r) => r.servicio_id === servicio.id)
    const clave = servicio.cliente || 'Sin cliente'

    const fila = porCliente.get(clave) ?? {
      cliente: clave,
      servicios: 0,
      gastado: 0,
      cobrado: 0,
      utilidad: 0,
    }

    fila.servicios += 1
    fila.gastado = redondear2(fila.gastado + sumarMontos(regsServicio))
    fila.cobrado = redondear2(fila.cobrado + cobradoServicio(cobros, servicio.id))
    fila.utilidad = redondear2(utilidadReal(fila.cobrado, fila.gastado))

    porCliente.set(clave, fila)
  }

  const filas = [...porCliente.values()]
  for (const fila of filas) {
    fila.utilidadPct = margenBruto(fila.utilidad, fila.cobrado)
  }
  return filas.sort((a, b) => b.utilidad - a.utilidad)
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

// Avance de la meta de ingreso (cobrado real de la empresa). Sin meta (> 0)
// no hay porcentaje ni faltante: se devuelve `definida: false` en vez de 0/NaN.
export function avanceMetaIngreso({ cobrado = 0, meta = 0 } = {}) {
  const objetivo = Number(meta) || 0
  const logrado = redondear2(Number(cobrado) || 0)

  if (objetivo <= 0) {
    return { definida: false, meta: 0, logrado, falta: null, porcentaje: null, cumplida: false }
  }

  return {
    definida: true,
    meta: redondear2(objetivo),
    logrado,
    falta: redondear2(Math.max(0, objetivo - logrado)),
    // Puede superar 100 si se cobró más que la meta (es logro, no exceso).
    porcentaje: Math.round((logrado / objetivo) * 100 * 100) / 100,
    cumplida: logrado >= objetivo,
  }
}
