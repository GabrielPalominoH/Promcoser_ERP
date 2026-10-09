import { useState } from 'react'
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
import { kardexMaterial } from '../utils/calculadora'
import { formatearCantidad, formatearFecha } from '../utils/formatters'
import { fechaHoyISO, reglasNumeroMayorACero } from './servicio/compartido'

function FormularioMovimiento({ materiales, movimientos, onGuardar }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      material_id: '',
      tipo: 'ingreso',
      cantidad: '',
      costo_unitario: '',
      fecha: fechaHoyISO(),
      documento: '',
      servicio_id: '',
    },
  })

  const enviar = ({ material_id, tipo, cantidad, costo_unitario, fecha, documento }) => {
    onGuardar({
      material_id: Number(material_id),
      tipo,
      cantidad: Number(cantidad),
      costo_unitario: Number(costo_unitario),
      fecha,
      documento: documento.trim() || null,
      servicio_id: null,
    })
    reset()
  }

  if (materiales.length === 0) {
    return (
      <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
        No hay materiales en el catálogo todavía.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Campo
          label="Material"
          error={errors.material_id?.message}
          htmlFor="alm-material"
        >
          <Select
            id="alm-material"
            {...register('material_id', { required: 'Selecciona un material' })}
          >
            <option value="" disabled>
              Selecciona…
            </option>
            {materiales.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre ?? m.nombre_material} ({m.unidad_medida})
              </option>
            ))}
          </Select>
        </Campo>
        <Campo label="Tipo" error={errors.tipo?.message} htmlFor="alm-tipo">
          <Select id="alm-tipo" {...register('tipo', { required: true })}>
            <option value="ingreso">Ingreso (compra)</option>
            <option value="salida">Salida (uso en obra)</option>
          </Select>
        </Campo>
        <Campo label="Documento" error={errors.documento?.message} htmlFor="alm-doc">
          <Input
            id="alm-doc"
            placeholder="FAC-001 / VAL-001"
            {...register('documento')}
          />
        </Campo>
        <Campo label="Cantidad" error={errors.cantidad?.message} htmlFor="alm-cant">
          <Input
            id="alm-cant"
            type="number"
            step="0.01"
            placeholder="0"
            {...register('cantidad', reglasNumeroMayorACero('Ingresa la cantidad'))}
          />
        </Campo>
        <Campo
          label="Costo unitario (S/)"
          error={errors.costo_unitario?.message}
          htmlFor="alm-pu"
        >
          <Input
            id="alm-pu"
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register('costo_unitario', reglasNumeroMayorACero('Ingresa el costo'))}
          />
        </Campo>
        <Campo label="Fecha" error={errors.fecha?.message} htmlFor="alm-fecha">
          <Input
            id="alm-fecha"
            type="date"
            {...register('fecha', { required: 'Indica la fecha' })}
          />
        </Campo>
      </div>
      <div className="flex justify-end">
        <Button type="submit">Registrar movimiento</Button>
      </div>
    </form>
  )
}

export function Almacen() {
  const { estado, agregarItem, eliminarItem } = useData()
  const { materiales, movimientos_almacen: movimientos } = estado
  const [aviso, setAviso] = useState(null)
  const [porEliminar, setPorEliminar] = useState(null)

  const guardar = (datos) => {
    if (datos.tipo === 'salida') {
      const kardex = kardexMaterial(datos.material_id, movimientos)
      if (datos.cantidad > kardex.stock) {
        setAviso({
          tipo: 'error',
          mensaje: `Stock insuficiente: hay ${kardex.stock} disponible.`,
        })
        return
      }
    }
    agregarItem('movimientos_almacen', datos)
    setAviso({ tipo: 'exito', mensaje: 'Movimiento registrado.' })
  }

  const confirmarEliminar = () => {
    eliminarItem('movimientos_almacen', porEliminar)
    setPorEliminar(null)
    setAviso({ tipo: 'info', mensaje: 'Movimiento eliminado.' })
  }

  const nombreMaterial = (m) => m.nombre ?? m.nombre_material ?? ''
  const filas = [...materiales]
    .sort((a, b) => nombreMaterial(a).localeCompare(nombreMaterial(b), 'es'))
    .map((m) => ({ material: m, kardex: kardexMaterial(m.id, movimientos) }))
    .filter(({ kardex }) => kardex.ingresos > 0 || kardex.salidas > 0)

  const ultimos = [...(movimientos ?? [])]
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id)
    .slice(0, 15)

  return (
    <div className="space-y-6">
      <Card
        titulo="Registrar movimiento"
        descripcion="Ingresos por compra y salidas hacia obra. Las salidas no pueden superar el stock."
      >
        <FormularioMovimiento
          materiales={materiales}
          movimientos={movimientos}
          onGuardar={guardar}
        />
      </Card>

      <Card
        titulo="Stock por material"
        descripcion="Precio promedio ponderado de los ingresos."
      >
        <Table>
          <TableHead>
            <TableRow>
              <Th>Material</Th>
              <Th alinear="right">Ingresos</Th>
              <Th alinear="right">Salidas</Th>
              <Th alinear="right">Stock</Th>
            </TableRow>
          </TableHead>
          <TableBody>
            {filas.length === 0 ? (
              <TableEmpty colSpan={4} mensaje="Aún no hay movimientos de almacén." />
            ) : (
              filas.map(({ material, kardex }) => (
                <TableRow key={material.id}>
                  <Td>
                    <span className="font-medium text-slate-900">
                      {nombreMaterial(material)}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {material.unidad_medida}
                    </span>
                  </Td>
                  <Td alinear="right" className="tabular-nums">
                    {formatearCantidad(kardex.ingresos)}
                  </Td>
                  <Td alinear="right" className="tabular-nums">
                    {formatearCantidad(kardex.salidas)}
                  </Td>
                  <Td
                    alinear="right"
                    className={`font-semibold tabular-nums ${kardex.stock <= 0 ? 'text-red-600' : 'text-slate-900'}`}
                  >
                    {formatearCantidad(kardex.stock)}
                  </Td>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {ultimos.length > 0 && (
        <Card titulo="Últimos movimientos" descripcion="Los 15 más recientes.">
          <ul className="space-y-1.5">
            {ultimos.map((m) => {
              const material = materiales.find((x) => x.id === m.material_id)
              return (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate text-slate-700">
                    <span
                      className={`mr-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        m.tipo === 'ingreso'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}
                    >
                      {m.tipo}
                    </span>
                    {(material?.nombre ?? material?.nombre_material) ?? 'Material eliminado'} ·{' '}
                    <span className="tabular-nums">
                      {formatearCantidad(m.cantidad)} {material?.unidad_medida ?? ''}
                    </span>{' '}
                    · <span className="text-slate-500">{formatearFecha(m.fecha)}</span>
                    {m.documento && (
                      <span className="text-slate-500"> · {m.documento}</span>
                    )}
                  </span>
                  <Button
                    variante="peligro"
                    tamano="sm"
                    onClick={() => setPorEliminar(m.id)}
                  >
                    Eliminar
                  </Button>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      {porEliminar != null && (
        <Modal
          abierto
          ancho="sm"
          titulo="Eliminar movimiento"
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
            Se eliminará el movimiento seleccionado. El stock se recalcula
            automáticamente.
          </p>
        </Modal>
      )}

      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />
    </div>
  )
}
