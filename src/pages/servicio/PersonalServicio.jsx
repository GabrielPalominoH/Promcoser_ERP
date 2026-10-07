import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Button } from '../../components/ui/Button'
import { Campo, Input } from '../../components/ui/Field'
import { formatearCantidad, formatearMoneda, redondearMonto } from '../../utils/formatters'
import {
  SeccionRegistros,
  fechaHoyISO,
  reglasNumeroMayorACero,
} from './compartido'

function nombreCompleto(item) {
  return `${item.nombre} ${item.apellido ?? ''}`.trim()
}

function FormularioPersonalCosto({ servicio, personal, registrar }) {
  // Solo personal de Obra: el de Oficina es gasto general y no se asigna
  // a un servicio. Los registros viejos sin ámbito cuentan como Obra.
  const elegibles = useMemo(
    () => personal.filter((p) => (p.ambito ?? 'Obra') !== 'Oficina'),
    [personal],
  )
  const ordenados = useMemo(
    () =>
      [...elegibles].sort((a, b) =>
        `${a.nombre} ${a.apellido ?? ''}`.localeCompare(`${b.nombre} ${b.apellido ?? ''}`, 'es'),
      ),
    [elegibles],
  )

  const [busqueda, setBusqueda] = useState('')
  const [seleccionadoId, setSeleccionadoId] = useState(null)
  const [abierto, setAbierto] = useState(false)
  const [errorPersona, setErrorPersona] = useState(null)
  const contenedorRef = useRef(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: { horas: '', tarifa: '', fecha: fechaHoyISO() },
  })

  useEffect(() => {
    const alPresionarFuera = (evento) => {
      if (contenedorRef.current && !contenedorRef.current.contains(evento.target)) {
        setAbierto(false)
      }
    }

    document.addEventListener('mousedown', alPresionarFuera)
    return () => document.removeEventListener('mousedown', alPresionarFuera)
  }, [])

  const termino = busqueda.trim().toLowerCase()
  const filtrados = termino
    ? ordenados.filter((item) =>
        `${item.nombre} ${item.apellido ?? ''} ${item.cargo} ${item.dni ?? ''}`
          .toLowerCase()
          .includes(termino),
      )
    : ordenados

  const elegir = (item) => {
    setSeleccionadoId(item.id)
    setBusqueda(nombreCompleto(item))
    setAbierto(false)
    setErrorPersona(null)
    if (Number(item.tarifa_por_hora) > 0) {
      setValue('tarifa', item.tarifa_por_hora, { shouldValidate: false })
    }
  }

  const alEscribir = (valor) => {
    setBusqueda(valor)
    setAbierto(true)
    if (seleccionadoId) {
      const actual = ordenados.find((item) => item.id === seleccionadoId)
      if (!actual || nombreCompleto(actual) !== valor.trim()) {
        setSeleccionadoId(null)
      }
    }
  }

  const limpiar = () => {
    reset({ horas: '', tarifa: '', fecha: fechaHoyISO() })
    setBusqueda('')
    setSeleccionadoId(null)
    setAbierto(false)
    setErrorPersona(null)
  }

  const enviar = ({ horas, tarifa, fecha }) => {
    if (!seleccionadoId) {
      setErrorPersona('Selecciona a una persona de la lista')
      setAbierto(true)
      return
    }
    const horasNum = Number(horas)
    const tarifaNum = Number(tarifa)
    registrar({
      servicio_id: servicio.id,
      tipo_registro: 'personal',
      referencia_id: Number(seleccionadoId),
      cantidad_o_horas: horasNum,
      monto_calculado: redondearMonto(horasNum * tarifaNum),
      fecha,
    })
    limpiar()
  }

  if (ordenados.length === 0) {
    return (
      <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Todavía no hay personal registrado.{' '}
        <Link to="/personal" className="font-medium underline">
          Registra personal
        </Link>{' '}
        para poder asignarlo a este servicio.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Campo
          label="Personal"
          error={errorPersona}
          htmlFor="per-busqueda"
          className="sm:col-span-3"
          hint="Escribe para buscar por nombre, cargo o DNI"
        >
          <div ref={contenedorRef} className="relative">
            <Input
              id="per-busqueda"
              placeholder="Escribe un nombre…"
              value={busqueda}
              onChange={(evento) => alEscribir(evento.target.value)}
              onFocus={() => setAbierto(true)}
              onKeyDown={(evento) => {
                if (evento.key === 'Escape') setAbierto(false)
              }}
              autoComplete="off"
            />
            {abierto && (
              <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                {filtrados.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-slate-400">
                    Sin coincidencias.
                  </li>
                ) : (
                  filtrados.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => elegir(item)}
                        className={`flex w-full flex-col px-3 py-2 text-left text-sm transition-colors hover:bg-primary-50 ${
                          seleccionadoId === item.id ? 'bg-primary-50' : ''
                        }`}
                      >
                        <span className="font-medium text-slate-900">
                          {nombreCompleto(item)}
                        </span>
                        <span className="text-xs text-slate-500">
                          {item.cargo}
                          {Number(item.tarifa_por_hora) > 0
                            ? ` · ${formatearMoneda(item.tarifa_por_hora)}/h`
                            : ''}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        </Campo>
        <Campo label="Horas" error={errors.horas?.message} htmlFor="per-horas">
          <Input
            id="per-horas"
            type="number"
            step="0.25"
            placeholder="0"
            {...register('horas', reglasNumeroMayorACero('Ingresa las horas'))}
          />
        </Campo>
        <Campo
          label="Tarifa por hora (S/)"
          error={errors.tarifa?.message}
          htmlFor="per-tarifa"
          hint="Se sugiere la de su ficha; puedes ajustarla"
        >
          <Input
            id="per-tarifa"
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register('tarifa', reglasNumeroMayorACero('Ingresa la tarifa'))}
          />
        </Campo>
        <Campo label="Fecha" error={errors.fecha?.message} htmlFor="per-fecha">
          <Input
            id="per-fecha"
            type="date"
            {...register('fecha', { required: 'Indica la fecha' })}
          />
        </Campo>
      </div>
      <div className="flex justify-end">
        <Button type="submit">Asignar personal</Button>
      </div>
    </form>
  )
}

export function PersonalServicio() {
  const { servicio } = useOutletContext()

  return (
    <SeccionRegistros
      servicio={servicio}
      tipo="personal"
      titulo="Personal"
      descripcion="Mano de obra del servicio: horas por tarifa. Suma al gastado del presupuesto."
      columnaCantidad
      etiquetaCantidad="Horas"
      mensajeVacio="Este servicio todavía no tiene personal asignado."
      mensajeExito={(datos) =>
        `Personal asignado por ${formatearMoneda(datos.monto_calculado)} (${formatearCantidad(datos.cantidad_o_horas)} h).`
      }
    >
      {({ servicio, personal, registrar }) => (
        <FormularioPersonalCosto servicio={servicio} personal={personal} registrar={registrar} />
      )}
    </SeccionRegistros>
  )
}
