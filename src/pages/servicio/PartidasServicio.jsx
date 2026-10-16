import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useData } from '../../context/useData'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Campo } from '../../components/ui/Field'
import { CampoComboBox } from '../../components/ui/ComboBox'
import { InputMonto } from '../../components/ui/Monto'
import { Modal } from '../../components/ui/Modal'
import { Aviso } from '../../components/ui/Aviso'
import { UNIDADES } from '../../data/unidades'
import {
  Table,
  TableBody,
  TableEmpty,
  TableHead,
  TableRow,
  Td,
  Th,
} from '../../components/ui/Table'
import { formatearCantidad, formatearMoneda } from '../../utils/formatters'
import { normalizar } from '../../components/ui/ComboBox'
import { Buscador, BarraFiltros, textoCoincide } from '../../components/ui/FiltroBusqueda'
import {
  avanceEfectivo,
  costoSinTarea,
  costoSubarbol,
  desviacionDias,
  diasEstimadosTarea,
  diasRealesTarea,
  montoTarea,
  presupuestoTareas,
  registrosDeServicio,
  tieneHijas,
  valorizadoTarea,
} from '../../utils/calculadora'
import {
  desviacionHoras,
  horasPlanTarea,
  horasRealesTarea,
} from '../../utils/horasHombre'
import { libroCostosPorPartida } from '../../utils/exportaciones'
import { descargarLibro } from '../../utils/descargas'

// Monto en texto: las hojas se editan con el botón Editar de la fila;
// los padres con hijas muestran la suma automática (solo lectura).
function CeldaMonto({ tarea, tareas }) {
  const valor = tieneHijas(tarea.id, tareas)
    ? montoTarea(tarea, tareas)
    : Number(tarea.monto) || 0
  return (
    <span
      className="tabular-nums"
      title={tieneHijas(tarea.id, tareas) ? 'Suma automática de sus hijas' : undefined}
    >
      {formatearMoneda(valor)}
    </span>
  )
}

// Horas-hombre por unidad ejecutada: horas reales ÷ metrado avanzado.
function hhPorUnidad(horas, metrado, avance) {
  const m = Number(metrado)
  if (!m) return null
  const ejecutado = m * ((Number(avance) || 0) / 100)
  if (ejecutado <= 0) return null
  return Math.round((Number(horas) / ejecutado) * 10000) / 10000
}

function ModalMonto({ tarea, onCerrar, onGuardar }) {
  const [monto, setMonto] = useState(() => Number(tarea?.monto) || 0)
  const [metrado, setMetrado] = useState(() => (tarea?.metrado ?? ''))
  const [unidad, setUnidad] = useState(() => (tarea?.unidad ?? ''))
  const [pu, setPu] = useState(() => (tarea?.precio_unitario ?? ''))
  const [error, setError] = useState(null)

  if (!tarea) return null
  const conMetrado = metrado !== '' && pu !== ''
  const metradoSinUnidad = metrado !== '' && unidad === ''
  const unidadSinMetrado = unidad !== '' && metrado === ''
  const derivado = conMetrado
    ? Math.round((Number(metrado) || 0) * (Number(pu) || 0) * 100) / 100
    : null
  const valor = derivado != null ? derivado : Number(monto)

  const guardar = () => {
    if (valor === '' || Number.isNaN(valor) || valor < 0) {
      setError('Ingresa un monto válido mayor o igual a cero')
      return
    }
    onGuardar(tarea.id, {
      monto: valor,
      metrado: metrado === '' ? null : Number(metrado),
      unidad: unidad || null,
      precio_unitario: pu === '' ? null : Number(pu),
    })
    onCerrar()
  }

  return (
    <Modal
      abierto
      ancho="sm"
      titulo="Partida: metrado, unidad y precio"
      descripcion={tarea.nombre}
      onCerrar={onCerrar}
      pie={
        <>
          <Button variante="secundario" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar}>Guardar</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Campo
            label="Metrado"
            error={error}
            htmlFor="partida-metrado"
            hint={metradoSinUnidad ? 'Agrega la unidad de medida (m³, m², und…)' : undefined}
          >
            <Input
              id="partida-metrado"
              type="number"
              step="0.0001"
              min="0"
              autoFocus
              value={metrado}
              onChange={(e) => {
                setMetrado(e.target.value)
                setError(null)
              }}
            />
          </Campo>
          <Campo
            label="Unidad de medida"
            htmlFor="partida-unidad"
            hint={unidadSinMetrado ? 'Sin metrado, la unidad no aplica' : undefined}
          >
            <CampoComboBox
              id="partida-unidad"
              placeholder="Elige unidad…"
              opciones={UNIDADES.map((u) => ({ valor: u.sigla, etiqueta: `${u.sigla} — ${u.nombre}` }))}
              value={unidad}
              onChange={(v) => setUnidad(v)}
            />
          </Campo>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Precio unitario (S/)" htmlFor="partida-pu">
            <InputMonto
              id="partida-pu"
              value={pu}
              onChange={(v) => {
                setPu(v)
                setError(null)
              }}
            />
          </Campo>
          <Campo
            label="Monto (S/)"
            error={error}
            htmlFor="partida-monto"
            hint={
              conMetrado
                ? `Metrado × precio unitario = ${formatearMoneda(valor)}`
                : 'Sin metrado ni precio unitario, el monto es manual.'
            }
          >
            <InputMonto
              id="partida-monto"
              value={conMetrado ? valor : monto}
              disabled={conMetrado}
              onChange={(valorCampo) => {
                setMonto(valorCampo)
                setError(null)
              }}
            />
          </Campo>
        </div>
      </div>
    </Modal>
  )
}

export function PartidasServicio() {
  const { servicio } = useOutletContext()
  // Tablero de montos por tarea: montos editables en la lista.
  // Las tareas se crean en el Cronograma; aquí solo se les pone monto.
  const { estado, actualizarItem } = useData()
  const [aviso, setAviso] = useState(null)
  const [montoEditando, setMontoEditando] = useState(null)
  const [colapsadas, setColapsadas] = useState({})
  const [busqueda, setBusqueda] = useState('')

  const alternarGrupo = (id) =>
    setColapsadas((previo) => ({ ...previo, [id]: !previo[id] }))

  const tareas = useMemo(
    () =>
      (estado.tareas ?? [])
        .filter((t) => t.servicio_id === servicio.id)
        .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio) || a.id - b.id),
    [estado.tareas, servicio.id],
  )
  const registros = useMemo(
    () => registrosDeServicio(estado.registros_servicio, servicio.id),
    [estado.registros_servicio, servicio.id],
  )
  const asignaciones = useMemo(
    () => (estado.asignaciones ?? []).filter((a) => a.servicio_id === servicio.id),
    [estado.asignaciones, servicio.id],
  )

  // Filtro de la lista: texto sobre el nombre de la tarea. Al buscar se
  // expande el árbol (se ignoran los grupos colapsados) y se conservan los
  // ancestros de cada coincidencia para no perder la jerarquía.
  const termino = normalizar(busqueda).trim()

  // Filas planas del árbol con sangría, como en el cronograma.
  // Respeta los grupos colapsados: sus hijas no aparecen en la lista.
  // Mientras se busca, se expande todo para poder encontrar cualquier tarea.
  const filas = useMemo(() => {
    const lista = []
    const porPadre = new Map()
    for (const t of tareas) {
      const clave = t.padre_id ?? null
      if (!porPadre.has(clave)) porPadre.set(clave, [])
      porPadre.get(clave).push(t)
    }
    const recorrer = (tarea, nivel, numero) => {
      const hijas = porPadre.get(tarea.id) ?? []
      lista.push({ tarea, nivel, numero, hijas })
      if (hijas.length > 0 && (termino || !colapsadas[tarea.id])) {
        for (const [j, hija] of hijas.entries()) {
          recorrer(hija, nivel + 1, `${numero}.${j + 1}`)
        }
      }
    }
    for (const [i, raiz] of (porPadre.get(null) ?? []).entries()) {
      recorrer(raiz, 0, `${i + 1}`)
    }
    return lista
  }, [tareas, colapsadas, termino])

  const filasFiltradas = useMemo(() => {
    if (!termino) return filas
    const padreDe = new Map(tareas.map((t) => [t.id, t.padre_id ?? null]))
    const incluir = new Set()
    for (const fila of filas) {
      if (!textoCoincide(fila.tarea.nombre, termino)) continue
      let actual = fila.tarea.id
      while (actual != null && !incluir.has(actual)) {
        incluir.add(actual)
        actual = padreDe.get(actual) ?? null
      }
    }
    return filas.filter((fila) => incluir.has(fila.tarea.id))
  }, [filas, tareas, termino])

  const grupos = useMemo(
    () => tareas.filter((t) => tieneHijas(t.id, tareas)).map((t) => t.id),
    [tareas],
  )

  const guardarMonto = (id, cambios) => {
    const tarea = tareas.find((t) => t.id === id)
    if (!tarea) return
    actualizarItem('tareas', { id, ...cambios })
    setAviso({ tipo: 'exito', mensaje: `Partida «${tarea.nombre}» actualizada.` })
  }

  // Exportación a Excel de los costos por partida (monto, valorizado, costo).
  const exportarExcel = () => {
    const ok = descargarLibro(
      libroCostosPorPartida({ servicio, tareas, registros: estado.registros_servicio }),
    )
    setAviso(
      ok
        ? { tipo: 'exito', mensaje: 'Costos por partida exportados a Excel.' }
        : { tipo: 'error', mensaje: 'No se pudo exportar los costos.' },
    )
  }

  const montoTotal = presupuestoTareas(tareas, servicio.id)
  const valorizado = tareas
    .filter((t) => t.padre_id == null)
    .reduce((s, t) => s + valorizadoTarea(t, tareas), 0)
  const costo = tareas
    .filter((t) => t.padre_id == null)
    .reduce((s, t) => s + costoSubarbol(t, tareas, estado.registros_servicio, servicio.id), 0)
  const sinTarea = costoSinTarea(estado.registros_servicio, servicio.id)
  const margen = valorizado - costo - sinTarea
  const estTotal = tareas
    .filter((t) => t.padre_id == null)
    .reduce((s, t) => s + diasEstimadosTarea(t, tareas), 0)
  const realTotal = tareas
    .filter((t) => t.padre_id == null)
    .reduce((s, t) => s + diasRealesTarea(t, tareas, estado.registros_servicio, servicio.id), 0)
  const desvTotal = desviacionDias(estTotal, realTotal)
  const hhPlanTotal = tareas
    .filter((t) => t.padre_id == null)
    .reduce((s, t) => s + horasPlanTarea(t, tareas, asignaciones, servicio), 0)
  const hhRealTotal = tareas
    .filter((t) => t.padre_id == null)
    .reduce((s, t) => s + horasRealesTarea(t, tareas, estado.registros_servicio, servicio.id), 0)
  const desvHHTotal = desviacionHoras(hhPlanTotal, hhRealTotal)
  const presupuesto = Number(servicio.presupuesto_asignado) || 0
  const desvioPresupuesto = Math.round((montoTotal - presupuesto) * 100) / 100

  return (
    <div className="space-y-6">
      {grupos.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => {
                if (grupos.some((id) => colapsadas[id])) {
                  setColapsadas({})
                } else {
                  setColapsadas(Object.fromEntries(grupos.map((id) => [id, true])))
                }
              }}
              className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100"
              title="Expandir o colapsar todos los grupos"
            >
              {grupos.some((id) => colapsadas[id]) ? 'Expandir todo' : 'Colapsar todo'}
            </button>
          </div>
        </div>
      )}
      <Card
        titulo="Montos y valorizado por tarea"
        descripcion={
          montoTotal > 0
            ? `Montos ${formatearMoneda(montoTotal)} · valorizado ${formatearMoneda(valorizado)}`
            : 'Ponle monto a cada tarea: las principales suman solas.'
        }
        acciones={
          <Button variante="secundario" tamano="sm" onClick={exportarExcel} disabled={tareas.length === 0}>
            Exportar Excel
          </Button>
        }
      >
        {tareas.length > 0 && (
          <BarraFiltros
            contador={
              termino ? (
                <>
                  <span className="font-semibold text-slate-700">{filasFiltradas.length}</span> de{' '}
                  {filas.length}
                </>
              ) : null
            }
          >
            <Buscador
              valor={busqueda}
              onChange={setBusqueda}
              placeholder="Buscar tarea…"
              ariaLabel="Buscar tareas"
            />
          </BarraFiltros>
        )}
        <Table>
          <TableHead>
            <TableRow>
              <Th>Tarea</Th>
              <Th alinear="right">UM</Th>
              <Th alinear="right">Metrado</Th>
              <Th alinear="right">Metrado ej.</Th>
              <Th alinear="right">P. Unit.</Th>
              <Th alinear="right">Monto</Th>
              <Th alinear="right">Valorizado</Th>
              <Th alinear="right">Avance</Th>
              <Th alinear="right">Costo</Th>
              <Th alinear="right">Margen</Th>
              <Th alinear="right">Días est.</Th>
              <Th alinear="right">Días reales</Th>
              <Th alinear="right">Desv. d</Th>
              <Th alinear="right">HH est.</Th>
              <Th alinear="right">HH real</Th>
              <Th alinear="right" className="whitespace-nowrap">HH/und</Th>
            </TableRow>
          </TableHead>
          <TableBody>
            {filas.length === 0 ? (
              <TableEmpty colSpan={16} mensaje="Aún no hay tareas. Créalas en el Cronograma." />
            ) : filasFiltradas.length === 0 ? (
              <TableEmpty colSpan={16} mensaje="Ninguna tarea coincide con el filtro." />
            ) : (
              filasFiltradas.map(({ tarea, nivel, numero, hijas }) => {
                const monto = montoTarea(tarea, tareas)
                const val = valorizadoTarea(tarea, tareas)
                const avance = avanceEfectivo(tarea, tareas)
                const costoFila = costoSubarbol(tarea, tareas, estado.registros_servicio, servicio.id)
                const margenFila = val - costoFila
                const estFila = diasEstimadosTarea(tarea, tareas)
                const realFila = diasRealesTarea(tarea, tareas, estado.registros_servicio, servicio.id)
                const desvFila = desviacionDias(estFila, realFila)
                const esPadre = hijas.length > 0
                const colapsada = esPadre && colapsadas[tarea.id]
                return (
                  <TableRow key={tarea.id}>
                    <Td>
                      <span style={{ paddingLeft: `${nivel * 1.25}rem` }} className="flex items-center gap-2">
                        {esPadre ? (
                          <button
                            type="button"
                            onClick={() => alternarGrupo(tarea.id)}
                            className="w-5 shrink-0 rounded p-0.5 text-center text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            aria-label={colapsada ? 'Expandir subtareas' : 'Colapsar subtareas'}
                            title={colapsada ? 'Expandir subtareas' : 'Colapsar subtareas'}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className={`mx-auto size-4 transition-transform ${colapsada ? '-rotate-90' : ''}`}
                              aria-hidden="true"
                            >
                              <path d="m6 9 6 6 6-6" />
                            </svg>
                          </button>
                        ) : (
                          <span className="w-5 shrink-0" aria-hidden="true" />
                        )}
                        <span className="mr-1.5 text-xs font-bold text-slate-400 tabular-nums">
                          {numero}
                        </span>
                        <span className={`min-w-0 flex-1 text-slate-900 ${nivel === 0 ? 'font-semibold' : ''}`}>
                          {tarea.nombre}
                        </span>
                        {esPadre && (
                          <span className="text-[11px] text-slate-400 tabular-nums">
                            {hijas.length} subt.
                          </span>
                        )}
                        {!esPadre && (
                          <Button
                            variante="secundario"
                            tamano="sm"
                            onClick={() => setMontoEditando(tarea)}
                          >
                            Editar partida
                          </Button>
                        )}
                      </span>
                    </Td>
                    <Td alinear="right" className="tabular-nums text-slate-600">
                      {esPadre ? '—' : (tarea.unidad ?? '—')}
                    </Td>
                    <Td
                      alinear="right"
                      className="tabular-nums text-slate-600"
                      title={
                        esPadre || tarea.metrado == null
                          ? undefined
                          : `${formatearCantidad(tarea.metrado)} ${tarea.unidad ?? 'sin unidad'}`
                      }
                    >
                      {esPadre ? '—' : (tarea.metrado ?? '—')}
                    </Td>
                    <Td alinear="right" className="tabular-nums text-slate-600">
                      {esPadre ? '—' : (tarea.metrado == null ? '—' : formatearCantidad(tarea.metrado * ((avance || 0) / 100)))}
                    </Td>
                    <Td alinear="right" className="tabular-nums text-slate-600">
                      {esPadre || tarea.precio_unitario == null
                        ? '—'
                        : formatearMoneda(tarea.precio_unitario)}
                    </Td>
                    <Td alinear="right">
                      <CeldaMonto tarea={tarea} tareas={tareas} />
                    </Td>
                    <Td alinear="right" className="tabular-nums">
                      {formatearMoneda(val)}
                    </Td>
                    <Td alinear="right" className="tabular-nums">
                      {avance.toFixed(0)}%
                    </Td>
                    <Td alinear="right" className="tabular-nums">
                      {formatearMoneda(costoFila)}
                    </Td>
                    <Td
                      alinear="right"
                      className={`font-semibold tabular-nums ${margenFila < 0 ? 'text-red-600' : 'text-slate-900'}`}
                    >
                      {formatearMoneda(margenFila)}
                    </Td>
                    <Td alinear="right" className="tabular-nums">
                      {estFila} d
                    </Td>
                    <Td alinear="right" className="tabular-nums">
                      {realFila} d
                    </Td>
                    <Td
                      alinear="right"
                      className={`tabular-nums ${desvFila.diferencia > 0 ? 'font-semibold text-red-600' : 'text-slate-500'}`}
                      title={desvFila.porcentaje == null ? 'Sin estimado' : `${desvFila.porcentaje}% de lo estimado`}
                    >
                      {desvFila.diferencia > 0 ? `+${desvFila.diferencia}` : desvFila.diferencia} d
                      <span className="block text-[11px] font-normal">
                        {desvFila.porcentaje == null ? '—' : `${desvFila.porcentaje}%`}
                      </span>
                    </Td>
                    <Td alinear="right" className="tabular-nums text-slate-600">
                      {formatearCantidad(
                        horasPlanTarea(tarea, tareas, asignaciones, servicio),
                      )}
                    </Td>
                    <Td alinear="right" className="tabular-nums">
                      {(() => {
                        const realHH = horasRealesTarea(
                          tarea,
                          tareas,
                          estado.registros_servicio,
                          servicio.id,
                        )
                        const desvHH = desviacionHoras(
                          horasPlanTarea(tarea, tareas, asignaciones, servicio),
                          realHH,
                        )
                        return (
                          <span
                            className={
                              desvHH.diferencia > 0 ? 'font-semibold text-red-600' : undefined
                            }
                            title={
                              desvHH.porcentaje == null
                                ? 'Sin horas planificadas'
                                : `${desvHH.diferencia > 0 ? '+' : ''}${formatearCantidad(
                                    desvHH.diferencia,
                                  )} h (${desvHH.porcentaje}% de lo planificado)`
                            }
                          >
                            {formatearCantidad(realHH)}
                          </span>
                        )
                      })()}
                    </Td>
                    <Td alinear="right" className="tabular-nums text-slate-600">
                      {(() => {
                        if (esPadre) return '—'
                        const realHH = horasRealesTarea(
                          tarea,
                          tareas,
                          estado.registros_servicio,
                          servicio.id,
                        )
                        const hhUnd = hhPorUnidad(realHH, tarea.metrado, avance)
                        return hhUnd == null ? '—' : formatearCantidad(hhUnd)
                      })()}
                    </Td>
                  </TableRow>
                )
              })
            )}

            {filasFiltradas.length > 0 && !termino && (
              <TableRow className="bg-slate-50 font-semibold">
                <Td className="text-slate-600">
                  Total
                  {sinTarea > 0 && (
                    <span className="block text-xs font-normal">
                      + {formatearMoneda(sinTarea)} sin tarea asignada
                    </span>
                  )}
                </Td>
                <Td alinear="right" className="tabular-nums">
                  —
                </Td>
                <Td alinear="right" className="tabular-nums">
                  —
                </Td>
                <Td alinear="right" className="tabular-nums">
                  —
                </Td>
                <Td alinear="right" className="tabular-nums">
                  —
                </Td>
                <Td alinear="right" className="tabular-nums">
                  {formatearMoneda(montoTotal)}
                </Td>
                <Td alinear="right" className="tabular-nums">
                  {formatearMoneda(valorizado)}
                </Td>
                <Td alinear="right" className="tabular-nums">
                  —
                </Td>
                <Td alinear="right" className="tabular-nums">
                  {formatearMoneda(costo + sinTarea)}
                </Td>
                <Td alinear="right" className="tabular-nums">
                  {formatearMoneda(margen)}
                </Td>
                <Td alinear="right" className="tabular-nums">
                  {estTotal} d
                </Td>
                <Td alinear="right" className="tabular-nums">
                  {realTotal} d
                </Td>
                <Td alinear="right" className={`tabular-nums ${desvTotal.diferencia > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                  {desvTotal.diferencia > 0 ? `+${desvTotal.diferencia}` : desvTotal.diferencia} d
                  <span className="block text-[11px] font-normal">
                    {desvTotal.porcentaje == null ? '—' : `${desvTotal.porcentaje}%`}
                  </span>
                </Td>
                <Td alinear="right" className="tabular-nums">
                  {formatearCantidad(hhPlanTotal)}
                </Td>
                <Td alinear="right" className="tabular-nums">
                  {formatearCantidad(hhRealTotal)}
                  {desvHHTotal.porcentaje != null && (
                    <span className="block text-[11px] font-normal">
                      {desvHHTotal.porcentaje}%
                    </span>
                  )}
                </Td>
                <Td alinear="right" className="tabular-nums">
                  —
                </Td>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {desvioPresupuesto !== 0 && (
          <p className="mt-3 rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
            Las partidas suman {formatearMoneda(montoTotal)} y el presupuesto del servicio es{' '}
            {formatearMoneda(presupuesto)} ({desvioPresupuesto > 0 ? '+' : ''}
            {formatearMoneda(desvioPresupuesto)}). Ajusta para que el valor ganado cuadre con el
            contrato.
          </p>
        )}
      </Card>

      {montoEditando && (
        <ModalMonto
          key={montoEditando.id}
          tarea={montoEditando}
          onCerrar={() => setMontoEditando(null)}
          onGuardar={guardarMonto}
        />
      )}

      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />
    </div>
  )
}
