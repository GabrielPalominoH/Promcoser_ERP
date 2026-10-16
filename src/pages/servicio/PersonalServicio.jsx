import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useData } from '../../context/useData'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Campo, Input } from '../../components/ui/Field'
import { CampoMonto, reglasMontoMayorACero } from '../../components/ui/Monto'
import { CampoComboBox, normalizar } from '../../components/ui/ComboBox'
import {
  Buscador,
  BarraFiltros,
  SelectFiltro,
  textoCoincide,
} from '../../components/ui/FiltroBusqueda'
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
} from '../../utils/formatters'
import {
  costoMensualAsignacion,
  diferenciaPersonalAuto,
  mesHoy,
  proyeccionAsignaciones,
} from '../../utils/calculadora'
import { personalAsignable } from '../../utils/personal'

function nombreCompleto(item) {
  return `${item.nombre} ${item.apellido ?? ''}`.trim()
}

function nombreTarea(tareas, id) {
  return tareas.find((t) => t.id === id)?.nombre ?? '—'
}

// Asignar personal al servicio: persona + pago + vigencia. El gasto se
// genera solo con la asignación (costo directo automático, sin tareo ni
// botón de asentar). Se abre en un modal, igual que "Registrar ingreso".
// Confirmación de baja de personal con fecha de último día trabajado.
// Extraída para poder montarla abierta en pruebas; el contenido es el mismo
// del bloque inline.
export function ModalDarDeBaja({ descripcion, fecha, onCambiarFecha, onCerrar, onConfirmar }) {
  return (
    <Modal
      abierto
      ancho="sm"
      titulo="Dar de baja"
      descripcion={descripcion}
      onCerrar={onCerrar}
      pie={
        <>
          <Button variante="secundario" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button variante="peligro" onClick={onConfirmar}>
            Confirmar baja
          </Button>
        </>
      }
    >
      <Campo label="Último día trabajado" htmlFor="baja-fecha">
        <Input
          id="baja-fecha"
          type="date"
          value={fecha}
          onChange={(e) => onCambiarFecha(e.target.value)}
        />
      </Campo>
    </Modal>
  )
}

export function ModalAsignacion({ servicio, personal, tareas, notificar, onCerrar }) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    setError,
    formState: { errors },
  } = useForm({
    defaultValues: {
      personal_id: '',
      tarea_id: '',
      horas: 8,
      tarifa: '',
      fecha_inicio: servicio.fecha_inicio || '',
      fecha_fin: '',
    },
  })
  const { agregarItem, estado } = useData()
  const personalId = watch('personal_id')

  useEffect(() => {
    const ficha = personal.find((p) => String(p.id) === String(personalId))
    if (ficha && Number(ficha.tarifa_por_hora) > 0) {
      setValue('tarifa', ficha.tarifa_por_hora)
    }
  }, [personalId, personal, setValue])

  const enviar = ({ personal_id, tarea_id, horas, tarifa, fecha_inicio, fecha_fin }) => {
    if (fecha_fin && fecha_fin < fecha_inicio) {
      setError('fecha_fin', { message: 'No puede ser anterior al inicio.' })
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
        ? 'Personal asignado. Ojo: ya está vigente en otro servicio en ese periodo (horas compartidas, no duplicadas: cada servicio calcula lo suyo).'
        : 'Personal asignado. El costo se genera automáticamente cada mes.',
    )
    reset()
    onCerrar()
  }

  return (
    <Modal
      abierto
      titulo="Asignar personal"
      descripcion="Quién trabaja en la obra, con qué pago y desde cuándo. El costo se genera automáticamente cada mes."
      onCerrar={onCerrar}
      pie={
        <>
          <Button variante="secundario" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit(enviar)}>Asignar personal</Button>
        </>
      }
    >
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
            opciones={personal.map((p) => ({
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
          <CampoMonto
            id="asi-tarifa"
            control={control}
            name="tarifa"
            placeholder="0.00"
            rules={reglasMontoMayorACero('Ingresa la tarifa')}
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
      </form>
    </Modal>
  )
}

export function PersonalServicio() {
  const { servicio } = useOutletContext()
  const { estado, agregarItem, actualizarItem, eliminarItem } = useData()
  const [aviso, setAviso] = useState(null)
  const [bajaDe, setBajaDe] = useState(null)
  const [fechaBaja, setFechaBaja] = useState('')
  const [busquedaAsig, setBusquedaAsig] = useState('')
  const [filtroVigencia, setFiltroVigencia] = useState('todas')
  const [busquedaCosto, setBusquedaCosto] = useState('')
  const [filtroCosto, setFiltroCosto] = useState('todo')
  const [mostrarAsignacion, setMostrarAsignacion] = useState(false)
  const notificar = (tipo, mensaje) => setAviso({ tipo, mensaje })

  const personal = estado.personal
  // Personal de Obra disponible para asignar: se excluye el de Oficina (no va a
  // obra) y el desactivado (no se ofrece para asignaciones nuevas; lo ya
  // devengado se conserva).
  const personalDeObra = useMemo(
    () => personal.filter((p) => (p.ambito ?? 'Obra') === 'Obra'),
    [personal],
  )
  const personalElegible = useMemo(
    () => personalAsignable(personal, 'Obra'),
    [personal],
  )
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
  const hoyMes = mesHoy()

  const proyeccion = useMemo(
    () => proyeccionAsignaciones(asignaciones, servicio, estado.registros_servicio),
    [asignaciones, servicio, estado.registros_servicio],
  )
  const devengados = proyeccion.porMes.filter((m) => !m.estimado)
  const proyectados = proyeccion.porMes.filter((m) => m.estimado && m.monto > 0)

  // Sincronización automática (Opción A): mantiene los registros mensuales de
  // personal al día con las asignaciones. Crea faltantes, corrige cambios de
  // tarifa/tarea/horas y limpia futuros obsoletos o de asignaciones
  // eliminadas. Sin botones ni tareo.
  const sincronizando = useRef(false)
  useEffect(() => {
    if (sincronizando.current) return
    const { porCrear, porActualizar, idsPorEliminar } = diferenciaPersonalAuto(
      asignaciones,
      servicio,
      estado.registros_servicio,
      hoyMes,
    )
    if (porCrear.length === 0 && porActualizar.length === 0 && idsPorEliminar.length === 0) return
    sincronizando.current = true
    try {
      porCrear.forEach((item) => agregarItem('registros_servicio', item))
      porActualizar.forEach((item) => actualizarItem('registros_servicio', item))
      idsPorEliminar.forEach((id) => eliminarItem('registros_servicio', id))
    } finally {
      sincronizando.current = false
    }
  }, [asignaciones, servicio, estado.registros_servicio, hoyMes, agregarItem, actualizarItem, eliminarItem])

  const personaDe = (id) => personal.find((p) => p.id === id)
  const devengadoPor = (asignacionId) =>
    registros.filter((r) => r.asignacion_id === asignacionId)

  // Filtro de la tabla de asignaciones: texto (persona, cargo, tarea) y
  // vigencia (vigente / de baja).
  const terminoAsig = normalizar(busquedaAsig).trim()
  const asignacionesFiltradas = asignaciones.filter((a) => {
    if (filtroVigencia === 'vigente' && a.fecha_fin) return false
    if (filtroVigencia === 'baja' && !a.fecha_fin) return false
    if (!terminoAsig) return true
    const persona = personaDe(a.personal_id)
    const haystack = [
      persona ? nombreCompleto(persona) : '',
      persona?.cargo ?? '',
      nombreTarea(tareas, a.tarea_id),
    ].join(' ')
    return textoCoincide(haystack, terminoAsig)
  })
  const hayFiltroAsig = terminoAsig !== '' || filtroVigencia !== 'todas'

  // Filtro del detalle mensual: texto (mes) y tipo (pagado / proyectado).
  const terminoCosto = normalizar(busquedaCosto).trim()
  const coincideCosto = (m) => textoCoincide(formatearMes(m.mes), terminoCosto)
  const devengadosFiltrados =
    filtroCosto === 'proyectado' ? [] : devengados.filter(coincideCosto)
  const proyectadosFiltrados =
    filtroCosto === 'pagado' ? [] : proyectados.filter(coincideCosto)
  const hayFiltroCosto = terminoCosto !== '' || filtroCosto !== 'todo'
  const costosVisibles = devengadosFiltrados.length + proyectadosFiltrados.length

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
    notificar('exito', 'Baja registrada: ya no genera gasto futuro. Lo devengado se conserva.')
    setBajaDe(null)
    setFechaBaja('')
  }

  const reactivar = (asignacion) => {
    actualizarItem('asignaciones', { id: asignacion.id, fecha_fin: null })
    notificar('exito', 'Asignación reactivada (vigente).')
  }

  const eliminarAsignacion = (asignacion) => {
    eliminarItem('asignaciones', asignacion.id)
    notificar('info', 'Asignación eliminada con sus meses automáticos.')
  }


  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">Gastado en personal</p>
          <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
            {formatearMoneda(proyeccion.gastado)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Pago automático: suma al gastado</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Proyectado restante</p>
          <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
            {formatearMoneda(proyeccion.proyectado)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Pago futuro hasta fin de obra</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Total inicio-fin</p>
          <p className="mt-1 text-xl font-bold text-red-600 tabular-nums">
            {formatearMoneda(proyeccion.total)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Lo pagado más lo proyectado hasta fin de obra</p>
        </Card>
      </div>

      <Card
        titulo="Asignaciones"
        descripcion="Vigentes generan costo automático; de baja solo conservan lo devengado."
        acciones={
          personalElegible.length > 0 ? (
            <Button tamano="sm" onClick={() => setMostrarAsignacion(true)}>
              Asignar personal
            </Button>
          ) : undefined
        }
      >
        {personalElegible.length === 0 && (
          <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {personalDeObra.length > 0 ? (
              <>
                Todo el personal de obra está{' '}
                <span className="font-medium">desactivado</span>.{' '}
                <Link to="/personal" className="font-medium underline">
                  Actívalo en Personal
                </Link>{' '}
                para poder asignarlo a este servicio.
              </>
            ) : (
              <>
                Todavía no hay personal registrado.{' '}
                <Link to="/personal" className="font-medium underline">
                  Registra personal
                </Link>{' '}
                para poder asignarlo a este servicio.
              </>
            )}
          </p>
        )}
        {asignaciones.length > 0 && (
          <BarraFiltros
            contador={
              hayFiltroAsig ? (
                <>
                  <span className="font-semibold text-slate-700">{asignacionesFiltradas.length}</span> de{' '}
                  {asignaciones.length}
                </>
              ) : null
            }
          >
            <Buscador
              valor={busquedaAsig}
              onChange={setBusquedaAsig}
              placeholder="Buscar por persona, cargo o tarea…"
              ariaLabel="Buscar asignaciones"
            />
            <SelectFiltro label="Filtrar por vigencia" value={filtroVigencia} onChange={setFiltroVigencia}>
              <option value="todas">Todas</option>
              <option value="vigente">Vigentes</option>
              <option value="baja">De baja</option>
            </SelectFiltro>
          </BarraFiltros>
        )}
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
            ) : asignacionesFiltradas.length === 0 ? (
              <TableEmpty colSpan={6} mensaje="Ninguna asignación coincide con el filtro." />
            ) : (
              asignacionesFiltradas.map((a) => {
                const persona = personaDe(a.personal_id)
                const vigente = !a.fecha_fin
                const mensual = vigente
                  ? costoMensualAsignacion(a, hoyMes, servicio).monto
                  : 0
                const gastado = devengadoPor(a.id).reduce(
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
        titulo="Costo mensual automático"
        descripcion="Pagado hasta hoy y proyectado a fin de obra. Sin tareo ni botones: se recalcula solo con las asignaciones."
      >
        {devengados.length === 0 && proyectados.length === 0 ? (
          <p className="text-sm text-slate-400">
            Sin costo de personal: asigna personal para generar el costo mensual.
          </p>
        ) : (
          <>
            <BarraFiltros
              contador={
                hayFiltroCosto ? (
                  <>
                    <span className="font-semibold text-slate-700">{costosVisibles}</span> de{' '}
                    {devengados.length + proyectados.length}
                  </>
                ) : null
              }
            >
              <Buscador
                valor={busquedaCosto}
                onChange={setBusquedaCosto}
                placeholder="Buscar por mes…"
                ariaLabel="Buscar meses de costo"
              />
              <SelectFiltro label="Filtrar por estado" value={filtroCosto} onChange={setFiltroCosto}>
                <option value="todo">Pagado y proyectado</option>
                <option value="pagado">Solo pagado</option>
                <option value="proyectado">Solo proyectado</option>
              </SelectFiltro>
            </BarraFiltros>
            {costosVisibles === 0 ? (
              <p className="text-sm text-slate-400">Ningún mes coincide con el filtro.</p>
            ) : (
              <ul className="space-y-1.5">
                {devengadosFiltrados.map((m) => (
                  <li
                    key={m.mes}
                    className="flex items-center justify-between gap-3 rounded-lg bg-green-50 px-3 py-2 text-sm"
                  >
                    <span className="text-slate-700">
                      <span className="font-medium capitalize">{formatearMes(m.mes)}</span> ·{' '}
                      <span className="tabular-nums">{formatearMoneda(m.monto)}</span>
                    </span>
                    <span className="text-xs font-medium text-emerald-700">Pagado</span>
                  </li>
                ))}
                {proyectadosFiltrados.map((m) => (
                  <li
                    key={m.mes}
                    className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"
                  >
                    <span className="text-slate-700">
                      <span className="font-medium capitalize">{formatearMes(m.mes)}</span> ·{' '}
                      <span className="tabular-nums">{formatearMoneda(m.monto)}</span>
                    </span>
                    <span className="text-xs font-medium text-slate-500">Proyectado</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Card>

      {mostrarAsignacion && (
        <ModalAsignacion
          servicio={servicio}
          personal={personalElegible}
          tareas={tareas}
          notificar={notificar}
          onCerrar={() => setMostrarAsignacion(false)}
        />
      )}

      {bajaDe && (
        <ModalDarDeBaja
          descripcion={`${personaDe(bajaDe.personal_id) ? nombreCompleto(personaDe(bajaDe.personal_id)) : 'Esta persona'} dejará de generar costo desde esa fecha. Lo devengado se conserva.`}
          fecha={fechaBaja}
          onCambiarFecha={setFechaBaja}
          onCerrar={() => setBajaDe(null)}
          onConfirmar={confirmarBaja}
        />
      )}

      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />
    </div>
  )
}
