import { useOutletContext } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Button } from '../../components/ui/Button'
import { Campo, Input } from '../../components/ui/Field'
import { CampoComboBox } from '../../components/ui/ComboBox'
import { useData } from '../../context/useData'
import { formatearMoneda, redondearMonto } from '../../utils/formatters'
import {
  SeccionRegistros,
  fechaHoyISO,
  reglasNumeroMayorACero,
} from './compartido'

// Costo de materiales del servicio: se registra el gasto con texto libre,
// sin almacén ni stock.
function FormularioMaterial({ servicio, registrar }) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: { nombre_material: '', cantidad: '', costo: '', fecha: fechaHoyISO(), tarea_id: '' },
  })
  const {
    estado: { tareas: todasTareas },
  } = useData()
  const tareas = (todasTareas ?? [])
    .filter((t) => t.servicio_id === servicio.id)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  const enviar = ({ nombre_material, cantidad, costo, fecha, tarea_id }) => {
    registrar({
      servicio_id: servicio.id,
      tipo_registro: 'material',
      referencia_id: null,
      nombre_material: nombre_material.trim(),
      cantidad_o_horas: Number(cantidad),
      monto_calculado: redondearMonto(costo),
      fecha,
      tarea_id: tarea_id ? Number(tarea_id) : null,
    })
    reset({ nombre_material: '', cantidad: '', costo: '', fecha: fechaHoyISO(), tarea_id: '' })
  }

  return (
    <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Campo
          label="Nombre del material"
          error={errors.nombre_material?.message}
          htmlFor="mat-nombre"
          className="sm:col-span-3"
        >
          <Input
            id="mat-nombre"
            placeholder="Ej. Cemento Portland"
            {...register('nombre_material', { required: 'Ingresa el nombre del material' })}
          />
        </Campo>
        <Campo label="Cantidad" error={errors.cantidad?.message} htmlFor="mat-cantidad">
          <Input
            id="mat-cantidad"
            type="number"
            step="0.01"
            placeholder="0"
            {...register('cantidad', reglasNumeroMayorACero('Ingresa la cantidad'))}
          />
        </Campo>
        <Campo label="Costo (S/)" error={errors.costo?.message} htmlFor="mat-costo" hint="Monto total">
          <Input
            id="mat-costo"
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register('costo', reglasNumeroMayorACero('Ingresa el costo'))}
          />
        </Campo>
        <Campo label="Fecha" error={errors.fecha?.message} htmlFor="mat-fecha">
          <Input
            id="mat-fecha"
            type="date"
            {...register('fecha', { required: 'Indica la fecha' })}
          />
        </Campo>
        {tareas.length > 0 && (
          <Campo
            label="Tarea (opcional)"
            error={errors.tarea_id?.message}
            htmlFor="mat-tarea"
            hint="A qué trabajo corresponde este costo"
            className="sm:col-span-3"
          >
            <CampoComboBox
              id="mat-tarea"
              control={control}
              name="tarea_id"
              placeholder="Sin tarea — escribe para buscar…"
              opciones={tareas.map((t) => ({ valor: String(t.id), etiqueta: t.nombre }))}
            />
          </Campo>
        )}
      </div>
      <div className="flex justify-end">
        <Button type="submit">Agregar material</Button>
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
      descripcion="Materiales comprados para el servicio. Suman al gastado del presupuesto."
      columnaCantidad
      etiquetaCantidad="Cantidad"
      mensajeVacio="Este servicio todavía no tiene materiales registrados."
      mensajeExito={(datos) => `Material agregado por ${formatearMoneda(datos.monto_calculado)}.`}
    >
      {({ servicio, registrar }) => (
        <FormularioMaterial servicio={servicio} registrar={registrar} />
      )}
    </SeccionRegistros>
  )
}
