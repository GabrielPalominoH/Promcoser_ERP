import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useData } from '../../context/useData'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Campo } from '../../components/ui/Field'
import { InputMonto } from '../../components/ui/Monto'
import { Modal } from '../../components/ui/Modal'
import { Aviso } from '../../components/ui/Aviso'
import {
  Table,
  TableBody,
  TableEmpty,
  TableHead,
  TableRow,
  Td,
  Th,
} from '../../components/ui/Table'
import { formatearMoneda } from '../../utils/formatters'
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

function ModalMonto({ tarea, onCerrar, onGuardar }) {
  const [texto, setTexto] = useState(() => Number(tarea?.monto) || 0)
  const [error, setError] = useState(null)

  if (!tarea) return null
  const valor = Number(texto)

  const guardar = () => {
    if (texto === '' || Number.isNaN(valor) || valor < 0) {
      setError('Ingresa un monto válido mayor o igual a cero')
      return
    }
    onGuardar(tarea.id, valor)
    onCerrar()
  }

  return (
    <Modal
      abierto
      ancho="sm"
      titulo="Monto de la tarea"
      descripcion={tarea.nombre}
      onCerrar={onCerrar}
      pie={
        <>
          <Button variante="secundario" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar}>Guardar monto</Button>
        </>
      }
    >
      <Campo label="Monto (S/)" error={error} htmlFor="monto-valor">
        <InputMonto
          id="monto-valor"
          autoFocus
          value={texto}
          onChange={(valorCampo) => {
            setTexto(valorCampo)
            setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') guardar()
          }}
        />
      </Campo>
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

  const guardarMonto = (id, monto) => {
    const tarea = tareas.find((t) => t.id === id)
    if (!tarea || (Number(tarea.monto) || 0) === monto) return
    actualizarItem('tareas', { id, monto })
    setAviso({ tipo: 'exito', mensaje: `Monto de «${tarea.nombre}» actualizado.` })
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
              <Th alinear="right">Monto</Th>
              <Th alinear="right">Valorizado</Th>
              <Th alinear="right">Avance</Th>
              <Th alinear="right">Costo</Th>
              <Th alinear="right">Margen</Th>
              <Th alinear="right">Días est.</Th>
              <Th alinear="right">Días reales</Th>
              <Th alinear="right">Desv. d</Th>
            </TableRow>
          </TableHead>
          <TableBody>
            {filas.length === 0 ? (
              <TableEmpty colSpan={9} mensaje="Aún no hay tareas. Créalas en el Cronograma." />
            ) : filasFiltradas.length === 0 ? (
              <TableEmpty colSpan={9} mensaje="Ninguna tarea coincide con el filtro." />
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
                            Editar
                          </Button>
                        )}
                      </span>
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
              </TableRow>
            )}
          </TableBody>
        </Table>
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
