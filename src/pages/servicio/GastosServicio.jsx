import { useOutletContext } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Campo, Input } from '../../components/ui/Field'
import { CampoMonto, reglasMontoMayorACero } from '../../components/ui/Monto'
import { CampoComboBox } from '../../components/ui/ComboBox'
import { useData } from '../../context/useData'
import { formatearMoneda, redondearMonto } from '../../utils/formatters'
import {
  SeccionRegistros,
  fechaHoyISO,
} from './compartido'

function FormularioGasto({ servicio, registrar, enModal = false }) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: { concepto: '', monto: '', fecha: fechaHoyISO(), tarea_id: '', documento: '' },
  })
  const {
    estado: { tareas: todasTareas },
  } = useData()
  const tareas = (todasTareas ?? [])
    .filter((t) => t.servicio_id === servicio.id)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  const enviar = ({ concepto, monto, fecha, tarea_id, documento }) => {
    registrar({
      servicio_id: servicio.id,
      tipo_registro: 'gasto',
      referencia_id: null,
      concepto: concepto.trim(),
      cantidad_o_horas: 1,
      monto_calculado: redondearMonto(monto),
      fecha,
      tarea_id: tarea_id ? Number(tarea_id) : null,
      documento: documento.trim() || null,
    })
    reset({ concepto: '', monto: '', fecha: fechaHoyISO(), tarea_id: '', documento: '' })
  }

  return (
    <form id="form-registro" onSubmit={handleSubmit(enviar)} noValidate className="space-y-4">
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
          {enModal ? (
            <p className="text-xs text-slate-500">
              Se suma al gastado del servicio al guardar.
            </p>
          ) : (
            <Button type="submit" className="w-full">
              Agregar gasto
            </Button>
          )}
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
      descripcion="Gastos extra del servicio. Suman al gastado."
      mensajeVacio="Este servicio todavía no tiene gastos registrados."
      mensajeExito={(datos) => `Gasto agregado por ${formatearMoneda(datos.monto_calculado)}.`}
      permitirEditar
      tarjetas={({ registros, totalMonto }) => (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="border-l-4 border-red-500 pl-4">
              <p className="text-sm text-slate-500">Total gastado</p>
              <p className="mt-1 text-3xl font-bold text-slate-900 tabular-nums">
                {formatearMoneda(totalMonto)}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">Gastos extra del servicio</p>
            </div>
            <div className="flex flex-1 flex-wrap items-stretch justify-start gap-6 sm:justify-end sm:gap-10">
              <div className="min-w-32 border-l border-slate-200 pl-6">
                <p className="text-3xl font-bold text-slate-800 tabular-nums">{registros.length}</p>
                <p className="mt-1 text-xs text-slate-500">gastos registrados</p>
              </div>
            </div>
          </div>
        </Card>
      )}
      modalRegistro={{
        boton: 'Agregar gasto',
        titulo: 'Registrar gasto',
        descripcion: 'Gastos extra del servicio. Suman al gastado.',
      }}
    >
      {({ servicio, registrar }) => (
        <FormularioGasto servicio={servicio} registrar={registrar} enModal />
      )}
    </SeccionRegistros>
  )
}
