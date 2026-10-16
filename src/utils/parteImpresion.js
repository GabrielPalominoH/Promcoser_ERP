// Impresión / exportación a PDF del parte diario (Fase 2).
//
// `htmlParteDiario` es PURO: recibe el parte y las referencias y devuelve un
// documento HTML autocontenido (estilos en línea) listo para imprimir. Así se
// puede probar sin navegador.
//
// `imprimirHTML` escribe ese HTML en un iframe oculto y lanza el diálogo de
// impresión del navegador (de donde se elige "Guardar como PDF"). No usa
// librerías. En SSR/pruebas no hace nada.

import { formatearCantidad, formatearFecha } from './formatters'
import { avanceAcumulado, horasEquipos, horasPersonal } from './partesDiario'

function esc(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function filas(lista, columnas, vacio) {
  if (!lista.length) {
    return `<tr><td class="vacio" colspan="${columnas}">${esc(vacio)}</td></tr>`
  }
  return lista.join('')
}

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

  const filasPersonal = filas(
    (parte.personal ?? []).map(
      (x) => `<tr>
        <td>${esc(nombrePersona(x.personal_id))}</td>
        <td>${esc(tareaDe(x.tarea_id)?.nombre ?? '—')}</td>
        <td class="num">${esc(formatearCantidad(x.horas))}</td>
      </tr>`,
    ),
    3,
    'Sin personal registrado.',
  )

  const filasEquipos = filas(
    (parte.equipos ?? []).map(
      (x) => `<tr>
        <td>${esc(nombreEquipo(x.equipo_id))}</td>
        <td class="num">${esc(formatearCantidad(x.horas))}</td>
      </tr>`,
    ),
    2,
    'Sin equipos registrados.',
  )

  const filasPartidas = filas(
    (parte.partidas ?? []).map((x) => {
      const t = tareaDe(x.tarea_id)
      return `<tr>
        <td>${esc(t?.nombre ?? 'Sin tarea')}</td>
        <td>${esc(t?.unidad ?? '—')}</td>
        <td class="num">${esc(formatearCantidad(t?.metrado))}</td>
        <td class="num">${esc(formatearCantidad(x.avance_dia))} %</td>
        <td class="num">${esc(formatearCantidad(avanceAcumulado(partes, x.tarea_id)))} %</td>
      </tr>`
    }),
    5,
    'Sin partidas ejecutadas.',
  )

  const fotos = (parte.fotos ?? [])
    .map((f) => `<li>${esc(f.nombre ?? f.id)}</li>`)
    .join('')

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Parte diario ${esc(parte.fecha ?? '')}</title>
<style>
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
  .bloque { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; white-space: pre-wrap; }
  .pie { margin-top: 20px; color: #94a3b8; font-size: 10px; }
  ul { margin: 0; padding-left: 18px; }
</style>
</head>
<body>
  <h1>${esc(empresa)} — Parte diario de obra</h1>
  <p class="sub">${esc(servicio.nombre_servicio ?? '')}${servicio.cliente ? ` · ${esc(servicio.cliente)}` : ''}</p>
  <div class="datos">
    <span><b>Fecha:</b> ${esc(formatearFecha(parte.fecha))}</span>
    <span><b>Clima:</b> ${esc(parte.clima || '—')}</span>
    <span><b>Responsable:</b> ${esc(parte.responsable || '—')}</span>
    ${parte.temperatura != null && parte.temperatura !== '' ? `<span><b>Temperatura:</b> ${esc(formatearCantidad(parte.temperatura))} °C</span>` : ''}
  </div>

  <h2>Personal presente (${(parte.personal ?? []).length}) · ${esc(formatearCantidad(horasPersonal(parte)))} h</h2>
  <table><thead><tr><th>Personal</th><th>Tarea</th><th class="num">Horas</th></tr></thead>
  <tbody>${filasPersonal}</tbody></table>

  <h2>Equipos (${(parte.equipos ?? []).length}) · ${esc(formatearCantidad(horasEquipos(parte)))} h</h2>
  <table><thead><tr><th>Equipo</th><th class="num">Horas</th></tr></thead>
  <tbody>${filasEquipos}</tbody></table>

  <h2>Partidas ejecutadas</h2>
  <table><thead><tr><th>Partida</th><th>UM</th><th class="num">Metrado</th><th class="num">Avance del día</th><th class="num">Acumulado</th></tr></thead>
  <tbody>${filasPartidas}</tbody></table>

  <h2>Incidencias</h2>
  <div class="bloque">${esc(parte.incidencias || 'Sin incidencias.')}</div>

  <h2>Observaciones</h2>
  <div class="bloque">${esc(parte.observaciones || 'Sin observaciones.')}</div>

  ${fotos ? `<h2>Fotos (${(parte.fotos ?? []).length})</h2><ul>${fotos}</ul>` : ''}

  <p class="pie">Generado ${esc(generado || '')} · ${esc(empresa)}</p>
</body>
</html>`
}

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
