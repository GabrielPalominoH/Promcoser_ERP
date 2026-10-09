import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
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
import { formatearCantidad, formatearMes, formatearMoneda } from '../../utils/formatters'
import {
  avanceEfectivo,
  avanceMedido,
  avanceTareasPartida,
  costoPorPartida,
  costoPorTarea,
  costoSinPartida,
  partidasDeServicio,
  presupuestoPartida,
  tareasDePartida,
  valorizadoPartida,
} from '../../utils/calculadora'
import {
  fechaHoyISO,
  reglasNumeroMayorACero,
} from './compartido'

function FormularioValorizacion({ servicio, partidas, onGuardar }) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: { partida_id: '', mes: '', metrado_ejecutado: '' },
  })

  const enviar = ({ partida_id, mes, metrado_ejecutado }) => {
    onGuardar({
      servicio_id: servicio.id,
      partida_id: Number(partida_id),
      mes,
      metrado_ejecutado: Number(metrado_ejecutado),
    })
    reset()
  }

  if (partidas.length === 0) {
    return (
      <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Primero crea al menos una partida para poder valorizarla.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Campo
          label="Partida"
          error={errors.partida_id?.message}
          htmlFor="val-partida"
        >
          <CampoComboBox
            id="val-partida"
            control={control}
            name="partida_id"
            rules={{ required: 'Selecciona una partida' }}
            placeholder="Escribe para buscar…"
            opciones={partidas.map((p) => ({
              valor: String(p.id),
              etiqueta: `${p.nombre} (${formatearMoneda(presupuestoPartida(p))})`,
            }))}
          />
        </Campo>
        <Campo label="Mes" error={errors.mes?.message} htmlFor="val-mes">
          <Input
            id="val-mes"
            type="month"
            {...register('mes', { required: 'Indica el mes' })}
          />
        </Campo>
        <Campo
          label="Metrado ejecutado"
          error={errors.metrado_ejecutado?.message}
          htmlFor="val-metrado"
        >
          <Input
            id="val-metrado"
            type="number"
            step="0.01"
            placeholder="0"
            {...register('metrado_ejecutado', reglasNumeroMayorACero('Ingresa el metrado'))}
          />
        </Campo>
      </div>
      <div className="flex justify-end">
        <Button type="submit">Agregar valorización</Button>
      </div>
    </form>
  )
}

export function PartidasServicio() {
  const { servicio } = useOutletContext()
  // Tablero de solo lectura: las partidas se crean, editan y eliminan
  // desde el Cronograma, en sus tareas principales.
  const { estado, agregarItem, eliminarItem } = useData()
  const {
    partidas: todasPartidas,
    valorizaciones: todasValorizaciones,
    registros_servicio: todosRegistros,
    tareas: todasTareas,
  } = estado
  const tareasServicio = (todasTareas ?? []).filter((t) => t.servicio_id === servicio.id)

  const [aviso, setAviso] = useState(null)
  const [porEliminar, setPorEliminar] = useState(null)

  const partidas = partidasDeServicio(todasPartidas, servicio.id).sort((a, b) => a.id - b.id)
  const medido = avanceMedido(servicio.id, todasPartidas, todasValorizaciones)

  const guardarValorizacion = (datos) => {
    agregarItem('valorizaciones', datos)
    setAviso({ tipo: 'exito', mensaje: 'Valorización agregada.' })
  }

  const confirmarEliminar = () => {
    eliminarItem('valorizaciones', porEliminar.id)
    setAviso({ tipo: 'info', mensaje: 'Valorización eliminada.' })
    setPorEliminar(null)
  }

  // Avance en tiempo global: promedio de las tareas raíz del servicio.
  const tiempoGlobal = (() => {
    const raices = tareasServicio.filter((t) => t.padre_id == null)
    if (raices.length === 0) return null
    return (
      raices.reduce((s, t) => s + avanceEfectivo(t, tareasServicio), 0) /
      raices.length
    )
  })()

  const filas = partidas.map((p) => {
    const presupuesto = presupuestoPartida(p)
    const valorizado = valorizadoPartida(p, todasValorizaciones)
    const costo = costoPorPartida(todosRegistros, servicio.id, p.id, tareasServicio)
    const avance = presupuesto > 0 ? (valorizado / presupuesto) * 100 : 0
    const tareasVinculadas = tareasDePartida(p.id, tareasServicio)
    const avanceTareas = avanceTareasPartida(p.id, tareasServicio)
    // Si el avance en tiempo y en plata difieren mucho, algo no cuadra.
    const difieren =
      avanceTareas != null && Math.abs(avanceTareas - avance) >= 20
    return {
      partida: p,
      presupuesto,
      valorizado,
      avance,
      costo,
      margen: valorizado - costo,
      tareasVinculadas,
      avanceTareas,
      difieren,
    }
  })
  const sinPartida = costoSinPartida(todosRegistros, servicio.id)

  return (
    <div className="space-y-6">
      <Card
        titulo="Valorización mensual"
        descripcion="Metrado ejecutado por partida en cada mes."
      >
        <FormularioValorizacion
          servicio={servicio}
          partidas={partidas}
          onGuardar={guardarValorizacion}
        />
      </Card>

      <Card
        titulo="Avance medido y margen por partida"
        descripcion={
          medido
            ? `Valorizado ${formatearMoneda(medido.valorizado)} de ${formatearMoneda(medido.presupuestoPartidas)} (${medido.porcentaje.toFixed(1)}%)`
            : 'Sin partidas con presupuesto todavía.'
        }
      >
        <Table>
          <TableHead>
            <TableRow>
              <Th>Partida</Th>
              <Th alinear="right">Presupuesto</Th>
              <Th alinear="right">Valorizado</Th>
              <Th alinear="right">Avance</Th>
              <Th alinear="right">Tiempo</Th>
              <Th alinear="right">Costo</Th>
              <Th alinear="right">Margen</Th>
            </TableRow>
          </TableHead>
          <TableBody>
            {filas.length === 0 ? (
              <TableEmpty colSpan={7} mensaje="Aún no hay partidas registradas. Créalas en el Cronograma, en sus tareas principales." />
            ) : (
              filas.map(({ partida, presupuesto, valorizado, avance, costo, margen, tareasVinculadas, avanceTareas, difieren }) => {
                return (
                  <TableRow key={partida.id}>
                    <Td>
                      <span className="font-medium text-slate-900">{partida.nombre}</span>
                      <span className="block text-xs text-slate-500">
                        {formatearCantidad(partida.metrado)} {partida.unidad} × {formatearMoneda(partida.precio_unitario)}
                      </span>
                      {tareasVinculadas.length > 0 ? (
                        <span className="block text-xs text-slate-500">
                          {tareasVinculadas.length} {tareasVinculadas.length === 1 ? 'tarea' : 'tareas'} · tiempo {avanceTareas.toFixed(0)}%
                          {difieren && (
                            <span className="ml-1.5 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                              difiere de plata {avance.toFixed(0)}%
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="block text-xs text-slate-400">
                          Sin tareas vinculadas
                        </span>
                      )}
                      {tareasVinculadas.map((t) => (
                        <span key={t.id} className="block truncate text-xs text-slate-500">
                          • {t.nombre} — {avanceEfectivo(t, tareasServicio).toFixed(0)}% ·{' '}
                          <span className="tabular-nums">
                            {formatearMoneda(costoPorTarea(todosRegistros, servicio.id, t.id))}
                          </span>
                        </span>
                      ))}
                    </Td>
                    <Td alinear="right" className="tabular-nums">
                      {formatearMoneda(presupuesto)}
                    </Td>
                    <Td alinear="right" className="tabular-nums">
                      {formatearMoneda(valorizado)}
                    </Td>
                    <Td alinear="right" className="tabular-nums">
                      {avance.toFixed(1)}%
                    </Td>
                    <Td alinear="right" className="tabular-nums">
                      {avanceTareas != null ? `${avanceTareas.toFixed(0)}%` : '—'}
                    </Td>
                    <Td alinear="right" className="tabular-nums">
                      {formatearMoneda(costo)}
                    </Td>
                    <Td
                      alinear="right"
                      className={`font-semibold tabular-nums ${margen < 0 ? 'text-red-600' : 'text-slate-900'}`}
                    >
                      {formatearMoneda(margen)}
                    </Td>
                  </TableRow>
                )
              })
            )}

            {filas.length > 0 && (
              <TableRow className="bg-slate-50 font-semibold">
                <Td className="text-slate-600">
                  Total
                  {sinPartida > 0 && (
                    <span className="block text-xs font-normal">
                      + {formatearMoneda(sinPartida)} sin partida asignada
                    </span>
                  )}
                </Td>
                <Td alinear="right" className="tabular-nums">
                  {formatearMoneda(filas.reduce((s, f) => s + f.presupuesto, 0))}
                </Td>
                <Td alinear="right" className="tabular-nums">
                  {formatearMoneda(filas.reduce((s, f) => s + f.valorizado, 0))}
                </Td>
                <Td alinear="right" className="tabular-nums">
                  {medido ? `${medido.porcentaje.toFixed(1)}%` : '—'}
                </Td>
                <Td alinear="right" className="tabular-nums">
                  {tiempoGlobal != null ? `${tiempoGlobal.toFixed(0)}%` : '—'}
                </Td>
                <Td alinear="right" className="tabular-nums">
                  {formatearMoneda(filas.reduce((s, f) => s + f.costo, 0))}
                </Td>
                <Td alinear="right" className="tabular-nums">
                  {formatearMoneda(filas.reduce((s, f) => s + f.margen, 0))}
                </Td>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {todasValorizaciones.filter((v) => v.servicio_id === servicio.id).length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-sm font-medium text-slate-700">
              Valorizaciones registradas
            </p>
            <ul className="space-y-1.5">
              {[...todasValorizaciones]
                .filter((v) => v.servicio_id === servicio.id)
                .sort((a, b) => a.mes.localeCompare(b.mes) || a.id - b.id)
                .map((v) => {
                  const partida = partidas.find((p) => p.id === v.partida_id)
                  return (
                    <li
                      key={v.id}
                      className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 truncate text-slate-700">
                        {partida?.nombre ?? 'Partida eliminada'} ·{' '}
                        <span className="text-slate-500 capitalize">{formatearMes(v.mes)}</span> ·{' '}
                        <span className="tabular-nums">
                          {formatearCantidad(v.metrado_ejecutado)} {partida?.unidad ?? ''}
                        </span>
                      </span>
                      <Button
                        variante="peligro"
                        tamano="sm"
                        onClick={() => setPorEliminar({ tipo: 'valorizacion', id: v.id })}
                      >
                        Eliminar
                      </Button>
                    </li>
                  )
                })}
            </ul>
          </div>
        )}
      </Card>

      {porEliminar && (
        <Modal
          abierto
          ancho="sm"
          titulo="Eliminar valorización"
          descripcion="Esta acción no se puede deshacer."
          onCerrar={() => setPorEliminar(null)}
          pie={
            <>
              <Button variante="secundario" onClick={() => setPorEliminar(null)}>
                Cancelar
              </Button>
              <Button variante="peligro" onClick={confirmarEliminar}>
                Sí, eliminar
              </Button>
            </>
          }
        >
          <p className="text-sm text-slate-600">
            Se eliminará la valorización seleccionada.
          </p>
        </Modal>
      )}

      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />
    </div>
  )
}
