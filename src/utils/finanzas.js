// Núcleo financiero centralizado (Etapa 2, §14 del programa maestro).
//
// TODAS las pantallas y reportes deben usar estas funciones: prohíbe calcular
// los mismos indicadores de forma diferente en cada componente.
//
// Política vigente (gerencial interna, validar con el
// contador antes de usar como base contable):
//   - Resultado de un servicio = cobrado − gastado (utilidad real, caja).
//   - Las facturas son registro documental con saldo y estado propios.
//   - Costos reconocidos = registros vigentes (excluye anulados/duplicados).
//   - El valorizado (monto × avance) solo mide avance físico en Partidas.
// Moneda predeterminada: PEN. Precisión: céntimos (redondeo bancario simple
// con Math.round; documentado como supuesto explícito, §18).
//
// Sin movimientos: devuelve 0 o null (no disponible), nunca NaN/Infinity.

const N = (valor) => Number(valor) || 0

export function redondear2(valor) {
  return Math.round(N(valor) * 100) / 100
}

// Resultado bruto = ingresos reconocidos − costos directos reconocidos.
export function resultadoBruto(ingresosReconocidos, costosDirectos) {
  return redondear2(N(ingresosReconocidos) - N(costosDirectos))
}

// Margen bruto (%) = resultado / ingresos × 100. null si ingresos = 0.
export function margenBruto(resultado, ingresosReconocidos) {
  if (N(ingresosReconocidos) === 0) return null
  return redondear2((N(resultado) / N(ingresosReconocidos)) * 100)
}

// Ejecución (%) = costo real / base × 100. null si base = 0.
export function porcentajeEjecucion(costoReal, base) {
  if (N(base) === 0) return null
  return redondear2((N(costoReal) / N(base)) * 100)
}

// Saldo por cobrar = facturado − cobrado (más notas que lo reduzcan).
export function saldoPorCobrar(facturado, cobrado, notasCredito = 0) {
  return redondear2(N(facturado) - N(cobrado) - N(notasCredito))
}

// Saldo por pagar = reconocido − pagado.
export function saldoPorPagar(reconocido, pagado) {
  return redondear2(N(reconocido) - N(pagado))
}

// Flujo neto de caja = entradas reales − salidas reales (≠ utilidad).
export function flujoNetoCaja(entradas, salidas) {
  return redondear2(N(entradas) - N(salidas))
}

// Resultado operativo estimado = bruto − indirectos − otros gastos.
export function resultadoOperativoEstimado(resultadoBrutoValor, indirectos = 0, otrosGastos = 0) {
  return redondear2(N(resultadoBrutoValor) - N(indirectos) - N(otrosGastos))
}

// Resultado por servicio con margen. Misma regla en dashboard y detalle.
export function resultadoPorServicio({ ingresos, directos, indirectos = 0 }) {
  const bruto = resultadoBruto(ingresos, directos)
  const operativo = resultadoOperativoEstimado(bruto, indirectos)
  return {
    resultadoBruto: bruto,
    margenBruto: margenBruto(bruto, ingresos),
    resultadoOperativo: operativo,
    margenOperativo: margenBruto(operativo, ingresos),
  }
}

// Vigencia de movimientos (Regla 5): anulados o duplicados no cuentan en
// los cálculos vigentes, pero conservan su historial.
export function esVigente(item) {
  return item != null && item.estado !== 'anulado' && item.duplicado_de == null
}

export function soloVigentes(items) {
  return (items ?? []).filter(esVigente)
}

// Pertenencia a un periodo mensual YYYY-MM por su fecha.
export function enMes(fechaISO, mesISO) {
  return typeof fechaISO === 'string' && fechaISO.slice(0, 7) === mesISO
}

// Pertenencia a un rango inclusivo (YYYY-MM-DD). Límites inequívocos.
export function enRango(fechaISO, desdeISO, hastaISO) {
  if (typeof fechaISO !== 'string') return false
  if (desdeISO && fechaISO < desdeISO) return false
  if (hastaISO && fechaISO > hastaISO) return false
  return true
}

// ------------------------------------------------------------
//  Facturas y cobros (sin módulo de pagos ni de cierre mensual)
// ------------------------------------------------------------

// Cobros aplicados a una factura (por factura_id). Sin vínculo = adelanto.
export function cobrosDeFactura(facturaId, cobros) {
  return (cobros ?? []).filter((c) => c.factura_id === facturaId)
}

// Saldo de factura = total − cobros aplicados − notas de crédito.
export function saldoFactura(factura, cobros) {
  const aplicado = cobrosDeFactura(factura.id, cobros).reduce(
    (s, c) => s + N(c.monto),
    0,
  )
  return redondear2(N(factura.total) - aplicado - N(factura.notas_credito))
}

// Estado calculado (no se guarda: deriva de saldo y vencimiento).
export function estadoFactura(factura, cobros, hoyISO = '') {
  if (factura.estado === 'anulada') return 'anulada'
  const saldo = saldoFactura(factura, cobros)
  if (saldo <= 0) return 'cobrada'
  if (saldo < N(factura.total)) return 'parcial'
  const hoy = hoyISO || new Date().toISOString().slice(0, 10)
  if (factura.fecha_vencimiento && factura.fecha_vencimiento < hoy) return 'vencida'
  return 'emitida'
}
