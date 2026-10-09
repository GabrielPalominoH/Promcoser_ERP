import { useOutletContext } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Button } from '../../components/ui/Button'
import { Campo, Input, Select } from '../../components/ui/Field'
import { useData } from '../../context/useData'
import { formatearMoneda, redondearMonto } from '../../utils/formatters'
import { partidasDeServicio } from '../../utils/calculadora'
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
    defaultValues: { concepto: '', monto: '', fecha: fechaHoyISO(), partida_id: '' },
  })
  const {
    estado: { partidas: todasPartidas },
  } = useData()
  const partidas = partidasDeServicio(todasPartidas, servicio.id)

  const enviar = ({ concepto, monto, fecha, partida_id }) => {
    registrar({
      servicio_id: servicio.id,
      tipo_registro: 'gasto',
      referencia_id: null,
      concepto: concepto.trim(),
      cantidad_o_horas: 1,
      monto_calculado: redondearMonto(monto),
      fecha,
      partida_id: partida_id ? Number(partida_id) : null,
    })
    reset({ concepto: '', monto: '', fecha: fechaHoyISO(), partida_id: '' })
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
        {partidas.length > 0 && (
          <Campo
            label="Partida (opcional)"
            error={errors.partida_id?.message}
            htmlFor="gasto-partida"
            hint="Para el costo por partida"
          >
            <Select id="gasto-partida" {...register('partida_id')}>
              <option value="">Sin partida</option>
              {partidas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </Select>
          </Campo>
        )}
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
