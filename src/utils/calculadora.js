// Cálculos derivados de registros_servicio. Todo local, sin backend.

export function registrosDeServicio(registros, servicioId) {
  return registros.filter((registro) => registro.servicio_id === servicioId)
}

// ------------------------------------------------------------
//  Montos por tareas (viven en el cronograma)
// ------------------------------------------------------------

// ¿Tiene hijas directas? Entonces su monto es suma automática.
export function tieneHijas(tareaId, tareas) {
  return (tareas ?? []).some((t) => t.padre_id === tareaId)
}

// Monto de una tarea: si tiene hijas, suma automática (solo lectura);
// si no, su monto manual.
export function montoTarea(tarea, tareas) {
  const hijas = (tareas ?? []).filter((t) => t.padre_id === tarea.id)
  if (hijas.length === 0) return Number(tarea.monto) || 0
  return hijas.reduce((total, h) => total + montoTarea(h, tareas), 0)
}

// Costo propio de una tarea: suma de sus registros dentro del servicio.
export function costoPorTarea(registros, servicioId, tareaId) {
  return (registros ?? [])
    .filter((r) => r.servicio_id === servicioId && r.tarea_id === tareaId)
    .reduce((total, r) => total + (Number(r.monto_calculado) || 0), 0)
}

// Costo del subárbol: propio más el de todas las descendientes.
export function costoSubarbol(tarea, tareas, registros, servicioId) {
  const propio = costoPorTarea(registros, servicioId, tarea.id)
  return (tareas ?? [])
    .filter((t) => t.padre_id === tarea.id)
    .reduce(
      (total, h) => total + costoSubarbol(h, tareas, registros, servicioId),
      propio,
    )
}

// Valorizado de una tarea: monto × avance efectivo (lo ya ejecutado).
export function valorizadoTarea(tarea, tareas) {
  return montoTarea(tarea, tareas) * (avanceEfectivo(tarea, tareas) / 100)
}

// Monto total del servicio: suma de los montos de sus tareas principales.
export function presupuestoTareas(tareas, servicioId) {
  return (tareas ?? [])
    .filter((t) => t.servicio_id === servicioId && t.padre_id == null)
    .reduce((total, t) => total + montoTarea(t, tareas), 0)
}

// Días estimados de una tarea: su duración planificada (fin − inicio + 1).
// Si tiene hijas, suma automática como los montos; si no, su propia duración.
export function diasEstimadosTarea(tarea, tareas) {
  const hijas = (tareas ?? []).filter((t) => t.padre_id === tarea.id)
  if (hijas.length === 0) return duracionTarea(tarea)
  return hijas.reduce((total, h) => total + diasEstimadosTarea(h, tareas), 0)
}

// Días reales de personal en una tarea: fechas distintas con registros de
// personal propios o de descendientes. Solo tipo personal (mano de obra).
export function diasRealesTarea(tarea, tareas, registros, servicioId) {
  const ids = new Set([tarea.id])
  let cambio = true
  while (cambio) {
    cambio = false
    for (const t of tareas ?? []) {
      if (!ids.has(t.id) && t.padre_id != null && ids.has(t.padre_id)) {
        ids.add(t.id)
        cambio = true
      }
    }
  }
  const fechas = new Set()
  for (const r of registros ?? []) {
    if (r.servicio_id !== servicioId || r.tipo_registro !== 'personal' || !r.fecha) continue
    if (r.tarea_id != null && ids.has(r.tarea_id)) fechas.add(r.fecha.slice(0, 10))
  }
  return fechas.size
}

// Desviación de días: real − estimado (+ = más días de los planeados).
// Porcentaje null sin estimado (no hay base contra qué comparar).
export function desviacionDias(estimado, real) {
  const e = Number(estimado) || 0
  const r = Number(real) || 0
  return {
    diferencia: r - e,
    porcentaje: e === 0 ? null : Math.round(((r / e) * 100) * 100) / 100,
  }
}

// Costo sin tarea asignada dentro del servicio.
export function costoSinTarea(registros, servicioId) {
  return (registros ?? [])
    .filter((r) => r.servicio_id === servicioId && r.tarea_id == null)
    .reduce((total, r) => total + (Number(r.monto_calculado) || 0), 0)
}

// ------------------------------------------------------------
//  Asignaciones de personal: costo directo automático + proyección
//  Opción A: sin tareo ni asentamiento manual. El gasto devengado de cada
//  mes se deriva de las asignaciones vigentes (días × horas × tarifa,
//  prorrateado) y se materializa en registros mensuales con asignacion_id.
//  La proyección = devengado (registros) + futuro (cálculo).
// ------------------------------------------------------------

// Días calendario (incluye domingos: régimen mensual) en un rango inclusive.
export function diasCalendarioRango(desdeISO, hastaISO) {
  if (!desdeISO || !hastaISO || hastaISO < desdeISO) return 0
  const [ai, mi, di] = desdeISO.split('-').map(Number)
  const [af, mf, df] = hastaISO.split('-').map(Number)
  if (!ai || !mi || !di || !af || !mf || !df) return 0
  const ms = new Date(af, mf - 1, df) - new Date(ai, mi - 1, di)
  return Math.round(ms / 86400000) + 1
}

export function ultimoDiaMes(mesISO) {
  const [anio, mes] = mesISO.split('-').map(Number)
  return `${mesISO}-${String(new Date(anio, mes, 0).getDate()).padStart(2, '0')}`
}

// Costo de una asignación en un mes (régimen 30 días): mes completo = 30 ×
// horas × tarifa; parcial = días trabajados × horas × tarifa (tope 30).
// Si se pasa el servicio, se recorta por su inicio y fin estimado.
export function costoMensualAsignacion(asignacion, mesISO, servicio = null) {
  const inicioMes = `${mesISO}-01`
  const finMes = ultimoDiaMes(mesISO)
  const desde = [inicioMes, asignacion.fecha_inicio, servicio?.fecha_inicio]
    .filter(Boolean)
    .sort()
    .at(-1)
  const topes = [finMes, asignacion.fecha_fin, servicio?.fecha_fin_estimada].filter(Boolean).sort()
  const hasta = topes[0]
  const diasReales = diasCalendarioRango(desde, hasta)
  if (diasReales <= 0) return { dias: 0, horas: 0, monto: 0 }
  const cubreMesCompleto = desde <= inicioMes && hasta >= finMes
  const dias = cubreMesCompleto ? 30 : Math.min(diasReales, 30)
  const horas = dias * (Number(asignacion.horas_por_dia) || 0)
  const monto = Math.round(horas * (Number(asignacion.tarifa) || 0) * 100) / 100
  return { dias, horas, monto }
}

// Meses YYYY-MM entre dos meses inclusive.
export function mesesEntre(desdeMes, hastaMes) {
  if (!desdeMes || !hastaMes || hastaMes < desdeMes) return []
  const [ai, mi] = desdeMes.split('-').map(Number)
  const [af, mf] = hastaMes.split('-').map(Number)
  const lista = []
  let anio = ai
  let mes = mi
  while (anio < af || (anio === af && mes <= mf)) {
    lista.push(`${anio}-${String(mes).padStart(2, '0')}`)
    mes += 1
    if (mes > 12) {
      mes = 1
      anio += 1
    }
  }
  return lista
}

// ¿El mes ya tiene registro devengado para esta asignación?
export function asentamientoDe(asignacionId, registros, mesISO) {
  return (registros ?? []).find(
    (r) =>
      r.asignacion_id === asignacionId &&
      r.fecha &&
      r.fecha.slice(0, 7) === mesISO,
  ) ?? null
}

// Mes actual YYYY-MM (corte de devengo: lo pasado cuenta, lo futuro proyecta).
export function mesHoy() {
  return new Date().toISOString().slice(0, 7)
}

// Meses devengados de una asignación hasta hoy (inclusive), recortados por
// vigencia de la asignación y fin estimado del servicio.
export function mesesDevengadosAsignacion(asignacion, servicio, hoyMes) {
  const inicioMes = (asignacion.fecha_inicio || '').slice(0, 7)
  const finVigencia = asignacion.fecha_fin || servicio?.fecha_fin_estimada || hoyMes
  const finMes = finVigencia.slice(0, 7)
  const hasta = finMes < hoyMes ? finMes : hoyMes
  const meses = mesesEntre(inicioMes, hasta)
  return meses.filter((m) => costoMensualAsignacion(asignacion, m, servicio).monto > 0)
}

// Proyección de mano de obra inicio→fin desde las asignaciones: meses
// devengados (registros auto) + meses futuros proyectados. Al dar de baja
// (fecha_fin), los meses futuros desaparecen y el total baja; lo devengado
// hasta hoy se conserva.
export function proyeccionAsignaciones(asignaciones, servicio, registros) {
  const lista = (asignaciones ?? []).filter((a) => a.servicio_id === servicio.id)
  if (lista.length === 0) {
    return { porMes: [], gastado: 0, proyectado: 0, total: 0 }
  }
  const inicios = lista.map((a) => a.fecha_inicio.slice(0, 7))
  const fines = lista.map((a) =>
    (a.fecha_fin || servicio.fecha_fin_estimada || '').slice(0, 7),
  )
  const desde = [servicio.fecha_inicio?.slice(0, 7), ...inicios].filter(Boolean).sort()[0]
  const hasta = [...fines, servicio.fecha_fin_estimada?.slice(0, 7)].filter(Boolean).sort().at(-1)
  const porMes = mesesEntre(desde, hasta).map((mes) => {
    let monto = 0
    let estimado = true
    for (const a of lista) {
      const asentado = asentamientoDe(a.id, registros, mes)
      if (asentado) {
        monto += Number(asentado.monto_calculado) || 0
        estimado = false
      } else {
        monto += costoMensualAsignacion(a, mes, servicio).monto
      }
    }
    return { mes, monto: Math.round(monto * 100) / 100, estimado }
  })
  const gastado = porMes.filter((m) => !m.estimado).reduce((s, m) => s + m.monto, 0)
  const proyectado = porMes.filter((m) => m.estimado).reduce((s, m) => s + m.monto, 0)
  return { porMes, gastado, proyectado, total: gastado + proyectado }
}

// Diferencia para sincronización automática (Opción A): qué registros
// mensuales de personal crear, actualizar o eliminar para que lo devengado
// hasta hoy refleje las asignaciones vigentes. Puro, sin efectos.
export function diferenciaPersonalAuto(asignaciones, servicio, registros, hoyMes) {
  const lista = (asignaciones ?? []).filter((a) => a.servicio_id === servicio.id)
  const todos = registros ?? []
  const porCrear = []
  const porActualizar = []
  const validos = new Set()
  for (const a of lista) {
    for (const mes of mesesDevengadosAsignacion(a, servicio, hoyMes)) {
      const { monto, horas } = costoMensualAsignacion(a, mes, servicio)
      if (monto <= 0) continue
      const existente = asentamientoDe(a.id, todos, mes)
      if (!existente) {
        porCrear.push({
          servicio_id: servicio.id,
          tipo_registro: 'personal',
          modalidad: 'mensual',
          referencia_id: a.personal_id,
          tarea_id: a.tarea_id,
          asignacion_id: a.id,
          cantidad_o_horas: horas,
          monto_calculado: Math.round(monto * 100) / 100,
          fecha: ultimoDiaMes(mes),
        })
      } else {
        validos.add(existente.id)
        const montoOk = Math.abs((Number(existente.monto_calculado) || 0) - monto) < 0.005
        const horasOk = Math.abs((Number(existente.cantidad_o_horas) || 0) - horas) < 0.005
        const tareaOk = (existente.tarea_id ?? null) === (a.tarea_id ?? null)
        const personaOk = existente.referencia_id === a.personal_id
        if (!montoOk || !horasOk || !tareaOk || !personaOk) {
          porActualizar.push({
            id: existente.id,
            referencia_id: a.personal_id,
            tarea_id: a.tarea_id,
            cantidad_o_horas: horas,
            monto_calculado: Math.round(monto * 100) / 100,
          })
        }
      }
    }
  }
  const idsPorEliminar = todos
    .filter(
      (r) =>
        r.asignacion_id != null &&
        r.servicio_id === servicio.id &&
        !validos.has(r.id) &&
        // Solo se eliminan futuros o de asignaciones ya inexistentes; lo
        // devengado válido se conserva.
        (r.fecha?.slice(0, 7) > hoyMes ||
          !lista.some((a) => a.id === r.asignacion_id)),
    )
    .map((r) => r.id)
  return { porCrear, porActualizar, idsPorEliminar }
}

// ------------------------------------------------------------
//  Cobros: lo que realmente entra por cada servicio
// ------------------------------------------------------------

// Total cobrado de un servicio.
export function cobradoServicio(cobros, servicioId) {
  return (cobros ?? [])
    .filter((c) => c.servicio_id === servicioId)
    .reduce((total, c) => total + (Number(c.monto) || 0), 0)
}

// Utilidad real: cobrado menos gastado (resultado económico efectivo).
export function utilidadReal(cobrado, gastado) {
  const redondear = (n) => Math.round(n * 100) / 100
  return redondear(cobrado) - redondear(gastado)
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

// Estado del presupuesto inicial frente a lo real: gastado, disponible,
// % de ejecución, excedido y cobrado. Solo lectura de control (sin
// proyecciones).
export function estadoPresupuesto(servicio, registros, cobros) {
  const gastado = sumarMontos(registrosDeServicio(registros, servicio.id))
  const presupuesto = Number(servicio.presupuesto_asignado) || 0
  const porcentaje = presupuesto ? (gastado / presupuesto) * 100 : 0

  return {
    gastado,
    presupuesto,
    disponible: presupuesto - gastado,
    porcentaje,
    excedido: gastado > presupuesto,
    cobrado: cobradoServicio(cobros, servicio.id),
  }
}

export function ordenarPorFechaDesc(registros) {
  return [...registros].sort((a, b) => {
    if (a.fecha === b.fecha) return b.id - a.id
    return b.fecha.localeCompare(a.fecha)
  })
}

export function nombreReferencia(registro, { personal, materiales = [], equipos = [] }) {
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

// Horas de personal por mes (YYYY-MM) con meses intermedios en cero,
// ordenado. Misma forma de serie continua que gastoPorMes.
export function horasPorMes(registros, servicioId) {
  const porMes = new Map()
  for (const r of registros ?? []) {
    if (r.servicio_id !== servicioId || r.tipo_registro !== 'personal') continue
    if (!r.fecha || r.fecha.length < 7) continue
    const mes = r.fecha.slice(0, 7)
    porMes.set(mes, (porMes.get(mes) || 0) + (Number(r.cantidad_o_horas) || 0))
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
    resultado.push({ mes: clave, horas: Math.round((porMes.get(clave) || 0) * 100) / 100 })
    mes += 1
    if (mes > 12) {
      mes = 1
      anio += 1
    }
  }
  return resultado
}

// Media móvil simple de una serie de números (ventana de 3 por defecto).
// Con menos datos que la ventana, promedia lo que hay (nunca ficticio).
export function mediaMovil(valores, ventana = 3) {
  return (valores ?? []).map((_, i) => {
    const tramo = valores.slice(Math.max(0, i - ventana + 1), i + 1)
    return Math.round((tramo.reduce((s, v) => s + v, 0) / tramo.length) * 100) / 100
  })
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

// Proyección financiera al 100% de la obra (estimado, no ejecutado):
// extrapolación lineal del ritmo actual. Valor ganado = lo que "vale" lo
// avanzado a precios del presupuesto; CPI = eficiencia del gasto;
// costo final = gastado / avance; utilidad proyectada = presupuesto − costo
// final. Sin avance (> 0) no hay proyección: todo null.
// El semáforo combina margen, ritmo de gasto y ritmo de avance (SPI):
// verde = margen protegido, amarillo = riesgo de plazo o margen estrecho,
// rojo = pérdida proyectada o sobrecosto crítico.
export function proyeccionFinanciera({ presupuesto, gastado, cobrado, avance, spi = null }) {
  const r2 = (n) => Math.round(n * 100) / 100
  const P = Number(presupuesto) || 0
  const G = Number(gastado) || 0
  const C = Number(cobrado) || 0
  const A = Number(avance) || 0

  if (A <= 0 || P <= 0) {
    return {
      tieneProyeccion: false,
      valorGanado: null,
      cpi: null,
      costoFinal: null,
      utilidadProyectada: null,
      margenProyectadoPct: null,
      cobroProyectado: null,
      faltanteCobro: null,
      semaforo: null,
    }
  }

  const tanto = A / 100
  const valorGanado = r2(P * tanto)
  const cpi = G > 0 ? r2(valorGanado / G) : null
  const costoFinal = r2(G / tanto)
  const utilidadProyectada = r2(P - costoFinal)
  const margenProyectadoPct = r2((utilidadProyectada / P) * 100)
  const cobroProyectado = r2(C / tanto)
  const faltanteCobro = r2(P - cobroProyectado)

  let semaforo = 'verde'
  if (utilidadProyectada <= 0 || (cpi != null && cpi < 0.9)) {
    semaforo = 'rojo'
  } else if ((spi != null && spi < 0.9) || utilidadProyectada < P * 0.1) {
    semaforo = 'amarillo'
  }

  return {
    tieneProyeccion: true,
    valorGanado,
    cpi,
    costoFinal,
    utilidadProyectada,
    margenProyectadoPct,
    cobroProyectado,
    faltanteCobro,
    semaforo,
  }
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

// Alertas del servicio: lista de {codigo, nivel: 'peligro'|'aviso', mensaje}.
// Centraliza todas las condiciones para que Resumen las muestre igual siempre.
export function alertasServicio({ estado, dias }) {
  const alertas = []

  if (estado.excedido) {
    alertas.push({
      codigo: 'excedido',
      nivel: 'peligro',
      mensaje: 'El servicio superó su presupuesto inicial.',
    })
  } else if (estado.presupuesto > 0 && estado.disponible / estado.presupuesto < 0.1) {
    alertas.push({
      codigo: 'margen-bajo',
      nivel: 'aviso',
      mensaje: `Margen bajo: queda solo el ${((estado.disponible / estado.presupuesto) * 100).toFixed(1)}% del presupuesto.`,
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

  return alertas
}
