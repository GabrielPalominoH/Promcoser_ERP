import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useData } from '../../context/useData'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Campo, Input } from '../../components/ui/Field'
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
import { cobrosDeFactura, estadoFactura, saldoFactura } from '../../utils/finanzas'
import { fechaHoyISO } from './compartido'

// Facturación interna de control (no son comprobantes SUNAT oficiales).
// Anular conserva historial (Regla 5); no hay borrado físico.
export function FacturacionServicio() {
  const { servicio } = useOutletContext()
  const { estado, agregarItem, actualizarItem } = useData()
  const [aviso, setAviso] = useState(null)
  const [porAnular, setPorAnular] = useState(null)

  const facturas = (estado.facturas ?? [])
    .filter((f) => f.servicio_id === servicio.id)
    .sort((a, b) => b.fecha_emision.localeCompare(a.fecha_emision) || b.id - a.id)
  const cobros = estado.cobros ?? []
  const hoy = new Date().toISOString().slice(0, 10)

  const facturado = facturas
    .filter((f) => f.estado !== 'anulada')
    .reduce((s, f) => s + Number(f.total), 0)
  const cobradoAplicado = facturas
    .filter((f) => f.estado !== 'anulada')
    .reduce((s, f) => s + (Number(f.total) - saldoFactura(f, cobros)), 0)
  const saldo = facturado - cobradoAplicado
  const vencidas = facturas.filter((f) => estadoFactura(f, cobros, hoy) === 'vencida').length

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      numero: '',
      fecha_emision: fechaHoyISO(),
      fecha_vencimiento: '',
      base: '',
      impuestos: '',
      total: '',
      moneda: 'PEN',
    },
  })
  const baseVista = Number(watch('base')) || 0
  const impVista = Number(watch('impuestos')) || 0

  const enviar = ({ numero, fecha_emision, fecha_vencimiento, base, impuestos, total, moneda }) => {
    const numeroLimpio = numero.trim()
    if (facturas.some((f) => f.numero?.trim().toLowerCase() === numeroLimpio.toLowerCase() && f.estado !== 'anulada')) {
      setAviso({ tipo: 'error', mensaje: `Ya existe la factura ${numeroLimpio} en este servicio.` })
      return
    }
    agregarItem('facturas', {
      servicio_id: servicio.id,
      numero: numeroLimpio,
      fecha_emision,
      fecha_vencimiento: fecha_vencimiento || null,
      base: redondearMonto(base),
      impuestos: redondearMonto(impuestos || 0),
      total: redondearMonto(total),
      moneda: (moneda || 'PEN').toUpperCase().slice(0, 3),
      estado: 'emitida',
    })
    setAviso({ tipo: 'exito', mensaje: `Factura ${numeroLimpio} registrada.` })
    reset()
  }

  const confirmarAnular = () => {
    actualizarItem('facturas', { id: porAnular, estado: 'anulada' })
    setPorAnular(null)
    setAviso({ tipo: 'info', mensaje: 'Factura anulada. Se conserva en el historial y deja de contar.' })
  }

  const tonoEstado = (est) =>
    est === 'cobrada'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : est === 'vencida'
        ? 'bg-red-50 text-red-700 ring-red-200'
        : est === 'anulada'
          ? 'bg-slate-100 text-slate-500 ring-slate-200'
          : est === 'parcial'
            ? 'bg-amber-50 text-amber-700 ring-amber-200'
            : 'bg-primary-50 text-primary-700 ring-primary-200'

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <p className="text-sm text-slate-500">Facturado</p>
          <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">{formatearMoneda(facturado)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Cobrado aplicado</p>
          <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">{formatearMoneda(cobradoAplicado)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Saldo por cobrar</p>
          <p className="mt-1 text-xl font-bold text-amber-700 tabular-nums">{formatearMoneda(saldo)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Vencidas</p>
          <p className={`mt-1 text-xl font-bold tabular-nums ${vencidas > 0 ? 'text-red-600' : 'text-slate-900'}`}>
            {vencidas}
          </p>
        </Card>
      </div>

      <Card
        titulo="Registrar factura"
        descripcion="Documento interno de control (no es comprobante SUNAT oficial)."
      >
        <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Campo label="Número" error={errors.numero?.message} htmlFor="fac-numero">
              <Input id="fac-numero" placeholder="F001-000123" {...register('numero', { required: 'Ingresa el número' })} />
            </Campo>
            <Campo label="Emisión" error={errors.fecha_emision?.message} htmlFor="fac-emision">
              <Input id="fac-emision" type="date" {...register('fecha_emision', { required: 'Indica la emisión' })} />
            </Campo>
            <Campo label="Vencimiento" error={errors.fecha_vencimiento?.message} htmlFor="fac-vence">
              <Input
                id="fac-vence"
                type="date"
                {...register('fecha_vencimiento', {
                  validate: (v) => (!v || v >= watch('fecha_emision') ? true : 'No puede vencer antes de emitirse'),
                })}
              />
            </Campo>
            <Campo label="Moneda" error={errors.moneda?.message} htmlFor="fac-moneda">
              <Input id="fac-moneda" maxLength={3} {...register('moneda', { required: 'Indica la moneda' })} />
            </Campo>
            <Campo label="Base imponible (S/)" error={errors.base?.message} htmlFor="fac-base">
              <Input id="fac-base" type="number" step="0.01" placeholder="0.00" {...register('base', { required: 'Ingresa la base' })} />
            </Campo>
            <Campo label="Impuestos (S/)" error={errors.impuestos?.message} htmlFor="fac-imp">
              <Input id="fac-imp" type="number" step="0.01" placeholder="0.00" {...register('impuestos')} />
            </Campo>
            <Campo
              label="Total (S/)"
              error={errors.total?.message}
              htmlFor="fac-total"
              hint={`Base + impuestos = ${formatearMoneda(baseVista + impVista)}`}
            >
              <Input id="fac-total" type="number" step="0.01" placeholder="0.00" {...register('total', { required: 'Ingresa el total' })} />
            </Campo>
          </div>
          <div className="flex justify-end">
            <Button type="submit">Agregar factura</Button>
          </div>
        </form>
      </Card>

      <Card titulo="Facturas del servicio">
        <Table>
          <TableHead>
            <TableRow>
              <Th>Número</Th>
              <Th>Emisión / Vencimiento</Th>
              <Th alinear="right">Total</Th>
              <Th alinear="right">Saldo</Th>
              <Th alinear="right">Estado</Th>
              <Th alinear="right">Acción</Th>
            </TableRow>
          </TableHead>
          <TableBody>
            {facturas.length === 0 ? (
              <TableEmpty colSpan={6} mensaje="Aún no hay facturas registradas." />
            ) : (
              facturas.map((f) => {
                const saldoF = f.estado === 'anulada' ? 0 : saldoFactura(f, cobros)
                const est = estadoFactura(f, cobros, hoy)
                return (
                  <TableRow key={f.id}>
                    <Td>
                      <span className="font-medium text-slate-900">{f.numero}</span>
                      <span className="block text-xs text-slate-500">{f.moneda}</span>
                    </Td>
                    <Td className="whitespace-nowrap text-slate-500">
                      {formatearFecha(f.fecha_emision)}
                      {f.fecha_vencimiento && (
                        <span className="block text-xs">vence {formatearFecha(f.fecha_vencimiento)}</span>
                      )}
                    </Td>
                    <Td alinear="right" className="tabular-nums">{formatearMoneda(f.total)}</Td>
                    <Td alinear="right" className="tabular-nums">{formatearMoneda(saldoF)}</Td>
                    <Td alinear="right">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${tonoEstado(est)}`}>
                        {est}
                      </span>
                    </Td>
                    <Td alinear="right">
                      {f.estado !== 'anulada' && (
                        <Button variante="secundario" tamano="sm" onClick={() => setPorAnular(f.id)}>
                          Anular
                        </Button>
                      )}
                    </Td>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {porAnular != null && (
        <Modal
          abierto
          ancho="sm"
          titulo="Anular factura"
          descripcion="Se conserva en el historial y deja de contar en saldos."
          onCerrar={() => setPorAnular(null)}
          pie={
            <>
              <Button variante="secundario" onClick={() => setPorAnular(null)}>Cancelar</Button>
              <Button variante="peligro" onClick={confirmarAnular}>Sí, anular</Button>
            </>
          }
        >
          <p className="text-sm text-slate-600">
            Los cobros ya aplicados a esta factura se conservan como historial, pero la
            factura deja de sumar al facturado y al saldo por cobrar.
          </p>
        </Modal>
      )}

      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />
    </div>
  )
}
