// Diagrama de red PERT / CPM del servicio (actividad-en-nodo).
//
// Es otra lectura del MISMO cálculo CPM (programar): no reescribe fechas ni
// dependencias. Cada nodo es una tarea hoja con su nombre, duración en días
// laborables, fechas tempranas (ES/EF) y holgura; las flechas etiquetadas
// indican el tipo de dependencia (FS/SS/FF/SF + holgura) y se pintan de rojo
// cuando ambos extremos son críticos, de modo que la ruta crítica se lee de un
// vistazo.
//
// Disposición: columnas = nivel topológico (camino más largo desde un inicio);
// dentro de cada columna se ordena por inicio temprano para reducir cruces.

import { useMemo } from 'react'
import { diasLaborablesRango } from '../../utils/calendario'

const NODO_W = 176
const NODO_H = 60
const GAP_X = 88
const GAP_Y = 22
const MARGEN = 28

// Etiqueta corta de la dependencia: tipo + holgura (FS, FS+5, SS-2…).
function etiquetaDependencia({ tipo, lag }) {
  const l = Number(lag) || 0
  if (!l) return tipo
  return `${tipo}${l > 0 ? `+${l}` : l}`
}

function truncar(texto, maximo) {
  const t = String(texto ?? '')
  return t.length > maximo ? `${t.slice(0, maximo - 1)}…` : t
}

// Fecha corta DD/MM para caber dentro del nodo.
function fechaCorta(iso) {
  if (!iso) return '—'
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

export function RedPERT({ servicio, tareas, cpm, calendario }) {
  const red = useMemo(() => {
    const todas = tareas ?? []
    const hojas = todas.filter(
      (t) =>
        t.servicio_id === servicio?.id &&
        t.fecha_inicio &&
        t.fecha_fin &&
        !todas.some((h) => h.padre_id === t.id),
    )
    const ids = new Set(hojas.map((t) => t.id))
    if (hojas.length === 0) {
      return { hojas: [], nodos: new Map(), flechas: [], niveles: 0, filasMax: 0, ancho: 0, alto: 0 }
    }

    // Nivel topológico: camino más largo desde un inicio (0 si no tiene preds).
    const nivel = new Map()
    const nivelDe = (t, pila = new Set()) => {
      if (nivel.has(t.id)) return nivel.get(t.id)
      if (pila.has(t.id)) return 0 // ciclo: se rompe con 0
      pila.add(t.id)
      const preds = (t.predecesoras ?? []).filter((p) => ids.has(p.id))
      const n =
        preds.length === 0
          ? 0
          : Math.max(
              ...preds.map((p) => {
                const pred = hojas.find((h) => h.id === p.id)
                return pred ? nivelDe(pred, pila) + 1 : 0
              }),
            )
      nivel.set(t.id, n)
      return n
    }
    hojas.forEach((t) => nivelDe(t))

    // Columnas por nivel; dentro de cada una, orden por inicio temprano.
    const porNivel = new Map()
    for (const t of hojas) {
      const n = nivel.get(t.id)
      if (!porNivel.has(n)) porNivel.set(n, [])
      porNivel.get(n).push(t)
    }
    for (const lista of porNivel.values()) {
      lista.sort(
        (a, b) =>
          (cpm.porTarea[a.id]?.es || '').localeCompare(cpm.porTarea[b.id]?.es || '') || a.id - b.id,
      )
    }

    const nodos = new Map()
    let filasMax = 0
    for (const [n, lista] of porNivel) {
      filasMax = Math.max(filasMax, lista.length)
      lista.forEach((t, i) => {
        nodos.set(t.id, { tarea: t, x: MARGEN + n * (NODO_W + GAP_X), y: MARGEN + i * (NODO_H + GAP_Y) })
      })
    }

    const flechas = []
    for (const t of hojas) {
      for (const p of t.predecesoras ?? []) {
        if (!ids.has(p.id)) continue
        flechas.push({ ...p, desde: p.id, hasta: t.id })
      }
    }

    const niveles = porNivel.size
    const ancho = MARGEN * 2 + niveles * NODO_W + Math.max(0, niveles - 1) * GAP_X
    const alto = MARGEN * 2 + filasMax * NODO_H + Math.max(0, filasMax - 1) * GAP_Y
    return { hojas, nodos, flechas, niveles, filasMax, ancho, alto }
  }, [tareas, servicio, cpm])

  // Resumen de la ruta crítica y duración total.
  const ruta = cpm.rutaCritica ?? []
  const cadenaRuta = ruta.map((id) => red.nodos.get(id)?.tarea?.nombre ?? `#${id}`).join(' → ')
  const duracionTotal =
    cpm.inicio && cpm.fin && calendario ? diasLaborablesRango(cpm.inicio, cpm.fin, calendario) : null

  if (red.hojas.length === 0) {
    return (
      <div className="rounded-xl border border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
        No hay tareas con fechas para dibujar la red.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm">
        <div className="min-w-0">
          <span className="font-semibold text-slate-700">Ruta crítica: </span>
          <span className="font-medium text-red-600">{cadenaRuta || 'Sin ruta crítica definida'}</span>
        </div>
        <div>
          <span className="font-semibold text-slate-700">Duración total: </span>
          <span className="tabular-nums text-slate-600">
            {duracionTotal != null ? `${duracionTotal} días laborables` : '—'}
          </span>
        </div>
        <div>
          <span className="font-semibold text-slate-700">Actividades críticas: </span>
          <span className="tabular-nums text-slate-600">{ruta.length}</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white shadow-sm">
        <svg
          viewBox={`0 0 ${red.ancho} ${red.alto}`}
          width={red.ancho}
          height={red.alto}
          role="img"
          aria-label="Diagrama de red PERT del servicio"
          className="block"
        >
          <defs>
            <marker id="pert-flecha" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0 0 L8 4 L0 8 z" fill="#94a3b8" />
            </marker>
            <marker id="pert-flecha-critica" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0 0 L8 4 L0 8 z" fill="#dc2626" />
            </marker>
          </defs>

          {/* Flechas de dependencia (debajo de los nodos) */}
          {red.flechas.map((f) => {
            const a = red.nodos.get(f.desde)
            const b = red.nodos.get(f.hasta)
            if (!a || !b) return null
            const x1 = a.x + NODO_W
            const y1 = a.y + NODO_H / 2
            const x2 = b.x
            const y2 = b.y + NODO_H / 2
            const codo = Math.max(14, (x2 - x1) / 2)
            const critica = cpm.porTarea[f.desde]?.critica && cpm.porTarea[f.hasta]?.critica
            const color = critica ? '#dc2626' : '#94a3b8'
            const etiqueta = etiquetaDependencia(f)
            const lx = x1 + codo
            const ly = (y1 + y2) / 2
            return (
              <g key={`${f.desde}-${f.hasta}-${f.tipo}`}>
                <path
                  d={`M ${x1} ${y1} H ${x1 + codo} V ${ly} H ${x2}`}
                  fill="none"
                  stroke={color}
                  strokeWidth={critica ? 2.2 : 1.4}
                  strokeDasharray={critica ? undefined : '5 4'}
                  markerEnd={`url(#pert-flecha${critica ? '-critica' : ''})`}
                />
                <text
                  x={lx}
                  y={ly + 3.5}
                  textAnchor="middle"
                  fontSize={9.5}
                  fontWeight={600}
                  fill={critica ? '#b91c1c' : '#64748b'}
                  stroke="#ffffff"
                  strokeWidth={3}
                  paintOrder="stroke"
                >
                  {etiqueta}
                </text>
              </g>
            )
          })}

          {/* Nodos */}
          {red.hojas.map((t) => {
            const n = red.nodos.get(t.id)
            const v = cpm.porTarea[t.id]
            if (!n || !v) return null
            const critica = v.critica
            const esHito = v.hito
            const cx = n.x + NODO_W / 2
            const cy = n.y + NODO_H / 2
            const borde = critica ? '#dc2626' : '#94a3b8'
            const fondo = critica ? '#fef2f2' : '#ffffff'
            return (
              <g key={t.id}>
                {esHito ? (
                  <>
                    <rect
                      x={cx - 11}
                      y={cy - 11}
                      width={22}
                      height={22}
                      rx={3}
                      transform={`rotate(45 ${cx} ${cy})`}
                      fill={critica ? '#fef2f2' : '#fffbeb'}
                      stroke={borde}
                      strokeWidth={critica ? 2.4 : 1.6}
                    />
                    <text x={cx} y={cy + 26} textAnchor="middle" fontSize={10} fontWeight={600} fill="#1e293b">
                      {truncar(t.nombre, 20)}
                    </text>
                    <text x={cx} y={cy + 40} textAnchor="middle" fontSize={9} fill="#64748b">
                      {fechaCorta(v.es)}
                    </text>
                  </>
                ) : (
                  <>
                    <rect
                      x={n.x}
                      y={n.y}
                      width={NODO_W}
                      height={NODO_H}
                      rx={10}
                      fill={fondo}
                      stroke={borde}
                      strokeWidth={critica ? 2.4 : 1.4}
                    />
                    <text x={n.x + 10} y={n.y + 18} fontSize={10.5} fontWeight={600} fill="#1e293b">
                      {truncar(t.nombre, 22)}
                    </text>
                    <text x={n.x + 10} y={n.y + 34} fontSize={9.5} fill="#475569">
                      {`ES ${fechaCorta(v.es)} · EF ${fechaCorta(v.ef)}`}
                    </text>
                    <text
                      x={n.x + 10}
                      y={n.y + 50}
                      fontSize={9.5}
                      fontWeight={critica ? 700 : 500}
                      fill={critica ? '#b91c1c' : '#64748b'}
                    >
                      {critica ? `${v.duracion} d · Crítica` : `${v.duracion} d · Holg. ${v.holgura} d`}
                    </text>
                  </>
                )}
                <title>{`${t.nombre} · duración ${v.duracion} d · holgura ${v.holgura} d${critica ? ' · crítica' : ''}`}</title>
              </g>
            )
          })}
        </svg>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3.5 rounded border-2 border-red-600 bg-red-50" /> Crítica
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3.5 rounded border-2 border-slate-400 bg-white" /> No crítica
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rotate-45 border-2 border-amber-500 bg-amber-50" /> Hito
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-5 bg-red-500" /> Dependencia crítica
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0 w-5 border-t-2 border-dashed border-slate-400" /> Dependencia
        </span>
      </div>
    </div>
  )
}
