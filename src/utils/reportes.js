// Reportes imprimibles (impresión / "Guardar como PDF") — Fase 3.
//
// Todo el HTML se arma aquí de forma PURA (sin tocar el DOM), de modo que se
// puede probar sin navegador. El único punto que toca el navegador es
// `imprimirHTML`, que escribe el documento en un iframe oculto y lanza el
// diálogo de impresión (de donde el usuario elige "Guardar como PDF"). Sin
// librerías: misma política que los gráficos SVG y el escritor .xlsx.
//
// Contiene:
//   - htmlParteDiario        (parte diario de obra de un día, Fase 2)
//   - htmlValorizacion       (valorización de obra de un periodo, Fase 3)
//   - htmlReporteMensualObra (reporte gerencial de un mes, Fase 3)
//
// Cabecera común: empresa, obra, cliente, periodo y fecha de emisión.

import {
  cobradoServicio,
  cuentaComoManoDeObra,
  desglosePorTipo,
  diasRestantes,
  hoyISO,
  metricasCronograma,
  nombreReferencia,
  sumarMontos,
  utilidadReal,
} from './calculadora'
import { redondear2 } from './finanzas'
import { servicioConPresupuestoVigente } from './modificaciones'
import { avanceAcumulado, horasEquipos, horasPersonal } from './partesDiario'
import { formatearCantidad, formatearFecha, formatearMes, formatearMoneda } from './formatters'

export function esc(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const ESTILOS_REPORTE = `
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 28px; font-size: 12px; }
  h1 { font-size: 16px; margin: 0 0 2px; }
  h2 { font-size: 12px; margin: 18px 0 6px; text-transform: uppercase; letter-spacing: .04em; color: #475569; }
  .sub { color: #475569; margin: 0 0 14px; }
  .datos { display: flex; flex-wrap: wrap; gap: 6px 24px; margin-bottom: 6px; }
  .datos b { color: #0f172a; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  th, td { border: 1px solid #cbd5e1; padding: 5px 7px; text-align: left; }
  th { background: #f1f5f9; }
  td.num, th.num { text-align: right; }
  td.vacio { color: #94a3b8; font-style: italic; }
  tr.total td { font-weight: bold; background: #f8fafc; }
  tr.total td:first-child { text-align: right; }
  .bloque { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; white-space: pre-wrap; }
  .neto { margin: 10px 0; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 6px; }
  .neto b { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #475569; }
  .neto span { font-size: 20px; font-weight: bold; }
  .pie { margin-top: 20px; color: #94a3b8; font-size: 10px; }
  ul { margin: 0; padding-left: 18px; }
`

// Tabla HTML: `columnas` = [{ t, num }], `filas` = matriz de valores; `total`
// marca la última fila como suma.
function tablaHTML(columnas, filas, vacio, { filaTotal = false } = {}) {
  const encabezado = columnas
    .map((c) => `<th${c.num ? ' class="num"' : ''}>${esc(c.t)}</th>`)
    .join('')
  let cuerpo
  if (filas.length === 0) {
    cuerpo = `<tr><td class="vacio" colspan="${columnas.length}">${esc(vacio)}</td></tr>`
  } else {
    cuerpo = filas
      .map((fila, i) => {
        const esTotal = filaTotal && i === filas.length - 1
        const celdas = fila
          .map((valor, j) => `<td${columnas[j]?.num ? ' class="num"' : ''}>${esc(valor)}</td>`)
          .join('')
        return `<tr${esTotal ? ' class="total"' : ''}>${celdas}</tr>`
      })
      .join('')
  }
  return `<table><thead><tr>${encabezado}</tr></thead><tbody>${cuerpo}</tbody></table>`
}

// Documento autocontenido con la cabecera común (empresa, obra, cliente,
// periodo y fecha de emisión). `datos` es una lista de [etiqueta, valor].
function documentoReporte({
  empresa = 'PROMCOSER',
  titulo,
  subtitulo,
  datos = [],
  cuerpo,
  pie,
}) {
  const filaDatos = datos.length
    ? `<div class="datos">${datos
        .map(([etiqueta, valor]) => `<span><b>${esc(etiqueta)}:</b> ${esc(valor)}</span>`)
        .join('')}</div>`
    : ''
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${esc(titulo)}</title>
<style>${ESTILOS_REPORTE}</style>
</head>
<body>
  <h1>${esc(empresa)} — ${esc(titulo)}</h1>
  ${subtitulo ? `<p class="sub">${esc(subtitulo)}</p>` : ''}
  ${filaDatos}
  ${cuerpo}
  <p class="pie">${esc(pie || `Generado ${fechaGeneracion()}`)}</p>
</body>
</html>`
}

function fechaGeneracion() {
  return formatearFecha(hoyISO())
}

// ------------------------------------------------------------
//  Parte diario de obra (un día)
// ------------------------------------------------------------

export function htmlParteDiario({
  servicio = {},
  parte = {},
  refs = {},
  partes = [],
  empresa = 'PROMCOSER',
  generado = '',
} = {}) {
  const personal = refs.personal ?? []
  const equipos = refs.equipos ?? []
  const tareas = refs.tareas ?? []

  const nombrePersona = (id) => {
    const p = personal.find((x) => x.id === id)
    return p ? `${p.nombre} ${p.apellido ?? ''}`.trim() : `Personal ${id}`
  }
  const nombreEquipo = (id) => equipos.find((x) => x.id === id)?.nombre ?? `Equipo ${id}`
  const tareaDe = (id) => tareas.find((x) => x.id === id) ?? null

  const filasPersonal = (parte.personal ?? []).map((x) => [
    nombrePersona(x.personal_id),
    tareaDe(x.tarea_id)?.nombre ?? '—',
    formatearCantidad(x.horas),
  ])
  const filasEquipos = (parte.equipos ?? []).map((x) => [
    nombreEquipo(x.equipo_id),
    formatearCantidad(x.horas),
  ])
  const filasPartidas = (parte.partidas ?? []).map((x) => {
    const t = tareaDe(x.tarea_id)
    return [
      t?.nombre ?? 'Sin tarea',
      t?.unidad ?? '—',
      formatearCantidad(t?.metrado),
      `${formatearCantidad(x.avance_dia)} %`,
      `${formatearCantidad(avanceAcumulado(partes, x.tarea_id))} %`,
    ]
  })

  const fotos = (parte.fotos ?? []).map((f) => `<li>${esc(f.nombre ?? f.id)}</li>`).join('')

  const cuerpo = `
  <h2>Personal presente (${(parte.personal ?? []).length}) · ${esc(formatearCantidad(horasPersonal(parte)))} h</h2>
  ${tablaHTML(
    [{ t: 'Personal' }, { t: 'Tarea' }, { t: 'Horas', num: true }],
    filasPersonal,
    'Sin personal registrado.',
  )}

  <h2>Equipos (${(parte.equipos ?? []).length}) · ${esc(formatearCantidad(horasEquipos(parte)))} h</h2>
  ${tablaHTML([{ t: 'Equipo' }, { t: 'Horas', num: true }], filasEquipos, 'Sin equipos registrados.')}

  <h2>Partidas ejecutadas</h2>
  ${tablaHTML(
    [
      { t: 'Partida' },
      { t: 'UM' },
      { t: 'Metrado', num: true },
      { t: 'Avance del día', num: true },
      { t: 'Acumulado', num: true },
    ],
    filasPartidas,
    'Sin partidas ejecutadas.',
  )}

  <h2>Incidencias</h2>
  <div class="bloque">${esc(parte.incidencias || 'Sin incidencias.')}</div>

  <h2>Observaciones</h2>
  <div class="bloque">${esc(parte.observaciones || 'Sin observaciones.')}</div>

  ${fotos ? `<h2>Fotos (${(parte.fotos ?? []).length})</h2><ul>${fotos}</ul>` : ''}`

  return documentoReporte({
    empresa,
    titulo: 'Parte diario de obra',
    subtitulo: `${servicio.nombre_servicio ?? ''}${servicio.cliente ? ` · ${servicio.cliente}` : ''}`,
    datos: [
      ['Fecha', formatearFecha(parte.fecha)],
      ['Clima', parte.clima || '—'],
      ['Responsable', parte.responsable || '—'],
      ...(parte.temperatura != null && parte.temperatura !== ''
        ? [['Temperatura', `${formatearCantidad(parte.temperatura)} °C`]]
        : []),
    ],
    cuerpo,
    pie: generado ? `Generado ${generado} · ${empresa}` : undefined,
  })
}

// ------------------------------------------------------------
//  Valorización de obra (un periodo)
// ------------------------------------------------------------

export function htmlValorizacion({
  servicio = {},
  valorizacion = {},
  empresa = 'PROMCOSER',
  generado = '',
} = {}) {
  const n = (v) => Number(v) || 0
  const items = (valorizacion.items ?? []).filter((i) => Number(i.metrado_periodo) > 0)

  const filasItems = items.map((i) => [
    i.nombre,
    i.unidad ?? '—',
    formatearCantidad(i.metrado_periodo),
    formatearMoneda(i.precio_unitario),
    formatearMoneda(i.importe),
  ])

  const filasResumen = [
    ['Valorización bruta', formatearMoneda(valorizacion.bruta)],
    ['− Amortización adelanto directo', formatearMoneda(valorizacion.amort_directo)],
    ['− Amortización adelanto de materiales', formatearMoneda(valorizacion.amort_materiales)],
    [`− Fondo de garantía (${n(valorizacion.fondo_garantia_pct)}%)`, formatearMoneda(valorizacion.retencion)],
    ['Subtotal', formatearMoneda(valorizacion.subtotal)],
    [`+ IGV (${n(valorizacion.igv_pct)}%)`, formatearMoneda(valorizacion.igv)],
    ['Total facturado', formatearMoneda(valorizacion.total)],
    [`− Detracción (${n(valorizacion.detraccion_pct)}%)`, formatearMoneda(valorizacion.detraccion)],
  ]

  const cuerpo = `
  <h2>Detalle de partidas valorizadas</h2>
  ${tablaHTML(
    [
      { t: 'Partida' },
      { t: 'UM' },
      { t: 'Metrado del periodo', num: true },
      { t: 'P. Unit.', num: true },
      { t: 'Importe', num: true },
    ],
    filasItems,
    'Esta valorización no tiene partidas con metrado en el periodo.',
  )}

  <h2>Resumen</h2>
  ${tablaHTML(
    [{ t: 'Concepto' }, { t: 'Importe', num: true }],
    filasResumen,
    'Sin importes.',
  )}

  <div class="neto"><b>Neto a pagar</b><span>${esc(formatearMoneda(valorizacion.neto))}</span></div>`

  return documentoReporte({
    empresa,
    titulo: `Valorización de obra N° ${valorizacion.numero ?? '—'}`,
    subtitulo: `${servicio.nombre_servicio ?? ''}${servicio.cliente ? ` · ${servicio.cliente}` : ''}`,
    datos: [
      ['Fecha', formatearFecha(valorizacion.fecha)],
      ['Estado', valorizacion.estado || '—'],
      ['Cliente', servicio.cliente || '—'],
      ['Emitido', generado || fechaGeneracion()],
    ],
    cuerpo,
  })
}

// ------------------------------------------------------------
//  Reporte mensual de obra
// ------------------------------------------------------------

export function htmlReporteMensualObra({
  servicio = {},
  mes,
  tareas = [],
  registros = [],
  cobros = [],
  valorizaciones = [],
  modificaciones = [],
  personal = [],
  materiales = [],
  equipos = [],
  empresa = 'PROMCOSER',
  generado = '',
} = {}) {
  const mesISO = mes || hoyISO().slice(0, 7)
  const tareasServicio = tareas.filter((t) => t.servicio_id === servicio.id)
  const registrosServicio = registros.filter(
    (r) => r.servicio_id === servicio.id && cuentaComoManoDeObra(r),
  )
  const delMes = registrosServicio.filter((r) => (r.fecha || '').slice(0, 7) === mesISO)

  const presupuesto = servicioConPresupuestoVigente(servicio, modificaciones).presupuesto_asignado
  const costoMes = redondear2(sumarMontos(delMes))
  const costoAcumulado = redondear2(sumarMontos(registrosServicio))
  const cobradoMes = redondear2(cobradoServicio(
    cobros.filter((c) => c.servicio_id === servicio.id && (c.fecha || '').slice(0, 7) === mesISO),
    servicio.id,
  ))
  const utilidadMes = utilidadReal(cobradoMes, costoMes)
  const desglose = desglosePorTipo(delMes)
  const cronograma = metricasCronograma(tareasServicio)

  const valorizacionesMes = valorizaciones
    .filter((v) => v.servicio_id === servicio.id && (v.fecha || '').slice(0, 7) === mesISO)
    .sort((a, b) => (Number(a.numero) || 0) - (Number(b.numero) || 0))
  const netoMes = redondear2(
    valorizacionesMes.reduce((s, v) => s + (Number(v.neto) || 0), 0),
  )

  const nombreTarea = (id) => tareasServicio.find((t) => t.id === id)?.nombre ?? 'Sin tarea asignada'

  const cuerpo = `
  <h2>Resumen del mes</h2>
  ${tablaHTML(
    [{ t: 'Concepto' }, { t: 'Del mes', num: true }, { t: 'Acumulado', num: true }],
    [
      ['Presupuesto vigente', formatearMoneda(presupuesto), '—'],
      ['Costo de obra', formatearMoneda(costoMes), formatearMoneda(costoAcumulado)],
      ['Cobrado', formatearMoneda(cobradoMes), formatearMoneda(cobradoServicio(cobros, servicio.id))],
      ['Utilidad real', formatearMoneda(utilidadMes), '—'],
    ],
    'Sin datos.',
  )}

  <h2>Avance del cronograma</h2>
  <div class="datos">
    <span><b>Avance global:</b> ${esc(`${cronograma.avanceGlobal}%`)}</span>
    <span><b>Tareas:</b> ${esc(cronograma.total)}</span>
    <span><b>Completadas:</b> ${esc(cronograma.completadas)}</span>
    <span><b>Atrasadas:</b> ${esc(cronograma.atrasadas)}</span>
    <span><b>Días restantes:</b> ${esc(diasRestantes(servicio.fecha_fin_estimada) ?? '—')}</span>
  </div>

  <h2>Costos del mes por tipo</h2>
  ${tablaHTML(
    [{ t: 'Tipo' }, { t: 'Monto', num: true }],
    [
      ['Materiales', formatearMoneda(desglose.material)],
      ['Personal', formatearMoneda(desglose.personal)],
      ['Equipos', formatearMoneda(desglose.equipo)],
      ['Gastos', formatearMoneda(desglose.gasto)],
      ['Total', formatearMoneda(costoMes)],
    ],
    'Sin costos.',
    { filaTotal: true },
  )}

  <h2>Valorizaciones del mes</h2>
  ${tablaHTML(
    [{ t: 'N°' }, { t: 'Fecha' }, { t: 'Bruto', num: true }, { t: 'Neto', num: true }],
    [
      ...valorizacionesMes.map((v) => [
        `N° ${v.numero}`,
        formatearFecha(v.fecha),
        formatearMoneda(v.bruta),
        formatearMoneda(v.neto),
      ]),
      ...(valorizacionesMes.length > 0
        ? [['', 'Neto del mes', '', formatearMoneda(netoMes)]]
        : []),
    ],
    'Sin valorizaciones emitidas en el mes.',
    { filaTotal: valorizacionesMes.length > 0 },
  )}

  <h2>Movimientos del mes (${delMes.length})</h2>
  ${tablaHTML(
    [
      { t: 'Fecha' },
      { t: 'Tipo' },
      { t: 'Referencia' },
      { t: 'Tarea' },
      { t: 'Monto', num: true },
    ],
    delMes
      .slice()
      .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '') || a.id - b.id)
      .map((r) => [
        formatearFecha(r.fecha),
        r.tipo_registro,
        nombreReferencia(r, { personal, materiales, equipos }),
        nombreTarea(r.tarea_id),
        formatearMoneda(r.monto_calculado),
      ]),
    'Sin movimientos en el mes.',
  )}`

  return documentoReporte({
    empresa,
    titulo: 'Reporte mensual de obra',
    subtitulo: `${servicio.nombre_servicio ?? ''}${servicio.cliente ? ` · ${servicio.cliente}` : ''}`,
    datos: [
      ['Periodo', formatearMes(mesISO)],
      ['Inicio', formatearFecha(servicio.fecha_inicio)],
      ['Fin estimado', formatearFecha(servicio.fecha_fin_estimada)],
      ['Emitido', generado || fechaGeneracion()],
    ],
    cuerpo,
  })
}

// Escribe el HTML en un iframe oculto y lanza el diálogo de impresión del
// navegador. En SSR/pruebas (sin document) no hace nada y devuelve false.
export function imprimirHTML(html) {
  if (typeof document === 'undefined' || !html) return false
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const quitar = () => setTimeout(() => iframe.remove(), 200)
  const doc = iframe.contentWindow.document
  doc.open()
  doc.write(html)
  doc.close()

  try {
    iframe.contentWindow.focus()
    iframe.contentWindow.print()
  } finally {
    quitar()
  }
  return true
}
