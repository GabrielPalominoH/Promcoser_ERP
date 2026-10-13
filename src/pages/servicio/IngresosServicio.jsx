import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useData } from '../../context/useData'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Campo, Input } from '../../components/ui/Field'
import { CampoMonto, reglasMontoMayorACero } from '../../components/ui/Monto'
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
import {
  cobradoServicio,
} from '../../utils/calculadora'
import { estadoFactura, saldoFactura } from '../../utils/finanzas'
import { fechaHoyISO } from './compartido'

// Cómo resolver el número de factura (opcional) al registrar un ingreso:
// vacío = adelanto; coincide (sin importar mayúsculas) = vincular con tope;
// nuevo = crear la factura mínima (total = monto) y vincular.
export function resolverFacturaIngreso(numero, facturas, cobros, monto) {
  const limpio = (numero || '').trim()
  if (!limpio) return { accion: 'adelanto', factura: null }
  const existente = (facturas ?? []).find(
    (f) => f.estado !== 'anulada' && f.numero?.trim().toLowerCase() === limpio.toLowerCase(),
  )
  if (!existente) return { accion: 'crear', factura: null, numero: limpio }
  const saldo = saldoFactura(existente, cobros)
  if (Number(monto) - saldo > 0.005) return { accion: 'excede', factura: existente, saldo }
  return { accion: 'vincular', factura: existente }
}

// Edición de un ingreso: fecha, monto, concepto y documento. La factura
// vinculada no se cambia aquí (para cambiarla, elimina y recrea el ingreso).
function ModalEdicionIngreso({ ingreso, factura, onGuardar, onCerrar }) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: {
      fecha: ingreso.fecha ?? '',
      monto: ingreso.monto ?? '',
      concepto: ingreso.concepto ?? 'valorización',
      documento: ingreso.documento ?? '',
    },
  })

  const enviar = ({ fecha, monto, concepto, documento }) => {
    onGuardar({
      id: ingreso.id,
      fecha,
      monto: redondearMonto(monto),
      concepto,
      documento: documento.trim() || null,
    })
  }

  return (
    <Modal
      abierto
      titulo="Editar ingreso"
      descripcion="Se actualizan cobrado y utilidad automáticamente."
      onCerrar={onCerrar}
      pie={
        <>
          <Button variante="secundario" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit(enviar)}>Guardar cambios</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Fecha" error={errors.fecha?.message} htmlFor="edi-fecha">
            <Input id="edi-fecha" type="date" {...register('fecha', { required: 'Indica la fecha' })} />
          </Campo>
          <Campo label="Monto (S/)" error={errors.monto?.message} htmlFor="edi-monto">
            <CampoMonto
              id="edi-monto"
              control={control}
              name="monto"
              rules={reglasMontoMayorACero('Ingresa el monto')}
            />
          </Campo>
        </div>
        <Campo
          label="Concepto"
          error={errors.concepto?.message}
          htmlFor="edi-concepto"
          hint="Ej. Adelanto 01, Valorización N°3, Contrato anual…"
        >
          <Input
            id="edi-concepto"
            placeholder="Escribe el concepto del ingreso"
            {...register('concepto', { required: 'Describe el concepto' })}
          />
        </Campo>
        <Campo label="Documento (opcional)" error={errors.documento?.message} htmlFor="edi-doc">
          <Input id="edi-doc" placeholder="REC-001" {...register('documento')} />
        </Campo>
        <p className="text-xs text-slate-500">
          {factura ? `Factura vinculada: ${factura.numero} (no se cambia aquí).` : 'Sin factura (adelanto).'}
        </p>
      </form>
    </Modal>
  )
}

export function IngresosServicio() {
  const { servicio } = useOutletContext()
  const { estado, agregarItem, actualizarItem, eliminarItem } = useData()
  const [aviso, setAviso] = useState(null)
  const [porEliminar, setPorEliminar] = useState(null)
  const [porAnular, setPorAnular] = useState(null)
  const [porEditar, setPorEditar] = useState(null)
  const [mostrarRegistro, setMostrarRegistro] = useState(false)
  const hoy = new Date().toISOString().slice(0, 10)

  const cobros = (estado.cobros ?? [])
    .filter((c) => c.servicio_id === servicio.id)
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id)
  const cobrado = cobradoServicio(estado.cobros, servicio.id)

  const facturasServicio = (estado.facturas ?? []).filter((f) => f.servicio_id === servicio.id)
  const facturas = [...facturasServicio].sort(
    (a, b) => b.fecha_emision.localeCompare(a.fecha_emision) || b.id - a.id,
  )
  const numerosPendientes = facturasServicio
    .filter((f) => f.estado !== 'anulada' && saldoFactura(f, estado.cobros) > 0)
    .map((f) => f.numero)

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: { fecha: fechaHoyISO(), monto: '', concepto: '', documento: '', factura_numero: '' },
  })

  const enviar = ({ fecha, monto, concepto, documento, factura_numero }) => {
    const res = resolverFacturaIngreso(factura_numero, facturasServicio, estado.cobros, monto)
    // Regla 6: lo aplicado a una factura no excede su saldo (sin factura = adelanto).
    if (res.accion === 'excede') {
      setAviso({
        tipo: 'error',
        mensaje: `Excede el saldo de ${res.factura.numero} (${formatearMoneda(res.saldo)}). Regístralo sin factura como adelanto.`,
      })
      return
    }
    let facturaId = null
    let detalle = 'como adelanto'
    if (res.accion === 'vincular') {
      facturaId = res.factura.id
      detalle = `aplicado a la factura ${res.factura.numero}`
    } else if (res.accion === 'crear') {
      const nueva = agregarItem('facturas', {
        servicio_id: servicio.id,
        numero: res.numero,
        fecha_emision: fecha,
        fecha_vencimiento: null,
        base: redondearMonto(monto),
        impuestos: 0,
        total: redondearMonto(monto),
        moneda: 'PEN',
        estado: 'emitida',
      })
      facturaId = nueva.id
      detalle = `con factura nueva ${res.numero}`
    }
    agregarItem('cobros', {
      servicio_id: servicio.id,
      fecha,
      monto: redondearMonto(monto),
      concepto: concepto.trim(),
      documento: documento.trim() || null,
      factura_id: facturaId,
    })
    setAviso({ tipo: 'exito', mensaje: `Ingreso registrado por ${formatearMoneda(redondearMonto(monto))} ${detalle}.` })
    reset()
    setMostrarRegistro(false)
  }

  const confirmarEliminar = () => {
    eliminarItem('cobros', porEliminar)
    setPorEliminar(null)
    setAviso({ tipo: 'info', mensaje: 'Ingreso eliminado. Los totales se actualizan.' })
  }

  const confirmarEdicion = ({ id, fecha, monto, concepto, documento }) => {
    const actual = (estado.cobros ?? []).find((c) => c.id === id)
    // Si está aplicado a una factura, el nuevo monto no excede su saldo
    // (calculado sin este ingreso).
    if (actual?.factura_id != null) {
      const factura = (estado.facturas ?? []).find((f) => f.id === actual.factura_id)
      if (factura) {
        const otros = (estado.cobros ?? []).filter((c) => c.factura_id === factura.id && c.id !== id)
        const saldoSinEste = Number(factura.total) - otros.reduce((s, c) => s + Number(c.monto), 0)
        if (Number(monto) - saldoSinEste > 0.005) {
          setAviso({
            tipo: 'error',
            mensaje: `Excede el saldo de ${factura.numero} (${formatearMoneda(saldoSinEste)}).`,
          })
          return
        }
      }
    }
    actualizarItem('cobros', { id, fecha, monto, concepto, documento })
    setPorEditar(null)
    setAviso({ tipo: 'exito', mensaje: 'Ingreso actualizado.' })
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

  // Una sola lista: ingresos y facturas ordenados por fecha (lo más nuevo primero).
  const filas = [
    ...cobros.map((c) => ({ tipo: 'ingreso', fecha: c.fecha, id: c.id, dato: c })),
    ...facturas.map((f) => ({ tipo: 'factura', fecha: f.fecha_emision, id: f.id, dato: f })),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha) || (a.tipo === b.tipo ? b.id - a.id : a.tipo === 'ingreso' ? -1 : 1))

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="border-l-4 border-emerald-500 pl-4">
            <p className="text-sm text-slate-500">Total cobrado</p>
            <p className="mt-1 text-3xl font-bold text-slate-900 tabular-nums">
              {formatearMoneda(cobrado)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Ingresos efectivamente recibidos</p>
          </div>
          <div className="flex flex-1 flex-wrap items-stretch justify-start gap-6 sm:justify-end sm:gap-10">
            <div className="min-w-32 border-l border-slate-200 pl-6">
              <p className="text-3xl font-bold text-slate-800 tabular-nums">{cobros.length}</p>
              <p className="mt-1 text-xs text-slate-500">ingresos registrados</p>
            </div>
            <div className="min-w-32 border-l border-slate-200 pl-6">
              <p className="text-3xl font-bold text-slate-800 tabular-nums">{facturas.length}</p>
              <p className="mt-1 text-xs text-slate-500">facturas registradas</p>
            </div>
          </div>
        </div>
      </Card>

      <Card
        titulo="Ingresos y facturas registrados"
        acciones={
          <Button tamano="sm" onClick={() => setMostrarRegistro(true)}>
            Agregar ingreso
          </Button>
        }
      >
        <Table>
          <TableHead>
            <TableRow>
              <Th>Fecha</Th>
              <Th>Detalle</Th>
              <Th alinear="right">Monto</Th>
              <Th alinear="right">Saldo / Estado</Th>
              <Th alinear="right">Acción</Th>
            </TableRow>
          </TableHead>
          <TableBody>
            {filas.length === 0 ? (
              <TableEmpty colSpan={5} mensaje="Aún no hay ingresos ni facturas registrados." />
            ) : (
              filas.map((fila) =>
                fila.tipo === 'ingreso' ? (
                  <TableRow key={`ingreso-${fila.id}`}>
                    <Td className="whitespace-nowrap text-slate-500">
                      {formatearFecha(fila.dato.fecha)}
                    </Td>
                    <Td>
                      <span className="font-medium capitalize text-slate-800">{fila.dato.concepto}</span>
                      {fila.dato.factura_id != null &&
                        (() => {
                          const f = (estado.facturas ?? []).find((x) => x.id === fila.dato.factura_id)
                          return f ? (
                            <span className="block text-xs text-slate-500">→ {f.numero}</span>
                          ) : null
                        })()}
                      {fila.dato.documento && (
                        <span className="block text-xs text-slate-500">{fila.dato.documento}</span>
                      )}
                    </Td>
                    <Td alinear="right" className="font-semibold text-slate-900 tabular-nums">
                      {formatearMoneda(fila.dato.monto)}
                    </Td>
                    <Td alinear="right" className="text-slate-400">
                      —
                    </Td>
                    <Td alinear="right">
                      <span className="inline-flex gap-1.5">
                        <Button variante="secundario" tamano="sm" onClick={() => setPorEditar(fila.id)}>
                          Editar
                        </Button>
                        <Button variante="peligro" tamano="sm" onClick={() => setPorEliminar(fila.id)}>
                          Eliminar
                        </Button>
                      </span>
                    </Td>
                  </TableRow>
                ) : (
                  (() => {
                    const f = fila.dato
                    const saldoF = f.estado === 'anulada' ? 0 : saldoFactura(f, estado.cobros)
                    const est = estadoFactura(f, estado.cobros, hoy)
                    return (
                      <TableRow key={`factura-${fila.id}`}>
                        <Td className="whitespace-nowrap text-slate-500">
                          {formatearFecha(f.fecha_emision)}
                        </Td>
                        <Td>
                          <span className="font-medium text-slate-900">Factura {f.numero}</span>
                          <span className="block text-xs text-slate-500">
                            {f.moneda}
                            {f.fecha_vencimiento && ` · vence ${formatearFecha(f.fecha_vencimiento)}`}
                          </span>
                        </Td>
                        <Td alinear="right" className="tabular-nums">
                          {formatearMoneda(f.total)}
                        </Td>
                        <Td alinear="right" className="tabular-nums">
                          <span className="block">{formatearMoneda(saldoF)}</span>
                          <span className={`mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${tonoEstado(est)}`}>
                            {est}
                          </span>
                        </Td>
                        <Td alinear="right">
                          {f.estado !== 'anulada' ? (
                            <Button variante="secundario" tamano="sm" onClick={() => setPorAnular(f.id)}>
                              Anular
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </Td>
                      </TableRow>
                    )
                  })()
                ),
              )
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
                <Td />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {mostrarRegistro && (
        <Modal
          abierto
          titulo="Registrar ingreso"
          descripcion="Adelantos, cobros de valorización e ingresos anuales del servicio. Elige factura si el ingreso la cancela; sin factura es adelanto."
          onCerrar={() => setMostrarRegistro(false)}
          pie={
            <>
              <Button variante="secundario" onClick={() => setMostrarRegistro(false)}>
                Cancelar
              </Button>
              <Button type="submit" form="form-ingreso">
                Agregar ingreso
              </Button>
            </>
          }
        >
          <form id="form-ingreso" onSubmit={handleSubmit(enviar)} noValidate className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Campo label="Fecha" error={errors.fecha?.message} htmlFor="cob-fecha">
                <Input
                  id="cob-fecha"
                  type="date"
                  {...register('fecha', { required: 'Indica la fecha' })}
                />
              </Campo>
              <Campo label="Monto (S/)" error={errors.monto?.message} htmlFor="cob-monto">
                <CampoMonto
                  id="cob-monto"
                  control={control}
                  name="monto"
                  placeholder="0.00"
                  rules={reglasMontoMayorACero('Ingresa el monto')}
                />
              </Campo>
              <Campo
                label="Concepto"
                error={errors.concepto?.message}
                htmlFor="cob-concepto"
                hint="Ej. Adelanto 01, Valorización N°3, Contrato anual…"
              >
                <Input
                  id="cob-concepto"
                  placeholder="Escribe el concepto del ingreso"
                  {...register('concepto', { required: 'Describe el concepto' })}
                />
              </Campo>
              <Campo label="Documento (opcional)" error={errors.documento?.message} htmlFor="cob-doc">
                <Input
                  id="cob-doc"
                  placeholder="REC-001"
                  {...register('documento')}
                />
              </Campo>
              <Campo
                label="N° factura (opcional)"
                error={errors.factura_numero?.message}
                htmlFor="cob-factura"
                hint={
                  numerosPendientes.length > 0
                    ? `Vacío = adelanto. Si el número no existe, se crea la factura. Pendientes: ${numerosPendientes.join(', ')}`
                    : 'Vacío = adelanto. Si el número no existe, se crea la factura.'
                }
                className="sm:col-span-2"
              >
                <Input id="cob-factura" placeholder="F001-000123" {...register('factura_numero')} />
              </Campo>
            </div>
          </form>
        </Modal>
      )}

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
            Los ingresos ya aplicados a esta factura se conservan como historial, pero la
            factura deja de contar en los saldos.
          </p>
        </Modal>
      )}

      {porEliminar != null && (
        <Modal
          abierto
          ancho="sm"
          titulo="Eliminar ingreso"
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
            Se eliminará el ingreso seleccionado. Cobrado y utilidad se
            actualizan automáticamente.
          </p>
        </Modal>
      )}

      {porEditar != null && (() => {
        const ingreso = (estado.cobros ?? []).find((c) => c.id === porEditar)
        if (!ingreso) return null
        const factura = ingreso.factura_id != null ? (estado.facturas ?? []).find((f) => f.id === ingreso.factura_id) : null
        return (
          <ModalEdicionIngreso
            ingreso={ingreso}
            factura={factura}
            onGuardar={confirmarEdicion}
            onCerrar={() => setPorEditar(null)}
          />
        )
      })()}

      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />
    </div>
  )
}
