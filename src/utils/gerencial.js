// Composición de indicadores para el Dashboard gerencial.
//
// Este módulo NO reimplementa fórmulas: reúne los helpers de `calculadora.js`
// y `finanzas.js` para que el panel y sus pruebas usen exactamente los mismos
// números. Todo es puro y devuelve 0/null (nunca NaN) cuando no hay base.

import {
  cobradoServicio,
  diasRestantes,
  estadoPresupuesto,
  hoyISO,
  mesesEntre,
  proyeccionAsignaciones,
  sumarMontos,
  ultimoDiaMes,
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

// ------------------------------------------------------------
//  Gráfico combinado de cartera (volumen + desfases de tiempo y costo)
// ------------------------------------------------------------

// Tolerancia (puntos porcentuales) para no marcar retraso por redondeos.
const TOLERANCIA_DESFASE = 0.5

// Días inclusivos entre dos fechas ISO (misma base que la duración del
// cronograma: fin − inicio + 1).
function diasInclusivos(desde, hasta) {
  if (!desde || !hasta) return 0
  const [ai, mi, di] = desde.split('-').map(Number)
  const [af, mf, df] = hasta.split('-').map(Number)
  return Math.round((new Date(af, mf - 1, df) - new Date(ai, mi - 1, di)) / 86400000) + 1
}

// Avance reconstruido de una tarea en una fecha de corte. Como el sistema no
// guarda historial, se prorratea el avance actual dentro de la ventana
// trabajada [inicio, min(corte, fin)]; las tareas con hijas promedian por
// duración, igual que `avanceEfectivo`. Al corte = hoy devuelve el avance actual.
function avanceTareaEnFecha(tarea, todas, corte) {
  const hijas = todas.filter((t) => t.padre_id === tarea.id)
  if (hijas.length > 0) {
    const dur = hijas.reduce((s, h) => s + diasInclusivos(h.fecha_inicio, h.fecha_fin), 0)
    if (!dur) return 0
    return (
      hijas.reduce(
        (s, h) => s + avanceTareaEnFecha(h, todas, corte) * diasInclusivos(h.fecha_inicio, h.fecha_fin),
        0,
      ) / dur
    )
  }
  const avance = Number(tarea.avance) || 0
  if (!tarea.fecha_inicio || !tarea.fecha_fin || corte < tarea.fecha_inicio) return 0
  const total = Math.max(1, diasInclusivos(tarea.fecha_inicio, tarea.fecha_fin))
  const hasta = corte < tarea.fecha_fin ? corte : tarea.fecha_fin
  const transcurridos = Math.min(total, diasInclusivos(tarea.fecha_inicio, hasta))
  return (avance * transcurridos) / total
}

// Avance global del servicio en una fecha (mismo peso por duración que
// `metricasCronograma`: todas las tareas, padres e hijas).
function avanceServicioEnFecha(tareasServicio, corte) {
  const durTotal = tareasServicio.reduce((s, t) => s + diasInclusivos(t.fecha_inicio, t.fecha_fin), 0)
  if (!durTotal) return 0
  return (
    tareasServicio.reduce(
      (s, t) => s + avanceTareaEnFecha(t, tareasServicio, corte) * diasInclusivos(t.fecha_inicio, t.fecha_fin),
      0,
    ) / durTotal
  )
}

// Avance esperado del servicio por tiempo transcurrido (misma base que el SPI):
// lineal entre el inicio y el fin estimado, tope 100 %.
function avancePlanEnFecha(servicio, corte) {
  const { fecha_inicio, fecha_fin_estimada } = servicio
  if (!fecha_inicio || !fecha_fin_estimada || fecha_fin_estimada <= fecha_inicio) return null
  if (corte < fecha_inicio) return 0
  const total = Math.round((new Date(fecha_fin_estimada) - new Date(fecha_inicio)) / 86400000)
  if (total <= 0) return null
  const van = Math.round((new Date(corte) - new Date(fecha_inicio)) / 86400000)
  return Math.min(100, (van / total) * 100)
}

// Serie mensual para el gráfico combinado del panel gerencial:
//   - `activos`: proyectos con ventana planificada que cubre el mes (barras).
//   - `desfaseTiempo`: % de proyectos activos y evaluables detrás de su plan
//     (avance reconstruido + tolerancia < avance esperado). null en meses futuros.
//   - `desfaseCosto`: % de sobrecosto promedio de los proyectos activos con
//     valor ganado. Por proyecto: (gasto real − valor ganado) / valor ganado
//     × 100, con 0 % si va bajo presupuesto; luego se promedian. null sin base
//     de valor ganado o en meses futuros.
// Todo puro; nunca devuelve NaN (null cuando no hay base).
export function desfaseMensualProyectos({
  servicios = [],
  tareas = [],
  registros = [],
  hoy = hoyISO(),
} = {}) {
  const mesHoy = hoy.slice(0, 7)
  const conInicio = servicios.filter((s) => s.fecha_inicio)
  if (conInicio.length === 0) return { serie: [], maxVolumen: 0, mesHoy }

  const finEfectiva = (s) => s.fecha_fin_estimada || s.fecha_inicio
  const desdeMes = conInicio.map((s) => s.fecha_inicio.slice(0, 7)).sort()[0]
  const hastaMes = [...conInicio.map((s) => finEfectiva(s).slice(0, 7)), mesHoy].sort().at(-1)

  const serie = []
  for (const mes of mesesEntre(desdeMes, hastaMes)) {
    const inicioMes = `${mes}-01`
    const finMes = ultimoDiaMes(mes)
    const corte = finMes < hoy ? finMes : hoy
    const activos = conInicio.filter((s) => s.fecha_inicio <= finMes && finEfectiva(s) >= inicioMes)

    let evaluables = 0
    let conRetraso = 0
    let sumaSobrecosto = 0
    let proyectosConCosto = 0
    for (const s of activos) {
      const tareasServicio = tareas.filter((t) => t.servicio_id === s.id)
      const real = tareasServicio.length ? avanceServicioEnFecha(tareasServicio, corte) : 0
      const plan = avancePlanEnFecha(s, corte)
      if (tareasServicio.length && plan != null && plan > 0) {
        evaluables += 1
        if (real + TOLERANCIA_DESFASE < plan) conRetraso += 1
      }
      // Sobrecosto del proyecto: gasto real vs valor ganado (AC − EV) / EV.
      // Bajo presupuesto = 0 % (no es sobrecosto); luego se promedian los
      // proyectos activos con valor ganado para no esconder una obra sobre
      // costo detrás de otra muy económica.
      const valorGanado = (Number(s.presupuesto_asignado) || 0) * (real / 100)
      if (valorGanado > 0) {
        const costoReal = registros
          .filter((r) => r.servicio_id === s.id && (r.fecha || '') <= corte)
          .reduce((total, r) => total + (Number(r.monto_calculado) || 0), 0)
        proyectosConCosto += 1
        sumaSobrecosto += Math.max(0, ((costoReal - valorGanado) / valorGanado) * 100)
      }
    }

    const futuro = mes > mesHoy
    serie.push({
      mes,
      activos: activos.length,
      evaluables,
      conRetraso,
      desfaseTiempo: futuro || evaluables === 0 ? null : redondear2((conRetraso / evaluables) * 100),
      desfaseCosto: futuro || proyectosConCosto === 0 ? null : redondear2(sumaSobrecosto / proyectosConCosto),
    })
  }

  return { serie, maxVolumen: Math.max(0, ...serie.map((f) => f.activos)), mesHoy }
}

// Variación del último mes contra el anterior en una serie [{ mes, ... }].
// null con menos de 2 puntos; porcentaje null sin base (nunca ficticio).
export function variacionMensual(serie, campo) {
  const lista = serie ?? []
  if (lista.length < 2) return null
  const anterior = Number(lista[lista.length - 2]?.[campo]) || 0
  const actual = Number(lista[lista.length - 1]?.[campo]) || 0
  const diferencia = redondear2(actual - anterior)
  return {
    actual: redondear2(actual),
    anterior: redondear2(anterior),
    diferencia,
    porcentaje: anterior === 0 ? null : Math.round(((diferencia / anterior) * 100) * 100) / 100,
  }
}

// Semáforo ejecutivo de la empresa: lectura de un vistazo.
// rojo = resultado negativo; amarillo = hay obras en riesgo o la caja del
// último mes fue negativa; verde = sin señales de alerta.
export function estadoEmpresa({ resultadoEmpresa = 0, enRiesgo = 0, ultimoMargenCaja = null } = {}) {
  if (resultadoEmpresa < 0) {
    return {
      nivel: 'rojo',
      titulo: 'Empresa en rojo',
      mensaje: 'El resultado es negativo: entre obras y oficina sale más de lo que entra.',
    }
  }
  const motivos = []
  if (enRiesgo > 0) motivos.push(`${enRiesgo} obra(s) en riesgo`)
  if (ultimoMargenCaja != null && ultimoMargenCaja < 0) {
    motivos.push('la caja del último mes fue negativa')
  }
  if (motivos.length > 0) {
    return {
      nivel: 'amarillo',
      titulo: 'Atención requerida',
      mensaje: `Hay señales para mirar: ${motivos.join(' · ')}.`,
    }
  }
  return {
    nivel: 'verde',
    titulo: 'Empresa en orden',
    mensaje: 'Resultado positivo y sin obras en riesgo.',
  }
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
