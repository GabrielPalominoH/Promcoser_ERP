import { useOutletContext } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Button } from '../../components/ui/Button'
import { Campo, Input } from '../../components/ui/Field'
import { CampoMonto, reglasMontoMayorACero } from '../../components/ui/Monto'
import { CampoComboBox } from '../../components/ui/ComboBox'
import { useData } from '../../context/useData'
import { formatearMoneda, redondearMonto } from '../../utils/formatters'
import { CATEGORIAS_GASTO } from '../../data/mockData'
import {
  SeccionRegistros,
  fechaHoyISO,
} from './compartido'

function FormularioGasto({ servicio, registrar }) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: { concepto: '', monto: '', fecha: fechaHoyISO(), tarea_id: '', categoria: '', documento: '' },
  })
  const {
    estado: { tareas: todasTareas },
  } = useData()
  const tareas = (todasTareas ?? [])
    .filter((t) => t.servicio_id === servicio.id)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  const enviar = ({ concepto, monto, fecha, tarea_id, categoria, documento }) => {
    registrar({
      servicio_id: servicio.id,
      tipo_registro: 'gasto',
      referencia_id: null,
      concepto: concepto.trim(),
      cantidad_o_horas: 1,
      monto_calculado: redondearMonto(monto),
      fecha,
      tarea_id: tarea_id ? Number(tarea_id) : null,
      categoria: categoria || null,
      documento: documento.trim() || null,
    })
    reset({ concepto: '', monto: '', fecha: fechaHoyISO(), tarea_id: '', categoria: '', documento: '' })
  }

  return (
    <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Campo
          label="Concepto del gasto"
          error={errors.concepto?.message}
          htmlFor="gasto-concepto"
          className="sm:col-span-3"
        >
          <Input
            id="gasto-concepto"
            placeholder="Ej. Alquiler de equipo adicional"
            {...register('concepto', { required: 'Describe el gasto' })}
          />
        </Campo>
        <Campo label="Monto (S/)" error={errors.monto?.message} htmlFor="gasto-monto">
          <CampoMonto
            id="gasto-monto"
            control={control}
            name="monto"
            placeholder="0.00"
            rules={reglasMontoMayorACero('Ingresa el monto')}
          />
        </Campo>
        <Campo label="Fecha" error={errors.fecha?.message} htmlFor="gasto-fecha">
          <Input
            id="gasto-fecha"
            type="date"
            {...register('fecha', { required: 'Indica la fecha' })}
          />
        </Campo>
        {tareas.length > 0 && (
          <Campo
            label="Tarea (opcional)"
            error={errors.tarea_id?.message}
            htmlFor="gasto-tarea"
            hint="A qué trabajo corresponde este gasto"
          >
            <CampoComboBox
              id="gasto-tarea"
              control={control}
              name="tarea_id"
              placeholder="Sin tarea — escribe para buscar…"
              opciones={tareas.map((t) => ({ valor: String(t.id), etiqueta: t.nombre }))}
            />
          </Campo>
        )}
        <Campo
          label="Categoría (opcional)"
          error={errors.categoria?.message}
          htmlFor="gasto-categoria"
          hint="Para el presupuesto por categorías"
        >
          <CampoComboBox
            id="gasto-categoria"
            control={control}
            name="categoria"
            placeholder="Sin categoría…"
            opciones={CATEGORIAS_GASTO.map((c) => ({ valor: c, etiqueta: c }))}
          />
        </Campo>
        <Campo
          label="N° factura / comprobante (opcional)"
          error={errors.documento?.message}
          htmlFor="gasto-doc"
          hint="Comprobante del proveedor, solo referencial"
        >
          <Input
            id="gasto-doc"
            placeholder="F001-000123"
            {...register('documento')}
          />
        </Campo>
        <div className="flex items-end">
          <Button type="submit" className="w-full">
            Agregar gasto
          </Button>
        </div>
      </div>
    </form>
  )
}

export function GastosServicio() {
  const { servicio } = useOutletContext()

  return (
    <SeccionRegistros
      servicio={servicio}
      tipo="gasto"
      titulo="Gastos"
      descripcion="Gastos extra del servicio. Suman al gastado del presupuesto."
      mensajeVacio="Este servicio todavía no tiene gastos registrados."
      mensajeExito={(datos) => `Gasto agregado por ${formatearMoneda(datos.monto_calculado)}.`}
      permitirEditar
    >
      {({ servicio, registrar }) => (
        <FormularioGasto servicio={servicio} registrar={registrar} />
      )}
    </SeccionRegistros>
  )
}
