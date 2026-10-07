import { useState } from 'react'
import { useData } from '../../context/useData'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
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
import {
  formatearCantidad,
  formatearMoneda,
  formatearFecha,
} from '../../utils/formatters'
import {
  nombreReferencia,
  ordenarPorFechaDesc,
  sumarMontos,
} from '../../utils/calculadora'

export function fechaHoyISO() {
  return new Date().toISOString().slice(0, 10)
}

export function reglasNumeroMayorACero(mensajeRequerido) {
  return {
    valueAsNumber: true,
    required: mensajeRequerido,
    validate: (valor) =>
      Number.isNaN(valor) || valor <= 0
        ? 'Debe ser un número mayor que cero'
        : true,
  }
}

function conceptoRegistro(registro, refs) {
  return (
    registro.concepto ?? nombreReferencia(registro, refs)
  )
}

function FilaRegistro({ registro, refs, conCantidad, onEliminar }) {
  return (
    <TableRow>
      <Td className="whitespace-nowrap text-slate-500">
        {formatearFecha(registro.fecha)}
      </Td>
      <Td>
        <span className="font-medium text-slate-800">
          {conceptoRegistro(registro, refs)}
        </span>
      </Td>
      {conCantidad && (
        <Td alinear="right" className="tabular-nums">
          {formatearCantidad(registro.cantidad_o_horas)}
        </Td>
      )}
      <Td alinear="right" className="font-semibold text-slate-900 tabular-nums">
        {registro.tipo_registro === 'equipo' ? (
          <span className="font-normal text-slate-400" title="Sin costo, solo control de uso">
            —
          </span>
        ) : (
          formatearMoneda(registro.monto_calculado)
        )}
      </Td>
      <Td alinear="right">
        <Button variante="peligro" tamano="sm" onClick={() => onEliminar(registro)}>
          Eliminar
        </Button>
      </Td>
    </TableRow>
  )
}

// Sección genérica de una pestaña del panel: formulario + su tabla.
export function SeccionRegistros({
  servicio,
  tipo,
  titulo,
  descripcion,
  columnaCantidad,
  etiquetaCantidad,
  mensajeVacio,
  mensajeExito,
  children,
}) {
  const { estado, agregarItem, eliminarItem } = useData()
  const { personal, materiales, equipos, registros_servicio: todos } = estado

  const [aviso, setAviso] = useState(null)
  const [porEliminar, setPorEliminar] = useState(null)

  const refs = { personal, materiales, equipos }
  const registros = ordenarPorFechaDesc(
    todos.filter(
      (r) => r.servicio_id === servicio.id && r.tipo_registro === tipo,
    ),
  )
  const totalMonto = sumarMontos(registros)
  const totalCantidad = registros.reduce(
    (total, r) => total + (Number(r.cantidad_o_horas) || 0),
    0,
  )

  const registrar = (datos) => {
    agregarItem('registros_servicio', datos)
    setAviso({ tipo: 'exito', mensaje: mensajeExito(datos) })
  }

  const confirmarEliminar = () => {
    eliminarItem('registros_servicio', porEliminar.id)
    setAviso({ tipo: 'info', mensaje: 'Registro eliminado.' })
    setPorEliminar(null)
  }

  const columnas = columnaCantidad ? 5 : 4

  return (
    <div className="space-y-6">
      <Card titulo={titulo} descripcion={descripcion}>
        {children({ servicio, personal, materiales, equipos, registrar })}
      </Card>

      <Card titulo={`Registros de ${titulo.toLowerCase()}`}>
        <Table>
          <TableHead>
            <TableRow>
              <Th>Fecha</Th>
              <Th>{titulo === 'Equipos' ? 'Equipo' : 'Concepto'}</Th>
              {columnaCantidad && <Th alinear="right">{etiquetaCantidad}</Th>}
              <Th alinear="right">Monto</Th>
              <Th alinear="right">Acción</Th>
            </TableRow>
          </TableHead>
          <TableBody>
            {registros.length === 0 ? (
              <TableEmpty colSpan={columnas} mensaje={mensajeVacio} />
            ) : (
              registros.map((registro) => (
                <FilaRegistro
                  key={registro.id}
                  registro={registro}
                  refs={refs}
                  conCantidad={columnaCantidad}
                  onEliminar={setPorEliminar}
                />
              ))
            )}

            {registros.length > 0 && (
              <TableRow className="bg-slate-50 font-semibold">
                <Td className="text-slate-600" colSpan={2}>
                  Total
                </Td>
                {columnaCantidad && (
                  <Td alinear="right" className="text-slate-900 tabular-nums">
                    {formatearCantidad(totalCantidad)}
                    {tipo === 'equipo' ? ' h' : ''}
                  </Td>
                )}
                <Td alinear="right" className="text-slate-900 tabular-nums">
                  {tipo === 'equipo' ? '—' : formatearMoneda(totalMonto)}
                </Td>
                <Td />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {porEliminar && (
        <Modal
          abierto
          ancho="sm"
          titulo="Eliminar registro"
          descripcion="Esta acción no se puede deshacer."
          onCerrar={() => setPorEliminar(null)}
          pie={
            <>
              <Button variante="secundario" onClick={() => setPorEliminar(null)}>
                Cancelar
              </Button>
              <Button variante="peligro" onClick={confirmarEliminar}>
                Sí, eliminar
              </Button>
            </>
          }
        >
          <p className="text-sm text-slate-600">
            Se eliminará{' '}
            <span className="font-semibold text-slate-900">
              {conceptoRegistro(porEliminar, refs)}
            </span>{' '}
            del {formatearFecha(porEliminar.fecha)}. El presupuesto del servicio se
            actualiza automáticamente.
          </p>
        </Modal>
      )}

      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />
    </div>
  )
}
