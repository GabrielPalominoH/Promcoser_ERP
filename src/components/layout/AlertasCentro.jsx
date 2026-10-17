import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../../context/useData'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Input } from '../ui/Field'
import { SelectFiltro } from '../ui/FiltroBusqueda'
import {
  agruparPorObra,
  alertasCentro,
  contarPorGravedad,
  descartarAlerta,
  etiquetaAlerta,
  posponerAlerta,
} from '../../utils/alertasCentro'
import { hoyISO } from '../../utils/calculadora'

// Campana del centro de alertas (Tarea 6). Vive en la esquina superior derecha
// y está presente en todas las pantallas. El panel NO compone alertas: lee la
// misma fuente única (`alertasCentro`) que el Resumen y el Dashboard, y solo
// escribe el estado mínimo del usuario (pospuestas y descartadas).

const TONO_GRAVEDAD = { alta: 'danger', media: 'warning', baja: 'neutral' }

// Estilo del borde/fondo de cada tarjeta según gravedad.
const CLASE_GRAVEDAD = {
  alta: 'border-red-200 bg-red-50/50',
  media: 'border-amber-200 bg-amber-50/40',
  baja: 'border-slate-200 bg-slate-50/60',
}

const OPCIONES_GRAVEDAD = [
  { valor: '', texto: 'Toda gravedad' },
  { valor: 'alta', texto: 'Alta' },
  { valor: 'media', texto: 'Media' },
  { valor: 'baja', texto: 'Baja' },
]

export function AlertasCentro() {
  const { estado, actualizarAlertasEstado } = useData()
  const [abierto, setAbierto] = useState(false)
  const [filtroObra, setFiltroObra] = useState('')
  const [filtroGravedad, setFiltroGravedad] = useState('')
  const [descartando, setDescartando] = useState(null)
  const [nota, setNota] = useState('')

  const hoy = hoyISO()
  const alertas = useMemo(
    () => alertasCentro({ estado, hoy, alertasEstado: estado.alertasEstado }),
    [estado, hoy],
  )
  const conteo = contarPorGravedad(alertas)

  const filtradas = alertas.filter(
    (a) =>
      (filtroObra === '' || String(a.obraId) === String(filtroObra)) &&
      (filtroGravedad === '' || a.gravedad === filtroGravedad),
  )
  const grupos = agruparPorObra(filtradas)

  const posponer = (alerta, dias) =>
    actualizarAlertasEstado(posponerAlerta(estado.alertasEstado, alerta.id, dias, hoy))

  const descartar = (alerta) => {
    actualizarAlertasEstado(descartarAlerta(estado.alertasEstado, alerta, nota, hoy))
    setDescartando(null)
    setNota('')
  }

  const badge = conteo.alta > 0 ? 'danger' : conteo.media > 0 ? 'warning' : 'neutral'

  return (
    <div className="fixed right-4 top-4 z-40 print:hidden">
      <button
        type="button"
        onClick={() => setAbierto((valor) => !valor)}
        aria-label="Centro de alertas"
        aria-expanded={abierto}
        className="relative inline-flex size-11 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-800"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {alertas.length > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1 text-center text-xs font-semibold leading-5 text-white">
            {alertas.length > 99 ? '99+' : alertas.length}
          </span>
        )}
      </button>

      {abierto && (
        <div className="mt-2 max-h-[75vh] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-slate-300 bg-white p-4 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Centro de alertas</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {alertas.length === 0
                  ? 'Todo dentro de lo esperado.'
                  : `${alertas.length} alerta(s): ${conteo.alta} alta(s), ${conteo.media} media(s).`}
              </p>
            </div>
            <Badge variante={badge}>{alertas.length}</Badge>
          </div>

          {alertas.length > 0 && (
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <SelectFiltro
                label="Filtrar alertas por obra"
                value={filtroObra}
                onChange={setFiltroObra}
              >
                <option value="">Todas las obras</option>
                {[...new Map(alertas.filter((a) => a.obraId != null).map((a) => [a.obraId, a.obra])).entries()].map(
                  ([id, nombre]) => (
                    <option key={id} value={id}>
                      {nombre}
                    </option>
                  ),
                )}
              </SelectFiltro>
              <SelectFiltro
                label="Filtrar alertas por gravedad"
                value={filtroGravedad}
                onChange={setFiltroGravedad}
              >
                {OPCIONES_GRAVEDAD.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.texto}
                  </option>
                ))}
              </SelectFiltro>
            </div>
          )}

          {filtradas.length === 0 ? (
            <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-800">
              {alertas.length === 0
                ? 'Sin alertas: la cartera va dentro de lo esperado.'
                : 'Ninguna alerta coincide con el filtro.'}
            </p>
          ) : (
            <div className="mt-3 space-y-4">
              {grupos.map((grupo) => (
                <section key={grupo.obraId ?? 'sin-obra'}>
                  <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {grupo.obra || 'Sin obra'}
                  </h3>
                  <ul className="space-y-2">
                    {grupo.alertas.map((a) => (
                      <li
                        key={a.id}
                        className={`rounded-lg border px-3 py-2.5 text-sm ${
                          CLASE_GRAVEDAD[a.gravedad] ?? CLASE_GRAVEDAD.baja
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-600">
                            {etiquetaAlerta(a.tipo)}
                          </span>
                          <Badge variante={TONO_GRAVEDAD[a.gravedad] ?? 'neutral'}>
                            {a.gravedad}
                          </Badge>
                        </div>
                        <Link
                          to={a.enlace}
                          className="mt-0.5 block font-medium text-slate-900 hover:text-primary-700 hover:underline"
                          onClick={() => setAbierto(false)}
                        >
                          {a.titulo}
                        </Link>
                        <p className="mt-0.5 text-xs text-slate-600">{a.mensaje}</p>

                        {descartando === a.id ? (
                          <div className="mt-2 space-y-2">
                            <Input
                              value={nota}
                              onChange={(evento) => setNota(evento.target.value)}
                              placeholder="Nota (por qué se descarta)"
                              aria-label="Nota de descarte"
                            />
                            <div className="flex gap-2">
                              <Button
                                variante="peligro"
                                tamano="sm"
                                onClick={() => descartar(a)}
                              >
                                Descartar
                              </Button>
                              <Button
                                variante="secundario"
                                tamano="sm"
                                onClick={() => {
                                  setDescartando(null)
                                  setNota('')
                                }}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <Button variante="secundario" tamano="sm" onClick={() => posponer(a, 1)}>
                              1 día
                            </Button>
                            <Button variante="secundario" tamano="sm" onClick={() => posponer(a, 3)}>
                              3 días
                            </Button>
                            <Button variante="secundario" tamano="sm" onClick={() => posponer(a, 7)}>
                              7 días
                            </Button>
                            <Button
                              variante="secundario"
                              tamano="sm"
                              onClick={() => {
                                setDescartando(a.id)
                                setNota('')
                              }}
                            >
                              Descartar
                            </Button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
