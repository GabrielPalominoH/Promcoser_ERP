// Gráficos del "Control de proyecto (P6)" del panel gerencial.
//
// Dos lecturas de cartera, SVG puro sin librerías:
//   · Curva S consolidada: PV/AC/EV acumulados de todos los servicios.
//   · Histograma de horas-hombre: plan vs real por mes.
//
// Son solo presentación: los números llegan ya calculados (cartera.js /
// horasHombre.js) y aquí no se reimplementa ninguna fórmula.

import { formatearMoneda } from '../../utils/formatters'

const COLOR = {
  pv: '#2563eb',
  ac: '#dc2626',
  ev: '#059669',
  plan: '#94a3b8',
  real: '#0f766e',
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function etiquetaCorta(mesISO) {
  const [anio, mes] = mesISO.split('-').map(Number)
  return { corta: MESES[mes - 1] ?? mesISO, anio }
}

// Redondea hacia arriba a un "techo bonito" (1, 2 o 5 × 10^n).
function techoBonito(maximo) {
  if (!(maximo > 0)) return 1
  const exponente = Math.floor(Math.log10(maximo))
  const base = Math.pow(10, exponente)
  const n = maximo / base
  const paso = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return paso * base
}

// Curva S consolidada de la cartera (PV planificado, AC real, EV ganado).
export function GraficoCurvaSCartera({ serie = [], indiceHoy = -1 }) {
  const n = serie.length
  if (n === 0) return null

  const ANCHO = 960
  const ALTO = 340
  const M = { arriba: 18, derecha: 26, abajo: 36, izquierda: 84 }
  const anchoUtil = ANCHO - M.izquierda - M.derecha
  const altoUtil = ALTO - M.arriba - M.abajo

  const maximo = Math.max(
    1,
    ...serie.map((m) => m.pv ?? 0),
    ...serie.map((m) => m.ac ?? 0),
    ...serie.map((m) => m.ev ?? 0),
  )
  const techo = techoBonito(maximo)
  const paso = n === 1 ? 0 : anchoUtil / (n - 1)
  const x = (i) => (n === 1 ? M.izquierda + anchoUtil / 2 : M.izquierda + i * paso)
  const y = (v) => M.arriba + altoUtil * (1 - Math.min(1, Math.max(0, (v ?? 0) / techo)))

  const camino = (campo) => {
    const puntos = serie
      .map((m, i) => (m[campo] == null ? null : `${x(i).toFixed(1)} ${y(m[campo]).toFixed(1)}`))
      .filter(Boolean)
    return puntos.length ? `M ${puntos.join(' L ')}` : ''
  }

  const marcasY = [0, 0.25, 0.5, 0.75, 1].map((f) => techo * f)
  const pasoEtiqueta = Math.max(1, Math.ceil(n / 10))
  const mostrarPuntos = n <= 120

  return (
    <svg
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      role="img"
      aria-label="Curva S consolidada de la cartera (PV, AC y EV)"
      className="w-full"
      style={{ height: 'auto' }}
    >
      {marcasY.map((v) => (
        <g key={`y-${v}`}>
          <line
            x1={M.izquierda}
            x2={ANCHO - M.derecha}
            y1={y(v)}
            y2={y(v)}
            stroke={v === 0 ? '#cbd5e1' : '#e2e8f0'}
            strokeWidth={v === 0 ? 1.2 : 1}
            strokeDasharray={v === 0 ? undefined : '3 4'}
          />
          <text x={M.izquierda - 8} y={y(v) + 3.5} textAnchor="end" className="fill-slate-400" fontSize="10">
            {formatearMoneda(v)}
          </text>
        </g>
      ))}

      {indiceHoy >= 0 && indiceHoy < n && (
        <g>
          <line
            x1={x(indiceHoy)}
            x2={x(indiceHoy)}
            y1={M.arriba}
            y2={M.arriba + altoUtil}
            stroke="#94a3b8"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
          <text x={x(indiceHoy)} y={M.arriba - 6} textAnchor="middle" className="fill-slate-400" fontSize="9.5">
            hoy
          </text>
        </g>
      )}

      {camino('pv') && <path d={camino('pv')} fill="none" stroke={COLOR.pv} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />}
      {camino('ac') && <path d={camino('ac')} fill="none" stroke={COLOR.ac} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />}
      {camino('ev') && <path d={camino('ev')} fill="none" stroke={COLOR.ev} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />}

      {mostrarPuntos &&
        serie.map((m, i) => (
          <g key={`pts-${m.clave}`}>
            {m.pv != null && <circle cx={x(i)} cy={y(m.pv)} r="2.4" fill={COLOR.pv} stroke="#fff" strokeWidth="1.1" />}
            {m.ac != null && <circle cx={x(i)} cy={y(m.ac)} r="2.4" fill={COLOR.ac} stroke="#fff" strokeWidth="1.1" />}
            {m.ev != null && <circle cx={x(i)} cy={y(m.ev)} r="2.4" fill={COLOR.ev} stroke="#fff" strokeWidth="1.1" />}
          </g>
        ))}

      {serie.map((m, i) => {
        const visible = i === 0 || i === n - 1 || i % pasoEtiqueta === 0
        if (!visible) return null
        return (
          <g key={`x-${m.clave}`}>
            <text x={x(i)} y={ALTO - 18} textAnchor="middle" className="fill-slate-500" fontSize="10">
              {m.corta}
            </text>
            {m.anio && (i === 0 || m.clave.slice(5) === '01') && (
              <text x={x(i)} y={ALTO - 6} textAnchor="middle" className="fill-slate-400" fontSize="9">
                {m.anio}
              </text>
            )}
          </g>
        )
      })}

      {serie.map((m, i) => (
        <rect
          key={`hit-${m.clave}`}
          x={x(i) - (n > 1 ? paso / 2 : anchoUtil / 2)}
          y={M.arriba}
          width={n > 1 ? Math.max(1, paso) : anchoUtil}
          height={altoUtil}
          fill="transparent"
        >
          <title>{`${m.etiqueta}: PV ${m.pv == null ? '—' : formatearMoneda(m.pv)} · AC ${
            m.ac == null ? '—' : formatearMoneda(m.ac)
          } · EV ${m.ev == null ? '—' : formatearMoneda(m.ev)}`}</title>
        </rect>
      ))}
    </svg>
  )
}

// Histograma de horas-hombre: barras agrupadas plan (gris) vs real (verde).
export function GraficoHistogramaHH({ serie = [] }) {
  const n = serie.length
  if (n === 0) return null

  const ANCHO = 960
  const ALTO = 300
  const M = { arriba: 18, derecha: 20, abajo: 36, izquierda: 56 }
  const anchoUtil = ANCHO - M.izquierda - M.derecha
  const altoUtil = ALTO - M.arriba - M.abajo

  const maximo = Math.max(1, ...serie.map((m) => Math.max(m.plan ?? 0, m.real ?? 0)))
  const techo = techoBonito(maximo)
  const anchoGrupo = anchoUtil / n
  const anchoBarra = Math.max(2, Math.min(26, (anchoGrupo - 8) / 2))
  const y = (v) => M.arriba + altoUtil * (1 - Math.min(1, Math.max(0, (v ?? 0) / techo)))
  const marcasY = [0, 0.25, 0.5, 0.75, 1].map((f) => techo * f)
  const pasoEtiqueta = Math.max(1, Math.ceil(n / 14))

  return (
    <svg
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      role="img"
      aria-label="Histograma de horas-hombre planificadas y reales por mes"
      className="w-full"
      style={{ height: 'auto' }}
    >
      {marcasY.map((v) => (
        <g key={`y-${v}`}>
          <line
            x1={M.izquierda}
            x2={ANCHO - M.derecha}
            y1={y(v)}
            y2={y(v)}
            stroke={v === 0 ? '#cbd5e1' : '#e2e8f0'}
            strokeWidth={v === 0 ? 1.2 : 1}
            strokeDasharray={v === 0 ? undefined : '3 4'}
          />
          <text x={M.izquierda - 8} y={y(v) + 3.5} textAnchor="end" className="fill-slate-400" fontSize="10">
            {Math.round(v).toLocaleString('es-PE')}
          </text>
        </g>
      ))}

      {serie.map((m, i) => {
        const centro = M.izquierda + anchoGrupo * (i + 0.5)
        const { corta, anio } = etiquetaCorta(m.mes)
        const visible = i === 0 || i === n - 1 || i % pasoEtiqueta === 0
        return (
          <g key={m.mes}>
            <rect
              x={centro - anchoBarra - 1}
              y={y(m.plan)}
              width={anchoBarra}
              height={Math.max(0, M.arriba + altoUtil - y(m.plan))}
              rx="2"
              fill={COLOR.plan}
            >
              <title>{`${corta} ${anio}: plan ${Math.round(m.plan).toLocaleString('es-PE')} h`}</title>
            </rect>
            <rect
              x={centro + 1}
              y={y(m.real)}
              width={anchoBarra}
              height={Math.max(0, M.arriba + altoUtil - y(m.real))}
              rx="2"
              fill={COLOR.real}
            >
              <title>{`${corta} ${anio}: real ${Math.round(m.real).toLocaleString('es-PE')} h`}</title>
            </rect>
            {visible && (
              <text x={centro} y={ALTO - 18} textAnchor="middle" className="fill-slate-500" fontSize="10">
                {corta}
              </text>
            )}
            {visible && m.mes.slice(5) === '01' && (
              <text x={centro} y={ALTO - 6} textAnchor="middle" className="fill-slate-400" fontSize="9">
                {anio}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
