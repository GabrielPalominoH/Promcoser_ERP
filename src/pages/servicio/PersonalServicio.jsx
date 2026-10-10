import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useData } from '../../context/useData'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Campo, Input } from '../../components/ui/Field'
import { CampoComboBox } from '../../components/ui/ComboBox'
import { Modal } from '../../components/ui/Modal'
import { Aviso } from '../../components/ui/Aviso'
import {
  Table,
  TableBody,
  TableEmpty,
  TableHead,
  TableRow,
  Td,
  Th,
} from '../../components/ui/Table'
import {
  formatearCantidad,
  formatearFecha,
  formatearMes,
  formatearMoneda,
  redondearMonto,
} from '../../utils/formatters'
import {
  asentamientoDe,
  costoMensualAsignacion,
  proyeccionAsignaciones,
  ultimoDiaMes,
} from '../../utils/calculadora'
import { mesCerrado, redondear2 } from '../../utils/finanzas'

function nombreCompleto(item) {
  return `${item.nombre} ${item.apellido ?? ''}`.trim()
}

function nombreTarea(tareas, id) {
  return tareas.find((t) => t.id === id)?.nombre ?? '—'
}

// Asignar personal al servicio: persona + pago + vigencia. No genera gasto
// todavía; el gasto nace al asentar cada mes.
function FormularioAsignacion({ servicio, personal, tareas, notificar }) {
  const elegibles = useMemo(
    () => [...personal].filter((p) => (p.ambito ?? 'Obra') !== 'Oficina'),
    [personal],
  )
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: {
      personal_id: '',
      tarea_id: '',
      horas: '',
      tarifa: '',
      fecha_inicio: servicio.fecha_inicio || '',
      fecha_fin: '',
    },
  })
  const { agregarItem, estado } = useData()
  const personalId = watch('personal_id')

  useEffect(() => {
    const ficha = elegibles.find((p) => String(p.id) === String(personalId))
    if (ficha && Number(ficha.tarifa_por_hora) > 0) {
      setValue('tarifa', ficha.tarifa_por_hora)
    }
  }, [personalId, elegibles, setValue])

  const enviar = ({ personal_id, tarea_id, horas, tarifa, fecha_inicio, fecha_fin }) => {
    if (fecha_fin && fecha_fin < fecha_inicio) {
      notificar('error', 'La fecha de fin no puede ser anterior al inicio.')
      return
    }
    const traslape = (estado.asignaciones ?? []).some(
      (a) =>
        a.servicio_id !== servicio.id &&
        Number(a.personal_id) === Number(personal_id) &&
        !a.fecha_fin &&
        (!fecha_fin || a.fecha_inicio <= fecha_fin),
    )
    agregarItem('asignaciones', {
      servicio_id: servicio.id,
      personal_id: Number(personal_id),
      tarea_id: tarea_id ? Number(tarea_id) : null,
      horas_por_dia: Number(horas),
      tarifa: Number(tarifa),
      fecha_inicio,
      fecha_fin: fecha_fin || null,
    })
    notificar(
      traslape ? 'info' : 'exito',
      traslape
        ? 'Personal asignado. Ojo: ya está vigente en otro servicio en ese periodo (horas compartidas, no duplicadas: cada servicio asienta lo suyo).'
        : 'Personal asignado. El gasto se genera al asentar cada mes.',
    )
    reset()
  }

  if (elegibles.length === 0) {
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
          label="Persona"
          error={errors.personal_id?.message}
          htmlFor="asi-persona"
          className="sm:col-span-2"
        >
          <CampoComboBox
            id="asi-persona"
            control={control}
            name="personal_id"
            rules={{ required: 'Selecciona a una persona' }}
            placeholder="Escribe para buscar…"
            opciones={elegibles.map((p) => ({
              valor: String(p.id),
              etiqueta: `${nombreCompleto(p)} — ${p.cargo}`,
            }))}
          />
        </Campo>
        <Campo
          label="Tarea (opcional)"
          error={errors.tarea_id?.message}
          htmlFor="asi-tarea"
        >
          <CampoComboBox
            id="asi-tarea"
            control={control}
            name="tarea_id"
            placeholder="Sin tarea…"
            opciones={tareas.map((t) => ({ valor: String(t.id), etiqueta: t.nombre }))}
          />
        </Campo>
        <Campo
          label="Horas por día"
          error={errors.horas?.message}
          htmlFor="asi-horas"
        >
          <Input
            id="asi-horas"
            type="number"
            step="0.25"
            placeholder="8"
            {...register('horas', {
              valueAsNumber: true,
              required: 'Ingresa las horas',
              validate: (v) => (v > 0 ? true : 'Debe ser mayor que cero'),
            })}
          />
        </Campo>
        <Campo
          label="Tarifa por hora (S/)"
          error={errors.tarifa?.message}
          htmlFor="asi-tarifa"
          hint="Se sugiere la de su ficha"
        >
          <Input
            id="asi-tarifa"
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register('tarifa', {
              valueAsNumber: true,
              required: 'Ingresa la tarifa',
              validate: (v) => (v > 0 ? true : 'Debe ser mayor que cero'),
            })}
          />
        </Campo>
        <Campo label="Desde" error={errors.fecha_inicio?.message} htmlFor="asi-desde">
          <Input
            id="asi-desde"
            type="date"
            {...register('fecha_inicio', { required: 'Indica el inicio' })}
          />
        </Campo>
        <Campo
          label="Hasta (opcional)"
          error={errors.fecha_fin?.message}
          htmlFor="asi-hasta"
          hint="Vacío = vigente"
        >
          <Input id="asi-hasta" type="date" {...register('fecha_fin')} />
        </Campo>
      </div>
      <div className="flex justify-end">
        <Button type="submit">Asignar personal</Button>
      </div>
    </form>
  )
}

// Tareo diario: horas normales + extras por persona, día y tarea, con
// tarifa fija al momento del registro (no cambia retroactivamente).
// Solo el tareo APROBADO alimenta el asentamiento mensual.
function FormularioTareo({ servicio, personal, tareas, tareos, notificar }) {
  const elegibles = useMemo(
    () => [...personal].filter((p) => (p.ambito ?? 'Obra') !== 'Oficina'),
    [personal],
  )
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: {
      fecha: new Date().toISOString().slice(0, 10),
      personal_id: '',
      tarea_id: '',
      horas_normales: '',
      horas_extras: '',
      tarifa_hora: '',
      tarifa_extra: '',
      observaciones: '',
    },
  })
  const { agregarItem } = useData()
  const personalId = watch('personal_id')
  const hn = Number(watch('horas_normales')) || 0
  const he = Number(watch('horas_extras')) || 0
  const th = Number(watch('tarifa_hora')) || 0
  const te = watch('tarifa_extra') === '' ? th * 1.5 : Number(watch('tarifa_extra'))
  const importe = redondear2(hn * th + he * te)

  useEffect(() => {
    const ficha = elegibles.find((p) => String(p.id) === String(personalId))
    if (ficha && Number(ficha.tarifa_por_hora) > 0) {
      setValue('tarifa_hora', ficha.tarifa_por_hora)
    }
  }, [personalId, elegibles, setValue])

  const enviar = ({ fecha, personal_id, tarea_id, horas_normales, horas_extras, tarifa_hora, tarifa_extra, observaciones }) => {
    const normales = Number(horas_normales) || 0
    const extras = Number(horas_extras) || 0
    if (normales < 0 || extras < 0) {
      notificar('error', 'Las horas no pueden ser negativas.')
      return
    }
    if (normales + extras === 0) {
      notificar('error', 'Ingresa al menos alguna hora (normal o extra).')
      return
    }
    if (normales + extras > 24) {
      notificar('error', 'Un día no puede superar 24 horas en total.')
      return
    }
    const duplicado = tareos.some(
      (t) =>
        String(t.personal_id) === String(personal_id) &&
        t.fecha === fecha &&
        String(t.tarea_id ?? '') === String(tarea_id ?? ''),
    )
    agregarItem('tareos', {
      fecha,
      personal_id: Number(personal_id),
      servicio_id: servicio.id,
      tarea_id: tarea_id ? Number(tarea_id) : null,
      horas_normales: normales,
      horas_extras: extras,
      tarifa_hora: Number(tarifa_hora),
      tarifa_extra: tarifa_extra === '' ? redondear2(Number(tarifa_hora) * 1.5) : Number(tarifa_extra),
      importe,
      estado: 'pendiente',
      observaciones: observaciones.trim() || null,
    })
    notificar(
      duplicado ? 'info' : 'exito',
      duplicado
        ? 'Tareo registrado, pero OJO: ya existe otro igual ese día (posible duplicado). Apruébalo solo si corresponde.'
        : `Tareo registrado por ${formatearMoneda(importe)}. Queda pendiente de aprobación.`,
    )
    reset()
  }

  return (
    <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Campo label="Fecha" error={errors.fecha?.message} htmlFor="tar-fecha">
          <Input id="tar-fecha" type="date" {...register('fecha', { required: 'Indica la fecha' })} />
        </Campo>
        <Campo
          label="Persona"
          error={errors.personal_id?.message}
          htmlFor="tar-persona"
          className="sm:col-span-2"
        >
          <CampoComboBox
            id="tar-persona"
            control={control}
            name="personal_id"
            rules={{ required: 'Selecciona a una persona' }}
            placeholder="Escribe para buscar…"
            opciones={elegibles.map((p) => ({
              valor: String(p.id),
              etiqueta: `${nombreCompleto(p)} — ${p.cargo}`,
            }))}
          />
        </Campo>
        <Campo label="Tarea (opcional)" error={errors.tarea_id?.message} htmlFor="tar-tarea">
          <CampoComboBox
            id="tar-tarea"
            control={control}
            name="tarea_id"
            placeholder="Sin tarea…"
            opciones={tareas.map((t) => ({ valor: String(t.id), etiqueta: t.nombre }))}
          />
        </Campo>
        <Campo label="Horas normales" error={errors.horas_normales?.message} htmlFor="tar-hn">
          <Input
            id="tar-hn"
            type="number"
            step="0.25"
            min="0"
            placeholder="8"
            {...register('horas_normales', { required: 'Ingresa las horas' })}
          />
        </Campo>
        <Campo label="Horas extras" error={errors.horas_extras?.message} htmlFor="tar-he">
          <Input id="tar-he" type="number" step="0.25" min="0" placeholder="0" {...register('horas_extras')} />
        </Campo>
        <Campo label="Tarifa hora (S/)" error={errors.tarifa_hora?.message} htmlFor="tar-th">
          <Input
            id="tar-th"
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register('tarifa_hora', { required: 'Ingresa la tarifa' })}
          />
        </Campo>
        <Campo
          label="Tarifa extra (S/)"
          error={errors.tarifa_extra?.message}
          htmlFor="tar-te"
          hint="Vacío = 1.5× la normal"
        >
          <Input id="tar-te" type="number" step="0.01" placeholder="—" {...register('tarifa_extra')} />
        </Campo>
        <Campo
          label="Observaciones"
          error={errors.observaciones?.message}
          htmlFor="tar-obs"
          className="sm:col-span-4"
        >
          <Input id="tar-obs" placeholder="Opcional" {...register('observaciones')} />
        </Campo>
      </div>
      {hn + he > 12 && (
        <p className="rounded-lg bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800">
          Jornada mayor a 12 horas: verifica que corresponda antes de aprobar.
        </p>
      )}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Importe: <span className="font-bold tabular-nums">{formatearMoneda(importe)}</span>
        </p>
        <Button type="submit">Registrar tareo</Button>
      </div>
    </form>
  )
}

export function PersonalServicio() {
  const { servicio } = useOutletContext()
  const { estado, agregarItem, actualizarItem, eliminarItem } = useData()
  const [aviso, setAviso] = useState(null)
  const [bajaDe, setBajaDe] = useState(null)
  const [fechaBaja, setFechaBaja] = useState('')
  const notificar = (tipo, mensaje) => setAviso({ tipo, mensaje })

  const personal = estado.personal
  const tareas = useMemo(
    () => (estado.tareas ?? []).filter((t) => t.servicio_id === servicio.id),
    [estado.tareas, servicio.id],
  )
  const registros = useMemo(
    () => (estado.registros_servicio ?? []).filter((r) => r.servicio_id === servicio.id),
    [estado.registros_servicio, servicio.id],
  )
  const asignaciones = useMemo(
    () => (estado.asignaciones ?? []).filter((a) => a.servicio_id === servicio.id),
    [estado.asignaciones, servicio.id],
  )
  const tareos = useMemo(
    () => (estado.tareos ?? []).filter((t) => t.servicio_id === servicio.id),
    [estado.tareos, servicio.id],
  )
  const [mesTareo, setMesTareo] = useState(new Date().toISOString().slice(0, 7))

  const proyeccion = useMemo(
    () => proyeccionAsignaciones(asignaciones, servicio, estado.registros_servicio),
    [asignaciones, servicio, estado.registros_servicio],
  )
  const mesActual = new Date().toISOString().slice(0, 7)
  const pendientes = proyeccion.porMes.filter((m) => m.estimado && m.mes <= mesActual && m.monto > 0)
  const asentados = proyeccion.porMes.filter((m) => !m.estimado)

  const personaDe = (id) => personal.find((p) => p.id === id)
  const asentadoPor = (asignacionId) =>
    registros.filter((r) => r.asignacion_id === asignacionId)

  // Asentar un mes: si hay tareo aprobado de la persona en el mes, el gasto
  // sale del tareo (agrupado por tarea); si no hay tareo, de la proyección
  // (prorrateado). Tareo pendiente bloquea a esa persona hasta aprobarlo.
  // No se puede asentar dos veces.
  const asentarMes = (mes) => {
    if (mesCerrado(mes, estado.cierres)) {
      notificar('error', `El mes ${formatearMes(mes)} está cerrado. Reábrelo con motivo para corregirlo.`)
      return
    }
    let creados = 0
    const bloqueados = []
    for (const a of asignaciones) {
      if (asentamientoDe(a.id, estado.registros_servicio, mes)) continue
      const tareoMes = tareos.filter(
        (t) =>
          t.personal_id === a.personal_id &&
          t.servicio_id === servicio.id &&
          t.fecha?.slice(0, 7) === mes,
      )
      const pendientes = tareoMes.filter((t) => t.estado !== 'aprobado')
      if (pendientes.length > 0) {
        const nombre = personaDe(a.personal_id)
          ? nombreCompleto(personaDe(a.personal_id))
          : `ID ${a.personal_id}`
        bloqueados.push(nombre)
        continue
      }
      if (tareoMes.length > 0) {
        const porTarea = new Map()
        for (const t of tareoMes) {
          const clave = t.tarea_id ?? 'x'
          if (!porTarea.has(clave)) porTarea.set(clave, { tarea_id: t.tarea_id ?? null, horas: 0, monto: 0 })
          const g = porTarea.get(clave)
          g.horas += Number(t.horas_normales) + Number(t.horas_extras)
          g.monto += Number(t.horas_normales) * Number(t.tarifa_hora) + Number(t.horas_extras) * Number(t.tarifa_extra)
        }
        for (const g of porTarea.values()) {
          agregarItem('registros_servicio', {
            servicio_id: servicio.id,
            tipo_registro: 'personal',
            modalidad: 'mensual',
            referencia_id: a.personal_id,
            tarea_id: g.tarea_id,
            asignacion_id: a.id,
            cantidad_o_horas: redondear2(g.horas),
            monto_calculado: redondear2(g.monto),
            fecha: ultimoDiaMes(mes),
          })
          creados += 1
        }
        continue
      }
      const { monto, horas } = costoMensualAsignacion(a, mes, servicio)
      if (monto <= 0) continue
      agregarItem('registros_servicio', {
        servicio_id: servicio.id,
        tipo_registro: 'personal',
        modalidad: 'mensual',
        referencia_id: a.personal_id,
        tarea_id: a.tarea_id,
        asignacion_id: a.id,
        cantidad_o_horas: horas,
        monto_calculado: redondearMonto(monto),
        fecha: ultimoDiaMes(mes),
      })
      creados += 1
    }
    notificar(
      creados > 0 ? 'exito' : 'info',
      `Mes ${formatearMes(mes)} asentado: ${creados} registro(s).` +
        (bloqueados.length > 0
          ? ` Pendiente de aprobar tareo: ${[...new Set(bloqueados)].join(', ')}.`
          : ' Resta del presupuesto.'),
    )
  }

  const desasentarMes = (mes) => {
    if (mesCerrado(mes, estado.cierres)) {
      notificar('error', `El mes ${formatearMes(mes)} está cerrado. Reábrelo con motivo para corregirlo.`)
      return
    }
    const ids = registros
      .filter((r) => r.asignacion_id != null && r.fecha?.slice(0, 7) === mes)
      .map((r) => r.id)
    ids.forEach((id) => eliminarItem('registros_servicio', id))
    notificar('info', `Asentamiento de ${formatearMes(mes)} eliminado (${ids.length} registro(s)).`)
  }

  const confirmarBaja = () => {
    if (!fechaBaja) {
      notificar('error', 'Indica el último día trabajado.')
      return
    }
    if (fechaBaja < bajaDe.fecha_inicio) {
      notificar('error', 'La baja no puede ser anterior al inicio.')
      return
    }
    actualizarItem('asignaciones', { id: bajaDe.id, fecha_fin: fechaBaja })
    notificar('exito', 'Baja registrada: ya no genera gasto futuro. Lo asentado se conserva.')
    setBajaDe(null)
    setFechaBaja('')
  }

  const reactivar = (asignacion) => {
    actualizarItem('asignaciones', { id: asignacion.id, fecha_fin: null })
    notificar('exito', 'Asignación reactivada (vigente).')
  }

  const eliminarAsignacion = (asignacion) => {
    if (asentadoPor(asignacion.id).length > 0) {
      notificar('error', 'Tiene meses asentados: dale de baja en vez de eliminar. Lo gastado no se quita.')
      return
    }
    eliminarItem('asignaciones', asignacion.id)
    notificar('info', 'Asignación eliminada (no tenía gasto asentado).')
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">Gastado en personal</p>
          <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
            {formatearMoneda(proyeccion.gastado)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Meses asentados: resta del presupuesto</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Proyectado restante</p>
          <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
            {formatearMoneda(proyeccion.proyectado)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Meses por asentar hasta fin de obra</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Total inicio-fin</p>
          <p className="mt-1 text-xl font-bold text-red-600 tabular-nums">
            {formatearMoneda(proyeccion.total)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Baja si alguien renuncia (quitan sus meses futuros)</p>
        </Card>
      </div>

      <Card
        titulo="Asignar personal"
        descripcion="Quién trabaja en la obra, con qué pago y desde cuándo. El gasto nace al asentar cada mes."
      >
        <FormularioAsignacion
          servicio={servicio}
          personal={personal}
          tareas={tareas}
          notificar={notificar}
        />
      </Card>

      <Card
        titulo="Asignaciones"
        descripcion="Vigentes generan gasto futuro; de baja solo conservan lo asentado."
      >
        <Table>
          <TableHead>
            <TableRow>
              <Th>Persona</Th>
              <Th>Tarea</Th>
              <Th>Vigencia</Th>
              <Th alinear="right">Mensual est.</Th>
              <Th alinear="right">Gastado</Th>
              <Th alinear="right">Acciones</Th>
            </TableRow>
          </TableHead>
          <TableBody>
            {asignaciones.length === 0 ? (
              <TableEmpty colSpan={6} mensaje="Aún no hay personal asignado a este servicio." />
            ) : (
              asignaciones.map((a) => {
                const persona = personaDe(a.personal_id)
                const vigente = !a.fecha_fin
                const mensual = vigente
                  ? costoMensualAsignacion(a, mesActual, servicio).monto
                  : 0
                const gastado = asentadoPor(a.id).reduce(
                  (s, r) => s + (Number(r.monto_calculado) || 0),
                  0,
                )
                return (
                  <TableRow key={a.id}>
                    <Td>
                      <span className="font-medium text-slate-900">
                        {persona ? nombreCompleto(persona) : 'Personal eliminado'}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {persona?.cargo ?? ''} · {formatearMoneda(a.tarifa)}/h ·{' '}
                        {formatearCantidad(a.horas_por_dia)} h/día
                      </span>
                    </Td>
                    <Td className="text-slate-600">{nombreTarea(tareas, a.tarea_id)}</Td>
                    <Td>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                          vigente
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                            : 'bg-slate-100 text-slate-600 ring-slate-200'
                        }`}
                      >
                        {vigente ? 'Vigente' : 'De baja'}
                      </span>
                      <span className="block text-xs whitespace-nowrap text-slate-500">
                        {formatearFecha(a.fecha_inicio)} →{' '}
                        {a.fecha_fin ? formatearFecha(a.fecha_fin) : 'fin de obra'}
                      </span>
                    </Td>
                    <Td alinear="right" className="tabular-nums">
                      {vigente ? formatearMoneda(mensual) : '—'}
                    </Td>
                    <Td alinear="right" className="tabular-nums">
                      {formatearMoneda(gastado)}
                    </Td>
                    <Td alinear="right">
                      <span className="inline-flex gap-1.5">
                        {vigente ? (
                          <Button
                            variante="secundario"
                            tamano="sm"
                            onClick={() => {
                              setBajaDe(a)
                              setFechaBaja(new Date().toISOString().slice(0, 10))
                            }}
                          >
                            Dar de baja
                          </Button>
                        ) : (
                          <Button variante="secundario" tamano="sm" onClick={() => reactivar(a)}>
                            Reactivar
                          </Button>
                        )}
                        <Button variante="peligro" tamano="sm" onClick={() => eliminarAsignacion(a)}>
                          Eliminar
                        </Button>
                      </span>
                    </Td>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <Card
        titulo="Tareo diario"
        descripcion="Horas normales y extras por persona y día. Solo lo aprobado alimenta el asentamiento."
      >
        <FormularioTareo
          servicio={servicio}
          personal={personal}
          tareas={tareas}
          tareos={tareos}
          notificar={notificar}
        />

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Campo label="Mes" htmlFor="tar-mes">
            <Input
              id="tar-mes"
              type="month"
              value={mesTareo}
              onChange={(e) => setMesTareo(e.target.value)}
            />
          </Campo>
          {(() => {
            const lista = tareos
              .filter((t) => t.fecha?.slice(0, 7) === mesTareo)
              .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id)
            const aprobados = lista.filter((t) => t.estado === 'aprobado')
            const hn = aprobados.reduce((s, t) => s + Number(t.horas_normales), 0)
            const he = aprobados.reduce((s, t) => s + Number(t.horas_extras), 0)
            const costo = aprobados.reduce((s, t) => s + Number(t.importe), 0)
            const pendientesTar = lista.filter((t) => t.estado !== 'aprobado').length
            return (
              <p className="text-sm text-slate-600">
                <span className="font-semibold tabular-nums">
                  {formatearCantidad(hn + he)} h.h.
                </span>{' '}
                ({formatearCantidad(hn)} normales + {formatearCantidad(he)} extras) ·{' '}
                <span className="font-semibold tabular-nums">{formatearMoneda(costo)}</span>
                {pendientesTar > 0 && (
                  <span className="ml-2 font-medium text-amber-700">
                    · {pendientesTar} por aprobar
                  </span>
                )}
              </p>
            )
          })()}
        </div>

        <Table>
          <TableHead>
            <TableRow>
              <Th>Fecha</Th>
              <Th>Persona</Th>
              <Th alinear="right">HN / HE</Th>
              <Th alinear="right">Importe</Th>
              <Th alinear="right">Estado</Th>
              <Th alinear="right">Acciones</Th>
            </TableRow>
          </TableHead>
          <TableBody>
            {tareos.filter((t) => t.fecha?.slice(0, 7) === mesTareo).length === 0 ? (
              <TableEmpty colSpan={6} mensaje="Sin tareo este mes." />
            ) : (
              tareos
                .filter((t) => t.fecha?.slice(0, 7) === mesTareo)
                .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id)
                .map((t) => {
                  const persona = personaDe(t.personal_id)
                  const aprobado = t.estado === 'aprobado'
                  return (
                    <TableRow key={t.id}>
                      <Td className="whitespace-nowrap text-slate-500">
                        {formatearFecha(t.fecha)}
                      </Td>
                      <Td>
                        <span className="font-medium text-slate-900">
                          {persona ? nombreCompleto(persona) : 'Personal eliminado'}
                        </span>
                        {t.tarea_id != null && (
                          <span className="block text-xs text-slate-500">
                            ↳ {nombreTarea(tareas, t.tarea_id)}
                          </span>
                        )}
                      </Td>
                      <Td alinear="right" className="tabular-nums">
                        {formatearCantidad(t.horas_normales)} / {formatearCantidad(t.horas_extras)}
                      </Td>
                      <Td alinear="right" className="tabular-nums">
                        {formatearMoneda(t.importe)}
                      </Td>
                      <Td alinear="right">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                            aprobado
                              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                              : 'bg-amber-50 text-amber-700 ring-amber-200'
                          }`}
                        >
                          {aprobado ? 'Aprobado' : 'Pendiente'}
                        </span>
                      </Td>
                      <Td alinear="right">
                        <span className="inline-flex gap-1.5">
                          {!aprobado && (
                            <Button
                              tamano="sm"
                              onClick={() => {
                                actualizarItem('tareos', { id: t.id, estado: 'aprobado' })
                                notificar('exito', 'Tareo aprobado: alimentará el asentamiento.')
                              }}
                            >
                              Aprobar
                            </Button>
                          )}
                          {aprobado && (
                            <Button
                              variante="secundario"
                              tamano="sm"
                              onClick={() => {
                                actualizarItem('tareos', { id: t.id, estado: 'pendiente' })
                                notificar('info', 'Tareo devuelto a pendiente.')
                              }}
                            >
                              Revertir
                            </Button>
                          )}
                          <Button
                            variante="peligro"
                            tamano="sm"
                            onClick={() => {
                              eliminarItem('tareos', t.id)
                              notificar('info', 'Tareo eliminado.')
                            }}
                          >
                            Eliminar
                          </Button>
                        </span>
                      </Td>
                    </TableRow>
                  )
                })
            )}
          </TableBody>
        </Table>
      </Card>

      <Card
        titulo="Asentar mes"
        descripcion="Cada mes pendiente genera registros por persona vigente y resta del presupuesto. Con tareo aprobado, el gasto sale del tareo; si no hay tareo, de la proyección."
      >
        {pendientes.length === 0 ? (
          <p className="text-sm text-slate-400">
            Sin meses pendientes: todo lo vigente hasta hoy está asentado.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {pendientes.map((m) => (
              <li
                key={m.mes}
                className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"
              >
                <span className="text-slate-700">
                  <span className="font-medium capitalize">{formatearMes(m.mes)}</span> ·{' '}
                  <span className="tabular-nums">{formatearMoneda(m.monto)}</span>
                </span>
                <Button tamano="sm" onClick={() => asentarMes(m.mes)}>
                  Asentar
                </Button>
              </li>
            ))}
          </ul>
        )}

        {asentados.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-slate-700">Meses asentados</p>
            <ul className="space-y-1.5">
              {asentados.map((m) => (
                <li
                  key={m.mes}
                  className="flex items-center justify-between gap-3 rounded-lg bg-green-50 px-3 py-2 text-sm"
                >
                  <span className="text-slate-700">
                    <span className="font-medium capitalize">{formatearMes(m.mes)}</span> ·{' '}
                    <span className="tabular-nums">{formatearMoneda(m.monto)}</span>
                  </span>
                  <Button variante="secundario" tamano="sm" onClick={() => desasentarMes(m.mes)}>
                    Desasentar
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {bajaDe && (
        <Modal
          abierto
          ancho="sm"
          titulo="Dar de baja"
          descripcion={`${personaDe(bajaDe.personal_id) ? nombreCompleto(personaDe(bajaDe.personal_id)) : 'Esta persona'} dejará de generar gasto desde esa fecha. Lo asentado se conserva.`}
          onCerrar={() => setBajaDe(null)}
          pie={
            <>
              <Button variante="secundario" onClick={() => setBajaDe(null)}>
                Cancelar
              </Button>
              <Button variante="peligro" onClick={confirmarBaja}>
                Confirmar baja
              </Button>
            </>
          }
        >
          <Campo label="Último día trabajado" htmlFor="baja-fecha">
            <Input
              id="baja-fecha"
              type="date"
              value={fechaBaja}
              onChange={(e) => setFechaBaja(e.target.value)}
            />
          </Campo>
        </Modal>
      )}

      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />
    </div>
  )
}
