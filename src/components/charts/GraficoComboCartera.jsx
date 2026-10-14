import { useMemo, useState } from 'react'
import { formatearMes } from '../../utils/formatters'

// Gráfico combinado de columnas y líneas con doble eje Y (Dual-Axis Combo Chart).
//
//   - Columnas (detrás): volumen de obras activas por periodo -> eje Y derecho
//     (unidades enteras).
//   - Línea 1 (delante): desfase de tiempo (% de obras retrasadas) -> eje Y
//     izquierdo (0–100 %).
//   - Línea 2 (delante): desfase de costo (% de sobrecosto acumulado) -> eje Y
//     izquierdo (0–100 %).
//
// Los datos llegan ya calculados y puros desde `desfaseMensualProyectos`
// (utils/gerencial.js). Aquí solo se dibujan: nada de fórmulas de negocio.
//
// Responsive y compacto: el SVG usa `viewBox` + `width:100%; height:auto` con un
// ancho máximo (`max-w`) para no crecer sin freno en pantallas muy anchas; el
// bloque completo (resumen + gráfico) queda centrado y de ancho acotado.

const ANCHO = 960
const ALTO = 220
const MARGEN = { arriba: 14, derecha: 36, abajo: 28, izquierda: 42 }
const ANCHO_PLOT = ANCHO - MARGEN.izquierda - MARGEN.derecha
const ALTO_PLOT = ALTO - MARGEN.arriba - MARGEN.abajo

const COLOR = {
  volumen: '#cbd5e1',
  volumenActivo: '#94a3b8',
  tiempo: '#2563eb',
  costo: '#dc2626',
}

// Marcas del eje derecho (unidades enteras). Con pocas obras se marca cada
// unidad; con muchas, un paso "bonito" que evita amontonar números.
function marcasVolumen(max) {
  if (max <= 0) return [0]
  if (max <= 5) return Array.from({ length: max + 1 }, (_, i) => i)
  const paso = Math.ceil(max / 5)
  const valores = []
  for (let v = 0; v <= max; v += paso) valores.push(v)
  if (valores[valores.length - 1] !== max) valores.push(max)
  return valores
}

// Trocea una serie de puntos en segmentos continuos: los `y` nulos (meses sin
// dato, típicamente futuros) cortan la línea en lugar de inventar un valor.
function segmentos(puntos) {
  const tramos = []
  let actual = []
  for (const punto of puntos) {
    if (punto.y == null) {
      if (actual.length > 0) tramos.push(actual)
      actual = []
    } else {
      actual.push(punto)
    }
  }
  if (actual.length > 0) tramos.push(actual)
  return tramos.map((tramo) =>
    tramo
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
      .join(' '),
  )
}

function porcentajeTexto(valor) {
  return valor == null ? '—' : `${valor.toFixed(1)} %`
}

// Ficha compacta de resumen (a la vez hace de leyenda del gráfico).
function ResumenItem({ color, forma, etiqueta, valor, detalle }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3.5 py-2.5">
      <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
        {forma === 'barra' ? (
          <span
            className="size-2 rounded-[2px]"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
        ) : (
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
        )}
        {etiqueta}
      </p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums text-slate-900">{valor}</p>
      <p className="text-xs text-slate-500">{detalle}</p>
    </div>
  )
}

export function GraficoComboCartera({ serie = [], maxVolumen = 0, mesHoy = null }) {
  const [activo, setActivo] = useState(null)
  const n = serie.length

  const { puntosTiempo, puntosCosto, segTiempo, segCosto, marcasVol, yPct, yVol, x } = useMemo(() => {
    const paso = n > 0 ? ANCHO_PLOT / n : ANCHO_PLOT
    const posX = (i) => MARGEN.izquierda + (i + 0.5) * paso
    const escalaPct = (p) => MARGEN.arriba + ALTO_PLOT * (1 - Math.min(100, Math.max(0, p)) / 100)
    const escalaVol = (v) =>
      maxVolumen > 0 ? MARGEN.arriba + ALTO_PLOT * (1 - v / maxVolumen) : MARGEN.arriba + ALTO_PLOT
    const pTiempo = serie.map((f, i) => ({
      x: posX(i),
      y: f.desfaseTiempo == null ? null : escalaPct(f.desfaseTiempo),
    }))
    const pCosto = serie.map((f, i) => ({
      x: posX(i),
      y: f.desfaseCosto == null ? null : escalaPct(f.desfaseCosto),
    }))
    return {
      puntosTiempo: pTiempo,
      puntosCosto: pCosto,
      segTiempo: segmentos(pTiempo),
      segCosto: segmentos(pCosto),
      marcasVol: marcasVolumen(maxVolumen),
      yPct: escalaPct,
      yVol: escalaVol,
      x: posX,
    }
  }, [serie, maxVolumen, n])

  if (n === 0) {
    return (
      <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
        Aún no hay obras para graficar. Registra servicios para ver su evolución.
      </p>
    )
  }

  const anchoBarra = Math.max(6, Math.min(34, (ANCHO_PLOT / n) * 0.5))
  const lineasPct = [0, 25, 50, 75, 100]
  const filaActual =
    serie.find((f) => f.mes === mesHoy) ??
    [...serie].reverse().find((f) => f.desfaseTiempo != null) ??
    serie[n - 1]
  const fila = activo != null ? serie[activo] : null

  // Evita amontonar etiquetas de mes cuando hay muchos periodos.
  const pasoEtiqueta = n > 14 ? 2 : 1

  return (
    <div className="mx-auto max-w-[1080px] space-y-4">
      <div>
        <p className="mb-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
          Situación de la cartera · {formatearMes(filaActual.mes)}
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ResumenItem
            color={COLOR.volumen}
            forma="barra"
            etiqueta="Volumen"
            valor={filaActual.activos}
            detalle="obras activas"
          />
          <ResumenItem
            color={COLOR.tiempo}
            forma="linea"
            etiqueta="Desfase de tiempo"
            valor={porcentajeTexto(filaActual.desfaseTiempo)}
            detalle={
              filaActual.desfaseTiempo != null
                ? `${filaActual.conRetraso} de ${filaActual.evaluables} obras con retraso`
                : 'sin avance medible'
            }
          />
          <ResumenItem
            color={COLOR.costo}
            forma="linea"
            etiqueta="Desfase de costo"
            valor={porcentajeTexto(filaActual.desfaseCosto)}
            detalle="sobrecosto promedio de la cartera"
          />
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${ANCHO} ${ALTO}`}
          role="img"
          aria-label="Gráfico combinado del volumen de obras activas y los desfases de tiempo y costo por mes"
          className="w-full"
          style={{ height: 'auto' }}
          onMouseLeave={() => setActivo(null)}
        >
          {/* Rejilla horizontal + eje izquierdo (%) */}
          {lineasPct.map((p) => (
            <g key={`pct-${p}`}>
              <line
                x1={MARGEN.izquierda}
                x2={ANCHO - MARGEN.derecha}
                y1={yPct(p)}
                y2={yPct(p)}
                stroke={p === 0 ? '#cbd5e1' : '#e2e8f0'}
                strokeWidth={p === 0 ? 1.2 : 1}
                strokeDasharray={p === 0 ? undefined : '3 4'}
              />
              <text
                x={MARGEN.izquierda - 7}
                y={yPct(p) + 3.5}
                textAnchor="end"
                className="fill-slate-400"
                fontSize="10"
              >
                {p} %
              </text>
            </g>
          ))}

          {/* Eje derecho (unidades) */}
          {marcasVol.map((v) => (
            <text
              key={`vol-${v}`}
              x={ANCHO - MARGEN.derecha + 7}
              y={yVol(v) + 3.5}
              textAnchor="start"
              className="fill-slate-400"
              fontSize="10"
            >
              {v}
            </text>
          ))}

          {/* Columnas de volumen (detrás) */}
          {serie.map((f, i) => {
            const altura = Math.max(0, yVol(0) - yVol(f.activos))
            return (
              <rect
                key={`bar-${f.mes}`}
                x={x(i) - anchoBarra / 2}
                y={yVol(f.activos)}
                width={anchoBarra}
                height={altura}
                rx={Math.min(3, anchoBarra / 3)}
                fill={activo === i ? COLOR.volumenActivo : COLOR.volumen}
                className="transition-colors"
              />
            )
          })}

          {/* Líneas de desfase (delante) */}
          {segTiempo.map((d, i) => (
            <path key={`t-${i}`} d={d} fill="none" stroke={COLOR.tiempo} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {segCosto.map((d, i) => (
            <path key={`c-${i}`} d={d} fill="none" stroke={COLOR.costo} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          ))}

          {/* Puntos de las líneas */}
          {puntosTiempo.map(
            (p, i) =>
              p.y != null && (
                <circle key={`pt-${i}`} cx={p.x} cy={p.y} r={activo === i ? 3.5 : 2.6} fill={COLOR.tiempo} stroke="#fff" strokeWidth="1.2" />
              ),
          )}
          {puntosCosto.map(
            (p, i) =>
              p.y != null && (
                <circle key={`pc-${i}`} cx={p.x} cy={p.y} r={activo === i ? 3.5 : 2.6} fill={COLOR.costo} stroke="#fff" strokeWidth="1.2" />
              ),
          )}

          {/* Guía vertical del periodo activo */}
          {activo != null && (
            <line
              x1={x(activo)}
              x2={x(activo)}
              y1={MARGEN.arriba}
              y2={MARGEN.arriba + ALTO_PLOT}
              stroke="#94a3b8"
              strokeWidth="1"
              strokeDasharray="4 3"
            />
          )}

          {/* Etiquetas del eje X (mes / año) */}
          {serie.map((f, i) => {
            if (i % pasoEtiqueta !== 0) return null
            const [anio, mes] = f.mes.split('-')
            const mostrarAnio = i === 0 || mes === '01'
            return (
              <g key={`x-${f.mes}`}>
                <text x={x(i)} y={ALTO - 16} textAnchor="middle" className="fill-slate-500" fontSize="10">
                  {formatearMes(f.mes).split(' ')[0]}
                </text>
                {mostrarAnio && (
                  <text x={x(i)} y={ALTO - 5} textAnchor="middle" className="fill-slate-400" fontSize="9">
                    {anio}
                  </text>
                )}
              </g>
            )
          })}

          {/* Zonas interactivas por periodo (tooltip) */}
          {serie.map((f, i) => (
            <rect
              key={`hit-${f.mes}`}
              x={x(i) - ANCHO_PLOT / n / 2}
              y={MARGEN.arriba}
              width={ANCHO_PLOT / n}
              height={ALTO_PLOT}
              fill="transparent"
              onMouseEnter={() => setActivo(i)}
              onFocus={() => setActivo(i)}
              tabIndex={0}
            />
          ))}
        </svg>

        {fila && (
          <div
            className="pointer-events-none absolute top-0 z-10 w-48 -translate-x-1/2 rounded-lg border border-slate-200 bg-white/95 p-3 text-xs shadow-lg backdrop-blur"
            style={{ left: `${Math.min(88, Math.max(12, (x(activo) / ANCHO) * 100))}%` }}
            role="tooltip"
          >
            <p className="mb-1.5 font-semibold text-slate-800 capitalize">{formatearMes(fila.mes)}</p>
            <dl className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-slate-500">
                  <span className="size-2 rounded-sm" style={{ backgroundColor: COLOR.volumen }} />
                  Volumen
                </dt>
                <dd className="font-medium tabular-nums text-slate-800">{fila.activos} obras</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-slate-500">
                  <span className="size-2 rounded-full" style={{ backgroundColor: COLOR.tiempo }} />
                  Desfase tiempo
                </dt>
                <dd className="font-medium tabular-nums text-slate-800">{porcentajeTexto(fila.desfaseTiempo)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-slate-500">
                  <span className="size-2 rounded-full" style={{ backgroundColor: COLOR.costo }} />
                  Desfase costo
                </dt>
                <dd className="font-medium tabular-nums text-slate-800">{porcentajeTexto(fila.desfaseCosto)}</dd>
              </div>
            </dl>
            {fila.desfaseTiempo != null ? (
              <p className="mt-1.5 border-t border-slate-100 pt-1.5 text-[11px] text-slate-400">
                {fila.conRetraso} de {fila.evaluables} obras con retraso
              </p>
            ) : (
              <p className="mt-1.5 border-t border-slate-100 pt-1.5 text-[11px] text-slate-400">
                Mes futuro: aún sin desfase calculado.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
