import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Campo, Input } from '../../components/ui/Field'
import { CampoMonto, reglasMontoMayorACero } from '../../components/ui/Monto'
import { CampoComboBox } from '../../components/ui/ComboBox'
import { useData } from '../../context/useData'
import { formatearCantidad, formatearMoneda, redondearMonto } from '../../utils/formatters'
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
    setValue,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: { horas: '', costo: '', fecha: fechaHoyISO(), tarea_id: '' },
  })
  const {
    estado: { tareas: todasTareas },
  } = useData()
  const tareas = (todasTareas ?? [])
    .filter((t) => t.servicio_id === servicio.id)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

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
    if (Number(item.costo_por_hora) > 0) {
      setValue('costo', item.costo_por_hora, { shouldValidate: false })
    }
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
    reset({ horas: '', costo: '', fecha: fechaHoyISO(), tarea_id: '' })
    setBusqueda('')
    setSeleccionadoId(null)
    setAbierto(false)
    setErrorEquipo(null)
  }

  const enviar = ({ horas, costo, fecha, tarea_id }) => {
    if (!seleccionadoId) {
      setErrorEquipo('Selecciona un equipo de la lista')
      setAbierto(true)
      return
    }
    const horasNum = Number(horas)
    registrar({
      servicio_id: servicio.id,
      tipo_registro: 'equipo',
      referencia_id: Number(seleccionadoId),
      cantidad_o_horas: horasNum,
      monto_calculado: redondearMonto(costo),
      fecha,
      tarea_id: tarea_id ? Number(tarea_id) : null,
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
              <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-300 bg-white py-1 shadow-lg">
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
                        <span className="text-xs text-slate-500">
                          {Number(item.costo_por_hora) > 0
                            ? `${formatearMoneda(item.costo_por_hora)}/h`
                            : 'Sin costo referencial'}
                          {(item.placa || item.tipo_unidad) &&
                            ` · ${[item.tipo_unidad, item.placa].filter(Boolean).join(' · ')}`}
                        </span>
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
        <Campo
          label="Costo (S/)"
          error={errors.costo?.message}
          htmlFor="eq-costo"
          hint="Se sugiere el de su ficha; puedes ajustarlo"
        >
          <CampoMonto
            id="eq-costo"
            control={control}
            name="costo"
            placeholder="0.00"
            rules={reglasMontoMayorACero('Ingresa el costo')}
          />
        </Campo>
        <Campo label="Fecha" error={errors.fecha?.message} htmlFor="eq-fecha">
          <Input
            id="eq-fecha"
            type="date"
            {...register('fecha', { required: 'Indica la fecha' })}
          />
        </Campo>
        {tareas.length > 0 && (
          <Campo
            label="Tarea (opcional)"
            error={errors.tarea_id?.message}
            htmlFor="eq-tarea"
            hint="A qué trabajo corresponde este costo"
            className="sm:col-span-2"
          >
            <CampoComboBox
              id="eq-tarea"
              control={control}
              name="tarea_id"
              placeholder="Sin tarea — escribe para buscar…"
              opciones={tareas.map((t) => ({ valor: String(t.id), etiqueta: t.nombre }))}
            />
          </Campo>
        )}
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
      descripcion="Uso de equipos en el servicio: horas por costo. Suma al gastado del presupuesto."
      columnaCantidad
      etiquetaCantidad="Horas"
      mensajeVacio="Este servicio todavía no tiene uso de equipos registrado."
      mensajeExito={(datos) => `Uso de equipo registrado por ${formatearMoneda(datos.monto_calculado)} (${formatearCantidad(datos.cantidad_o_horas)} h).`}
      tarjetas={({ totalMonto, totalCantidad, registros }) => (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <p className="text-sm text-slate-500">Gastado en equipos</p>
            <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
              {formatearMoneda(totalMonto)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Uso registrado: suma al presupuesto</p>
          </Card>
          <Card>
            <p className="text-sm text-slate-500">Horas totales</p>
            <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
              {formatearCantidad(totalCantidad)} h
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Horas acumuladas en este servicio</p>
          </Card>
          <Card>
            <p className="text-sm text-slate-500">Equipos en obra</p>
            <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
              {new Set(registros.map((r) => r.referencia_id)).size}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Con uso registrado aquí</p>
          </Card>
        </div>
      )}
    >
      {({ servicio, equipos, registrar }) => (
        <FormularioEquipo servicio={servicio} equipos={equipos} registrar={registrar} />
      )}
    </SeccionRegistros>
  )
}
