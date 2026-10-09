import { useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Button } from '../../components/ui/Button'
import { Campo, Input } from '../../components/ui/Field'
import { CampoComboBox } from '../../components/ui/ComboBox'
import { useData } from '../../context/useData'
import { formatearCantidad, formatearMoneda, redondearMonto } from '../../utils/formatters'
import { kardexMaterial, partidasDeServicio } from '../../utils/calculadora'
import {
  SeccionRegistros,
  fechaHoyISO,
  reglasNumeroMayorACero,
} from './compartido'

const NUEVO_MATERIAL = '__nuevo__'

// Comprar = costo del servicio + ingreso al almacén en un solo paso.
// Ambos registros quedan vinculados: si se elimina uno, se va el otro.
function FormularioMaterial({ servicio, notificar }) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: {
      material_id: '',
      nombre_nuevo: '',
      unidad_nueva: '',
      costo_ref: '',
      cantidad: '',
      costo_unitario: '',
      fecha: fechaHoyISO(),
      documento: '',
      partida_id: '',
    },
  })
  const {
    estado: { materiales: catalogo, partidas: todasPartidas, movimientos_almacen: movimientos },
    agregarItem,
    actualizarItem,
  } = useData()
  const partidas = partidasDeServicio(todasPartidas, servicio.id)
  const activos = catalogo.filter((m) => m.activo !== false)

  const materialId = watch('material_id')
  const esNuevo = materialId === NUEVO_MATERIAL
  const materialElegido = activos.find((m) => String(m.id) === String(materialId))

  // Al elegir del catálogo se sugiere su costo referencial.
  useEffect(() => {
    if (materialElegido) {
      setValue('costo_unitario', materialElegido.costo_unitario)
    }
  }, [materialElegido, setValue])

  const stock = materialElegido
    ? kardexMaterial(materialElegido.id, movimientos).stock
    : null

  const enviar = ({
    material_id,
    nombre_nuevo,
    unidad_nueva,
    costo_ref,
    cantidad,
    costo_unitario,
    fecha,
    documento,
    partida_id,
  }) => {
    let idMaterial
    let nombreMaterial
    if (material_id === NUEVO_MATERIAL) {
      const creado = agregarItem('materiales', {
        nombre: nombre_nuevo.trim(),
        unidad_medida: unidad_nueva.trim() || 'unidad',
        costo_unitario: Number(costo_ref) || Number(costo_unitario),
        activo: true,
      })
      idMaterial = creado.id
      nombreMaterial = creado.nombre
    } else {
      idMaterial = Number(material_id)
      nombreMaterial = materialElegido?.nombre ?? materialElegido?.nombre_material ?? ''
    }

    const cant = Number(cantidad)
    const pu = Number(costo_unitario)
    const partida = partida_id ? Number(partida_id) : null

    const ingreso = agregarItem('movimientos_almacen', {
      material_id: idMaterial,
      tipo: 'ingreso',
      cantidad: cant,
      costo_unitario: pu,
      fecha,
      documento: documento.trim() || null,
      servicio_id: servicio.id,
      partida_id: partida,
      registro_id: null,
    })
    const registro = agregarItem('registros_servicio', {
      servicio_id: servicio.id,
      tipo_registro: 'material',
      referencia_id: idMaterial,
      nombre_material: nombreMaterial,
      cantidad_o_horas: cant,
      monto_calculado: redondearMonto(cant * pu),
      fecha,
      partida_id: partida,
      movimiento_id: ingreso.id,
    })
    actualizarItem('movimientos_almacen', { id: ingreso.id, registro_id: registro.id })

    notificar(
      'exito',
      `Compra registrada por ${formatearMoneda(registro.monto_calculado)} e ingresada al almacén.`,
    )
    reset()
  }

  return (
    <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Campo
          label="Material"
          error={errors.material_id?.message}
          htmlFor="mat-material"
          className="sm:col-span-2"
        >
          <CampoComboBox
            id="mat-material"
            control={control}
            name="material_id"
            rules={{ required: 'Selecciona un material' }}
            placeholder="Escribe para buscar…"
            opciones={[
              ...activos.map((m) => ({
                valor: String(m.id),
                etiqueta: `${m.nombre ?? m.nombre_material} (${m.unidad_medida})`,
              })),
              { valor: NUEVO_MATERIAL, etiqueta: '＋ Nuevo material…' },
            ]}
          />
        </Campo>
        <Campo label="Fecha" error={errors.fecha?.message} htmlFor="mat-fecha">
          <Input
            id="mat-fecha"
            type="date"
            {...register('fecha', { required: 'Indica la fecha' })}
          />
        </Campo>

        {esNuevo && (
          <>
            <Campo
              label="Nombre del material nuevo"
              error={errors.nombre_nuevo?.message}
              htmlFor="mat-nuevo"
              className="sm:col-span-2"
            >
              <Input
                id="mat-nuevo"
                placeholder="Ej. Cemento Portland"
                {...register('nombre_nuevo', { required: 'Ingresa el nombre' })}
              />
            </Campo>
            <Campo label="Unidad" error={errors.unidad_nueva?.message} htmlFor="mat-unidad">
              <Input
                id="mat-unidad"
                placeholder="saco, m3, unidad…"
                {...register('unidad_nueva')}
              />
            </Campo>
          </>
        )}

        <Campo label="Cantidad" error={errors.cantidad?.message} htmlFor="mat-cantidad">
          <Input
            id="mat-cantidad"
            type="number"
            step="0.01"
            placeholder="0"
            {...register('cantidad', reglasNumeroMayorACero('Ingresa la cantidad'))}
          />
        </Campo>
        <Campo
          label="Costo unitario (S/)"
          error={errors.costo_unitario?.message}
          htmlFor="mat-pu"
          hint={
            stock != null
              ? `Hay ${formatearCantidad(stock)} en stock`
              : undefined
          }
        >
          <Input
            id="mat-pu"
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register('costo_unitario', reglasNumeroMayorACero('Ingresa el costo'))}
          />
        </Campo>
        <Campo label="Documento" error={errors.documento?.message} htmlFor="mat-doc">
          <Input
            id="mat-doc"
            placeholder="FAC-001 (opcional)"
            {...register('documento')}
          />
        </Campo>

        {partidas.length > 0 && (
          <Campo
            label="Partida (opcional)"
            error={errors.partida_id?.message}
            htmlFor="mat-partida"
            hint="Para el costo por partida"
            className="sm:col-span-3"
          >
            <CampoComboBox
              id="mat-partida"
              control={control}
              name="partida_id"
              placeholder="Sin partida — escribe para buscar…"
              opciones={partidas.map((p) => ({ valor: String(p.id), etiqueta: p.nombre }))}
            />
          </Campo>
        )}
      </div>
      <div className="flex justify-end">
        <Button type="submit">Comprar e ingresar a almacén</Button>
      </div>
    </form>
  )
}

export function MaterialesServicio() {
  const { servicio } = useOutletContext()

  return (
    <SeccionRegistros
      servicio={servicio}
      tipo="material"
      titulo="Materiales"
      descripcion="Cada compra suma al gastado del servicio e ingresa automáticamente al almacén."
      columnaCantidad
      etiquetaCantidad="Cantidad"
      mensajeVacio="Este servicio todavía no tiene materiales registrados."
      mensajeExito={(datos) => `Material agregado por ${formatearMoneda(datos.monto_calculado)}.`}
    >
      {({ servicio, notificar }) => (
        <FormularioMaterial servicio={servicio} notificar={notificar} />
      )}
    </SeccionRegistros>
  )
}
