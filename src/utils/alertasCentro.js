// Centro de alertas (Tarea 6). Módulo PURO.
//
// UNA sola función reúne TODAS las alertas del sistema en un formato común y
// estable, para que la campana, el Resumen y el Dashboard lean exactamente lo
// mismo (nadie recompone alertas por su cuenta):
//
//   partida_vencida           partida con fin vencido y avance < 100 %
//   partida_inactividad       partida en metrado sin partes hace N días
//   partida_rendimiento       partida en metrado por debajo del umbral
//   presupuesto_excedido      la obra gastó más que su presupuesto vigente
//   margen_bajo               queda menos del 10 % del presupuesto vigente
//   plazo_vencido             la fecha fin de la obra ya pasó
//   plazo_cercano             quedan 15 días o menos de plazo
//   factura_vencida           factura vigente con saldo y vencimiento pasado
//   valorizacion_sin_cobrar   valorización emitida hace X días sin cobro
//
// Las tres primeras salen de `alertas.js`, las de presupuesto/plazo de
// `alertasServicio` (calculadora.js) y las dos financieras de `finanzas.js`:
// aquí no se reimplementa ninguna fórmula, solo se unifican.
//
// `hoy` se INYECTA (por defecto la fecha real) y TODA comparación de fechas lo
// usa, de modo que las pruebas no dependan del reloj.
//
// Formato común de cada alerta:
//   { id, obraId, obra, tipo, gravedad, titulo, mensaje, enlace, meta, creadaEn }
//     id        estable mientras la causa no cambie (ver `firma`)
//     gravedad  'alta' | 'media' | 'baja'
//     titulo    texto corto y clicable (nombre de la partida, N.º de factura…)
//     enlace    ruta interna donde se resuelve la alerta
//     meta      datos de la causa; si empeoran o cambian, una alerta descartada
//               reaparece (comparación estable por JSON)
//
// El estado del usuario es mínimo y aparte:
//   alertasEstado = { pospuestas: { [id]: { hasta } },
//                     descartadas: { [id]: { nota, meta, fecha } } }

import { cuentaComoManoDeObra, estadoPresupuesto, hoyISO } from './calculadora'
import { alertasDeObra } from './alertas'
import { saldoFactura } from './finanzas'
import { servicioConPresupuestoVigente } from './modificaciones'

const n = (v) => Number(v) || 0
const r2 = (v) => Math.round(n(v) * 100) / 100

// Etiquetas legibles de cada tipo de alerta (las usa la UI).
export const ETIQUETAS_ALERTA = {
  partida_vencida: 'Vencida',
  partida_inactividad: 'Sin partes',
  partida_rendimiento: 'Bajo rendimiento',
  presupuesto_excedido: 'Presupuesto excedido',
  margen_bajo: 'Margen bajo',
  plazo_vencido: 'Plazo vencido',
  plazo_cercano: 'Plazo próximo',
  factura_vencida: 'Factura vencida',
  valorizacion_sin_cobrar: 'Valorización sin cobrar',
}

const ORDEN_GRAVEDAD = { alta: 3, media: 2, baja: 1 }

export function etiquetaAlerta(tipo) {
  return ETIQUETAS_ALERTA[tipo] ?? tipo
}

// ------------------------------------------------------------
//  Fechas (todo con `hoy` inyectado)
// ------------------------------------------------------------

// Días calendario entre dos fechas ISO (hasta − desde). Negativo = futuro.
export function diasEntre(desdeISO, hastaISO) {
  const [a1, m1, d1] = String(desdeISO).split('-').map(Number)
  const [a2, m2, d2] = String(hastaISO).split('-').map(Number)
  if (!a1 || !m1 || !d1 || !a2 || !m2 || !d2) return 0
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000)
}

// Suma (o resta, con `dias` negativo) días a una fecha ISO.
export function sumarDiasISO(fechaISO, dias) {
  const [anio, mes, dia] = String(fechaISO).split('-').map(Number)
  if (!anio || !mes || !dia) return fechaISO
  const fecha = new Date(Date.UTC(anio, mes - 1, dia))
  fecha.setUTCDate(fecha.getUTCDate() + Math.round(Number(dias) || 0))
  const mm = String(fecha.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(fecha.getUTCDate()).padStart(2, '0')
  return `${fecha.getUTCFullYear()}-${mm}-${dd}`
}

// ------------------------------------------------------------
//  Identidad estable y comparación de causa
// ------------------------------------------------------------

// Firma corta y determinista (djb2) para construir ids estables.
function firma(...partes) {
  const texto = partes.map((p) => String(p ?? '')).join('|')
  let h = 5381
  for (let i = 0; i < texto.length; i += 1) {
    h = ((h << 5) + h + texto.charCodeAt(i)) >>> 0
  }
  return h.toString(36)
}

// id = tipo + obra + clave. NO incluye el valor medido: así una alerta
// pospuesta sigue pospuesta aunque el atraso crezca; el empeoramiento se
// detecta con `meta` (una descartada reaparece si su meta cambia).
function idAlerta(tipo, obraId, clave) {
  return `${tipo}-${obraId ?? 0}-${firma(tipo, obraId ?? '', clave ?? '')}`
}

// JSON con claves ordenadas: comparación estable de la causa.
function jsonEstable(valor) {
  if (valor === null || typeof valor !== 'object') return JSON.stringify(valor)
  if (Array.isArray(valor)) return `[${valor.map(jsonEstable).join(',')}]`
  const claves = Object.keys(valor).sort()
  return `{${claves.map((k) => `${JSON.stringify(k)}:${jsonEstable(valor[k])}`).join(',')}}`
}

export function metaIgual(a, b) {
  return jsonEstable(a ?? {}) === jsonEstable(b ?? {})
}

// ------------------------------------------------------------
//  Estado del usuario (pospuestas / descartadas)
// ------------------------------------------------------------

export const ALERTAS_ESTADO_INICIAL = { pospuestas: {}, descartadas: {} }

function objetoPlano(valor) {
  return valor && typeof valor === 'object' && !Array.isArray(valor) ? valor : {}
}

// Normaliza el estado persistido: solo `{ pospuestas, descartadas }` con
// entradas válidas. Idempotente.
export function normalizarEstadoAlertas(alertasEstado) {
  const base = objetoPlano(alertasEstado)
  const pospuestas = {}
  for (const [id, valor] of Object.entries(objetoPlano(base.pospuestas))) {
    if (valor && typeof valor === 'object' && valor.hasta) {
      pospuestas[id] = { hasta: String(valor.hasta) }
    }
  }
  const descartadas = {}
  for (const [id, valor] of Object.entries(objetoPlano(base.descartadas))) {
    if (valor && typeof valor === 'object') {
      descartadas[id] = {
        nota: String(valor.nota ?? ''),
        meta: objetoPlano(valor.meta),
        fecha: valor.fecha ? String(valor.fecha) : null,
      }
    }
  }
  return { pospuestas, descartadas }
}

// Pospone una alerta N días (1/3/7 en la UI). Devuelve un estado nuevo.
export function posponerAlerta(alertasEstado, id, dias, hoy = hoyISO()) {
  const base = normalizarEstadoAlertas(alertasEstado)
  if (!id) return base
  const nDias = Math.max(1, Math.round(n(dias)) || 1)
  return {
    ...base,
    pospuestas: { ...base.pospuestas, [id]: { hasta: sumarDiasISO(hoy, nDias) } },
  }
}

// Descarta una alerta guardando su causa (`meta`) y una nota opcional. Si la
// causa empeora o cambia, la comparación de `meta` la hace reaparecer.
export function descartarAlerta(alertasEstado, alerta, nota = '', hoy = hoyISO()) {
  const base = normalizarEstadoAlertas(alertasEstado)
  if (!alerta?.id) return base
  return {
    ...base,
    descartadas: {
      ...base.descartadas,
      [alerta.id]: { nota: String(nota ?? '').trim(), meta: objetoPlano(alerta.meta), fecha: hoy },
    },
  }
}

// Quita una posposición (volver a mostrarla ya).
export function reactivarAlerta(alertasEstado, id) {
  const base = normalizarEstadoAlertas(alertasEstado)
  if (!id || !base.pospuestas[id]) return base
  const pospuestas = { ...base.pospuestas }
  delete pospuestas[id]
  return { ...base, pospuestas }
}

export function estaVigente(alertasEstado, id, hoy = hoyISO()) {
  const base = normalizarEstadoAlertas(alertasEstado)
  const p = base.pospuestas[id]
  if (p && p.hasta >= hoy) return false
  return true
}

// ------------------------------------------------------------
//  Construcción de alertas
// ------------------------------------------------------------

function crear({ tipo, gravedad, obraId, obra, clave, titulo, mensaje, enlace, meta, hoy }) {
  return {
    id: idAlerta(tipo, obraId, clave),
    obraId: obraId ?? null,
    obra: obra ?? '',
    tipo,
    gravedad,
    titulo: titulo ?? '',
    mensaje,
    enlace: enlace ?? (obraId != null ? `/servicios/${obraId}` : '/'),
    meta: meta ?? {},
    creadaEn: hoy,
  }
}

// valorizacionCobrada: ¿el cobro de esa valorización ya está registrado?
// El modelo no guarda un `valorizacion_id`, así que se reconoce por vínculo
// explícito (`cobrada`/`cobro_id`) o por el número en el concepto del cobro
// ("valorización N° 2"). Sin datos devuelve false (la alerta exige más datos).
export function valorizacionCobrada(valorizacion, cobros = []) {
  if (!valorizacion) return true
  if (valorizacion.cobrada === true) return true
  const propios = (cobros ?? []).filter((c) => c.servicio_id === valorizacion.servicio_id)
  if (valorizacion.cobro_id != null && propios.some((c) => c.id === valorizacion.cobro_id)) {
    return true
  }
  const numero = Number(valorizacion.numero) || null
  return propios.some((c) => {
    const texto = String(c.concepto ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
    if (!texto.includes('valoriza')) return false
    if (c.fecha && valorizacion.fecha && c.fecha < valorizacion.fecha) return false
    if (numero == null) return true
    const digitos = texto.match(/\d+/)
    return digitos ? Number(digitos[0]) === numero : false
  })
}

// Días de gracia antes de avisar de una valorización sin cobrar. Configurable
// por obra (`dias_alerta_valorizacion_sin_cobro`); 30 por defecto.
export function umbralValorizacionSinCobro(servicio = {}, config = {}) {
  const propios = Number(servicio?.dias_alerta_valorizacion_sin_cobro)
  if (propios > 0) return propios
  const global = Number(config?.dias_alerta_valorizacion_sin_cobro)
  if (global > 0) return global
  return 30
}

function alertasDeObraComun({ servicio, tareas, partes, hoy }) {
  return alertasDeObra({ servicio, tareas, partes, hoy }).map((a) => {
    const meta =
      a.tipo === 'vencida'
        ? { atraso_dias: Math.max(0, diasEntre(a.fecha_fin ?? hoy, hoy)) }
        : a.tipo === 'inactividad'
          ? { dias: extraerDias(a.detalle) }
          : { desvio: extraerDesvio(a.detalle) }
    return crear({
      obraId: a.servicio_id,
      obra: a.servicio,
      tipo: `partida_${a.tipo}`,
      gravedad: a.tipo === 'vencida' ? 'alta' : 'media',
      clave: a.tarea_id ?? a.tarea,
      titulo: a.tarea || `Partida ${a.tarea_id ?? ''}`.trim(),
      mensaje: a.detalle,
      enlace: `/servicios/${a.servicio_id}/partidas?tarea=${a.tarea_id}`,
      meta: { ...meta, tarea_id: a.tarea_id ?? null, tarea: a.tarea },
      hoy,
    })
  })
}

function extraerDias(texto) {
  const m = String(texto ?? '').match(/(\d+)\s*día/)
  return m ? Number(m[1]) : null
}

function extraerDesvio(texto) {
  const m = String(texto ?? '').match(/Rinde\s+([\d.]+)\s*%/)
  return m ? Number(m[1]) : null
}

function alertasDeServicioComun({ servicio, registros, cobros, modificaciones, hoy }) {
  const alertas = []
  const vigente = servicioConPresupuestoVigente(servicio, modificaciones)
  const estado = estadoPresupuesto(vigente, registros, cobros)
  const finValido =
    typeof servicio?.fecha_fin_estimada === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(servicio.fecha_fin_estimada)
  const dias = finValido ? diasEntre(hoy, servicio.fecha_fin_estimada) : null

  if (estado.excedido) {
    alertas.push(
      crear({
        obraId: servicio.id,
        obra: servicio.nombre_servicio,
        tipo: 'presupuesto_excedido',
        gravedad: 'alta',
        clave: 'presupuesto',
        titulo: 'Presupuesto de la obra',
        mensaje: 'El servicio superó su presupuesto inicial.',
        meta: { gastado: r2(estado.gastado), presupuesto: r2(estado.presupuesto) },
        hoy,
      }),
    )
  } else if (estado.presupuesto > 0 && estado.disponible / estado.presupuesto < 0.1) {
    alertas.push(
      crear({
        obraId: servicio.id,
        obra: servicio.nombre_servicio,
        tipo: 'margen_bajo',
        gravedad: 'media',
        clave: 'presupuesto',
        titulo: 'Presupuesto de la obra',
        mensaje: `Margen bajo: queda solo el ${((estado.disponible / estado.presupuesto) * 100).toFixed(1)}% del presupuesto.`,
        meta: { disponible: r2(estado.disponible), presupuesto: r2(estado.presupuesto) },
        hoy,
      }),
    )
  }

  if (dias !== null) {
    if (dias < 0) {
      alertas.push(
        crear({
          obraId: servicio.id,
          obra: servicio.nombre_servicio,
          tipo: 'plazo_vencido',
          gravedad: 'alta',
          clave: 'plazo',
          titulo: 'Plazo de la obra',
          mensaje: `Plazo vencido hace ${Math.abs(dias)} día(s).`,
          meta: { atraso_dias: Math.abs(dias), fecha_fin: servicio.fecha_fin_estimada },
          hoy,
        }),
      )
    } else if (dias <= 15) {
      alertas.push(
        crear({
          obraId: servicio.id,
          obra: servicio.nombre_servicio,
          tipo: 'plazo_cercano',
          gravedad: 'media',
          clave: 'plazo',
          titulo: 'Plazo de la obra',
          mensaje: dias === 0 ? 'El plazo vence hoy.' : `Quedan ${dias} día(s) de plazo.`,
          meta: { fecha_fin: servicio.fecha_fin_estimada },
          hoy,
        }),
      )
    }
  }

  return alertas
}

function alertasFacturasComun({ facturas = [], cobros = [], serviciosPorId, hoy }) {
  const alertas = []
  for (const factura of facturas) {
    if (factura?.estado === 'anulada' || factura?.duplicado_de != null) continue
    const saldo = saldoFactura(factura, cobros)
    if (saldo <= 0) continue
    if (!factura.fecha_vencimiento || factura.fecha_vencimiento >= hoy) continue
    const atraso = diasEntre(factura.fecha_vencimiento, hoy)
    const servicio = serviciosPorId.get(factura.servicio_id)
    alertas.push(
      crear({
        obraId: factura.servicio_id ?? null,
        obra: servicio?.nombre_servicio ?? '',
        tipo: 'factura_vencida',
        gravedad: atraso > 15 ? 'alta' : 'media',
        clave: factura.id ?? factura.numero,
        titulo: factura.numero ? `Factura ${factura.numero}` : `Factura ${factura.id ?? ''}`.trim(),
        mensaje: `Venció hace ${atraso} día(s); saldo por cobrar S/ ${saldo.toFixed(2)}.`,
        enlace: `/servicios/${factura.servicio_id}/ingresos`,
        meta: { atraso_dias: atraso, saldo: r2(saldo) },
        hoy,
      }),
    )
  }
  return alertas
}

function alertasValorizacionesComun({
  valorizaciones = [],
  cobros = [],
  serviciosPorId,
  config,
  hoy,
}) {
  const alertas = []
  for (const valorizacion of valorizaciones) {
    if (!valorizacion || valorizacion.estado === 'anulada') continue
    if (valorizacionCobrada(valorizacion, cobros)) continue
    if (!valorizacion.fecha) continue
    const servicio = serviciosPorId.get(valorizacion.servicio_id)
    const umbral = umbralValorizacionSinCobro(servicio ?? {}, config)
    const atraso = diasEntre(valorizacion.fecha, hoy)
    if (atraso <= umbral) continue
    alertas.push(
      crear({
        obraId: valorizacion.servicio_id ?? null,
        obra: servicio?.nombre_servicio ?? '',
        tipo: 'valorizacion_sin_cobrar',
        gravedad: atraso > umbral * 2 ? 'alta' : 'media',
        clave: valorizacion.id ?? `${valorizacion.numero}-${valorizacion.fecha}`,
        titulo: `Valorización N° ${valorizacion.numero ?? ''}`.trim(),
        mensaje: `Emitida hace ${atraso} día(s) sin cobrar (límite ${umbral}).`,
        enlace: `/servicios/${valorizacion.servicio_id}/valorizaciones`,
        meta: { atraso_dias: atraso, neto: r2(valorizacion.neto) },
        hoy,
      }),
    )
  }
  return alertas
}

// ------------------------------------------------------------
//  Función principal
// ------------------------------------------------------------

// Alertas activas (pospuestas y descartadas sin cambio de causa quedan fuera).
// `servicioId` limita el resultado a una sola obra (lo usa el Resumen).
export function alertasCentro({
  estado = {},
  hoy = hoyISO(),
  alertasEstado = null,
  servicioId = null,
} = {}) {
  const servicios = (estado.servicios ?? []).filter(
    (s) => servicioId == null || String(s.id) === String(servicioId),
  )
  const tareas = estado.tareas ?? []
  const registros = (estado.registros_servicio ?? []).filter(cuentaComoManoDeObra)
  const cobros = estado.cobros ?? []
  const partes = estado.partes_diario ?? []
  const facturas = estado.facturas ?? []
  const valorizaciones = estado.valorizaciones ?? []
  const config = Array.isArray(estado.config) ? (estado.config[0] ?? {}) : (estado.config ?? {})
  const modificaciones = estado.modificaciones ?? []
  const serviciosPorId = new Map(servicios.map((s) => [s.id, s]))

  const crudas = []
  for (const servicio of servicios) {
    crudas.push(...alertasDeObraComun({ servicio, tareas, partes, hoy }))
    crudas.push(
      ...alertasDeServicioComun({
        servicio,
        registros: registros.filter((r) => r.servicio_id === servicio.id),
        cobros,
        modificaciones,
        hoy,
      }),
    )
  }
  crudas.push(...alertasFacturasComun({ facturas, cobros, serviciosPorId, hoy }))
  crudas.push(...alertasValorizacionesComun({ valorizaciones, cobros, serviciosPorId, config, hoy }))

  const usuario = normalizarEstadoAlertas(alertasEstado)
  const activas = crudas.filter((alerta) => {
    const pospuesta = usuario.pospuestas[alerta.id]
    if (pospuesta && pospuesta.hasta >= hoy) return false
    const descartada = usuario.descartadas[alerta.id]
    if (descartada && metaIgual(descartada.meta, alerta.meta)) return false
    return true
  })

  return ordenarAlertas(activas)
}

// Orden estable: gravedad desc, obra, tipo, título. Id empata siempre.
export function ordenarAlertas(alertas = []) {
  return [...alertas].sort((a, b) => {
    const g = (ORDEN_GRAVEDAD[b.gravedad] ?? 0) - (ORDEN_GRAVEDAD[a.gravedad] ?? 0)
    if (g !== 0) return g
    const obra = String(a.obra ?? '').localeCompare(String(b.obra ?? ''), 'es')
    if (obra !== 0) return obra
    const tipo = String(a.tipo).localeCompare(String(b.tipo))
    if (tipo !== 0) return tipo
    const titulo = String(a.titulo ?? '').localeCompare(String(b.titulo ?? ''), 'es')
    if (titulo !== 0) return titulo
    return String(a.id).localeCompare(String(b.id))
  })
}

export function contarPorGravedad(alertas = []) {
  const resumen = { alta: 0, media: 0, baja: 0 }
  for (const a of alertas) {
    if (a.gravedad in resumen) resumen[a.gravedad] += 1
  }
  return resumen
}

// Agrupa por obra conservando el orden de las alertas.
export function agruparPorObra(alertas = []) {
  const grupos = []
  const indice = new Map()
  for (const alerta of alertas) {
    const clave = alerta.obraId ?? 'sin-obra'
    if (!indice.has(clave)) {
      const grupo = { obraId: alerta.obraId ?? null, obra: alerta.obra ?? '', alertas: [] }
      indice.set(clave, grupo)
      grupos.push(grupo)
    }
    indice.get(clave).alertas.push(alerta)
  }
  return grupos
}

// ¿Una alerta descartada volvería a mostrarse con esta causa? (Para la UI.)
export function reapareceDescartada(alertasEstado, alerta) {
  const base = normalizarEstadoAlertas(alertasEstado)
  const descartada = base.descartadas[alerta?.id]
  if (!descartada) return true
  return !metaIgual(descartada.meta, alerta?.meta)
}
