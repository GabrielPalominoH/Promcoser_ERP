import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useData } from '../../context/useData'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Campo, Input, Select } from '../../components/ui/Field'
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
import { CampoComboBox } from '../../components/ui/ComboBox'
import { formatearFecha, formatearMoneda, redondearMonto } from '../../utils/formatters'
import {
  cobradoServicio,
  porCobrar,
  sumarMontos,
  registrosDeServicio,
  utilidadReal,
} from '../../utils/calculadora'
import { saldoFactura } from '../../utils/finanzas'
import { fechaHoyISO, reglasNumeroMayorACero } from './compartido'

const CONCEPTOS = ['adelanto', 'valorización', 'pago anual', 'otro']

export function CobrosServicio() {
  const { servicio } = useOutletContext()
  const { estado, agregarItem, eliminarItem } = useData()
  const [aviso, setAviso] = useState(null)
  const [porEliminar, setPorEliminar] = useState(null)

  const cobros = (estado.cobros ?? [])
    .filter((c) => c.servicio_id === servicio.id)
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id)
  const cobrado = cobradoServicio(estado.cobros, servicio.id)
  const pendiente = porCobrar(servicio, estado.cobros)
  const gastado = sumarMontos(registrosDeServicio(estado.registros_servicio, servicio.id))
  const utilidad = utilidadReal(cobrado, gastado)

  const facturasVigentes = (estado.facturas ?? []).filter(
    (f) => f.servicio_id === servicio.id && f.estado !== 'anulada' && f.estado !== 'cobrada',
  )

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: { fecha: fechaHoyISO(), monto: '', concepto: 'valorización', documento: '', factura_id: '' },
  })

  const enviar = ({ fecha, monto, concepto, documento, factura_id }) => {
    const factura = factura_id ? facturasVigentes.find((f) => String(f.id) === String(factura_id)) : null
    // Regla 6: lo aplicado a una factura no excede su saldo (sin factura = adelanto).
    if (factura && Number(monto) - saldoFactura(factura, estado.cobros) > 0.005) {
      setAviso({
        tipo: 'error',
        mensaje: `Excede el saldo de ${factura.numero} (${formatearMoneda(saldoFactura(factura, estado.cobros))}). Regístralo sin factura como adelanto.`,
      })
      return
    }
    agregarItem('cobros', {
      servicio_id: servicio.id,
      fecha,
      monto: redondearMonto(monto),
      concepto,
      documento: documento.trim() || null,
      factura_id: factura ? factura.id : null,
    })
    setAviso({ tipo: 'exito', mensaje: `Cobro registrado por ${formatearMoneda(redondearMonto(monto))}.` })
    reset()
  }

  const confirmarEliminar = () => {
    eliminarItem('cobros', porEliminar)
    setPorEliminar(null)
    setAviso({ tipo: 'info', mensaje: 'Cobro eliminado. Los totales se actualizan.' })
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">Cobrado</p>
          <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
            {formatearMoneda(cobrado)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Ingresos efectivamente recibidos</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Por cobrar</p>
          <p className={`mt-1 text-xl font-bold tabular-nums ${pendiente < 0 ? 'text-amber-600' : 'text-slate-900'}`}>
            {formatearMoneda(pendiente)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {pendiente < 0 ? 'Sobrepago del cliente' : 'Pendiente de cobro del monto contratado'}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Utilidad real</p>
          <p className={`mt-1 text-xl font-bold tabular-nums ${utilidad < 0 ? 'text-red-600' : 'text-slate-900'}`}>
            {formatearMoneda(utilidad)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Cobrado menos gastado</p>
        </Card>
      </div>

      <Card
        titulo="Registrar cobro"
        descripcion="Adelantos, pagos de valorización y pagos anuales del servicio."
      >
        <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Campo label="Fecha" error={errors.fecha?.message} htmlFor="cob-fecha">
              <Input
                id="cob-fecha"
                type="date"
                {...register('fecha', { required: 'Indica la fecha' })}
              />
            </Campo>
            <Campo label="Monto (S/)" error={errors.monto?.message} htmlFor="cob-monto">
              <Input
                id="cob-monto"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('monto', reglasNumeroMayorACero('Ingresa el monto'))}
              />
            </Campo>
            <Campo label="Concepto" error={errors.concepto?.message} htmlFor="cob-concepto">
              <Select id="cob-concepto" {...register('concepto', { required: true })}>
                {CONCEPTOS.map((c) => (
                  <option key={c} value={c} className="capitalize">
                    {c}
                  </option>
                ))}
              </Select>
            </Campo>
            {facturasVigentes.length > 0 && (
              <Campo
                label="Factura (opcional)"
                error={errors.factura_id?.message}
                htmlFor="cob-factura"
                hint="Sin factura = adelanto"
              >
                <CampoComboBox
                  id="cob-factura"
                  control={control}
                  name="factura_id"
                  placeholder="Sin factura…"
                  opciones={facturasVigentes.map((f) => ({
                    valor: String(f.id),
                    etiqueta: `${f.numero} (saldo ${formatearMoneda(saldoFactura(f, estado.cobros))})`,
                  }))}
                />
              </Campo>
            )}
            <Campo label="Documento (opcional)" error={errors.documento?.message} htmlFor="cob-doc">
              <Input
                id="cob-doc"
                placeholder="REC-001"
                {...register('documento')}
              />
            </Campo>
          </div>
          <div className="flex justify-end">
            <Button type="submit">Agregar cobro</Button>
          </div>
        </form>
      </Card>

      <Card titulo="Cobros registrados">
        <Table>
          <TableHead>
            <TableRow>
              <Th>Fecha</Th>
              <Th>Concepto</Th>
              <Th alinear="right">Monto</Th>
              <Th alinear="right">Acción</Th>
            </TableRow>
          </TableHead>
          <TableBody>
            {cobros.length === 0 ? (
              <TableEmpty colSpan={4} mensaje="Aún no hay cobros registrados." />
            ) : (
              cobros.map((c) => (
                <TableRow key={c.id}>
                  <Td className="whitespace-nowrap text-slate-500">
                    {formatearFecha(c.fecha)}
                  </Td>
                  <Td>
                    <span className="font-medium capitalize text-slate-800">{c.concepto}</span>
                    {c.factura_id != null &&
                      (() => {
                        const f = (estado.facturas ?? []).find((x) => x.id === c.factura_id)
                        return f ? (
                          <span className="block text-xs text-slate-500">→ {f.numero}</span>
                        ) : null
                      })()}
                    {c.documento && (
                      <span className="block text-xs text-slate-500">{c.documento}</span>
                    )}
                  </Td>
                  <Td alinear="right" className="font-semibold text-slate-900 tabular-nums">
                    {formatearMoneda(c.monto)}
                  </Td>
                  <Td alinear="right">
                    <Button variante="peligro" tamano="sm" onClick={() => setPorEliminar(c.id)}>
                      Eliminar
                    </Button>
                  </Td>
                </TableRow>
              ))
            )}

            {cobros.length > 0 && (
              <TableRow className="bg-slate-50 font-semibold">
                <Td className="text-slate-600" colSpan={2}>
                  Total cobrado
                </Td>
                <Td alinear="right" className="text-slate-900 tabular-nums">
                  {formatearMoneda(cobrado)}
                </Td>
                <Td />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {porEliminar != null && (
        <Modal
          abierto
          ancho="sm"
          titulo="Eliminar cobro"
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
            Se eliminará el cobro seleccionado. Cobrado, por cobrar y utilidad se
            actualizan automáticamente.
          </p>
        </Modal>
      )}

      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />
    </div>
  )
}
