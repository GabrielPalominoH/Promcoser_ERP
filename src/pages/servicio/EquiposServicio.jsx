import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Button } from '../../components/ui/Button'
import { Campo, Input } from '../../components/ui/Field'
import { formatearCantidad } from '../../utils/formatters'
import {
  SeccionRegistros,
  fechaHoyISO,
  reglasNumeroMayorACero,
} from './compartido'

function FormularioEquipo({ servicio, equipos, registrar }) {
  const ordenados = useMemo(
    () => [...equipos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [equipos],
  )

  const [busqueda, setBusqueda] = useState('')
  const [seleccionadoId, setSeleccionadoId] = useState(null)
  const [abierto, setAbierto] = useState(false)
  const [errorEquipo, setErrorEquipo] = useState(null)
  const contenedorRef = useRef(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: { horas: '', fecha: fechaHoyISO() },
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
        `${item.nombre} ${item.placa ?? ''} ${item.tipo_unidad ?? ''}`
          .toLowerCase()
          .includes(termino),
      )
    : ordenados

  const elegir = (item) => {
    setSeleccionadoId(item.id)
    setBusqueda(item.nombre)
    setAbierto(false)
    setErrorEquipo(null)
  }

  const alEscribir = (valor) => {
    setBusqueda(valor)
    setAbierto(true)
    if (seleccionadoId) {
      const actual = ordenados.find((item) => item.id === seleccionadoId)
      if (!actual || actual.nombre !== valor.trim()) {
        setSeleccionadoId(null)
      }
    }
  }

  const limpiar = () => {
    reset({ horas: '', fecha: fechaHoyISO() })
    setBusqueda('')
    setSeleccionadoId(null)
    setAbierto(false)
    setErrorEquipo(null)
  }

  const enviar = ({ horas, fecha }) => {
    if (!seleccionadoId) {
      setErrorEquipo('Selecciona un equipo de la lista')
      setAbierto(true)
      return
    }
    registrar({
      servicio_id: servicio.id,
      tipo_registro: 'equipo',
      referencia_id: Number(seleccionadoId),
      cantidad_o_horas: Number(horas),
      monto_calculado: 0,
      fecha,
    })
    limpiar()
  }

  if (ordenados.length === 0) {
    return (
      <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Todavía no hay equipos registrados.{' '}
        <Link to="/equipos" className="font-medium underline">
          Registra equipos
        </Link>{' '}
        para poder cargar su uso a este servicio.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo
          label="Equipo"
          error={errorEquipo}
          htmlFor="eq-busqueda"
          className="sm:col-span-2"
          hint="Escribe para buscar por nombre"
        >
          <div ref={contenedorRef} className="relative">
            <Input
              id="eq-busqueda"
              placeholder="Escribe un equipo…"
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
                        <span className="font-medium text-slate-900">{item.nombre}</span>
                        {(item.placa || item.tipo_unidad) && (
                          <span className="text-xs text-slate-500">
                            {[item.tipo_unidad, item.placa].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        </Campo>
        <Campo label="Horas de uso" error={errors.horas?.message} htmlFor="eq-horas">
          <Input
            id="eq-horas"
            type="number"
            step="0.25"
            placeholder="0"
            {...register('horas', reglasNumeroMayorACero('Ingresa las horas'))}
          />
        </Campo>
        <Campo label="Fecha" error={errors.fecha?.message} htmlFor="eq-fecha">
          <Input
            id="eq-fecha"
            type="date"
            {...register('fecha', { required: 'Indica la fecha' })}
          />
        </Campo>
      </div>
      <div className="flex justify-end">
        <Button type="submit">Agregar uso de equipo</Button>
      </div>
    </form>
  )
}

export function EquiposServicio() {
  const { servicio } = useOutletContext()

  return (
    <SeccionRegistros
      servicio={servicio}
      tipo="equipo"
      titulo="Equipos"
      descripcion="Uso de equipos en el servicio. Es solo control de uso, no suma al gastado."
      columnaCantidad
      etiquetaCantidad="Horas"
      mensajeVacio="Este servicio todavía no tiene uso de equipos registrado."
      mensajeExito={(datos) => `Uso de equipo registrado (${formatearCantidad(datos.cantidad_o_horas)} h).`}
    >
      {({ servicio, equipos, registrar }) => (
        <FormularioEquipo servicio={servicio} equipos={equipos} registrar={registrar} />
      )}
    </SeccionRegistros>
  )
}
