// Cálculos derivados de registros_servicio. Todo local, sin backend.

export function registrosDeServicio(registros, servicioId) {
  return registros.filter((registro) => registro.servicio_id === servicioId)
}

// ------------------------------------------------------------
//  Partidas, valorización y almacén (Fase 3)
// ------------------------------------------------------------

export function partidasDeServicio(partidas, servicioId) {
  return (partidas ?? []).filter((p) => p.servicio_id === servicioId)
}

export function presupuestoPartida(partida) {
  return (Number(partida.metrado) || 0) * (Number(partida.precio_unitario) || 0)
}

export function presupuestoPartidas(partidas, servicioId) {
  return partidasDeServicio(partidas, servicioId).reduce(
    (total, p) => total + presupuestoPartida(p),
    0,
  )
}

export function valorizadoPartida(partida, valorizaciones) {
  const precio = Number(partida.precio_unitario) || 0
  return (valorizaciones ?? [])
    .filter((v) => v.partida_id === partida.id)
    .reduce((total, v) => total + (Number(v.metrado_ejecutado) || 0) * precio, 0)
}

// Avance medido del servicio: valorizado total / presupuesto por partidas.
// null si no hay partidas con presupuesto (evita dividir entre cero).
export function avanceMedido(servicioId, partidas, valorizaciones) {
  const lista = partidasDeServicio(partidas, servicioId)
  const presupuesto = lista.reduce((t, p) => t + presupuestoPartida(p), 0)
  if (presupuesto <= 0) return null
  const valorizado = lista.reduce((t, p) => t + valorizadoPartida(p, valorizaciones), 0)
  return {
    presupuestoPartidas: presupuesto,
    valorizado,
    porcentaje: (valorizado / presupuesto) * 100,
  }
}

// Costo cargado a una partida: suma de registros (material/gasto/personal/
// equipo) con ese partida_id dentro del servicio.
export function costoPorPartida(registros, servicioId, partidaId) {
  return (registros ?? [])
    .filter((r) => r.servicio_id === servicioId && r.partida_id === partidaId)
    .reduce((total, r) => total + (Number(r.monto_calculado) || 0), 0)
}

// Costo sin partida asignada dentro del servicio.
export function costoSinPartida(registros, servicioId) {
  return (registros ?? [])
    .filter((r) => r.servicio_id === servicioId && r.partida_id == null)
    .reduce((total, r) => total + (Number(r.monto_calculado) || 0), 0)
}

// Salidas de un servicio: qué material se usó en obra y en qué partida.
// No generan costo (el costo se contó en la compra); sirven para ver el
// consumo por partida.
export function salidasDeServicio(servicioId, movimientos) {
  return (movimientos ?? []).filter(
    (m) => m.tipo === 'salida' && m.servicio_id === servicioId,
  )
}

// Consumo de una partida por salidas: cantidad × costo unitario registrado.
export function consumoPartidaPorSalidas(servicioId, partidaId, movimientos) {
  return salidasDeServicio(servicioId, movimientos)
    .filter((m) => m.partida_id === partidaId)
    .reduce(
      (total, m) => total + (Number(m.cantidad) || 0) * (Number(m.costo_unitario) || 0),
      0,
    )
}

// Compras de un servicio: ingresos vinculados a su registro de costo.
export function comprasDeServicio(servicioId, movimientos) {
  return (movimientos ?? []).filter(
    (m) => m.tipo === 'ingreso' && m.servicio_id === servicioId,
  )
}

// Un ingreso solo puede eliminarse si el stock resultante no queda negativo.
export function puedeEliminarIngreso(ingreso, movimientos) {
  if (ingreso.tipo !== 'ingreso') return { permitido: true, stockResultante: null }
  const { stock } = kardexMaterial(ingreso.material_id, movimientos)
  const stockResultante = stock - (Number(ingreso.cantidad) || 0)
  return { permitido: stockResultante >= 0, stockResultante }
}

// Kardex por material: ingresos, salidas, stock y precio promedio ponderado.
export function kardexMaterial(materialId, movimientos) {
  const lista = (movimientos ?? []).filter((m) => m.material_id === materialId)
  let ingresosCant = 0
  let ingresosMonto = 0
  let salidasCant = 0
  for (const m of lista) {
    const cant = Number(m.cantidad) || 0
    const pu = Number(m.costo_unitario) || 0
    if (m.tipo === 'ingreso') {
      ingresosCant += cant
      ingresosMonto += cant * pu
    } else if (m.tipo === 'salida') {
      salidasCant += cant
    }
  }
  const stock = ingresosCant - salidasCant
  const precioPromedio = ingresosCant > 0 ? ingresosMonto / ingresosCant : 0
  return {
    ingresos: ingresosCant,
    salidas: salidasCant,
    stock,
    precioPromedio,
    valorizado: stock * precioPromedio,
  }
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

// Avance efectivo (recursivo): si la tarea tiene hijas, es el promedio
// ponderado por duración de sus subtareas (la padre pasa a ser nombre de
// grupo); si no, su propio avance.
export function avanceEfectivo(tarea, todas) {
  const hijas = hijasDe(todas ?? [], tarea.id)
  if (hijas.length === 0) return Number(tarea.avance) || 0
  const duracion = hijas.reduce((s, h) => s + duracionTarea(h), 0)
  if (!duracion) return 0
  return Math.round(
    hijas.reduce((s, h) => s + avanceEfectivo(h, todas) * duracionTarea(h), 0) / duracion,
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

// Proyección de mano de obra: cubre todos los meses desde el inicio del
// servicio (o el primer registro) hasta su fecha fin. Los meses con
// registros muestran el costo real; todos los meses vacíos se estiman con
// el ritmo (promedio de meses con costo), prorrateados si caen parciales al
// inicio o fin del servicio. Van marcados con estimado: true.
export function proyeccionLaboral(registrosPersonal, fechaFin, hoy = hoyISO(), fechaInicio = '', tarifaReferencia = 0) {
  const porMes = new Map()
  for (const r of registrosPersonal) {
    if (!r.fecha || r.fecha.length < 7) continue
    const mes = r.fecha.slice(0, 7)
    const actual = porMes.get(mes) ?? { mes, horas: 0, monto: 0 }
    actual.horas += Number(r.cantidad_o_horas) || 0
    actual.monto += Number(r.monto_calculado) || 0
    porMes.set(mes, actual)
  }
  const reales = [...porMes.values()].sort((a, b) => a.mes.localeCompare(b.mes))
  const conCosto = reales.filter((m) => m.monto > 0)
  const ritmo = conCosto.length
    ? conCosto.reduce((s, m) => s + m.monto, 0) / conCosto.length
    : 0
  // Meses con horas pero sin costo (registros viejos): se estiman con la
  // tarifa media (costo/hora de los meses con costo) o, si no hay ningún
  // mes con costo, con la tarifa de referencia de las fichas.
  const horasConCosto = conCosto.reduce((s, m) => s + m.horas, 0)
  const tarifaMedia = horasConCosto > 0
    ? conCosto.reduce((s, m) => s + m.monto, 0) / horasConCosto
    : (Number(tarifaReferencia) || 0)
  for (const m of reales) {
    if (m.horas > 0 && m.monto === 0 && tarifaMedia > 0) {
      m.monto = Math.round(m.horas * tarifaMedia * 100) / 100
      m.calculado = true
    }
  }
  const conHoras = reales.filter((m) => m.horas > 0)
  const ritmoHoras = conHoras.length
    ? conHoras.reduce((s, m) => s + m.horas, 0) / conHoras.length
    : 0

  let desde = fechaInicio && fechaInicio.length >= 7 ? fechaInicio.slice(0, 7) : ''
  if (!desde) desde = reales.length > 0 ? reales[0].mes : hoy.slice(0, 7)
  let hasta = fechaFin && fechaFin.length >= 7 ? fechaFin.slice(0, 7) : ''
  if (!hasta || hasta < desde) hasta = desde

  const meses = []
  let [anio, mes] = desde.split('-').map(Number)
  const [anioFin, mesFin] = hasta.split('-').map(Number)
  const mesDeInicio = fechaInicio && fechaInicio.length >= 7 ? fechaInicio.slice(0, 7) : ''
  const mesDeFin = fechaFin && fechaFin.length >= 7 ? fechaFin.slice(0, 7) : ''
  while (anio < anioFin || (anio === anioFin && mes <= mesFin)) {
    const clave = `${anio}-${String(mes).padStart(2, '0')}`
    const real = porMes.get(clave)
    if (real) {
      meses.push({ ...real, estimado: false })
      // Los meses reales pasados sin registros previos no existen aquí:
      // `real` solo existe si hubo registros ese mes.
    } else {
      // Mes vacío (pasado, actual o futuro): se estima con el ritmo,
      // prorrateado si cae parcial al inicio o fin del servicio.
      let factor = 1
      const diasMes = diasLaborables(clave)
      if (diasMes > 0) {
        if (clave === mesDeInicio && fechaInicio > `${clave}-01`) {
          factor = diasLaborablesRango(fechaInicio, `${clave}-${String(new Date(anio, mes, 0).getDate()).padStart(2, '0')}`) / diasMes
        }
        if (clave === mesDeFin && fechaFin < `${clave}-${String(new Date(anio, mes, 0).getDate()).padStart(2, '0')}`) {
          const diasCubiertos = diasLaborablesRango(`${clave}-01`, fechaFin)
          factor = Math.min(factor, diasCubiertos / diasMes)
        }
      }
      meses.push({
        mes: clave,
        horas: Math.round(ritmoHoras * factor * 100) / 100,
        monto: ritmo * factor,
        estimado: true,
      })
    }
    mes += 1
    if (mes > 12) {
      mes = 1
      anio += 1
    }
  }

  const mesesRestantes = meses.filter((m) => m.estimado).length
  const costoProyectado = meses
    .filter((m) => m.estimado)
    .reduce((s, m) => s + m.monto, 0)

  return {
    porMes: meses,
    ritmo,
    ritmoHoras,
    mesesRestantes,
    costoProyectado,
  }
}

// Agrupa registros de personal por persona y mes: una fila por persona por
// mes con días, horas y costo mensual. Para la vista registrada (los
// registros diarios siguen existiendo por debajo para los cálculos).
export function agruparPersonalPorMes(registros, personal = []) {
  const grupos = new Map()
  for (const r of registros) {
    if (r.tipo_registro !== 'personal' || !r.fecha || r.fecha.length < 7) continue
    const mes = r.fecha.slice(0, 7)
    const clave = `${r.referencia_id ?? 'x'}|${mes}`
    if (!grupos.has(clave)) {
      const persona = personal.find((p) => p.id === r.referencia_id)
      grupos.set(clave, {
        clave,
        personaId: r.referencia_id ?? null,
        nombre: persona
          ? `${persona.nombre} ${persona.apellido ?? ''}`.trim()
          : 'Personal eliminado',
        cargo: persona?.cargo ?? '',
        mes,
        dias: 0,
        horas: 0,
        monto: 0,
        ids: [],
      })
    }
    const g = grupos.get(clave)
    g.dias += 1
    g.horas += Number(r.cantidad_o_horas) || 0
    g.monto += Number(r.monto_calculado) || 0
    g.ids.push(r.id)
  }
  return [...grupos.values()].sort(
    (a, b) => a.mes.localeCompare(b.mes) || a.nombre.localeCompare(b.nombre, 'es'),
  )
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

// true si la fecha ISO cae en domingo (construcción local, sin desfase UTC).
export function esDomingo(fechaISO) {
  if (!fechaISO) return false
  const [anio, mes, dia] = fechaISO.split('-').map(Number)
  if (!anio || !mes || !dia) return false
  return new Date(anio, mes - 1, dia).getDay() === 0
}

// Los domingos no generan costo de mano de obra diaria: los registros de
// personal con fecha en domingo no cuentan, salvo los de modalidad mensual
// (régimen de 30 días, domingos incluidos). Materiales, gastos y equipos no
// se ven afectados.
export function cuentaComoManoDeObra(registro) {
  return !(
    registro.tipo_registro === 'personal' &&
    registro.modalidad !== 'mensual' &&
    esDomingo(registro.fecha)
  )
}

// Fechas ISO de los días laborables (sin domingos) de un mes YYYY-MM.
// Para generar la asignación mensual de personal de una sola vez.
export function fechasLaborablesMes(mesISO) {
  if (!mesISO) return []
  const [anio, mes] = mesISO.split('-').map(Number)
  if (!anio || !mes) return []
  const diasEnMes = new Date(anio, mes, 0).getDate()
  const fechas = []
  for (let dia = 1; dia <= diasEnMes; dia += 1) {
    if (new Date(anio, mes - 1, dia).getDay() !== 0) {
      fechas.push(`${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`)
    }
  }
  return fechas
}

// Fechas ISO de todos los días de un mes YYYY-MM (régimen mensual de
// 30 días: incluye domingos).
export function fechasDelMes(mesISO) {
  if (!mesISO) return []
  const [anio, mes] = mesISO.split('-').map(Number)
  if (!anio || !mes) return []
  const diasEnMes = new Date(anio, mes, 0).getDate()
  const fechas = []
  for (let dia = 1; dia <= diasEnMes; dia += 1) {
    fechas.push(`${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`)
  }
  return fechas
}

// Cobertura de tareo por persona y mes: días con registro vs días
// laborables esperados dentro del rango inicio→fin del servicio.
// Solo incluye personas con al menos un registro.
export function coberturaTareo(registrosPersonal, personal, fechaInicio, fechaFin) {
  const porPersonaMes = new Map()
  for (const r of registrosPersonal) {
    if (!r.fecha || r.fecha.length < 7) continue
    const mes = r.fecha.slice(0, 7)
    const clave = `${r.referencia_id ?? 'x'}|${mes}`
    if (!porPersonaMes.has(clave)) {
      porPersonaMes.set(clave, { personaId: r.referencia_id ?? null, mes, fechas: new Set() })
    }
    porPersonaMes.get(clave).fechas.add(r.fecha)
  }

  const nombreDe = (id) => {
    const p = (personal ?? []).find((x) => x.id === id)
    return p
      ? { nombre: `${p.nombre} ${p.apellido ?? ''}`.trim(), cargo: p.cargo ?? '' }
      : { nombre: 'Personal eliminado', cargo: '' }
  }

  const diasEsperadosEn = (mesISO) => {
    const [anio, numMes] = mesISO.split('-').map(Number)
    const ultimoDia = `${mesISO}-${String(new Date(anio, numMes, 0).getDate()).padStart(2, '0')}`
    let desde = `${mesISO}-01`
    let hasta = ultimoDia
    if (fechaInicio && fechaInicio.length >= 10 && fechaInicio.slice(0, 7) === mesISO && fechaInicio > desde) {
      desde = fechaInicio
    }
    if (fechaFin && fechaFin.length >= 10 && fechaFin.slice(0, 7) === mesISO && fechaFin < hasta) {
      hasta = fechaFin
    }
    if (hasta < desde) return 0
    return diasLaborablesRango(desde, hasta)
  }

  return [...porPersonaMes.values()]
    .map((g) => {
      const { nombre, cargo } = nombreDe(g.personaId)
      const esperados = diasEsperadosEn(g.mes)
      const registrados = g.fechas.size
      return {
        personaId: g.personaId,
        nombre,
        cargo,
        mes: g.mes,
        diasRegistrados: registrados,
        diasEsperados: esperados,
        completo: esperados > 0 && registrados >= esperados,
      }
    })
    .sort((a, b) => a.mes.localeCompare(b.mes) || a.nombre.localeCompare(b.nombre, 'es'))
}

// Fechas ISO de todos los días desde una fecha hasta fin de ese mes
// (domingos incluidos: régimen mensual). Para la asignación mensual que
// empieza a mitad de mes.
export function fechasHastaFinDeMes(desdeISO) {
  if (!desdeISO || desdeISO.length < 10) return []
  const [anio, mes, dia] = desdeISO.split('-').map(Number)
  if (!anio || !mes || !dia) return []
  const ultimo = new Date(anio, mes, 0).getDate()
  if (dia < 1 || dia > ultimo) return []
  const fechas = []
  for (let d = dia; d <= ultimo; d += 1) {
    fechas.push(`${anio}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }
  return fechas
}

// Fechas ISO de los días laborables (sin domingos) en un rango inclusive.
// Para generar asignaciones por rango de fechas.
export function fechasLaborables(desdeISO, hastaISO) {
  if (!desdeISO || !hastaISO || hastaISO < desdeISO) return []
  const [ai, mi, di] = desdeISO.split('-').map(Number)
  const [af, mf, df] = hastaISO.split('-').map(Number)
  if (!ai || !mi || !di || !af || !mf || !df) return []
  const fechas = []
  const actual = new Date(ai, mi - 1, di)
  const fin = new Date(af, mf - 1, df)
  while (actual <= fin) {
    if (actual.getDay() !== 0) {
      const mes = String(actual.getMonth() + 1).padStart(2, '0')
      const dia = String(actual.getDate()).padStart(2, '0')
      fechas.push(`${actual.getFullYear()}-${mes}-${dia}`)
    }
    actual.setDate(actual.getDate() + 1)
  }
  return fechas
}

// Días laborables (sin domingos) de un mes YYYY-MM. Para el estimador
// mensual de mano de obra.
export function diasLaborables(mesISO) {
  if (!mesISO) return 0
  const [anio, mes] = mesISO.split('-').map(Number)
  if (!anio || !mes) return 0
  const diasEnMes = new Date(anio, mes, 0).getDate()
  let laborables = 0
  for (let dia = 1; dia <= diasEnMes; dia += 1) {
    if (new Date(anio, mes - 1, dia).getDay() !== 0) laborables += 1
  }
  return laborables
}

// Días laborables en un rango ISO inclusive. Si el rango es inválido, 0.
export function diasLaborablesRango(desdeISO, hastaISO) {
  if (!desdeISO || !hastaISO || hastaISO < desdeISO) return 0
  const [ai, mi, di] = desdeISO.split('-').map(Number)
  const [af, mf, df] = hastaISO.split('-').map(Number)
  if (!ai || !mi || !di || !af || !mf || !df) return 0
  let laborables = 0
  const actual = new Date(ai, mi - 1, di)
  const fin = new Date(af, mf - 1, df)
  while (actual <= fin) {
    if (actual.getDay() !== 0) laborables += 1
    actual.setDate(actual.getDate() + 1)
  }
  return laborables
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

// Alertas del servicio: lista de {codigo, nivel: 'peligro'|'aviso', mensaje}.
// Centraliza todas las condiciones para que Resumen las muestre igual siempre.
export function alertasServicio({ servicio, consumo, dias, rentabilidad, coberturaIncompleta = 0 }) {
  const alertas = []

  if (consumo.excedido) {
    alertas.push({
      codigo: 'excedido',
      nivel: 'peligro',
      mensaje: 'El servicio superó su presupuesto.',
    })
  } else if (consumo.presupuesto > 0 && consumo.disponible / consumo.presupuesto < 0.1) {
    alertas.push({
      codigo: 'margen-bajo',
      nivel: 'aviso',
      mensaje: `Margen bajo: queda solo el ${((consumo.disponible / consumo.presupuesto) * 100).toFixed(1)}% del presupuesto.`,
    })
  }

  if (rentabilidad.cpi != null && rentabilidad.cpi < 0.9) {
    alertas.push({
      codigo: 'cpi-critico',
      nivel: 'peligro',
      mensaje: `Ritmo de gasto crítico (${rentabilidad.cpi.toFixed(2)}): gastas más rápido de lo que avanzas.`,
    })
  }

  if (dias !== null && dias < 0) {
    alertas.push({
      codigo: 'plazo-vencido',
      nivel: 'peligro',
      mensaje: `Plazo vencido hace ${Math.abs(dias)} día(s).`,
    })
  } else if (dias !== null && dias <= 15) {
    alertas.push({
      codigo: 'plazo-cercano',
      nivel: 'aviso',
      mensaje: dias === 0 ? 'El plazo vence hoy.' : `Quedan ${dias} día(s) de plazo.`,
    })
  }

  if (coberturaIncompleta > 0) {
    alertas.push({
      codigo: 'tareo-incompleto',
      nivel: 'aviso',
      mensaje: `${coberturaIncompleta} mes(es) persona con tareo incompleto.`,
    })
  }

  return alertas
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