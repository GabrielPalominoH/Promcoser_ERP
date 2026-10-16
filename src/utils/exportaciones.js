// Armado de libros .xlsx a partir de los datos del ERP — Fase 3.
//
// Cada función es PURA: recibe colecciones y devuelve un descriptor
// `{ nombre, hojas: [{ nombre, filas }] }` que `excel.js` convierte en bytes y
// `descargas.js` baja al disco. No toca el DOM, así que se prueba sin navegador.
//
// Todas las hojas llevan la cabecera común (empresa, obra, cliente, periodo y
// fecha de emisión) y usan las mismas fórmulas que las pantallas: no se
// reimplementa ningún cálculo.

import {
  avanceEfectivo,
  costoSubarbol,
  costoSinTarea,
  diasCalendarioRango,
  estadoTarea,
  hoyISO,
  montoTarea,
  presupuestoTareas,
  valorizadoTarea,
} from './calculadora'
import { formatearFecha, formatearMes } from './formatters'
import { resumenValorizaciones } from './valorizaciones'

const EMPRESA = 'PROMCOSER'

// --- celdas ---------------------------------------------------------------
const fuerte = (v) => ({ v, negrita: true })
const moneda = (v) => ({ v: Number(v) || 0, tipo: 'moneda' })
const monedaFuerte = (v) => ({ v: Number(v) || 0, tipo: 'moneda', negrita: true })
const porcentaje = (v) => ({ v: (Number(v) || 0) / 100, tipo: 'porcentaje' })

const capitalizar = (texto) =>
  texto ? `${texto.charAt(0).toUpperCase()}${texto.slice(1)}` : texto

// Cabecera común a todas las hojas: empresa, título, obra, cliente, periodo y
// fecha de emisión (más una fila en blanco antes de la tabla).
function encabezadoHoja({ titulo, obra, cliente, periodo, generado, empresa = EMPRESA }) {
  return [
    [fuerte(empresa)],
    [fuerte(titulo)],
    [],
    [fuerte('Obra'), obra ?? '—'],
    [fuerte('Cliente'), cliente ?? '—'],
    [fuerte('Periodo'), periodo ?? '—'],
    [fuerte('Emitido'), formatearFecha(generado)],
    [],
  ]
}

// Filas del árbol de tareas con numeración jerárquica 1, 1.1, 1.2…
function filasArbol(tareas) {
  const ids = new Set(tareas.map((t) => t.id))
  const porPadre = new Map()
  for (const t of tareas) {
    const clave = t.padre_id != null && ids.has(t.padre_id) ? t.padre_id : null
    if (!porPadre.has(clave)) porPadre.set(clave, [])
    porPadre.get(clave).push(t)
  }
  const lista = []
  const recorrer = (t, nivel, numero) => {
    lista.push({ tarea: t, nivel, numero })
    const hijas = porPadre.get(t.id) ?? []
    hijas.forEach((h, j) => recorrer(h, nivel + 1, `${numero}.${j + 1}`))
  }
  ;(porPadre.get(null) ?? []).forEach((t, i) => recorrer(t, 0, `${i + 1}`))
  return lista
}

function ordenarTareas(tareas) {
  return [...tareas].sort(
    (a, b) => (a.fecha_inicio || '').localeCompare(b.fecha_inicio || '') || a.id - b.id,
  )
}

function rangoPeriodo(tareas) {
  const fechas = tareas.filter((t) => t.fecha_inicio && t.fecha_fin)
  if (fechas.length === 0) return '—'
  const inicio = fechas.reduce((min, t) => (t.fecha_inicio < min ? t.fecha_inicio : min), fechas[0].fecha_inicio)
  const fin = fechas.reduce((max, t) => (t.fecha_fin > max ? t.fecha_fin : max), fechas[0].fecha_fin)
  return `${formatearFecha(inicio)} al ${formatearFecha(fin)}`
}

function textoPredecesoras(tarea, tareas) {
  const lista = (tarea.predecesoras ?? []).filter(Boolean)
  if (lista.length === 0) return '—'
  return lista
    .map((p) => {
      const nombre = tareas.find((t) => t.id === p.id)?.nombre ?? `Tarea ${p.id}`
      const lag = Number(p.lag) || 0
      const sufijo = lag === 0 ? '' : lag > 0 ? `+${lag}` : `${lag}`
      return `${nombre} (${p.tipo ?? 'FS'}${sufijo})`
    })
    .join(', ')
}

// ------------------------------------------------------------
//  Cronograma
// ------------------------------------------------------------
export function libroCronograma({
  servicio = {},
  tareas = [],
  generado = hoyISO(),
  empresa = EMPRESA,
} = {}) {
  const propias = ordenarTareas(tareas.filter((t) => t.servicio_id === servicio.id))
  const hoy = generado
  const filas = filasArbol(propias)

  const columnas = [
    fuerte('N°'),
    fuerte('Tarea'),
    fuerte('Inicio'),
    fuerte('Fin'),
    fuerte('Días'),
    fuerte('Avance'),
    fuerte('Monto (S/)'),
    fuerte('Estado'),
    fuerte('Predecesoras'),
  ]

  const datos = filas.map(({ tarea, nivel, numero }) => [
    numero,
    `${'    '.repeat(nivel)}${tarea.nombre}`,
    formatearFecha(tarea.fecha_inicio),
    formatearFecha(tarea.fecha_fin),
    tarea.hito ? 0 : diasCalendarioRango(tarea.fecha_inicio, tarea.fecha_fin),
    porcentaje(avanceEfectivo(tarea, propias)),
    moneda(montoTarea(tarea, propias)),
    capitalizar(estadoTarea(tarea, hoy)),
    textoPredecesoras(tarea, propias),
  ])

  const total = presupuestoTareas(propias, servicio.id)
  if (datos.length > 0) {
    datos.push([fuerte('Total'), '', '', '', '', '', monedaFuerte(total), '', ''])
  }

  return {
    nombre: `cronograma-${servicio.id ?? 'obra'}`,
    hojas: [
      {
        nombre: 'Cronograma',
        filas: [
          ...encabezadoHoja({
            titulo: 'Cronograma de obra',
            obra: servicio.nombre_servicio,
            cliente: servicio.cliente,
            periodo: rangoPeriodo(propias),
            generado,
            empresa,
          }),
          columnas,
          ...datos,
        ],
      },
    ],
  }
}

// ------------------------------------------------------------
//  Valorizaciones
// ------------------------------------------------------------
export function libroValorizaciones({
  servicio = {},
  valorizaciones = [],
  generado = hoyISO(),
  empresa = EMPRESA,
} = {}) {
  const propias = valorizaciones
    .filter((v) => v.servicio_id === servicio.id)
    .sort((a, b) => (Number(a.numero) || 0) - (Number(b.numero) || 0))
  const resumen = resumenValorizaciones({ servicio, valorizaciones: propias })

  const columnas = [
    fuerte('N°'),
    fuerte('Fecha'),
    fuerte('Estado'),
    fuerte('Bruto'),
    fuerte('Amort. directo'),
    fuerte('Amort. materiales'),
    fuerte('Retención'),
    fuerte('Subtotal'),
    fuerte('IGV'),
    fuerte('Total'),
    fuerte('Detracción'),
    fuerte('Neto'),
  ]
  const datos = propias.map((v) => [
    `N° ${v.numero}`,
    formatearFecha(v.fecha),
    v.estado ?? '—',
    moneda(v.bruta),
    moneda(v.amort_directo),
    moneda(v.amort_materiales),
    moneda(v.retencion),
    moneda(v.subtotal),
    moneda(v.igv),
    moneda(v.total),
    moneda(v.detraccion),
    moneda(v.neto),
  ])
  if (datos.length > 0) {
    datos.push([
      fuerte('Total'),
      '',
      '',
      monedaFuerte(resumen.bruta),
      monedaFuerte(resumen.amort_directo),
      monedaFuerte(resumen.amort_materiales),
      monedaFuerte(resumen.retencion),
      '',
      monedaFuerte(resumen.igv),
      monedaFuerte(resumen.total),
      monedaFuerte(resumen.detraccion),
      monedaFuerte(resumen.neto),
    ])
  }

  const detalle = propias.flatMap((v) =>
    (v.items ?? [])
      .filter((i) => Number(i.metrado_periodo) > 0)
      .map((i) => [
        `N° ${v.numero}`,
        formatearFecha(v.fecha),
        i.nombre,
        i.unidad ?? '—',
        Number(i.metrado_periodo) || 0,
        moneda(i.precio_unitario),
        moneda(i.importe),
      ]),
  )

  return {
    nombre: `valorizaciones-${servicio.id ?? 'obra'}`,
    hojas: [
      {
        nombre: 'Valorizaciones',
        filas: [
          ...encabezadoHoja({
            titulo: 'Valorizaciones de obra',
            obra: servicio.nombre_servicio,
            cliente: servicio.cliente,
            periodo: propias.length > 0 ? `N° 1 al N° ${propias[propias.length - 1].numero}` : '—',
            generado,
            empresa,
          }),
          columnas,
          ...datos,
        ],
      },
      {
        nombre: 'Detalle',
        filas: [
          ...encabezadoHoja({
            titulo: 'Detalle de partidas valorizadas',
            obra: servicio.nombre_servicio,
            cliente: servicio.cliente,
            periodo: propias.length > 0 ? `N° 1 al N° ${propias[propias.length - 1].numero}` : '—',
            generado,
            empresa,
          }),
          [
            fuerte('N°'),
            fuerte('Fecha'),
            fuerte('Partida'),
            fuerte('UM'),
            fuerte('Metrado del periodo'),
            fuerte('P. Unit. (S/)'),
            fuerte('Importe (S/)'),
          ],
          ...detalle,
        ],
      },
    ],
  }
}

// ------------------------------------------------------------
//  Costos por partida
// ------------------------------------------------------------
export function libroCostosPorPartida({
  servicio = {},
  tareas = [],
  registros = [],
  generado = hoyISO(),
  empresa = EMPRESA,
} = {}) {
  const propias = ordenarTareas(tareas.filter((t) => t.servicio_id === servicio.id))
  const filas = filasArbol(propias)

  const columnas = [
    fuerte('N°'),
    fuerte('Partida'),
    fuerte('UM'),
    fuerte('Metrado'),
    fuerte('P. Unit. (S/)'),
    fuerte('Monto (S/)'),
    fuerte('Valorizado (S/)'),
    fuerte('Avance'),
    fuerte('Costo (S/)'),
    fuerte('Margen (S/)'),
  ]

  const datos = filas.map(({ tarea, nivel, numero }) => {
    const esPadre = propias.some((t) => t.padre_id === tarea.id)
    const valorizado = valorizadoTarea(tarea, propias)
    const costo = costoSubarbol(tarea, propias, registros, servicio.id)
    return [
      numero,
      `${'    '.repeat(nivel)}${tarea.nombre}`,
      esPadre ? '—' : (tarea.unidad ?? '—'),
      esPadre || tarea.metrado == null ? '—' : Number(tarea.metrado),
      esPadre || tarea.precio_unitario == null ? '—' : moneda(tarea.precio_unitario),
      moneda(montoTarea(tarea, propias)),
      moneda(valorizado),
      porcentaje(avanceEfectivo(tarea, propias)),
      moneda(costo),
      moneda(valorizado - costo),
    ]
  })

  const raices = propias.filter((t) => t.padre_id == null)
  const totalMonto = raices.reduce((s, t) => s + montoTarea(t, propias), 0)
  const totalValorizado = raices.reduce((s, t) => s + valorizadoTarea(t, propias), 0)
  const totalCosto = raices.reduce((s, t) => s + costoSubarbol(t, propias, registros, servicio.id), 0)
  const sinTarea = costoSinTarea(registros, servicio.id)
  if (datos.length > 0) {
    if (sinTarea > 0) {
      datos.push(['', 'Costo sin tarea asignada', '', '', '', '', '', '', moneda(sinTarea), ''])
    }
    datos.push([
      fuerte('Total'),
      '',
      '',
      '',
      '',
      monedaFuerte(totalMonto),
      monedaFuerte(totalValorizado),
      '',
      monedaFuerte(totalCosto + sinTarea),
      monedaFuerte(totalValorizado - totalCosto - sinTarea),
    ])
  }

  return {
    nombre: `costos-partidas-${servicio.id ?? 'obra'}`,
    hojas: [
      {
        nombre: 'Costos por partida',
        filas: [
          ...encabezadoHoja({
            titulo: 'Costos por partida',
            obra: servicio.nombre_servicio,
            cliente: servicio.cliente,
            periodo: rangoPeriodo(propias),
            generado,
            empresa,
          }),
          columnas,
          ...datos,
        ],
      },
    ],
  }
}

// ------------------------------------------------------------
//  Flujo de caja
// ------------------------------------------------------------
export function libroFlujoCaja({ flujo = [], generado = hoyISO(), empresa = EMPRESA } = {}) {
  const columnas = [
    fuerte('Mes'),
    fuerte('Cobrado (S/)'),
    fuerte('Egreso obra (S/)'),
    fuerte('Oficina (S/)'),
    fuerte('Margen (S/)'),
  ]
  const filas = flujo.map((f) => [
    formatearMes(f.mes),
    moneda(f.cobrado),
    moneda(f.egresoObra),
    moneda(f.oficina),
    moneda(f.margenReal),
  ])
  if (filas.length > 0) {
    const suma = (campo) => flujo.reduce((s, f) => s + (Number(f[campo]) || 0), 0)
    filas.push([
      fuerte('Total'),
      monedaFuerte(suma('cobrado')),
      monedaFuerte(suma('egresoObra')),
      monedaFuerte(suma('oficina')),
      monedaFuerte(suma('margenReal')),
    ])
  }

  return {
    nombre: 'flujo-caja',
    hojas: [
      {
        nombre: 'Flujo de caja',
        filas: [
          ...encabezadoHoja({
            titulo: 'Flujo de caja mensual',
            obra: 'Toda la empresa',
            cliente: '—',
            periodo:
              flujo.length > 0
                ? `${formatearMes(flujo[0].mes)} al ${formatearMes(flujo[flujo.length - 1].mes)}`
                : '—',
            generado,
            empresa,
          }),
          columnas,
          ...filas,
        ],
      },
    ],
  }
}
