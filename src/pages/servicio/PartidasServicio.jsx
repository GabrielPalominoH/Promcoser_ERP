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
import {
  avanceEfectivo,
  costoSinTarea,
  costoSubarbol,
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
  // Tablero del presupuesto por tareas: montos editables en la lista.
  // Las tareas se crean en el Cronograma; aquí solo se les pone monto.
  const { estado, actualizarItem } = useData()
  const [aviso, setAviso] = useState(null)
  const [montoEditando, setMontoEditando] = useState(null)

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

  // Filas planas del árbol con sangría, como en el cronograma.
  const filas = useMemo(() => {
    const lista = []
    const porPadre = new Map()
    for (const t of tareas) {
      const clave = t.padre_id ?? null
      if (!porPadre.has(clave)) porPadre.set(clave, [])
      porPadre.get(clave).push(t)
    }
    const recorrer = (tarea, nivel, numero) => {
      lista.push({ tarea, nivel, numero })
      for (const [j, hija] of (porPadre.get(tarea.id) ?? []).entries()) {
        recorrer(hija, nivel + 1, `${numero}.${j + 1}`)
      }
    }
    for (const [i, raiz] of (porPadre.get(null) ?? []).entries()) {
      recorrer(raiz, 0, `${i + 1}`)
    }
    return lista
  }, [tareas])

  const guardarMonto = (id, monto) => {
    const tarea = tareas.find((t) => t.id === id)
    if (!tarea || (Number(tarea.monto) || 0) === monto) return
    actualizarItem('tareas', { id, monto })
    setAviso({ tipo: 'exito', mensaje: `Monto de «${tarea.nombre}» actualizado.` })
  }

  const presupuesto = presupuestoTareas(tareas, servicio.id)
  const valorizado = tareas
    .filter((t) => t.padre_id == null)
    .reduce((s, t) => s + valorizadoTarea(t, tareas), 0)
  const costo = tareas
    .filter((t) => t.padre_id == null)
    .reduce((s, t) => s + costoSubarbol(t, tareas, estado.registros_servicio, servicio.id), 0)
  const sinTarea = costoSinTarea(estado.registros_servicio, servicio.id)
  const margen = valorizado - costo - sinTarea
  const medido = presupuesto > 0 ? (valorizado / presupuesto) * 100 : null

  return (
    <div className="space-y-6">
      <Card
        titulo="Presupuesto por tareas"
        descripcion={
          presupuesto > 0
            ? `Presupuesto ${formatearMoneda(presupuesto)} · valorizado ${formatearMoneda(valorizado)}${medido != null ? ` (${medido.toFixed(1)}%)` : ''}`
            : 'Ponle monto a cada tarea: las principales suman solas.'
        }
      >
        <Table>
          <TableHead>
            <TableRow>
              <Th>Tarea</Th>
              <Th alinear="right">Monto</Th>
              <Th alinear="right">Valorizado</Th>
              <Th alinear="right">Avance</Th>
              <Th alinear="right">Costo</Th>
              <Th alinear="right">Margen</Th>
            </TableRow>
          </TableHead>
          <TableBody>
            {filas.length === 0 ? (
              <TableEmpty colSpan={6} mensaje="Aún no hay tareas. Créalas en el Cronograma." />
            ) : (
              filas.map(({ tarea, nivel, numero }) => {
                const monto = montoTarea(tarea, tareas)
                const val = valorizadoTarea(tarea, tareas)
                const avance = avanceEfectivo(tarea, tareas)
                const costoFila = costoSubarbol(tarea, tareas, estado.registros_servicio, servicio.id)
                const margenFila = val - costoFila
                return (
                  <TableRow key={tarea.id}>
                    <Td>
                      <span style={{ paddingLeft: `${nivel * 1.25}rem` }} className="flex items-center gap-2">
                        <span className="mr-1.5 text-xs font-bold text-slate-400 tabular-nums">
                          {numero}
                        </span>
                        <span className={`min-w-0 flex-1 text-slate-900 ${nivel === 0 ? 'font-semibold' : ''}`}>
                          {tarea.nombre}
                        </span>
                        {!tieneHijas(tarea.id, tareas) && (
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
                  </TableRow>
                )
              })
            )}

            {filas.length > 0 && (
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
                  {formatearMoneda(presupuesto)}
                </Td>
                <Td alinear="right" className="tabular-nums">
                  {formatearMoneda(valorizado)}
                </Td>
                <Td alinear="right" className="tabular-nums">
                  {medido != null ? `${medido.toFixed(1)}%` : '—'}
                </Td>
                <Td alinear="right" className="tabular-nums">
                  {formatearMoneda(costo + sinTarea)}
                </Td>
                <Td alinear="right" className="tabular-nums">
                  {formatearMoneda(margen)}
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
