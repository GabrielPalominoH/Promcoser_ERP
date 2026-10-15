import { useOutletContext } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Button } from '../../components/ui/Button'
import { Campo, Input } from '../../components/ui/Field'
import { CampoMonto, reglasMontoMayorACero } from '../../components/ui/Monto'
import { CampoComboBox } from '../../components/ui/ComboBox'
import { useData } from '../../context/useData'
import { UNIDADES } from '../../data/unidades'
import { formatearMoneda, redondearMonto } from '../../utils/formatters'
import {
  SeccionRegistros,
  fechaHoyISO,
  reglasNumeroMayorACero,
} from './compartido'

// Unidades de medida disponibles para el metrado de un material.
const OPCIONES_UNIDAD = UNIDADES.map((unidad) => ({
  valor: unidad.sigla,
  etiqueta: `${unidad.sigla} — ${unidad.nombre}`,
}))

const VALORES_INICIALES = {
  nombre_material: '',
  unidad: '',
  metrado: '',
  costo: '',
  fecha: fechaHoyISO(),
  tarea_id: '',
}

// Costo de materiales del servicio: cada línea se mide con su unidad (UM) y su
// metrado, igual que las partidas. Se registra el gasto, sin almacén ni stock.
function FormularioMaterial({ servicio, registrar, enModal = false }) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({ defaultValues: VALORES_INICIALES })
  const {
    estado: { tareas: todasTareas },
  } = useData()
  const tareas = (todasTareas ?? [])
    .filter((t) => t.servicio_id === servicio.id)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  const enviar = ({ nombre_material, unidad, metrado, costo, fecha, tarea_id }) => {
    registrar({
      servicio_id: servicio.id,
      tipo_registro: 'material',
      referencia_id: null,
      nombre_material: nombre_material.trim(),
      unidad,
      cantidad_o_horas: Number(metrado),
      monto_calculado: redondearMonto(costo),
      fecha,
      tarea_id: tarea_id ? Number(tarea_id) : null,
    })
    reset(VALORES_INICIALES)
  }

  return (
    <form id="form-registro" onSubmit={handleSubmit(enviar)} noValidate className="space-y-4">
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
        <Campo
          label="Unidad de medida"
          error={errors.unidad?.message}
          htmlFor="mat-unidad"
          hint="En qué se mide el metrado"
        >
          <CampoComboBox
            id="mat-unidad"
            control={control}
            name="unidad"
            placeholder="Elige unidad…"
            opciones={OPCIONES_UNIDAD}
            rules={{ required: 'Elige la unidad de medida' }}
          />
        </Campo>
        <Campo label="Metrado" error={errors.metrado?.message} htmlFor="mat-metrado">
          <Input
            id="mat-metrado"
            type="number"
            step="0.01"
            placeholder="0"
            {...register('metrado', reglasNumeroMayorACero('Ingresa el metrado'))}
          />
        </Campo>
        <Campo label="Costo total (S/)" error={errors.costo?.message} htmlFor="mat-costo" hint="Monto total">
          <CampoMonto
            id="mat-costo"
            control={control}
            name="costo"
            placeholder="0.00"
            rules={reglasMontoMayorACero('Ingresa el costo')}
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
            className="sm:col-span-2"
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
      {!enModal && (
        <div className="flex justify-end">
          <Button type="submit">Agregar material</Button>
        </div>
      )}
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
      descripcion="Materiales comprados para el servicio, con su unidad de medida y metrado. Suman al gastado."
      columnaCantidad
      etiquetaCantidad="Metrado"
      columnaUnidad
      mensajeVacio="Este servicio todavía no tiene materiales registrados."
      mensajeExito={(datos) => `Material agregado por ${formatearMoneda(datos.monto_calculado)}.`}
      modalRegistro={{
        boton: 'Agregar material',
        titulo: 'Registrar material',
        descripcion: 'Material comprado para el servicio. Suma al gastado.',
      }}
    >
      {({ servicio, registrar }) => (
        <FormularioMaterial servicio={servicio} registrar={registrar} enModal />
      )}
    </SeccionRegistros>
  )
}
