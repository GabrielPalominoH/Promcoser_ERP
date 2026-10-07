// Cálculos derivados de registros_servicio. Todo local, sin backend.

export function registrosDeServicio(registros, servicioId) {
  return registros.filter((registro) => registro.servicio_id === servicioId)
}

export function sumarMontos(registros) {
  return registros.reduce((total, registro) => total + (Number(registro.monto_calculado) || 0), 0)
}

export function desglosePorTipo(registros) {
  const desglose = { material: 0, personal: 0, gasto: 0, equipo: 0 }

  for (const registro of registros) {
    const monto = Number(registro.monto_calculado) || 0
    if (registro.tipo_registro in desglose) {
      desglose[registro.tipo_registro] += monto
    }
  }

  return desglose
}

export function consumoPresupuesto(servicio, registros) {
  const gastado = sumarMontos(registrosDeServicio(registros, servicio.id))
  const presupuesto = Number(servicio.presupuesto_asignado) || 0
  const porcentaje = presupuesto ? (gastado / presupuesto) * 100 : 0

  return {
    gastado,
    presupuesto,
    disponible: presupuesto - gastado,
    porcentaje,
    excedido: gastado > presupuesto,
  }
}

export function ordenarPorFechaDesc(registros) {
  return [...registros].sort((a, b) => {
    if (a.fecha === b.fecha) return b.id - a.id
    return b.fecha.localeCompare(a.fecha)
  })
}

export function nombreReferencia(registro, { personal, materiales, equipos = [] }) {
  if (registro.tipo_registro === 'gasto') return registro.concepto?.trim() || 'Gasto operativo'
  if (registro.tipo_registro === 'personal') {
    const persona = personal.find((p) => p.id === registro.referencia_id)
    if (!persona) return 'Personal eliminado'
    return `${persona.nombre} ${persona.apellido ?? ''}`.trim()
  }
  if (registro.tipo_registro === 'material') {
    if (registro.nombre_material?.trim()) return registro.nombre_material.trim()
    return materiales.find((m) => m.id === registro.referencia_id)?.nombre ?? 'Material eliminado'
  }
  if (registro.tipo_registro === 'equipo') {
    const equipo = equipos.find((e) => e.id === registro.referencia_id)
    if (!equipo) return 'Equipo eliminado'
    const horas = Number(registro.cantidad_o_horas) || 0
    return `${equipo.nombre} · ${horas} h`
  }
  return '—'
}

export function hoyISO() {
  const ahora = new Date()
  const mes = String(ahora.getMonth() + 1).padStart(2, '0')
  const dia = String(ahora.getDate()).padStart(2, '0')
  return `${ahora.getFullYear()}-${mes}-${dia}`
}

export function estadoTarea(tarea, hoy) {
  const avance = Number(tarea.avance) || 0
  if (avance >= 100) return 'completada'
  if (tarea.fecha_fin < hoy) return 'atrasada'
  if (tarea.fecha_inicio <= hoy) return 'en curso'
  return 'pendiente'
}

function duracionTarea(tarea) {
  const [ai, mi, di] = tarea.fecha_inicio.split('-').map(Number)
  const [af, mf, df] = tarea.fecha_fin.split('-').map(Number)
  return Math.round((new Date(af, mf - 1, df) - new Date(ai, mi - 1, di)) / 86400000) + 1
}

function hijasDe(tareas, idPadre) {
  return tareas.filter((t) => t.padre_id === idPadre)
}

// Avance efectivo: si la tarea tiene hijas, es el promedio ponderado por
// duración de sus subtareas (la padre pasa a ser nombre de grupo);
// si no, su propio avance.
export function avanceEfectivo(tarea, todas) {
  const hijas = hijasDe(todas ?? [], tarea.id)
  if (hijas.length === 0) return Number(tarea.avance) || 0
  const duracion = hijas.reduce((s, h) => s + duracionTarea(h), 0)
  if (!duracion) return 0
  return Math.round(
    hijas.reduce((s, h) => s + (Number(h.avance) || 0) * duracionTarea(h), 0) / duracion,
  )
}

// Métricas del cronograma: conteos por estado y avance global
// ponderado por duración de cada tarea.
export function metricasCronograma(tareas, hoy = hoyISO()) {
  const conAvance = tareas.map((t) => ({ ...t, avance: avanceEfectivo(t, tareas) }))
  const total = conAvance.length
  const completadas = conAvance.filter((t) => estadoTarea(t, hoy) === 'completada').length
  const atrasadas = conAvance.filter((t) => estadoTarea(t, hoy) === 'atrasada').length
  const duracionTotal = conAvance.reduce((s, t) => s + duracionTarea(t), 0)
  const avanceGlobal = duracionTotal
    ? Math.round(
        conAvance.reduce((s, t) => s + (Number(t.avance) || 0) * duracionTarea(t), 0) /
          duracionTotal,
      )
    : 0

  return { total, completadas, atrasadas, avanceGlobal }
}

// Gasto por mes (YYYY-MM) con meses intermedios en cero, ordenado.
export function gastoPorMes(registros) {
  const porMes = new Map()
  for (const r of registros) {
    if (!r.fecha || r.fecha.length < 7) continue
    const mes = r.fecha.slice(0, 7)
    porMes.set(mes, (porMes.get(mes) || 0) + (Number(r.monto_calculado) || 0))
  }
  const meses = [...porMes.keys()].sort()
  if (meses.length === 0) return []

  const [ai, mi] = meses[0].split('-').map(Number)
  const [af, mf] = meses[meses.length - 1].split('-').map(Number)
  const resultado = []
  let anio = ai
  let mes = mi
  while (anio < af || (anio === af && mes <= mf)) {
    const clave = `${anio}-${String(mes).padStart(2, '0')}`
    resultado.push({ mes: clave, monto: porMes.get(clave) || 0 })
    mes += 1
    if (mes > 12) {
      mes = 1
      anio += 1
    }
  }
  return resultado
}

// SPI: avance real vs avance esperado por tiempo transcurrido del plazo.
// null si no hay fecha fin o la obra aún no empieza.
export function indiceAvance(servicio, avanceGlobal, hoy = hoyISO()) {
  if (!servicio.fecha_inicio || !servicio.fecha_fin_estimada) return null
  const inicio = servicio.fecha_inicio
  const fin = servicio.fecha_fin_estimada
  if (hoy < inicio || fin <= inicio) return null
  const total = Math.max(1, Math.round((new Date(fin) - new Date(inicio)) / 86400000))
  const van = Math.round((new Date(hoy) - new Date(inicio)) / 86400000)
  const esperado = Math.min(100, (van / total) * 100)
  if (esperado <= 0) return null
  return { spi: avanceGlobal / esperado, esperado }
}

// Días restantes hasta una fecha ISO (YYYY-MM-DD). Negativo = vencido.
export function diasRestantes(fechaISO) {
  if (!fechaISO) return null
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const [anio, mes, dia] = fechaISO.split('-').map(Number)
  const limite = new Date(anio, mes - 1, dia)
  return Math.round((limite - hoy) / 86400000)
}

export function nombreServicio(servicios, servicioId) {
  return servicios.find((s) => s.id === servicioId)?.nombre_servicio ?? 'Servicio eliminado'
}

// Rentabilidad del servicio con lo registrado (materiales + gastos):
// 1) margen actual, 2) índice costo vs avance (valor ganado) y
// 3) proyección al cierre. Sin tareas con avance no hay CPI ni proyección.
export function rentabilidadServicio(servicio, registros, tareas, hoy = hoyISO()) {
  const consumo = consumoPresupuesto(servicio, registros)
  const margen = consumo.disponible
  const margenPct = consumo.presupuesto ? (margen / consumo.presupuesto) * 100 : 0

  const { avanceGlobal } = metricasCronograma(tareas, hoy)
  const tieneAvance = tareas.length > 0 && avanceGlobal > 0
  const avanceTanto = avanceGlobal / 100

  const valorGanado = consumo.presupuesto * avanceTanto
  const cpi = tieneAvance && consumo.gastado > 0 ? valorGanado / consumo.gastado : null
  const costoFinal = tieneAvance ? consumo.gastado / avanceTanto : null
  const margenProyectado = costoFinal == null ? null : consumo.presupuesto - costoFinal

  return {
    margen,
    margenPct,
    avance: avanceGlobal,
    tieneAvance,
    valorGanado,
    cpi,
    costoFinal,
    margenProyectado,
  }
}