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

// Métricas del cronograma: conteos por estado y avance global
// ponderado por duración de cada tarea.
export function metricasCronograma(tareas, hoy = hoyISO()) {
  const total = tareas.length
  const completadas = tareas.filter((t) => estadoTarea(t, hoy) === 'completada').length
  const atrasadas = tareas.filter((t) => estadoTarea(t, hoy) === 'atrasada').length
  const duracionTotal = tareas.reduce((s, t) => s + duracionTarea(t), 0)
  const avanceGlobal = duracionTotal
    ? Math.round(
        tareas.reduce((s, t) => s + (Number(t.avance) || 0) * duracionTarea(t), 0) /
          duracionTotal,
      )
    : 0

  return { total, completadas, atrasadas, avanceGlobal }
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