import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useData } from '../../context/useData'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Campo, Input } from '../../components/ui/Field'
import { CampoComboBox } from '../../components/ui/ComboBox'
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
import { formatearFecha, formatearMoneda, redondearMonto } from '../../utils/formatters'
import { mesCerrado, saldoGasto } from '../../utils/finanzas'
import { fechaHoyISO, reglasNumeroMayorACero } from './compartido'

const MEDIOS = ['efectivo', 'transferencia', 'depósito', 'cheque', 'otro']

// Pagos a obligaciones (gastos reconocidos). Regla 7: lo aplicado no excede
// el saldo del gasto, salvo anticipo explícito (pago sin gasto vinculado).
export function PagosServicio() {
  const { servicio } = useOutletContext()
  const { estado, agregarItem, eliminarItem } = useData()
  const [aviso, setAviso] = useState(null)
  const [porEliminar, setPorEliminar] = useState(null)

  const gastos = (estado.registros_servicio ?? []).filter(
    (r) => r.servicio_id === servicio.id && r.tipo_registro === 'gasto',
  )
  const pagos = (estado.pagos ?? [])
    .filter((p) => p.servicio_id === servicio.id)
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id)

  const reconocido = gastos.reduce((s, g) => s + Number(g.monto_calculado), 0)
  const pagado = pagos.reduce((s, p) => s + Number(p.monto), 0)
  const pendiente = reconocido - pagado

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: { fecha: fechaHoyISO(), monto: '', medio: 'transferencia', gasto_id: '', referencia: '' },
  })

  const enviar = ({ fecha, monto, medio, gasto_id, referencia }) => {
    if (mesCerrado(fecha.slice(0, 7), estado.cierres)) {
      setAviso({ tipo: 'error', mensaje: 'Ese mes está cerrado. Reábrelo con motivo para corregirlo.' })
      return
    }
    const gasto = gasto_id ? gastos.find((g) => String(g.id) === String(gasto_id)) : null
    if (gasto && Number(monto) - saldoGasto(gasto.monto_calculado, gasto.id, estado.pagos) > 0.005) {
      setAviso({
        tipo: 'error',
        mensaje: `Excede el saldo de ese gasto (${formatearMoneda(saldoGasto(gasto.monto_calculado, gasto.id, estado.pagos))}). Regístralo sin gasto como anticipo.`,
      })
      return
    }
    agregarItem('pagos', {
      servicio_id: servicio.id,
      fecha,
      monto: redondearMonto(monto),
      medio,
      gasto_id: gasto ? gasto.id : null,
      referencia: referencia.trim() || null,
    })
    setAviso({ tipo: 'exito', mensaje: `Pago registrado por ${formatearMoneda(redondearMonto(monto))}.` })
    reset()
  }

  const confirmarEliminar = () => {
    const pago = (estado.pagos ?? []).find((p) => p.id === porEliminar)
    if (pago && mesCerrado(pago.fecha.slice(0, 7), estado.cierres)) {
      setPorEliminar(null)
      setAviso({ tipo: 'error', mensaje: 'Ese mes está cerrado. Reábrelo con motivo para corregirlo.' })
      return
    }
    eliminarItem('pagos', porEliminar)
    setPorEliminar(null)
    setAviso({ tipo: 'info', mensaje: 'Pago eliminado. Los saldos se actualizan.' })
  }

  const nombreGasto = (g) =>
    g.concepto ?? g.nombre_material ?? `Gasto #${g.id}`

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">Gasto reconocido</p>
          <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">{formatearMoneda(reconocido)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Pagado</p>
          <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">{formatearMoneda(pagado)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Saldo por pagar</p>
          <p className={`mt-1 text-xl font-bold tabular-nums ${pendiente < 0 ? 'text-amber-600' : 'text-slate-900'}`}>
            {formatearMoneda(pendiente)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {pendiente < 0 ? 'Anticipo a rendir' : 'Obligaciones pendientes'}
          </p>
        </Card>
      </div>

      <Card
        titulo="Registrar pago"
        descripcion="Pagos a gastos del servicio. Sin gasto vinculado = anticipo."
      >
        <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Campo label="Fecha" error={errors.fecha?.message} htmlFor="pag-fecha">
              <Input id="pag-fecha" type="date" {...register('fecha', { required: 'Indica la fecha' })} />
            </Campo>
            <Campo label="Monto (S/)" error={errors.monto?.message} htmlFor="pag-monto">
              <Input
                id="pag-monto"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('monto', reglasNumeroMayorACero('Ingresa el monto'))}
              />
            </Campo>
            <Campo label="Medio" error={errors.medio?.message} htmlFor="pag-medio">
              <Input id="pag-medio" list="medios-pago" placeholder="transferencia" {...register('medio', { required: 'Indica el medio' })} />
              <datalist id="medios-pago">
                {MEDIOS.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </Campo>
            <Campo label="Referencia (opcional)" error={errors.referencia?.message} htmlFor="pag-ref">
              <Input id="pag-ref" placeholder="OP-123" {...register('referencia')} />
            </Campo>
            {gastos.length > 0 && (
              <Campo
                label="Gasto (opcional)"
                error={errors.gasto_id?.message}
                htmlFor="pag-gasto"
                hint="Sin gasto = anticipo"
                className="sm:col-span-4"
              >
                <CampoComboBox
                  id="pag-gasto"
                  control={control}
                  name="gasto_id"
                  placeholder="Sin gasto…"
                  opciones={gastos.map((g) => ({
                    valor: String(g.id),
                    etiqueta: `${nombreGasto(g)} (saldo ${formatearMoneda(saldoGasto(g.monto_calculado, g.id, estado.pagos))})`,
                  }))}
                />
              </Campo>
            )}
          </div>
          <div className="flex justify-end">
            <Button type="submit">Agregar pago</Button>
          </div>
        </form>
      </Card>

      <Card titulo="Gastos y sus saldos">
        <Table>
          <TableHead>
            <TableRow>
              <Th>Gasto</Th>
              <Th alinear="right">Reconocido</Th>
              <Th alinear="right">Pagado</Th>
              <Th alinear="right">Saldo</Th>
            </TableRow>
          </TableHead>
          <TableBody>
            {gastos.length === 0 ? (
              <TableEmpty colSpan={4} mensaje="Este servicio no tiene gastos registrados." />
            ) : (
              gastos.map((g) => {
                const pagadoG = Number(g.monto_calculado) - saldoGasto(g.monto_calculado, g.id, estado.pagos)
                const saldoG = saldoGasto(g.monto_calculado, g.id, estado.pagos)
                return (
                  <TableRow key={g.id}>
                    <Td>
                      <span className="font-medium text-slate-800">{nombreGasto(g)}</span>
                      <span className="block text-xs text-slate-500">{formatearFecha(g.fecha)}</span>
                    </Td>
                    <Td alinear="right" className="tabular-nums">{formatearMoneda(g.monto_calculado)}</Td>
                    <Td alinear="right" className="tabular-nums">{formatearMoneda(pagadoG)}</Td>
                    <Td alinear="right" className={`font-semibold tabular-nums ${saldoG < 0 ? 'text-amber-600' : saldoG > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                      {formatearMoneda(saldoG)}
                    </Td>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <Card titulo="Pagos registrados">
        <Table>
          <TableHead>
            <TableRow>
              <Th>Fecha</Th>
              <Th>Destino</Th>
              <Th alinear="right">Monto</Th>
              <Th alinear="right">Acción</Th>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagos.length === 0 ? (
              <TableEmpty colSpan={4} mensaje="Aún no hay pagos registrados." />
            ) : (
              pagos.map((p) => {
                const gasto = gastos.find((g) => g.id === p.gasto_id)
                return (
                  <TableRow key={p.id}>
                    <Td className="whitespace-nowrap text-slate-500">{formatearFecha(p.fecha)}</Td>
                    <Td>
                      <span className="font-medium capitalize text-slate-800">{p.medio}</span>
                      <span className="block text-xs text-slate-500">
                        {gasto ? nombreGasto(gasto) : 'Anticipo'}
                        {p.referencia ? ` · ${p.referencia}` : ''}
                      </span>
                    </Td>
                    <Td alinear="right" className="font-semibold text-slate-900 tabular-nums">
                      {formatearMoneda(p.monto)}
                    </Td>
                    <Td alinear="right">
                      <Button variante="peligro" tamano="sm" onClick={() => setPorEliminar(p.id)}>
                        Eliminar
                      </Button>
                    </Td>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {porEliminar != null && (
        <Modal
          abierto
          ancho="sm"
          titulo="Eliminar pago"
          descripcion="Esta acción no se puede deshacer."
          onCerrar={() => setPorEliminar(null)}
          pie={
            <>
              <Button variante="secundario" onClick={() => setPorEliminar(null)}>Cancelar</Button>
              <Button variante="peligro" onClick={confirmarEliminar}>Sí, eliminar</Button>
            </>
          }
        >
          <p className="text-sm text-slate-600">Se eliminará el pago seleccionado. Los saldos se actualizan.</p>
        </Modal>
      )}

      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />
    </div>
  )
}
