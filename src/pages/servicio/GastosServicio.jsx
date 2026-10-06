import { useOutletContext } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Button } from '../../components/ui/Button'
import { Campo, Input } from '../../components/ui/Field'
import { formatearMoneda, redondearMonto } from '../../utils/formatters'
import {
  SeccionRegistros,
  fechaHoyISO,
  reglasNumeroMayorACero,
} from './compartido'

function FormularioGasto({ servicio, registrar }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: { concepto: '', monto: '', fecha: fechaHoyISO() },
  })

  const enviar = ({ concepto, monto, fecha }) => {
    registrar({
      servicio_id: servicio.id,
      tipo_registro: 'gasto',
      referencia_id: null,
      concepto: concepto.trim(),
      cantidad_o_horas: 1,
      monto_calculado: redondearMonto(monto),
      fecha,
    })
    reset({ concepto: '', monto: '', fecha: fechaHoyISO() })
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
          <Input
            id="gasto-monto"
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register('monto', reglasNumeroMayorACero('Ingresa el monto'))}
          />
        </Campo>
        <Campo label="Fecha" error={errors.fecha?.message} htmlFor="gasto-fecha">
          <Input
            id="gasto-fecha"
            type="date"
            {...register('fecha', { required: 'Indica la fecha' })}
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
    >
      {({ servicio, registrar }) => (
        <FormularioGasto servicio={servicio} registrar={registrar} />
      )}
    </SeccionRegistros>
  )
}
