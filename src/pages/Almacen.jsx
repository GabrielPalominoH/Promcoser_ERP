import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Campo, Input, Select } from '../components/ui/Field'
import { CampoComboBox } from '../components/ui/ComboBox'
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
import {
  kardexMaterial,
  partidasDeServicio,
  puedeEliminarIngreso,
} from '../utils/calculadora'
import { formatearCantidad, formatearFecha } from '../utils/formatters'
import { fechaHoyISO, reglasNumeroMayorACero } from './servicio/compartido'

const nombreMaterial = (m) => m?.nombre ?? m?.nombre_material ?? 'Material eliminado'

// Las salidas exigen servicio (y partida opcional): descuentan stock e
// indican dónde se usó el material, sin generar costo nuevo porque el
// costo ya se contó en la compra. Los ingresos desde aquí son stock
// general; para comprar para un servicio se usa su pestaña Materiales.
function FormularioMovimiento({ materiales, servicios, partidas, onGuardar }) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
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
      partida_id: '',
    },
  })
  const tipo = watch('tipo')
  const servicioId = watch('servicio_id')
  const esSalida = tipo === 'salida'
  const partidasDelServicio = servicioId
    ? partidasDeServicio(partidas, Number(servicioId))
    : []

  const enviar = ({
    material_id,
    tipo,
    cantidad,
    costo_unitario,
    fecha,
    documento,
    servicio_id,
    partida_id,
  }) => {
    onGuardar({
      material_id: Number(material_id),
      tipo,
      cantidad: Number(cantidad),
      costo_unitario: Number(costo_unitario),
      fecha,
      documento: documento.trim() || null,
      servicio_id: esSalida ? Number(servicio_id) : null,
      partida_id: esSalida && partida_id ? Number(partida_id) : null,
      registro_id: null,
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
          <CampoComboBox
            id="alm-material"
            control={control}
            name="material_id"
            rules={{ required: 'Selecciona un material' }}
            placeholder="Escribe para buscar…"
            opciones={materiales.map((m) => ({
              valor: String(m.id),
              etiqueta: `${nombreMaterial(m)} (${m.unidad_medida})`,
            }))}
          />
        </Campo>
        <Campo label="Tipo" error={errors.tipo?.message} htmlFor="alm-tipo">
          <Select id="alm-tipo" {...register('tipo', { required: true })}>
            <option value="ingreso">Ingreso (compra general)</option>
            <option value="salida">Salida (uso en obra)</option>
          </Select>
        </Campo>
        <Campo label="Documento" error={errors.documento?.message} htmlFor="alm-doc">
          <Input
            id="alm-doc"
            placeholder="FAC-001 / SAL-001"
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

        {esSalida && (
          <>
            <Campo
              label="Servicio destino"
              error={errors.servicio_id?.message}
              htmlFor="alm-servicio"
            >
              <CampoComboBox
                id="alm-servicio"
                control={control}
                name="servicio_id"
                rules={{ required: 'Indica el servicio' }}
                placeholder="Escribe para buscar…"
                opciones={servicios.map((s) => ({
                  valor: String(s.id),
                  etiqueta: s.nombre_servicio,
                }))}
              />
            </Campo>
            {partidasDelServicio.length > 0 && (
              <Campo
                label="Partida (opcional)"
                error={errors.partida_id?.message}
                htmlFor="alm-partida"
              >
                <CampoComboBox
                  id="alm-partida"
                  control={control}
                  name="partida_id"
                  placeholder="Sin partida — escribe para buscar…"
                  opciones={partidasDelServicio.map((p) => ({
                    valor: String(p.id),
                    etiqueta: p.nombre,
                  }))}
                />
              </Campo>
            )}
          </>
        )}
      </div>

      {!esSalida && (
        <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Los ingresos desde aquí son stock general. Para comprar para un servicio
          (con su costo), usa la pestaña Materiales de ese servicio.
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit">Registrar movimiento</Button>
      </div>
    </form>
  )
}

export function Almacen() {
  const { estado, agregarItem, eliminarItem } = useData()
  const {
    materiales,
    servicios,
    partidas,
    movimientos_almacen: movimientos,
  } = estado
  const [aviso, setAviso] = useState(null)
  const [porEliminar, setPorEliminar] = useState(null)

  const guardar = (datos) => {
    if (datos.tipo === 'salida') {
      const kardex = kardexMaterial(datos.material_id, movimientos)
      if (datos.cantidad > kardex.stock) {
        setAviso({
          tipo: 'error',
          mensaje: `Stock insuficiente: hay ${formatearCantidad(kardex.stock)} disponible.`,
        })
        return
      }
    }
    agregarItem('movimientos_almacen', datos)
    setAviso({ tipo: 'exito', mensaje: 'Movimiento registrado.' })
  }

  const pedirEliminar = (movimiento) => {
    if (movimiento.tipo === 'ingreso') {
      const { permitido, stockResultante } = puedeEliminarIngreso(movimiento, movimientos)
      if (!permitido) {
        setAviso({
          tipo: 'error',
          mensaje: `No se puede eliminar: el stock quedaría en ${formatearCantidad(stockResultante)}. Elimina primero las salidas.`,
        })
        return
      }
    }
    setPorEliminar(movimiento)
  }

  const confirmarEliminar = () => {
    eliminarItem('movimientos_almacen', porEliminar.id)
    setAviso({
      tipo: 'info',
      mensaje:
        porEliminar.registro_id != null
          ? 'Movimiento y su costo vinculado eliminados. El stock se recalcula automáticamente.'
          : 'Movimiento eliminado. El stock se recalcula automáticamente.',
    })
    setPorEliminar(null)
  }

  const filas = [...materiales]
    .sort((a, b) => nombreMaterial(a).localeCompare(nombreMaterial(b), 'es'))
    .map((m) => ({ material: m, kardex: kardexMaterial(m.id, movimientos) }))
    .filter(({ kardex }) => kardex.ingresos > 0 || kardex.salidas > 0)

  const servicioDe = (id) => servicios.find((s) => s.id === id)
  const partidaDe = (id) => (partidas ?? []).find((p) => p.id === id)

  const ultimos = [...(movimientos ?? [])]
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id)
    .slice(0, 15)

  return (
    <div className="space-y-6">
      <Card
        titulo="Registrar movimiento"
        descripcion="Ingresos de stock general y salidas hacia obra con su destino."
      >
        <FormularioMovimiento
          materiales={materiales}
          servicios={servicios}
          partidas={partidas ?? []}
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
                    {nombreMaterial(material)} ·{' '}
                    <span className="tabular-nums">
                      {formatearCantidad(m.cantidad)} {material?.unidad_medida ?? ''}
                    </span>{' '}
                    · <span className="text-slate-500">{formatearFecha(m.fecha)}</span>
                    {m.documento && (
                      <span className="text-slate-500"> · {m.documento}</span>
                    )}
                    {m.servicio_id != null && (
                      <span className="block truncate text-xs text-slate-500">
                        → {servicioDe(m.servicio_id)?.nombre_servicio ?? 'Servicio eliminado'}
                        {m.partida_id != null &&
                          ` · ${partidaDe(m.partida_id)?.nombre ?? ''}`}
                      </span>
                    )}
                    {m.registro_id != null && (
                      <span className="mt-0.5 inline-block rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-800">
                        con costo
                      </span>
                    )}
                  </span>
                  <Button
                    variante="peligro"
                    tamano="sm"
                    onClick={() => pedirEliminar(m)}
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
            {porEliminar.registro_id != null && (
              <>
                {' '}
                Su costo vinculado también se quitará del servicio y el presupuesto
                se actualiza.
              </>
            )}
          </p>
        </Modal>
      )}

      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />
    </div>
  )
}
