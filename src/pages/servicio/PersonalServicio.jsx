import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useData } from '../../context/useData'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Campo, Input } from '../../components/ui/Field'
import {
  Table,
  TableBody,
  TableEmpty,
  TableHead,
  TableRow,
  Td,
  Th,
} from '../../components/ui/Table'
import { formatearCantidad, formatearFecha, formatearMes, formatearMoneda, redondearMonto } from '../../utils/formatters'
import { agruparPersonalPorMes, coberturaTareo, fechasHastaFinDeMes, metricasCronograma, proyeccionLaboral } from '../../utils/calculadora'
import {
  SeccionRegistros,
  reglasNumeroMayorACero,
} from './compartido'

function nombreCompleto(item) {
  return `${item.nombre} ${item.apellido ?? ''}`.trim()
}

// Tabla de personal agrupada por persona y mes: una fila por persona por
// mes con días, horas y costo mensual calculado.
function TablaPersonalMensual({ registros, refs, onEliminar, mensajeVacio }) {
  const grupos = agruparPersonalPorMes(registros, refs.personal)
  const total = grupos.reduce((s, g) => s + g.monto, 0)

  return (
    <Table>
      <TableHead>
        <TableRow>
          <Th>Personal</Th>
          <Th>Mes</Th>
          <Th alinear="right">Días</Th>
          <Th alinear="right">Horas</Th>
          <Th alinear="right">Costo mensual</Th>
          <Th alinear="right">Acción</Th>
        </TableRow>
      </TableHead>
      <TableBody>
        {grupos.length === 0 ? (
          <TableEmpty colSpan={6} mensaje={mensajeVacio} />
        ) : (
          grupos.map((g) => (
            <TableRow key={g.clave}>
              <Td>
                <span className="font-medium text-slate-900">{g.nombre}</span>
                {g.cargo && (
                  <span className="block text-xs text-slate-500">{g.cargo}</span>
                )}
              </Td>
              <Td className="whitespace-nowrap capitalize">{formatearMes(g.mes)}</Td>
              <Td alinear="right" className="tabular-nums">
                {g.dias}
              </Td>
              <Td alinear="right" className="tabular-nums">
                {formatearCantidad(g.horas)}
              </Td>
              <Td alinear="right" className="font-semibold text-slate-900 tabular-nums">
                {formatearMoneda(g.monto)}
              </Td>
              <Td alinear="right">
                <Button
                  variante="peligro"
                  tamano="sm"
                  onClick={() =>
                    onEliminar({
                      ids: g.ids,
                      titulo: `${g.nombre} · ${formatearMes(g.mes)}`,
                    })
                  }
                >
                  Eliminar
                </Button>
              </Td>
            </TableRow>
          ))
        )}

        {grupos.length > 0 && (
          <TableRow className="bg-slate-50 font-semibold">
            <Td className="text-slate-600" colSpan={4}>
              Total
            </Td>
            <Td alinear="right" className="text-slate-900 tabular-nums">
              {formatearMoneda(total)}
            </Td>
            <Td />
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}

function FormularioPersonalCosto({ servicio, personal, registrarLote }) {
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
  const [avisoRango, setAvisoRango] = useState(null)
  const contenedorRef = useRef(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      horas: '',
      tarifa: '',
      fecha_desde: servicio.fecha_inicio || '',
    },
  })

  const horasVista = Number(watch('horas')) || 0
  const tarifaVista = Number(watch('tarifa')) || 0
  const desdeVista = watch('fecha_desde')
  const fechasRango = fechasHastaFinDeMes(desdeVista)
  const totalRango = redondearMonto(fechasRango.length * horasVista * tarifaVista)

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
    reset({
      horas: '',
      tarifa: '',
      fecha_desde: servicio.fecha_inicio || '',
    })
    setBusqueda('')
    setSeleccionadoId(null)
    setAbierto(false)
    setErrorPersona(null)
    setAvisoRango(null)
  }

  const baseRegistro = (horasNum, tarifaNum, fecha) => ({
    servicio_id: servicio.id,
    tipo_registro: 'personal',
    modalidad: 'mensual',
    referencia_id: Number(seleccionadoId),
    cantidad_o_horas: horasNum,
    monto_calculado: redondearMonto(horasNum * tarifaNum),
    fecha,
  })

  const enviar = ({ horas, tarifa, fecha_desde }) => {
    if (!seleccionadoId) {
      setErrorPersona('Selecciona a una persona de la lista')
      setAbierto(true)
      return
    }
    const horasNum = Number(horas)
    const tarifaNum = Number(tarifa)
    // Desde la fecha elegida hasta fin de ese mes (domingos incluidos).
    const fechas = fechasHastaFinDeMes(fecha_desde)
    if (fechas.length === 0) {
      setAvisoRango('Indica una fecha de inicio válida.')
      return
    }
    registrarLote(
      fechas.map((f) => baseRegistro(horasNum, tarifaNum, f)),
      `${nombreCompleto(ordenados.find((p) => p.id === seleccionadoId))}: ` +
        `${fechas.length} días × ${formatearCantidad(horasNum)} h × ${formatearMoneda(tarifaNum)} = ` +
        `${formatearMoneda(redondearMonto(fechas.length * horasNum * tarifaNum))} ` +
        `(del ${formatearFecha(fecha_desde)} a fin de mes).`,
    )
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
        <Campo
          label="Horas por día"
          error={errors.horas?.message}
          htmlFor="per-horas"
        >
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
        <Campo
          label="Fecha de inicio"
          error={errors.fecha_desde?.message}
          htmlFor="per-desde"
          hint="Por defecto, el inicio del servicio. Genera hasta fin de mes"
        >
          <Input
            id="per-desde"
            type="date"
            {...register('fecha_desde', { required: 'Indica el inicio' })}
          />
        </Campo>
      </div>
      <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
        {avisoRango ? (
          <p className="font-medium text-amber-700">{avisoRango}</p>
        ) : (
          <p className="text-slate-600">
            Se crearán <span className="font-semibold text-slate-900">{fechasRango.length} registros</span>
            {' '}({formatearCantidad(horasVista)} h × {formatearMoneda(tarifaVista)} c/u) por un total de{' '}
            <span className="font-semibold text-slate-900">{formatearMoneda(totalRango)}</span>
          </p>
        )}
      </div>
      <div className="flex justify-end">
        <Button type="submit">Asignar personal</Button>
      </div>
    </form>
  )
}

export function PersonalServicio() {
  const { servicio } = useOutletContext()
  const {
    estado: { registros_servicio: todos, tareas: todasLasTareas, personal },
  } = useData()

  const registros = todos.filter(
    (r) => r.servicio_id === servicio.id && r.tipo_registro === 'personal',
  )
  // Tarifa promedio del personal de Obra: respaldo para estimar meses con
  // horas pero sin costo registrado.
  const tarifasObra = personal
    .filter((p) => (p.ambito ?? 'Obra') !== 'Oficina')
    .map((p) => Number(p.tarifa_por_hora) || 0)
    .filter((t) => t > 0)
  const tarifaPromedioObra = tarifasObra.length > 0
    ? tarifasObra.reduce((s, t) => s + t, 0) / tarifasObra.length
    : 0
  const proyeccion = proyeccionLaboral(
    registros,
    servicio.fecha_fin_estimada,
    undefined,
    servicio.fecha_inicio,
    tarifaPromedioObra,
  )
  const totalInicioFin =
    proyeccion.porMes
      .filter((m) => !m.estimado)
      .reduce((s, m) => s + m.monto, 0) + proyeccion.costoProyectado

  const tareas = todasLasTareas.filter((t) => t.servicio_id === servicio.id)
  const cobertura = coberturaTareo(registros, personal, servicio.fecha_inicio, servicio.fecha_fin_estimada)
  const incompletos = cobertura.filter((c) => !c.completo)
  const mesActual = new Date().toISOString().slice(0, 7)
  const costoMesActual = proyeccion.porMes.find((m) => m.mes === mesActual)?.monto ?? 0
  const mesSinCarga =
    tareas.length > 0 &&
    metricasCronograma(tareas).avanceGlobal > 0 &&
    !proyeccion.porMes.some((m) => m.mes === mesActual)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm text-slate-500">Costo este mes ({formatearMes(mesActual)})</p>
          <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
            {formatearMoneda(costoMesActual)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Mano de obra registrada en el mes actual
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Estimado total personal</p>
          <p className="mt-1 text-xl font-bold text-red-600 tabular-nums">
            {formatearMoneda(totalInicioFin)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
            Gastado {formatearMoneda(totalInicioFin - proyeccion.costoProyectado)} + proyectado {formatearMoneda(proyeccion.costoProyectado)}
          </p>
        </Card>
      </div>

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
        tablaAgrupada={({ registros, refs, onEliminar }) => (
          <TablaPersonalMensual
            registros={registros}
            refs={refs}
            onEliminar={onEliminar}
            mensajeVacio="Este servicio todavía no tiene personal asignado."
          />
        )}
      >
        {({ servicio, personal, registrarLote }) => (
          <FormularioPersonalCosto
            servicio={servicio}
            personal={personal}
            registrarLote={registrarLote}
          />
        )}
      </SeccionRegistros>

      <Card
        titulo="Cobertura de tareo"
        descripcion="Días con registro frente a días laborables esperados, por persona y mes."
      >
        {cobertura.length === 0 ? (
          <p className="text-sm text-slate-400">
            Sin tareo todavía. Al asignar personal aparecerá aquí su cobertura mensual.
          </p>
        ) : (
          <>
            {incompletos.length > 0 && (
              <p className="mb-4 rounded-lg bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800">
                {incompletos.length} mes(es) persona con tareo incompleto: revisa los días faltantes.
              </p>
            )}
            <Table>
              <TableHead>
                <TableRow>
                  <Th>Personal</Th>
                  <Th>Mes</Th>
                  <Th alinear="right">Días</Th>
                  <Th alinear="right">Estado</Th>
                </TableRow>
              </TableHead>
              <TableBody>
                {cobertura.map((c) => (
                  <TableRow key={`${c.personaId ?? 'x'}-${c.mes}`}>
                    <Td>
                      <span className="font-medium text-slate-900">{c.nombre}</span>
                      {c.cargo && (
                        <span className="block text-xs text-slate-500">{c.cargo}</span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap capitalize">{formatearMes(c.mes)}</Td>
                    <Td alinear="right" className="tabular-nums">
                      {c.diasRegistrados}/{c.diasEsperados}
                    </Td>
                    <Td alinear="right">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                          c.completo
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                            : 'bg-amber-50 text-amber-700 ring-amber-200'
                        }`}
                      >
                        {c.completo ? 'Completo' : 'Incompleto'}
                      </span>
                    </Td>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </Card>

      <Card
        titulo="Proyección de mano de obra"
        descripcion="Costo por mes y total desde el inicio hasta el fin del servicio."
      >
        <p className="mb-4 text-center text-sm text-slate-600">
          Del <span className="font-semibold text-slate-900">{formatearFecha(servicio.fecha_inicio)}</span>
          {' '}al <span className="font-semibold text-slate-900">{servicio.fecha_fin_estimada ? formatearFecha(servicio.fecha_fin_estimada) : '—'}</span>
        </p>
        {mesSinCarga && (
          <p className="mb-4 rounded-lg bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800">
            Este mes aún no tiene horas cargadas: la estimación puede estar subestimada.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 text-center sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Costo por mes
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
              {formatearMoneda(proyeccion.ritmo)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Promedio mensual registrado
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Total inicio → fin
            </p>
            <p className="mt-1 text-xl font-bold text-red-600 tabular-nums">
              {formatearMoneda(totalInicioFin)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
              Gastado + proyectado a {servicio.fecha_fin_estimada ? formatearFecha(servicio.fecha_fin_estimada) : 'fin'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
