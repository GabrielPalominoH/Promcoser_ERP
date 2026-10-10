import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Campo, Input, Select } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { Aviso } from '../components/ui/Aviso'
import {
  Table,
  TableBody,
  TableEmpty,
  TableHead,
  TableRow,
  Td,
  Th,
} from '../components/ui/Table'
import { useData } from '../context/useData'
import { formatearFecha, formatearMes, formatearMoneda, redondearMonto } from '../utils/formatters'
import { enMes } from '../utils/finanzas'
import { fechaHoyISO, reglasNumeroMayorACero } from './servicio/compartido'

// Caja de control: cobros y pagos alimentan solos; aquí solo ajustes y
// otros movimientos manuales (Regla 1: una fuente por hecho económico).
export function Caja() {
  const { estado, agregarItem, eliminarItem } = useData()
  const [aviso, setAviso] = useState(null)
  const [porEliminar, setPorEliminar] = useState(null)
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7))

  const cobros = estado.cobros ?? []
  const pagos = estado.pagos ?? []
  const manuales = useMemo(
    () => [...(estado.movimientos_caja ?? [])].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id),
    [estado.movimientos_caja],
  )

  const entradas = useMemo(
    () =>
      cobros.filter((c) => enMes(c.fecha, mes)).reduce((s, c) => s + Number(c.monto), 0) +
      manuales.filter((m) => enMes(m.fecha, mes) && m.tipo === 'entrada').reduce((s, m) => s + Number(m.monto), 0),
    [cobros, manuales, mes],
  )
  const salidas = useMemo(
    () =>
      pagos.filter((p) => enMes(p.fecha, mes)).reduce((s, p) => s + Number(p.monto), 0) +
      manuales.filter((m) => enMes(m.fecha, mes) && m.tipo === 'salida').reduce((s, m) => s + Number(m.monto), 0),
    [pagos, manuales, mes],
  )
  const flujo = entradas - salidas

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: { fecha: fechaHoyISO(), tipo: 'entrada', monto: '', concepto: '', referencia: '' },
  })

  const enviar = ({ fecha, tipo, monto, concepto, referencia }) => {
    agregarItem('movimientos_caja', {
      fecha,
      tipo,
      monto: redondearMonto(monto),
      concepto: concepto.trim(),
      referencia: referencia.trim() || null,
    })
    setAviso({ tipo: 'exito', mensaje: 'Movimiento de caja registrado.' })
    reset()
  }

  const confirmarEliminar = () => {
    eliminarItem('movimientos_caja', porEliminar)
    setPorEliminar(null)
    setAviso({ tipo: 'info', mensaje: 'Movimiento eliminado.' })
  }

  const filas = useMemo(() => {
    const lista = [
      ...cobros.filter((c) => enMes(c.fecha, mes)).map((c) => ({
        id: `c-${c.id}`,
        fecha: c.fecha,
        concepto: `Cobro · ${c.concepto}`,
        tipo: 'entrada',
        monto: Number(c.monto),
        manual: false,
      })),
      ...pagos.filter((p) => enMes(p.fecha, mes)).map((p) => ({
        id: `p-${p.id}`,
        fecha: p.fecha,
        concepto: `Pago · ${p.medio}`,
        tipo: 'salida',
        monto: Number(p.monto),
        manual: false,
      })),
      ...manuales.filter((m) => enMes(m.fecha, mes)).map((m) => ({
        id: `m-${m.id}`,
        fecha: m.fecha,
        concepto: m.concepto,
        tipo: m.tipo,
        monto: Number(m.monto),
        manual: true,
        ref: m.id,
      })),
    ]
    return lista.sort((a, b) => b.fecha.localeCompare(a.fecha))
  }, [cobros, pagos, manuales, mes])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">Entradas del mes</p>
          <p className="mt-1 text-xl font-bold text-emerald-700 tabular-nums">{formatearMoneda(entradas)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Salidas del mes</p>
          <p className="mt-1 text-xl font-bold text-red-600 tabular-nums">{formatearMoneda(salidas)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Flujo neto</p>
          <p className={`mt-1 text-xl font-bold tabular-nums ${flujo < 0 ? 'text-red-600' : 'text-slate-900'}`}>
            {formatearMoneda(flujo)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Entradas menos salidas (≠ utilidad)</p>
        </Card>
      </div>

      <Card
        titulo="Movimientos"
        descripcion="Cobros y pagos entran solos; aquí solo ajustes y otros manuales."
        acciones={
          <Campo label="Mes" htmlFor="caja-mes">
            <Input id="caja-mes" type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
          </Campo>
        }
      >
        <Table>
          <TableHead>
            <TableRow>
              <Th>Fecha</Th>
              <Th>Concepto</Th>
              <Th alinear="right">Entrada</Th>
              <Th alinear="right">Salida</Th>
              <Th alinear="right">Acción</Th>
            </TableRow>
          </TableHead>
          <TableBody>
            {filas.length === 0 ? (
              <TableEmpty colSpan={5} mensaje={`Sin movimientos en ${formatearMes(mes)}.`} />
            ) : (
              filas.map((f) => (
                <TableRow key={f.id}>
                  <Td className="whitespace-nowrap text-slate-500">{formatearFecha(f.fecha)}</Td>
                  <Td className="text-slate-700">
                    {f.concepto}
                    {f.manual && <span className="ml-1.5 text-xs text-slate-400">(manual)</span>}
                  </Td>
                  <Td alinear="right" className="tabular-nums">
                    {f.tipo === 'entrada' ? formatearMoneda(f.monto) : '—'}
                  </Td>
                  <Td alinear="right" className="tabular-nums">
                    {f.tipo === 'salida' ? formatearMoneda(f.monto) : '—'}
                  </Td>
                  <Td alinear="right">
                    {f.manual && (
                      <Button variante="peligro" tamano="sm" onClick={() => setPorEliminar(f.ref)}>
                        Eliminar
                      </Button>
                    )}
                  </Td>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Card titulo="Movimiento manual" descripcion="Ajustes y otros no ligados a cobros ni pagos.">
        <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
            <Campo label="Fecha" error={errors.fecha?.message} htmlFor="caja-fecha">
              <Input id="caja-fecha" type="date" {...register('fecha', { required: 'Indica la fecha' })} />
            </Campo>
            <Campo label="Tipo" error={errors.tipo?.message} htmlFor="caja-tipo">
              <Select id="caja-tipo" {...register('tipo', { required: true })}>
                <option value="entrada">Entrada</option>
                <option value="salida">Salida</option>
              </Select>
            </Campo>
            <Campo label="Monto (S/)" error={errors.monto?.message} htmlFor="caja-monto">
              <Input
                id="caja-monto"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('monto', reglasNumeroMayorACero('Ingresa el monto'))}
              />
            </Campo>
            <Campo label="Concepto" error={errors.concepto?.message} htmlFor="caja-concepto" className="sm:col-span-2">
              <Input id="caja-concepto" placeholder="Ej. Ajuste de caja chica" {...register('concepto', { required: 'Describe el movimiento' })} />
            </Campo>
            <Campo label="Referencia (opcional)" error={errors.referencia?.message} htmlFor="caja-ref" className="sm:col-span-5">
              <Input id="caja-ref" placeholder="Opcional" {...register('referencia')} />
            </Campo>
          </div>
          <div className="flex justify-end">
            <Button type="submit">Agregar movimiento</Button>
          </div>
        </form>
      </Card>

      {porEliminar != null && (
        <Modal
          abierto
          ancho="sm"
          titulo="Eliminar movimiento"
          descripcion="Esta acción no se puede deshacer."
          onCerrar={() => setPorEliminar(null)}
          pie={
            <>
              <Button variante="secundario" onClick={() => setPorEliminar(null)}>Cancelar</Button>
              <Button variante="peligro" onClick={confirmarEliminar}>Sí, eliminar</Button>
            </>
          }
        >
          <p className="text-sm text-slate-600">Se eliminará el movimiento manual seleccionado.</p>
        </Modal>
      )}

      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />
    </div>
  )
}
