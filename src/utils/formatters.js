const monedaFormatter = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
})

const numeroFormatter = new Intl.NumberFormat('es-PE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const cantidadFormatter = new Intl.NumberFormat('es-PE', {
  maximumFractionDigits: 2,
})

export function formatearMoneda(valor) {
  return monedaFormatter.format(Number(valor) || 0)
}

export function formatearNumero(valor) {
  return numeroFormatter.format(Number(valor) || 0)
}

export function formatearCantidad(valor) {
  return cantidadFormatter.format(Number(valor) || 0)
}

export function formatearFecha(fechaISO) {
  if (!fechaISO) return '—'

  const [anio, mes, dia] = fechaISO.split('-')
  return `${dia}/${mes}/${anio}`
}

export function porcentaje(parte, total) {
  if (!total) return 0
  return Math.min(100, Math.max(0, (parte / total) * 100))
}

// Los montos se guardan redondeados a 2 decimales para evitar ruido de coma flotante.
export function redondearMonto(valor) {
  return Math.round((Number(valor) || 0) * 100) / 100
}

// --- Captura de montos ---------------------------------------------------
// Mientras se escribe un monto se agrupan los miles con coma y se usa el
// punto como separador decimal (igual que formatearMoneda). Trabajan con
// texto para no perder lo que el usuario teclea (un "." o un "0." a medias).

// Deja solo dígitos y un separador decimal (punto), con hasta 2 decimales.
// Las comas se leen como separador de miles. Devuelve '' si no hay dígitos.
export function normalizarEntradaMonto(texto) {
  if (texto == null) return ''
  const limpio = String(texto).replace(/[^\d.,]/g, '').replace(/,/g, '')
  const [enteroCrudo, ...resto] = limpio.split('.')
  const entero = enteroCrudo.replace(/^0+(?=\d)/, '')
  if (resto.length === 0) return entero
  return `${entero || '0'}.${resto.join('').slice(0, 2)}`
}

// Agrupa los miles cada 3 cifras: "1234567.5" -> "1,234,567.5".
export function formatearEntradaMonto(valor) {
  const canonico = normalizarEntradaMonto(valor)
  if (canonico === '') return ''
  const [entero, fraccion] = canonico.split('.')
  const agrupado = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return fraccion === undefined ? agrupado : `${agrupado}.${fraccion}`
}

// Número listo para guardar (o '' si el campo está vacío).
export function parsearEntradaMonto(texto) {
  const canonico = normalizarEntradaMonto(texto)
  if (canonico === '') return ''
  const numero = Number(canonico)
  return Number.isNaN(numero) ? '' : numero
}

const MESES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// 'YYYY-MM' -> 'ene 2026'. Si trae día, lo ignora.
export function formatearMes(mesISO) {
  if (!mesISO) return '—'
  const [anio, mes] = mesISO.split('-').map(Number)
  if (!anio || !mes) return mesISO
  return `${MESES_CORTO[mes - 1]} ${anio}`
}