// Calendario laboral de obra: días laborables de la semana y feriados.
//
// Alimenta la programación (motor CPM) y la duración de las tareas: una obra
// no trabaja domingos ni feriados, así que la duración se mide en días
// laborables, igual que el calendario de un proyecto en Primavera P6.
//
// Todo es puro y trabaja con fechas ISO (YYYY-MM-DD) en horario local, sin
// desfase UTC.

// 0 = domingo … 6 = sábado (getDay de JS).
export const DIAS_SEMANA = [
  { valor: 1, etiqueta: 'Lun' },
  { valor: 2, etiqueta: 'Mar' },
  { valor: 3, etiqueta: 'Mié' },
  { valor: 4, etiqueta: 'Jue' },
  { valor: 5, etiqueta: 'Vie' },
  { valor: 6, etiqueta: 'Sáb' },
  { valor: 0, etiqueta: 'Dom' },
]

// Por defecto: lunes a sábado (jornada típica de construcción).
export const CALENDARIO_POR_DEFECTO = {
  dias_laborables: [1, 2, 3, 4, 5, 6],
  feriados: [],
}

function parsear(iso) {
  const [a, m, d] = String(iso).split('-').map(Number)
  return new Date(a, m - 1, d)
}

function aISO(fecha) {
  const m = String(fecha.getMonth() + 1).padStart(2, '0')
  const d = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${m}-${d}`
}

export function sumarDiasISO(iso, n) {
  const fecha = parsear(iso)
  fecha.setDate(fecha.getDate() + n)
  return aISO(fecha)
}

export function diaSemana(iso) {
  return parsear(iso).getDay()
}

// Normaliza el calendario guardado en el servicio con el respaldo por defecto.
export function normalizarCalendario(calendario) {
  const dias = Array.isArray(calendario?.dias_laborables) && calendario.dias_laborables.length
    ? calendario.dias_laborables.map(Number)
    : CALENDARIO_POR_DEFECTO.dias_laborables
  const feriados = Array.isArray(calendario?.feriados)
    ? calendario.feriados.filter(Boolean).map(String)
    : []
  return { dias_laborables: dias, feriados }
}

// Calendario vigente de un servicio (con respaldo por defecto).
export function calendarioDe(servicio) {
  return normalizarCalendario(servicio?.calendario)
}

export function esLaborable(iso, calendario) {
  const c = normalizarCalendario(calendario)
  if (!iso) return false
  if (c.feriados.includes(iso)) return false
  return c.dias_laborables.includes(diaSemana(iso))
}

// Primer día laborable en/hasta `iso` (inclusive).
export function siguienteLaborable(iso, calendario) {
  let f = iso
  let guarda = 0
  while (!esLaborable(f, calendario) && guarda < 3700) {
    f = sumarDiasISO(f, 1)
    guarda += 1
  }
  return f
}

// Último día laborable en/antes de `iso` (inclusive).
export function anteriorLaborable(iso, calendario) {
  let f = iso
  let guarda = 0
  while (!esLaborable(f, calendario) && guarda < 3700) {
    f = sumarDiasISO(f, -1)
    guarda += 1
  }
  return f
}

// Días laborables dentro de [desde, hasta] inclusive. 0 si el rango es vacío.
export function diasLaborablesRango(desde, hasta, calendario) {
  if (!desde || !hasta || hasta < desde) return 0
  let f = desde
  let total = 0
  let guarda = 0
  while (f <= hasta && guarda < 4000) {
    if (esLaborable(f, calendario)) total += 1
    f = sumarDiasISO(f, 1)
    guarda += 1
  }
  return total
}

// Suma n días laborables a `iso` (iso se cuenta si ya es laborable; con n = 0
// devuelve el primer día laborable en/después de iso).
export function sumarDiasLaborables(iso, n, calendario) {
  let f = siguienteLaborable(iso, calendario)
  let restantes = Math.max(0, Math.round(Number(n) || 0))
  let guarda = 0
  while (restantes > 0 && guarda < 5000) {
    f = sumarDiasISO(f, 1)
    if (esLaborable(f, calendario)) restantes -= 1
    guarda += 1
  }
  return f
}

// Resta n días laborables a `iso` (con n = 0, último día laborable en/antes).
export function restarDiasLaborables(iso, n, calendario) {
  let f = anteriorLaborable(iso, calendario)
  let restantes = Math.max(0, Math.round(Number(n) || 0))
  let guarda = 0
  while (restantes > 0 && guarda < 5000) {
    f = sumarDiasISO(f, -1)
    if (esLaborable(f, calendario)) restantes -= 1
    guarda += 1
  }
  return f
}
