// Núcleo financiero centralizado (Etapa 2, §14 del programa maestro).
//
// TODAS las pantallas y reportes deben usar estas funciones: prohíbe calcular
// los mismos indicadores de forma diferente en cada componente.
//
// Política de reconocimiento vigente (gerencial interna, validar con el
// contador antes de usar como base contable):
//   - Ingresos reconocidos de un servicio = valorizado (monto × avance).
//   - Costos reconocidos = registros vigentes (excluye anulados/duplicados).
//   - Cobros y pagos mueven caja, no resultado.
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

// Desviación = costo real − presupuesto vigente (+ = sobrecosto).
export function desviacionPresupuesto(costoReal, presupuestoVigente) {
  return redondear2(N(costoReal) - N(presupuestoVigente))
}

// Ejecución (%) = costo real / presupuesto × 100. null si presupuesto = 0.
export function porcentajeEjecucion(costoReal, presupuestoVigente) {
  if (N(presupuestoVigente) === 0) return null
  return redondear2((N(costoReal) / N(presupuestoVigente)) * 100)
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

// ------------------------------------------------------------
//  Presupuesto por categorías (Etapa 6)
// ------------------------------------------------------------

// Inicial / adicional / vigente por categoría + totales. Lo no registrado
// en una categoría simplemente vale 0 (nunca ficticio).
export function presupuestoPorCategoria(presupuestos, servicioId) {
  const porCategoria = {}
  for (const p of presupuestos ?? []) {
    if (p.servicio_id !== servicioId) continue
    const cat = p.categoria || 'Otros costos directos'
    if (!porCategoria[cat]) porCategoria[cat] = { inicial: 0, adicional: 0 }
    if (p.version === 'adicional') porCategoria[cat].adicional += N(p.monto)
    else porCategoria[cat].inicial += N(p.monto)
  }
  let inicialTotal = 0
  let adicionalTotal = 0
  for (const cat of Object.values(porCategoria)) {
    cat.vigente = redondear2(cat.inicial + cat.adicional)
    cat.inicial = redondear2(cat.inicial)
    cat.adicional = redondear2(cat.adicional)
    inicialTotal += cat.inicial
    adicionalTotal += cat.adicional
  }
  return {
    porCategoria,
    inicialTotal: redondear2(inicialTotal),
    adicionalTotal: redondear2(adicionalTotal),
    vigenteTotal: redondear2(inicialTotal + adicionalTotal),
  }
}

// Costo real por categoría desde los registros vigentes del servicio.
// Equipos según propiedad; gastos según su categoría; lo demás mapea fijo.
export function realPorCategoria(registros, servicioId, equipos) {
  const porCategoria = {}
  let sinCategoria = 0
  const equipoPorId = new Map((equipos ?? []).map((e) => [e.id, e]))
  for (const r of soloVigentes(registros ?? [])) {
    if (r.servicio_id !== servicioId) continue
    const monto = N(r.monto_calculado)
    if (r.tipo_registro === 'gasto' && !r.categoria) {
      sinCategoria += monto
      continue
    }
    let cat = null
    if (r.tipo_registro === 'equipo') {
      const eq = equipoPorId.get(r.referencia_id)
      cat = (eq?.propiedad ?? 'Propio') === 'Alquilado' ? 'Equipos alquilados' : 'Equipos propios'
    } else if (r.tipo_registro === 'personal') {
      cat = 'Mano de obra'
    } else if (r.tipo_registro === 'material') {
      cat = 'Materiales'
    } else {
      const mapa = {
        Transporte: 'Transporte y movilización',
        Alimentación: 'Viáticos y alojamiento',
        Alojamiento: 'Viáticos y alojamiento',
        Herramientas: 'Herramientas y consumibles',
        Subcontratos: 'Subcontratos',
      }
      cat = mapa[r.categoria] ?? 'Otros costos directos'
    }
    porCategoria[cat] = redondear2((porCategoria[cat] || 0) + monto)
  }
  return { porCategoria, sinCategoria: redondear2(sinCategoria) }
}

// Desviación de una categoría + ejecución (null si vigente = 0).
export function desviacionCategoria(vigente, real) {
  const v = N(vigente)
  const r = N(real)
  return {
    desviacion: redondear2(r - v),
    ejecucion: v === 0 ? null : redondear2((r / v) * 100),
    excedida: v > 0 && r > v,
  }
}

// ------------------------------------------------------------
//  Distribución de indirectos (regla configurable, §9/§11)
// ------------------------------------------------------------

export const REGLAS_INDIRECTOS = ['ninguna', 'horas', 'costos', 'ingresos']

// Reparte un total entre servicios en proporción a sus bases. Redondea a
// céntimos y asigna el residuo al de mayor base (cuadra exacto).
// Sin regla ('ninguna') o sin bases: todo queda sin distribuir.
export function distribuirIndirectos(total, basesPorServicio) {
  const T = N(total)
  const lista = (basesPorServicio ?? []).filter((b) => N(b.base) > 0)
  const sumaBases = lista.reduce((s, b) => s + N(b.base), 0)
  if (T === 0 || lista.length === 0 || sumaBases <= 0) {
    return {
      regla: 'ninguna',
      distribuido: [],
      sinDistribuir: redondear2(T),
    }
  }
  const ordenada = [...lista].sort((a, b) => N(b.base) - N(a.base))
  // Prorrateo exacto: todos menos el mayor, residuo al mayor.
  let resto = T
  const resultado = ordenada.map((b, i) => {
    if (i === 0) return { ...b, monto: 0 }
    const m = redondear2((T * N(b.base)) / sumaBases)
    resto = redondear2(resto - m)
    return { ...b, monto: m }
  })
  resultado[0] = { ...resultado[0], monto: redondear2(resto) }
  const acumulado = resultado.reduce((s, r) => s + r.monto, 0)
  return { regla: 'aplicada', distribuido: resultado, sinDistribuir: redondear2(T - acumulado) }
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
//  Facturas, pagos y caja (Etapas 4–5)
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

// Pagos aplicados a un gasto (por gasto_id = id del registro de gasto).
export function pagosDeGasto(gastoId, pagos) {
  return (pagos ?? []).filter((p) => p.gasto_id === gastoId)
}

// Saldo por pagar de un gasto = reconocido − pagos aplicados.
export function saldoGasto(gastoMonto, gastoId, pagos) {
  const pagado = pagosDeGasto(gastoId, pagos).reduce((s, p) => s + N(p.monto), 0)
  return redondear2(N(gastoMonto) - pagado)
}

// Horas hombre del mes: tareo aprobado cuando existe; si no hay tareo,
// registros de personal del mes (supuesto explícito y reversible).
export function horasMes(mesISO, registros, tareos) {
  const tareoAprobado = (tareos ?? []).filter(
    (t) => enMes(t.fecha, mesISO) && t.estado === 'aprobado',
  )
  if (tareoAprobado.length > 0) {
    const normales = tareoAprobado.reduce((s, t) => s + N(t.horas_normales), 0)
    const extras = tareoAprobado.reduce((s, t) => s + N(t.horas_extras), 0)
    const costo = tareoAprobado.reduce(
      (s, t) => s + N(t.horas_normales) * N(t.tarifa_hora) + N(t.horas_extras) * N(t.tarifa_extra),
      0,
    )
    return { normales, extras, total: normales + extras, costo: redondear2(costo), fuente: 'tareo' }
  }
  const regs = (registros ?? []).filter(
    (r) => r.tipo_registro === 'personal' && enMes(r.fecha, mesISO),
  )
  const total = regs.reduce((s, r) => s + N(r.cantidad_o_horas), 0)
  return {
    normales: total,
    extras: 0,
    total,
    costo: redondear2(regs.reduce((s, r) => s + N(r.monto_calculado), 0)),
    fuente: 'registros',
  }
}

// Snapshot de cierre mensual: foto congelada de los totales del mes.
// Las correcciones posteriores no alteran este objeto (trazabilidad).
export function generarCierre(mesISO, estado) {
  const regs = (estado.registros_servicio ?? []).filter((r) => enMes(r.fecha, mesISO))
  const facturas = (estado.facturas ?? []).filter((f) => enMes(f.fecha_emision, mesISO))
  const cobros = (estado.cobros ?? []).filter((c) => enMes(c.fecha, mesISO))
  const pagos = (estado.pagos ?? []).filter((p) => enMes(p.fecha, mesISO))
  const facturado = redondear2(facturas.reduce((s, f) => s + N(f.total), 0))
  const cobrado = redondear2(cobros.reduce((s, c) => s + N(c.monto), 0))
  const gastado = redondear2(regs.reduce((s, r) => s + N(r.monto_calculado), 0))
  const pagado = redondear2(pagos.reduce((s, p) => s + N(p.monto), 0))
  const horas = horasMes(mesISO, estado.registros_servicio, estado.tareos)
  const porServicio = (estado.servicios ?? []).map((s) => {
    const rs = regs.filter((r) => r.servicio_id === s.id)
    const fs = facturas.filter((f) => f.servicio_id === s.id)
    const cs = cobros.filter((c) => c.servicio_id === s.id)
    return {
      servicio_id: s.id,
      nombre: s.nombre_servicio,
      facturado: redondear2(fs.reduce((t, f) => t + N(f.total), 0)),
      cobrado: redondear2(cs.reduce((t, c) => t + N(c.monto), 0)),
      gastado: redondear2(rs.reduce((t, r) => t + N(r.monto_calculado), 0)),
      resultado: redondear2(
        fs.reduce((t, f) => t + N(f.total), 0) - rs.reduce((t, r) => t + N(r.monto_calculado), 0),
      ),
    }
  })
  return {
    mes: mesISO,
    fecha_generacion: new Date().toISOString(),
    facturado,
    cobrado,
    gastado,
    pagado,
    flujo: flujoNetoCaja(cobrado, pagado),
    resultado: redondear2(facturado - gastado),
    horas,
    porServicio,
  }
}
