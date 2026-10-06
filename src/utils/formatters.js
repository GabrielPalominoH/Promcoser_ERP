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