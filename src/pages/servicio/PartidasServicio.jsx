import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useData } from '../../context/useData'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Field'
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

// Monto editable en línea: las hojas se escriben a mano; los padres con
// hijas muestran la suma automática (solo lectura).
function CeldaMonto({ tarea, tareas, onGuardar }) {
  const automatico = tieneHijas(tarea.id, tareas)
  const [texto, setTexto] = useState(null)
  const mostrado = texto ?? String(Number(tarea.monto) || 0)

  if (automatico) {
    return (
      <span className="tabular-nums" title="Suma automática de sus hijas">
        {formatearMoneda(montoTarea(tarea, tareas))}
      </span>
    )
  }

  const guardar = () => {
    if (texto == null) return
    const valor = Number(texto)
    setTexto(null)
    if (Number.isNaN(valor) || valor < 0) return
    onGuardar(tarea.id, valor)
  }

  return (
    <Input
      key={`${tarea.id}-${Number(tarea.monto) || 0}`}
      type="number"
      step="0.01"
      min="0"
      aria-label={`Monto de ${tarea.nombre}`}
      className="w-32 py-1 text-right tabular-nums"
      defaultValue={mostrado}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={guardar}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
    />
  )
}

export function PartidasServicio() {
  const { servicio } = useOutletContext()
  // Tablero del presupuesto por tareas: montos editables en la lista.
  // Las tareas se crean en el Cronograma; aquí solo se les pone monto.
  const { estado, actualizarItem } = useData()
  const [aviso, setAviso] = useState(null)

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
                      <span style={{ paddingLeft: `${nivel * 1.25}rem` }} className="block">
                        <span className="mr-1.5 text-xs font-bold text-slate-400 tabular-nums">
                          {numero}
                        </span>
                        <span className={`text-slate-900 ${nivel === 0 ? 'font-semibold' : ''}`}>
                          {tarea.nombre}
                        </span>
                      </span>
                    </Td>
                    <Td alinear="right">
                      <CeldaMonto tarea={tarea} tareas={tareas} onGuardar={guardarMonto} />
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

      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />
    </div>
  )
}
