import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useData } from '../../context/useData'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Campo, Input, Select, Textarea } from '../../components/ui/Field'

import { Modal } from '../../components/ui/Modal'
import { Aviso } from '../../components/ui/Aviso'
import { Badge, BadgeModo } from '../../components/ui/Badge'
import { formatearCantidad, formatearFecha, formatearMoneda } from '../../utils/formatters'
import { avanceEfectivo, estadoTarea, hoyISO, metricasCronograma, nombreReferencia, sumarMontos } from '../../utils/calculadora'
import { programar, TIPOS_DEPENDENCIA } from '../../utils/cpm'
import {
  CALENDARIO_POR_DEFECTO,
  DIAS_SEMANA,
  calendarioDe,
  esLaborable,
  normalizarCalendario,
} from '../../utils/calendario'
import {
  SEMANAS_LOOKAHEAD,
  cambiosDeArrastre,
  conflictosDependencia,
  desviacionLineaBase,
  histogramaRecursosSemanal,
  resumenDesviacionLineaBase,
  ventanaLookahead,
} from '../../utils/cronograma'
import { CampoComboBox, normalizar } from '../../components/ui/ComboBox'
import {
  ETIQUETAS_CORTAS_MODO,
  MODOS_MEDICION,
  OPCIONES_MODO,
  ORIGEN_AVANCE,
  pasosQueReproducenAvance,
} from '../../utils/avance'
import { Buscador, textoCoincide } from '../../components/ui/FiltroBusqueda'
import { libroCronograma } from '../../utils/exportaciones'
import { descargarLibro } from '../../utils/descargas'
import { leerXLSX } from '../../utils/excel'
import {
  plantillaCronograma,
  tareasImportadas,
  diasTareaImportada,
} from '../../utils/importacion'
import { RedPERT } from './RedPERT'

// En SSR useLayoutEffect avisa; cae a useEffect en el servidor.
const usarLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

const DIA_MS = 86400000
const DIA_PX_MIN = 28
const ANCHO_ETIQUETA = 300

function parsearFecha(fechaISO) {
  const [anio, mes, dia] = fechaISO.split('-').map(Number)
  return new Date(anio, mes - 1, dia)
}

function diasEntre(aISO, bISO) {
  return Math.round((parsearFecha(bISO) - parsearFecha(aISO)) / DIA_MS)
}

function sumarMeses(fechaISO, n) {
  const fecha = parsearFecha(fechaISO)
  fecha.setMonth(fecha.getMonth() + n)
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mes}-${dia}`
}

// Fecha ISO (YYYY-MM-DD) de un objeto Date local.
function isoDe(fecha) {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mes}-${dia}`
}

const COLORES_BARRA = {
  completada: 'bg-emerald-600',
  atrasada: 'bg-red-700',
  'en curso': 'bg-blue-800',
  pendiente: 'bg-slate-500',
}

const COLORES_ETIQUETA = {
  completada: 'success',
  atrasada: 'danger',
  'en curso': 'info',
  pendiente: 'neutral',
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MESES_LARGO = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function etiquetaTrimestre(mesesGrupo) {
  const primero = mesesGrupo[0].fecha
  const ultimo = mesesGrupo[mesesGrupo.length - 1].fecha
  const mismoAnio = primero.getFullYear() === ultimo.getFullYear()
  const ini = `${MESES_LARGO[primero.getMonth()].slice(0, 3)}${mismoAnio ? '' : ` ${primero.getFullYear()}`}`
  return `${ini} - ${MESES_LARGO[ultimo.getMonth()].slice(0, 3)} ${ultimo.getFullYear()}`
}

function ModalTarea({ servicio, tarea, padre, costos, tieneHijos, avanceDerivado, candidatas = [], onCerrar, onGuardar, onEliminar }) {
  const enEdicion = Boolean(tarea)
  const [confirmando, setConfirmando] = useState(false)
  const esGrupo = enEdicion && tieneHijos
  const [predecesoras, setPredecesoras] = useState(() =>
    (tarea?.predecesoras ?? []).filter(Boolean).map((p) => ({ ...p })),
  )
  const [hito, setHito] = useState(() => tarea?.hito === true)
  // Pasos del modo `hitos` (se editan aquí; el avance sale de sus pesos).
  const [pasos, setPasos] = useState(() =>
    Array.isArray(tarea?.pasos) ? tarea.pasos.map((p) => ({ ...p })) : [],
  )
  const [errorPasos, setErrorPasos] = useState('')

  const {
    register,
    control,
    watch,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: tarea
      ? {
          nombre: tarea.nombre,
          fecha_inicio: tarea.fecha_inicio,
          fecha_fin: tarea.fecha_fin,
          avance: tarea.avance ?? 0,
          modo_medicion: MODOS_MEDICION.includes(tarea.modo_medicion) ? tarea.modo_medicion : 'metrado',
          nota_justificacion: tarea.nota_justificacion ?? '',
          metrado_previo: tarea.metrado_previo ?? '',
        }
      : {
          nombre: '',
          fecha_inicio: hoyISO(),
          fecha_fin: hoyISO(),
          avance: 0,
          modo_medicion: 'metrado',
          nota_justificacion: '',
          metrado_previo: '',
        },
    mode: 'onBlur',
  })

  // El modo elegido decide qué campos se piden (justificación en `manual`) y
  // de dónde se explicará que sale el avance.
  const modoActual = watch('modo_medicion') ?? 'metrado'

  const sumaPesosPasos = Math.round(
    (pasos.reduce((s, p) => s + (Number(p.peso) || 0), 0) + Number.EPSILON) * 100,
  ) / 100

  const agregarPaso = () => {
    setErrorPasos('')
    setPasos((lista) => [
      ...lista,
      { id: (lista.reduce((m, p) => Math.max(m, Number(p.id) || 0), 0) || 0) + 1, nombre: '', peso: 0, estado: 'pendiente', fecha_cumplimiento: null },
    ])
  }
  const quitarPaso = (i) => {
    setErrorPasos('')
    setPasos((lista) => lista.filter((_, j) => j !== i))
  }
  const cambiarPaso = (i, cambios) => {
    setErrorPasos('')
    setPasos((lista) => lista.map((p, j) => (j === i ? { ...p, ...cambios } : p)))
  }

  const enviar = (valores) => {
    const nombreTarea = valores.nombre.trim()
    const avance = esGrupo
      ? Number(tarea.avance) || 0
      : Math.min(100, Math.max(0, Number(valores.avance) || 0))
    const cambios = {
      id: tarea?.id,
      servicio_id: servicio.id,
      padre_id: tarea?.padre_id ?? padre?.id ?? null,
      monto: tarea?.monto ?? 0,
      nombre: nombreTarea,
      fecha_inicio: valores.fecha_inicio,
      fecha_fin: hito ? valores.fecha_inicio : valores.fecha_fin,
      hito,
      predecesoras: esGrupo
        ? []
        : predecesoras
            .filter((p) => p.id != null && p.id !== '')
            .map((p) => ({
              id: Number(p.id),
              tipo: p.tipo ?? 'FS',
              lag: Number(p.lag) || 0,
            })),
      // `avance` NO se envía aquí: fuera del modo manual es un valor derivado y
      // lo escribe `recalcularAvances` (única escritura, más el modo manual).
    }

    // El modo de medición solo aplica a las hojas. Al cambiar de modo se
    // conserva el avance: en `hitos` se generan pasos que lo reproducen, en
    // `metrado`/`costo` se fija el ejecutado previo equivalente. En `manual` la
    // justificación es obligatoria.
    if (!esGrupo) {
      const modo = MODOS_MEDICION.includes(valores.modo_medicion) ? valores.modo_medicion : 'metrado'
      const modoPrevio = MODOS_MEDICION.includes(tarea?.modo_medicion) ? tarea.modo_medicion : null
      const cambiaModo = enEdicion && modoPrevio !== modo
      cambios.modo_medicion = modo
      cambios.nota_justificacion = modo === 'manual' ? String(valores.nota_justificacion ?? '').trim() : ''

      // Única escritura directa del avance permitida: el modo `manual`.
      if (modo === 'manual') cambios.avance = avance

      if (modo === 'hitos') {
        const lista = pasos.length > 0 ? pasos : pasosQueReproducenAvance(avance)
        const suma = lista.reduce((s, p) => s + (Number(p.peso) || 0), 0)
        if (Math.abs(suma - 100) > 0.01) {
          setErrorPasos(`Los pasos deben sumar 100 % (ahora suman ${Math.round(suma * 100) / 100} %).`)
          return
        }
        cambios.pasos = lista
      } else if (modo === 'metrado') {
        const crudo = valores.metrado_previo
        if (crudo !== '' && crudo != null && Number.isFinite(Number(crudo))) {
          cambios.metrado_previo = Math.max(0, Number(crudo))
        } else if (cambiaModo) {
          const met = Number(tarea?.metrado) || 0
          cambios.metrado_previo = met > 0 ? Math.round((avance * met) / 100 * 100) / 100 : 0
        }
      } else if (modo === 'costo' && cambiaModo) {
        const base = Number(tarea?.monto) || 0
        const yaCosto = sumarMontos(costos)
        cambios.costo_previo = Math.max(0, Math.round((avance * base) / 100 * 100) / 100 - yaCosto)
      }
    }

    onGuardar(cambios)
  }

  const agregarPredecesora = () =>
    setPredecesoras((lista) => [...lista, { id: '', tipo: 'FS', lag: 0 }])
  const quitarPredecesora = (i) =>
    setPredecesoras((lista) => lista.filter((_, j) => j !== i))
  const cambiarPredecesora = (i, cambios) =>
    setPredecesoras((lista) => lista.map((p, j) => (j === i ? { ...p, ...cambios } : p)))

  const nombreCandidata = (id) =>
    candidatas.find((c) => c.id === Number(id))?.nombre ?? `Tarea ${id}`

  return (
    <Modal
      abierto
      ancho="md"
          titulo={confirmando ? 'Eliminar tarea' : enEdicion ? 'Editar tarea' : padre ? 'Nueva subtarea' : 'Nueva tarea'}
          descripcion={
            confirmando
              ? tieneHijos
                ? 'Se eliminará la tarea junto con sus subtareas. Esta acción no se puede deshacer.'
                : 'Esta acción no se puede deshacer.'
              : padre
                ? `Subtarea de «${padre.nombre}».`
                : 'Las tareas alimentan el cronograma del servicio.'
          }
      onCerrar={onCerrar}
      pie={
        confirmando ? (
          <>
            <Button variante="secundario" onClick={() => setConfirmando(false)}>
              Cancelar
            </Button>
            <Button variante="peligro" onClick={() => onEliminar(tarea)}>
              Sí, eliminar
            </Button>
          </>
        ) : (
          <>
            {enEdicion && (
              <Button variante="peligro" onClick={() => setConfirmando(true)}>
                Eliminar
              </Button>
            )}
            <span className="flex-1" />
            <Button variante="secundario" onClick={onCerrar}>
              Cancelar
            </Button>
            <Button type="submit" form="form-tarea">
              {enEdicion ? 'Guardar cambios' : 'Agregar tarea'}
            </Button>
          </>
        )
      }
    >
      {confirmando ? (
          <p className="text-sm text-slate-600">
            Se eliminará la tarea{' '}
            <span className="font-semibold text-slate-900">{tarea.nombre}</span>{' '}
            del cronograma. Sus costos asignados se conservan como “sin tarea”.
          </p>
      ) : (
        <form id="form-tarea" onSubmit={handleSubmit(enviar)} noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Campo
              label="Nombre de la tarea"
              error={errors.nombre?.message}
              htmlFor="tarea-nombre"
              className="sm:col-span-3"
            >
              <Input
                id="tarea-nombre"
                placeholder="Ej. Albañilería y tarrajeo"
                {...register('nombre', { required: 'Ingresa el nombre de la tarea' })}
              />
            </Campo>
            <Campo label="Inicio" error={errors.fecha_inicio?.message} htmlFor="tarea-inicio">
              <Input
                id="tarea-inicio"
                type="date"
                min={padre?.fecha_inicio}
                max={padre?.fecha_fin}
                {...register('fecha_inicio', {
                  required: 'Indica el inicio',
                  validate: (valor) =>
                    padre && valor < padre.fecha_inicio
                      ? `No puede empezar antes que la tarea padre (${formatearFecha(padre.fecha_inicio)})`
                      : true,
                })}
              />
            </Campo>
            <Campo label="Fin" error={errors.fecha_fin?.message} htmlFor="tarea-fin" className={hito ? 'hidden' : undefined}>
              <Input
                id="tarea-fin"
                type="date"
                min={padre?.fecha_inicio}
                max={padre?.fecha_fin}
                disabled={hito}
                {...register('fecha_fin', {
                  required: hito ? false : 'Indica el fin',
                  validate: (valor) => {
                    if (hito) return true
                    if (valor < getValues('fecha_inicio')) {
                      return 'El fin no puede ser anterior al inicio'
                    }
                    if (padre && valor > padre.fecha_fin) {
                      return `No puede exceder el fin de la tarea padre (${formatearFecha(padre.fecha_fin)})`
                    }
                    return true
                  },
                })}
              />
            </Campo>
            {esGrupo ? (
              <Campo label="Avance (%)" htmlFor="tarea-avance-grupo">
                <div
                  id="tarea-avance-grupo"
                  className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-800 tabular-nums"
                >
                  {avanceDerivado ?? 0}% · calculado de sus subtareas
                </div>
              </Campo>
            ) : (
              <Campo
                label="Avance (%)"
                error={errors.avance?.message}
                hint={
                  modoActual === 'manual'
                    ? 'Avance fijado a mano: obligatorio justificar el dato.'
                    : `${ORIGEN_AVANCE[modoActual]} (se calcula solo).`
                }
                htmlFor="tarea-avance"
              >
                <Input
                  id="tarea-avance"
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  readOnly={modoActual !== 'manual'}
                  className={modoActual !== 'manual' ? 'cursor-not-allowed bg-slate-100' : undefined}
                  {...register('avance', {
                    valueAsNumber: true,
                    min: { value: 0, message: 'Mínimo: 0' },
                    max: { value: 100, message: 'Máximo: 100' },
                    // El campo no deja escribir fuera de 0–100: al pasar el
                    // límite se recorta solo (además de validar y recortar al guardar).
                    onChange: (e) => {
                      if (modoActual !== 'manual') return
                      const v = Number(e.target.value)
                      if (Number.isNaN(v)) return
                      if (v > 100) setValue('avance', 100, { shouldValidate: true })
                      else if (v < 0) setValue('avance', 0, { shouldValidate: true })
                    },
                  })}
                />
              </Campo>
            )}
            {!esGrupo && (
              <Campo
                label="Modo de medición"
                error={errors.modo_medicion?.message}
                hint="Cómo se mide el avance de esta partida."
                htmlFor="tarea-modo"
              >
                <CampoComboBox
                  control={control}
                  name="modo_medicion"
                  id="tarea-modo"
                  placeholder="Elegir modo…"
                  opciones={OPCIONES_MODO}
                  rules={{ required: 'Elige cómo se mide esta partida' }}
                />
              </Campo>
            )}
          </div>
          {!esGrupo && modoActual === 'metrado' && (
            <div className="mt-4">
              <Campo
                label="Ejecutado previo"
                error={errors.metrado_previo?.message}
                hint="Metrado ya ejecutado ANTES de registrar partes (en la unidad de la partida). El avance = (ejecutado previo + partes) ÷ metrado contratado."
                htmlFor="tarea-metrado-previo"
              >
                <Input
                  id="tarea-metrado-previo"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  {...register('metrado_previo', { valueAsNumber: true })}
                />
              </Campo>
            </div>
          )}
          {!esGrupo && modoActual === 'hitos' && (
            <div className="mt-4 rounded-lg border border-slate-200 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-700">
                  Pasos ·{' '}
                  <span className={sumaPesosPasos === 100 ? 'text-emerald-700' : 'text-amber-700'}>
                    {sumaPesosPasos} % de 100 %
                  </span>
                </p>
                <button
                  type="button"
                  onClick={agregarPaso}
                  className="rounded-md px-2 py-1 text-xs font-semibold text-primary-700 transition-colors hover:bg-primary-50"
                >
                  + Agregar paso
                </button>
              </div>
              {pasos.length === 0 ? (
                <p className="mt-1 text-xs text-slate-500">
                  Sin pasos todavía: al guardar se generan dos que reproducen el avance actual.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {pasos.map((paso, i) => (
                    <li key={paso.id ?? i} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
                      <Input
                        value={paso.nombre ?? ''}
                        onChange={(e) => cambiarPaso(i, { nombre: e.target.value })}
                        placeholder="Nombre del paso"
                        aria-label="Nombre del paso"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={paso.peso ?? 0}
                        onChange={(e) => cambiarPaso(i, { peso: Number(e.target.value) || 0 })}
                        aria-label="Peso del paso"
                        title="Peso del paso (los pesos suman 100)"
                        className="sm:w-24"
                      />
                      <label className="flex items-center gap-2 px-1 text-xs font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={paso.estado === 'cumplido'}
                          onChange={(e) =>
                            cambiarPaso(i, {
                              estado: e.target.checked ? 'cumplido' : 'pendiente',
                              fecha_cumplimiento: e.target.checked
                                ? paso.fecha_cumplimiento ?? hoyISO()
                                : null,
                            })
                          }
                          className="size-4 rounded border-slate-300 text-primary-600 focus:ring-primary-600"
                        />
                        Cumplido
                      </label>
                      <button
                        type="button"
                        onClick={() => quitarPaso(i)}
                        className="justify-self-end rounded-md px-2 py-1.5 text-sm font-bold text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        aria-label="Quitar paso"
                        title="Quitar"
                      >
                        ×
                      </button>
                      {paso.estado === 'cumplido' && (
                        <Input
                          type="date"
                          value={paso.fecha_cumplimiento ?? ''}
                          onChange={(e) => cambiarPaso(i, { fecha_cumplimiento: e.target.value || null })}
                          aria-label="Fecha de cumplimiento"
                          className="sm:col-span-4 sm:w-48"
                        />
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {errorPasos && <p className="mt-2 text-xs font-medium text-red-600">{errorPasos}</p>}
            </div>
          )}
          {!esGrupo && modoActual === 'manual' && (
            <div className="mt-4">
              <Campo
                label="Justificación del avance manual"
                error={errors.nota_justificacion?.message}
                hint="El modo manual es la excepción: explica de dónde sale el avance y quedará marcado en el cronograma."
                htmlFor="tarea-nota"
              >
                <Textarea
                  id="tarea-nota"
                  rows={2}
                  placeholder="Ej. Avance acordado con el supervisor en la visita del 12/07."
                  {...register('nota_justificacion', {
                    required: modoActual === 'manual' ? 'Justifica por qué el avance se fija a mano' : false,
                  })}
                />
              </Campo>
            </div>
          )}
          {!esGrupo && (
            <div className="mt-4 rounded-lg border border-slate-200 px-4 py-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={hito}
                  onChange={(e) => setHito(e.target.checked)}
                  className="size-4 rounded border-slate-300 text-primary-600 focus:ring-primary-600"
                />
                Hito (sin duración, sin recursos)
              </label>
              <div className="mt-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-700">Predecesoras</p>
                  <button
                    type="button"
                    onClick={agregarPredecesora}
                    disabled={candidatas.length === 0}
                    className="rounded-md px-2 py-1 text-xs font-semibold text-primary-700 transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    + Agregar
                  </button>
                </div>
                {predecesoras.length === 0 ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Sin dependencias: la tarea arranca en su fecha de inicio.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {predecesoras.map((p, i) => (
                      <li key={i} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
                        <Select
                          value={p.id ?? ''}
                          onChange={(e) => cambiarPredecesora(i, { id: e.target.value })}
                          aria-label="Tarea predecesora"
                        >
                          <option value="">Elegir tarea…</option>
                          {candidatas.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nombre}
                            </option>
                          ))}
                        </Select>
                        <Select
                          value={p.tipo ?? 'FS'}
                          onChange={(e) => cambiarPredecesora(i, { tipo: e.target.value })}
                          aria-label="Tipo de dependencia"
                          className="sm:w-40"
                        >
                          {TIPOS_DEPENDENCIA.map((tp) => (
                            <option key={tp.valor} value={tp.valor}>
                              {tp.etiqueta}
                            </option>
                          ))}
                        </Select>
                        <Input
                          type="number"
                          step="1"
                          value={p.lag ?? 0}
                          onChange={(e) => cambiarPredecesora(i, { lag: e.target.value })}
                          aria-label="Holgura en días laborables"
                          title="Holgura (lag) en días laborables"
                          className="sm:w-20"
                        />
                        <button
                          type="button"
                          onClick={() => quitarPredecesora(i)}
                          className="justify-self-end rounded-md px-2 py-1.5 text-sm font-bold text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          aria-label="Quitar predecesora"
                          title="Quitar"
                        >
                          ×
                        </button>
                        {p.id !== '' && p.id != null && (
                          <span className="text-[11px] text-slate-400 sm:col-span-4">
                            Después de «{nombreCandidata(p.id)}»
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
          {enEdicion && !confirmando && (
            <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3">
              <p className="text-sm font-medium text-slate-700">
                Costos asignados ({costos.length}) ·{' '}
                <span className="tabular-nums">{formatearMoneda(sumarMontos(costos))}</span>
              </p>
              {costos.length > 0 ? (
                <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto">
                  {costos.map((c) => (
                    <li key={c.id} className="flex justify-between gap-2 text-xs text-slate-600">
                      <span className="min-w-0 truncate">{c.texto}</span>
                      <span className="shrink-0 tabular-nums">{formatearMoneda(c.monto_calculado)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-xs text-slate-500">
                  Sin costos todavía. Se asignan desde Materiales, Personal,
                  Equipos o Gastos eligiendo esta tarea.
                </p>
              )}
            </div>
          )}
        </form>
      )}
    </Modal>
  )
}

// Calendario laboral de la obra: qué días de la semana se trabaja y cuáles son
// feriados. Define la duración en días laborables y, con ella, el cálculo CPM.
function ModalCalendario({ servicio, calendario, onCerrar, onGuardar }) {
  const base = normalizarCalendario(calendario)
  const [dias, setDias] = useState(base.dias_laborables)
  const [feriados, setFeriados] = useState(base.feriados)
  const [nuevo, setNuevo] = useState('')

  const alternarDia = (valor) =>
    setDias((previo) =>
      previo.includes(valor) ? previo.filter((d) => d !== valor) : [...previo, valor],
    )
  const añadirFeriado = () => {
    if (!nuevo || feriados.includes(nuevo)) return
    setFeriados((previo) => [...previo, nuevo].sort())
    setNuevo('')
  }
  const quitarFeriado = (fecha) =>
    setFeriados((previo) => previo.filter((f) => f !== fecha))

  const guardar = () => {
    if (dias.length === 0) return
    onGuardar({ dias_laborables: [...dias].sort(), feriados })
  }

  return (
    <Modal
      abierto
      ancho="md"
      titulo="Calendario laboral"
      descripcion={`Días trabajados de «${servicio.nombre_servicio}».`}
      onCerrar={onCerrar}
      pie={
        <>
          <Button variante="secundario" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={dias.length === 0}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Días laborables</p>
          <div className="flex flex-wrap gap-2">
            {DIAS_SEMANA.map((dia) => (
              <label
                key={dia.valor}
                className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  dias.includes(dia.valor)
                    ? 'border-primary-600 bg-primary-50 text-primary-800'
                    : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                }`}
              >
                <input
                  type="checkbox"
                  checked={dias.includes(dia.valor)}
                  onChange={() => alternarDia(dia.valor)}
                  className="size-4 rounded border-slate-300 text-primary-600 focus:ring-primary-600"
                />
                {dia.etiqueta}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Por defecto lunes a sábado. La duración de tareas y dependencias se mide en días
            laborables de este calendario.
          </p>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Feriados</p>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={nuevo}
              onChange={(e) => setNuevo(e.target.value)}
              aria-label="Fecha de feriado"
              className="w-auto"
            />
            <Button variante="secundario" tamano="sm" onClick={añadirFeriado} disabled={!nuevo}>
              Agregar
            </Button>
            <Button
              variante="secundario"
              tamano="sm"
              onClick={() => setFeriados([])}
              disabled={feriados.length === 0}
            >
              Limpiar
            </Button>
          </div>
          {feriados.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-2">
              {feriados.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 tabular-nums"
                >
                  {formatearFecha(f)}
                  <button
                    type="button"
                    onClick={() => quitarFeriado(f)}
                    className="font-bold text-slate-400 hover:text-red-600"
                    aria-label={`Quitar feriado ${f}`}
                    title="Quitar"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-slate-500">Sin feriados cargados.</p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setDias(CALENDARIO_POR_DEFECTO.dias_laborables)}
          className="text-xs font-semibold text-primary-700 hover:underline"
        >
          Restaurar lunes a sábado
        </button>
      </div>
    </Modal>
  )
}

// Flechas de dependencia (lógica del cronograma): unen el fin de la
// predecesora con el inicio de la sucesora con un codo y punta de flecha.
// Se apoyan en la geometría medida de las filas, así que no alteran el layout.
function FlechasDependencia({ filas, geometria, rango, diaVista, criticas }) {
  if (!rango || !filas?.length) return null

  const xFecha = (iso) =>
    ANCHO_ETIQUETA + ((parsearFecha(iso).getTime() - rango.inicioMs) / DIA_MS) * diaVista
  const xInicio = (t) => xFecha(t.fecha_inicio)
  const xFin = (t) => xFecha(t.fecha_fin) + (diasEntre(t.fecha_inicio, t.fecha_fin) + 1) * diaVista

  const porId = new Map(filas.map((f) => [f.tarea.id, f.tarea]))
  const rutas = []
  for (const suc of porId.values()) {
    const preds = suc.predecesoras ?? []
    if (preds.length === 0) continue
    const geoS = geometria[suc.id]
    if (!geoS) continue
    for (const p of preds) {
      const pred = porId.get(p.id)
      const geoP = geometria[p.id]
      if (!pred || !geoP) continue
      const tipo = p.tipo ?? 'FS'
      const origen = tipo === 'SS' || tipo === 'SF' ? xInicio(pred) : xFin(pred)
      const destino = tipo === 'FF' || tipo === 'SF' ? xFin(suc) : xInicio(suc)
      const codo = origen + 8
      const y1 = geoP.y
      const y2 = geoS.y
      rutas.push({
        clave: `${p.id}-${tipo}-${suc.id}`,
        d: `M ${origen} ${y1} L ${codo} ${y1} L ${codo} ${y2} L ${destino} ${y2}`,
        critica: criticas.has(p.id) && criticas.has(suc.id),
      })
    }
  }
  if (rutas.length === 0) return null

  return (
    <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full" aria-hidden="true">
      <defs>
        <marker id="crono-flecha" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L8 4 L0 8 z" fill="#94a3b8" />
        </marker>
        <marker id="crono-flecha-critica" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L8 4 L0 8 z" fill="#ef4444" />
        </marker>
      </defs>
      {rutas.map((r) => (
        <path
          key={r.clave}
          d={r.d}
          fill="none"
          strokeWidth="1.3"
          stroke={r.critica ? '#ef4444' : '#94a3b8'}
          strokeDasharray={r.critica ? undefined : '4 3'}
          markerEnd={`url(#${r.critica ? 'crono-flecha-critica' : 'crono-flecha'})`}
        />
      ))}
    </svg>
  )
}

// Celda del histograma de recursos: mini-barra vertical con la línea de
// capacidad (días laborables × 8 h). Se pinta en rojo al sobreasignar.
function CeldaHistograma({ horas, capacidad, maxHoras, tono }) {
  const excede = horas > capacidad + 1e-9
  const alto = Math.max(0, Math.min(100, (horas / maxHoras) * 100))
  const tope = Math.max(0, Math.min(100, (capacidad / maxHoras) * 100))
  return (
    <td className="px-1.5 py-1 align-bottom">
      <div
        className="relative mx-auto h-10 w-6 rounded-sm bg-slate-100 ring-1 ring-inset ring-slate-200"
        title={`${horas} h comprometidas · capacidad ${capacidad} h`}
      >
        <span
          className={`absolute bottom-0 left-0 w-full rounded-sm ${excede ? 'bg-red-600' : tono}`}
          style={{ height: `${alto}%` }}
        />
        <span
          className="absolute left-0 w-full border-t border-dashed border-slate-400"
          style={{ bottom: `${tope}%` }}
          title="Capacidad semanal"
        />
      </div>
      <span
        className={`mt-0.5 block text-center text-[10px] tabular-nums ${
          excede ? 'font-semibold text-red-700' : 'text-slate-500'
        }`}
      >
        {horas}
      </span>
    </td>
  )
}

export function CronogramaServicio() {
  const { servicio } = useOutletContext()
  const { estado, agregarItem, actualizarItem, eliminarItem, reemplazarColeccion } = useData()
  const { tareas: todas } = estado

  const [aviso, setAviso] = useState(null)
  const [modal, setModal] = useState(null) // null | { modo: 'crear', padre? } | { modo: 'editar', tarea }
  const [importacion, setImportacion] = useState(null) // null | { archivo, tareas, errores, total }
  const [calendarioAbierto, setCalendarioAbierto] = useState(false)
  const [vistaRed, setVistaRed] = useState(false) // false = Gantt, true = red PERT
  const [colapsadas, setColapsadas] = useState({})
  const [busqueda, setBusqueda] = useState('')
  const archivoRef = useRef(null)
  const [zoomManual, setZoomManual] = useState(null) // px por día elegido con +/−; null = ajuste automático
  const [lookahead, setLookahead] = useState(false) // ventana de 3–6 semanas
  const [semanasLA, setSemanasLA] = useState(4)
  const [arrastre, setArrastre] = useState(null) // arrastre/redimensionado activo
  const PASOS_ZOOM = [6, 10, 16, 28, 48, 80, 130]
  const indicePaso = (valor, direccion) => {
    if (direccion < 0) {
      for (let i = PASOS_ZOOM.length - 1; i >= 0; i -= 1) {
        if (PASOS_ZOOM[i] < valor) return PASOS_ZOOM[i]
      }
      return PASOS_ZOOM[0]
    }
    for (let i = 0; i < PASOS_ZOOM.length; i += 1) {
      if (PASOS_ZOOM[i] > valor) return PASOS_ZOOM[i]
    }
    return PASOS_ZOOM[PASOS_ZOOM.length - 1]
  }

  const hoy = hoyISO()

  const tareas = useMemo(
    () =>
      todas
        .filter((t) => t.servicio_id === servicio.id)
        .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio) || a.id - b.id),
    [todas, servicio.id],
  )

  const registros = useMemo(
    () => (estado.registros_servicio ?? []).filter((r) => r.servicio_id === servicio.id),
    [estado.registros_servicio, servicio.id],
  )

  // Árbol multinivel: cada tarea puede tener subtareas que a su vez
  // pueden tener las suyas. Las huérfanas (padre inexistente) suben a raíz.
  const arbol = useMemo(() => {
    const porId = new Map(tareas.map((t) => [t.id, t]))
    const hijasPorPadre = new Map()
    for (const t of tareas) {
      const pid = t.padre_id ?? null
      const clave = pid !== null && !porId.has(pid) ? null : pid
      if (!hijasPorPadre.has(clave)) hijasPorPadre.set(clave, [])
      hijasPorPadre.get(clave).push(t)
    }
    const armar = (t) => ({
      tarea: t,
      hijas: (hijasPorPadre.get(t.id) ?? []).map(armar),
    })
    return (hijasPorPadre.get(null) ?? []).map(armar)
  }, [tareas])

  // Filtro de la lista: texto sobre el nombre de la tarea. Al buscar se
  // expande el árbol (se ignoran los grupos colapsados) y se conservan los
  // ancestros de cada coincidencia para no perder la jerarquía.
  const termino = normalizar(busqueda).trim()

  // Filas planas para la lista y el diagrama, con numeración jerárquica
  // 1, 1.1, 1.1.1… Respetan los grupos colapsados. Mientras se busca, se
  // expande todo para poder encontrar cualquier tarea.
  const filas = useMemo(() => {
    const lista = []
    const recorrer = (nodo, nivel, numero) => {
      const hijas = nodo.hijas
      lista.push({ tarea: nodo.tarea, nivel, numero, hijas: hijas.map((h) => h.tarea) })
      if (hijas.length > 0 && (termino || !colapsadas[nodo.tarea.id])) {
        hijas.forEach((hija, j) => recorrer(hija, nivel + 1, `${numero}.${j + 1}`))
      }
    }
    arbol.forEach((nodo, i) => recorrer(nodo, 0, `${i + 1}`))
    return lista
  }, [arbol, colapsadas, termino])

  const filasFiltradas = useMemo(() => {
    if (!termino) return filas
    const padreDe = new Map(tareas.map((t) => [t.id, t.padre_id ?? null]))
    const incluir = new Set()
    for (const fila of filas) {
      if (!textoCoincide(fila.tarea.nombre, termino)) continue
      let actual = fila.tarea.id
      while (actual != null && !incluir.has(actual)) {
        incluir.add(actual)
        actual = padreDe.get(actual) ?? null
      }
    }
    return filas.filter((fila) => incluir.has(fila.tarea.id))
  }, [filas, tareas, termino])

  const alternarGrupo = (id) =>
    setColapsadas((previo) => ({ ...previo, [id]: !previo[id] }))

  // Historial para deshacer/rehacer (fotos de la colección de tareas).
  const [atras, setAtras] = useState([])
  const [adelante, setAdelante] = useState([])

  const registrarPaso = () => {
    setAtras((previo) => [...previo.slice(-29), todas])
    setAdelante([])
  }

  const deshacer = () => {
    if (atras.length === 0) return
    const previo = atras[atras.length - 1]
    setAtras((lista) => lista.slice(0, -1))
    setAdelante((lista) => [...lista, todas])
    reemplazarColeccion('tareas', previo)
    setAviso({ tipo: 'info', mensaje: 'Cambio deshecho.' })
  }

  const rehacer = () => {
    if (adelante.length === 0) return
    const siguiente = adelante[adelante.length - 1]
    setAdelante((lista) => lista.slice(0, -1))
    setAtras((lista) => [...lista.slice(-29), todas])
    reemplazarColeccion('tareas', siguiente)
    setAviso({ tipo: 'info', mensaje: 'Cambio rehecho.' })
  }

  const guardar = (valores) => {
    registrarPaso()
    if (valores.id == null) {
      agregarItem('tareas', valores)
      setAviso({
        tipo: 'exito',
        mensaje:
          valores.padre_id != null
            ? 'Subtarea agregada al cronograma.'
            : 'Tarea agregada al cronograma.',
      })
    } else {
      actualizarItem('tareas', valores)
      setAviso({ tipo: 'exito', mensaje: 'Tarea actualizada.' })
    }
    setModal(null)
  }

  const eliminar = (tarea) => {
    registrarPaso()
    eliminarItem('tareas', tarea.id)
    setAviso({ tipo: 'info', mensaje: `Tarea «${tarea.nombre}» eliminada.` })
    setModal(null)
  }

  const guardarCalendario = (calendario) => {
    actualizarItem('servicios', { id: servicio.id, calendario })
    setCalendarioAbierto(false)
    setAviso({ tipo: 'exito', mensaje: 'Calendario laboral actualizado.' })
  }

  // Ventana de look-ahead (próximas 3–6 semanas desde hoy). Cuando está activa,
  // el Gantt se recorta a esa ventana y las barras se atenúan fuera de ella.
  const ventana = useMemo(
    () => (lookahead ? ventanaLookahead({ hoy, semanas: semanasLA }) : null),
    [lookahead, hoy, semanasLA],
  )

  const rango = useMemo(() => {
    if (tareas.length === 0) return null
    let minimo
    let maximo
    if (ventana) {
      minimo = ventana.inicio
      maximo = ventana.fin
    } else {
      const inicios = tareas.map((t) => t.fecha_inicio)
      const fines = tareas.map((t) => t.fecha_fin)
      minimo = inicios.reduce((a, b) => (a < b ? a : b))
      maximo = fines.reduce((a, b) => (a > b ? a : b))
      if (servicio.fecha_inicio && servicio.fecha_inicio < minimo) minimo = servicio.fecha_inicio
      if (servicio.fecha_fin_estimada && servicio.fecha_fin_estimada > maximo) {
        maximo = servicio.fecha_fin_estimada
      }
      if (hoy < minimo) minimo = hoy
      // Horizonte acotado: el cronograma continúa 12 meses más allá de hoy
      // (cruza de año sin problemas) en vez de cortarse en diciembre.
      const horizonte = sumarMeses(hoy, 12)
      if (horizonte > maximo) maximo = horizonte
    }
    // Un día de aire al inicio.
    const base = parsearFecha(minimo).getTime() - DIA_MS
    const totalDias =
      diasEntre(
        new Date(base).getFullYear() +
          '-' +
          String(new Date(base).getMonth() + 1).padStart(2, '0') +
          '-' +
          String(new Date(base).getDate()).padStart(2, '0'),
        maximo,
      ) + 1
    return { inicioMs: base, totalDias }
  }, [tareas, servicio.fecha_inicio, servicio.fecha_fin_estimada, hoy, ventana])

  const dias = useMemo(() => {
    if (!rango) return []
    return Array.from({ length: rango.totalDias }, (_, i) => new Date(rango.inicioMs + i * DIA_MS))
  }, [rango])

  // Posición (%) de cada cambio de mes: grillas verticales del diagrama.
  const limitesMes = useMemo(() => {
    if (!rango) return []
    const lista = []
    dias.forEach((d, i) => {
      if (i === 0) return
      const previo = dias[i - 1]
      if (d.getMonth() !== previo.getMonth() || d.getFullYear() !== previo.getFullYear()) {
        lista.push((i / rango.totalDias) * 100)
      }
    })
    return lista
  }, [dias, rango])

  const meses = useMemo(() => {
    const grupos = []
    dias.forEach((dia, i) => {
      const clave = `${dia.getFullYear()}-${dia.getMonth()}`
      const ultimo = grupos[grupos.length - 1]
      if (ultimo && ultimo.clave === clave) {
        ultimo.dias += 1
      } else {
        grupos.push({ clave, dias: 1, desde: i, fecha: dia })
      }
    })
    return grupos
  }, [dias])

  // Ancho fluido: el día ocupa el espacio disponible entre la etiqueta y el
  // borde del contenedor; al reducir el zoom (más espacio) las barras crecen.
  const envolturaRef = useRef(null)
  const [anchoCaja, setAnchoCaja] = useState(0)

  useEffect(() => {
    const caja = envolturaRef.current
    if (!caja || typeof ResizeObserver === 'undefined') return undefined
    const observador = new ResizeObserver((entradas) => {
      const ancho = entradas[0]?.contentRect.width ?? 0
      setAnchoCaja((previo) => (Math.abs(ancho - previo) > 1 ? ancho : previo))
    })
    observador.observe(caja)
    return () => observador.disconnect()
  }, [])

  // Por defecto se muestra el panorama completo (todo el rango visible,
  // normalmente en vista de trimestres); los botones −/+ ajustan el detalle.
  const ajusteAuto =
    rango && anchoCaja > 0
      ? Math.max(4, (anchoCaja - ANCHO_ETIQUETA) / rango.totalDias)
      : DIA_PX_MIN
  const bruto = zoomManual ?? ajusteAuto
  const diaPx =
    bruto < 22
      ? Math.min(Math.max(bruto, 4), 12)
      : Math.min(160, Math.max(bruto, DIA_PX_MIN))
  // Con días pequeños se agrupan los meses en pestañas de trimestre.
  const esTrimestre = diaPx < 22

  const trimestres = useMemo(() => {
    const grupos = []
    meses.forEach((mes, i) => {
      if (i % 3 === 0) grupos.push([])
      grupos[grupos.length - 1].push(mes)
    })
    return grupos
  }, [meses])

  // Trimestres con su posición (%): inicio para la línea separadora y
  // segmento completo para la banda de fondo alternada.
  const bandasTrimestre = useMemo(() => {
    if (!rango) return []
    const lista = []
    let acc = 0
    trimestres.forEach((grupo, gi) => {
      const diasGrupo = grupo.reduce((s, m) => s + m.dias, 0)
      lista.push({
        clave: gi,
        inicio: (acc / rango.totalDias) * 100,
        ancho: (diasGrupo / rango.totalDias) * 100,
      })
      acc += diasGrupo
    })
    return lista
  }, [trimestres, rango])
  const limitesTrimestre = bandasTrimestre.filter((b) => b.inicio > 0).map((b) => b.inicio)

  const scrollRef = useRef(null)
  const enfocadoHoy = useRef(false)
  // Escala visible durante la animación de zoom; null = escala objetivo.
  const [diaInter, setDiaInter] = useState(null)
  const diaVista = diaInter ?? diaPx
  // Última escala mostrada (para encadenar zooms sin saltos).
  const vistaRef = useRef(null)
  const rafZoom = useRef(null)

  // Cancela la animación en curso al desmontar.
  useEffect(
    () => () => {
      if (rafZoom.current !== null && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(rafZoom.current)
      }
    },
    [],
  )
  const desplazar = (direccion) => {
    scrollRef.current?.scrollBy({ left: direccion * scrollRef.current.clientWidth * 0.8, behavior: 'smooth' })
  }

  const pos = (fechaISO) => ((parsearFecha(fechaISO).getTime() - rango.inicioMs) / DIA_MS / rango.totalDias) * 100
  const ancho = (desdeISO, hastaISO) => ((diasEntre(desdeISO, hastaISO) + 1) / rango.totalDias) * 100
  const posHoy = rango
    ? ((parsearFecha(hoy).getTime() - rango.inicioMs) / DIA_MS / rango.totalDias) * 100
    : -1

  // px, dentro del contenido con scroll, de una fecha dada como % del rango.
  const xDe = (porcentaje, dia) => ANCHO_ETIQUETA + (porcentaje / 100) * rango.totalDias * dia
  // Deja ese % del rango a esa fracción del área útil de la pista
  // (0.5 = centro del área a la derecha de la columna de etiquetas).
  const enfocar = (porcentaje, dia, fraccion, comportamiento = 'smooth') => {
    const contenedor = scrollRef.current
    if (!contenedor || !rango) return
    const pantalla = ANCHO_ETIQUETA + fraccion * (contenedor.clientWidth - ANCHO_ETIQUETA)
    contenedor.scrollTo({ left: Math.max(0, xDe(porcentaje, dia) - pantalla), behavior: comportamiento })
  }

  const irAHoy = () => {
    if (posHoy < 0 || posHoy > 100) return
    enfocar(posHoy, diaVista, 0.5)
  }

  // Foco inicial en el mes actual (solo una vez, cuando ya se midió el ancho).
  useEffect(() => {
    if (enfocadoHoy.current || !rango || tareas.length === 0 || anchoCaja === 0) {
      return
    }
    if (!scrollRef.current) return
    enfocar(posHoy, diaPx, 0.25, 'auto')
    enfocadoHoy.current = true
  }, [rango, diaPx, anchoCaja, tareas.length, posHoy])

  const diaPxPrevio = useRef(null)
  // Zoom suave y anclado: si hoy está visible, la escala crece a su alrededor
  // sin moverlo de pantalla; si no, el zoom se centra en el área visible.
  // Escala y scroll se interpolan juntos en cada cuadro, por eso no hay
  // deslizamiento doble. Solo reacciona al zoom manual (−/+/Trimestres-Días),
  // nunca al montar ni al redimensionar la ventana.
  usarLayoutEffect(() => {
    const contenedor = scrollRef.current
    const previo = vistaRef.current ?? diaPxPrevio.current
    diaPxPrevio.current = diaPx
    if (!contenedor || !rango || previo === null || previo === diaPx) return
    if (posHoy < 0 || posHoy > 100) return
    const xHoyViejo = xDe(posHoy, previo)
    const visibleIzq = contenedor.scrollLeft + ANCHO_ETIQUETA
    const visibleDer = contenedor.scrollLeft + contenedor.clientWidth
    let pctAncla
    let pantallaAncla
    if (xHoyViejo >= visibleIzq && xHoyViejo <= visibleDer) {
      pctAncla = posHoy
      pantallaAncla = xHoyViejo - contenedor.scrollLeft
    } else {
      const centroViejo =
        contenedor.scrollLeft + ANCHO_ETIQUETA + (contenedor.clientWidth - ANCHO_ETIQUETA) / 2
      pctAncla = ((centroViejo - ANCHO_ETIQUETA) / (rango.totalDias * previo)) * 100
      pantallaAncla = ANCHO_ETIQUETA + (contenedor.clientWidth - ANCHO_ETIQUETA) / 2
    }
    const aplicarScroll = (dia) => {
      contenedor.scrollLeft = Math.max(0, xDe(pctAncla, dia) - pantallaAncla)
    }
    const sinAnimacion =
      typeof window === 'undefined' ||
      typeof requestAnimationFrame === 'undefined' ||
      (typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    if (sinAnimacion) {
      vistaRef.current = null
      setDiaInter(null)
      aplicarScroll(diaPx)
      return
    }
    if (rafZoom.current !== null) cancelAnimationFrame(rafZoom.current)
    const DURACION = 280
    let inicio = null
    const paso = (ahora) => {
      if (inicio === null) inicio = ahora
      const p = Math.min(1, (ahora - inicio) / DURACION)
      const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2
      const dia = previo + (diaPx - previo) * e
      vistaRef.current = dia
      setDiaInter(dia)
      aplicarScroll(dia)
      if (p < 1) {
        rafZoom.current = requestAnimationFrame(paso)
      } else {
        rafZoom.current = null
        vistaRef.current = null
        setDiaInter(null)
        aplicarScroll(diaPx)
      }
    }
    rafZoom.current = requestAnimationFrame(paso)
  }, [zoomManual])

  // Mismas métricas que Resumen, Dashboard y Curva S (avance valorizado, solo
  // hojas): el encabezado del cronograma nunca contradice al resto.
  const { completadas, atrasadas, avanceGlobal } = metricasCronograma(tareas, hoy)

  // Calendario laboral de la obra (días laborables y feriados) y red CPM.
  const calendario = useMemo(() => calendarioDe(servicio), [servicio])
  const cpm = useMemo(
    () => programar({ tareas, servicio, calendario }),
    [tareas, servicio, calendario],
  )
  const rutaCritica = useMemo(() => new Set(cpm.rutaCritica), [cpm])

  // Tareas que pueden ser predecesoras de la que se está editando: las hojas
  // del servicio, sin la propia ni sus descendientes.
  const candidatas = useMemo(() => {
    const conHijas = new Set(
      tareas.filter((t) => tareas.some((x) => x.padre_id === t.id)).map((t) => t.id),
    )
    const editar = modal?.modo === 'editar' ? modal.tarea : null
    const excluir = new Set(editar ? [editar.id] : [])
    if (editar) {
      let cambio = true
      while (cambio) {
        cambio = false
        for (const t of tareas) {
          if (!excluir.has(t.id) && t.padre_id != null && excluir.has(t.padre_id)) {
            excluir.add(t.id)
            cambio = true
          }
        }
      }
    }
    return tareas
      .filter((t) => !conHijas.has(t.id) && !excluir.has(t.id))
      .map((t) => ({ id: t.id, nombre: t.nombre }))
  }, [tareas, modal])

  // Línea base vigente: se dibuja como fantasma contra las fechas reales.
  const baseVigente = useMemo(
    () =>
      (estado.lineas_base ?? [])
        .filter((l) => l.servicio_id === servicio.id)
        .sort((a, b) => (Number(b.version) || 0) - (Number(a.version) || 0))[0] ?? null,
    [estado.lineas_base, servicio.id],
  )
  const basePorId = useMemo(
    () => new Map((baseVigente?.tareas ?? []).map((t) => [t.id, t])),
    [baseVigente],
  )

  // Resumen del desvío contra la línea base (encabezado del Gantt).
  const resumenBase = useMemo(
    () => resumenDesviacionLineaBase({ tareas, basePorId }),
    [tareas, basePorId],
  )

  // En look-ahead solo se muestran las tareas que caen en la ventana, con sus
  // ancestros para no perder la jerarquía.
  const filasVisibles = useMemo(() => {
    if (!ventana) return filasFiltradas
    const padreDe = new Map(tareas.map((t) => [t.id, t.padre_id ?? null]))
    const incluir = new Set()
    for (const fila of filasFiltradas) {
      const t = fila.tarea
      if (!(t.fecha_inicio <= ventana.fin && t.fecha_fin >= ventana.inicio)) continue
      let actual = t.id
      while (actual != null && !incluir.has(actual)) {
        incluir.add(actual)
        actual = padreDe.get(actual) ?? null
      }
    }
    return filasFiltradas.filter((f) => incluir.has(f.tarea.id))
  }, [filasFiltradas, ventana, tareas])

  // Límites de semana (lunes) y bandas de semana para el look-ahead.
  const limitesSemana = useMemo(() => {
    if (!rango || !ventana) return []
    const lista = []
    dias.forEach((d, i) => {
      if (i === 0) return
      if (d.getDay() === 1) lista.push({ indice: i, pos: (i / rango.totalDias) * 100 })
    })
    return lista
  }, [dias, rango, ventana])

  const bandasSemana = useMemo(() => {
    if (!rango || !ventana) return []
    const total = rango.totalDias
    const cortes = [0, ...limitesSemana.map((l) => l.indice), total]
    const lista = []
    for (let k = 0; k < cortes.length - 1; k += 1) {
      const i0 = cortes[k]
      const i1 = cortes[k + 1]
      lista.push({
        clave: k,
        inicio: (i0 / total) * 100,
        ancho: ((i1 - i0) / total) * 100,
        desde: isoDe(dias[i0]),
        hasta: isoDe(dias[i1 - 1]),
      })
    }
    return lista
  }, [rango, dias, limitesSemana, ventana])

  // Columnas de días no laborables (domingos y feriados): sombreado gerencial.
  const bandasNoLaborable = useMemo(() => {
    if (!rango) return []
    const lista = []
    let inicio = null
    dias.forEach((d, i) => {
      const laborable = esLaborable(isoDe(d), calendario)
      if (!laborable && inicio === null) inicio = i
      const ultimo = i === dias.length - 1
      if ((laborable || ultimo) && inicio !== null) {
        const fin = laborable ? i - 1 : i
        lista.push({
          clave: `${inicio}-${fin}`,
          izq: (inicio / rango.totalDias) * 100,
          ancho: ((fin - inicio + 1) / rango.totalDias) * 100,
        })
        inicio = null
      }
    })
    return lista
  }, [dias, rango, calendario])

  // Fechas de vista previa mientras se arrastra o redimensiona una barra.
  const previewPorId = useMemo(() => {
    if (!arrastre) return null
    const cambios = cambiosDeArrastre({
      tarea: arrastre.tarea,
      tareas,
      deltaDias: arrastre.delta,
      modo: arrastre.modo,
      borde: arrastre.borde,
      calendario,
    })
    return new Map(cambios.map((c) => [c.id, c]))
  }, [arrastre, tareas, calendario])

  // Semanas del histograma: la ventana look-ahead o las próximas 6 semanas.
  const semanasRecursos = useMemo(
    () => ventanaLookahead({ hoy, semanas: lookahead ? semanasLA : 6 }).semanas,
    [hoy, lookahead, semanasLA],
  )
  const histograma = useMemo(
    () =>
      histogramaRecursosSemanal({
        semanas: semanasRecursos,
        servicio,
        asignaciones: estado.asignaciones ?? [],
        registros: estado.registros_servicio ?? [],
        personal: estado.personal ?? [],
        equipos: estado.equipos ?? [],
        calendario,
      }),
    [semanasRecursos, servicio, estado.asignaciones, estado.registros_servicio, estado.personal, estado.equipos, calendario],
  )

  // --- Arrastre / redimensionado de barras ------------------------------
  // Se usan refs para que los listeners (registrados al iniciar el gesto) lean
  // siempre el estado más reciente sin re-suscribirse en cada movimiento.
  const diaVistaRef = useRef(diaVista)
  diaVistaRef.current = diaVista
  const arrastreRef = useRef(null)
  arrastreRef.current = arrastre

  const finalizarArrastre = (a) => {
    setArrastre(null)
    if (!a || !a.delta) return
    const cambios = cambiosDeArrastre({
      tarea: a.tarea,
      tareas,
      deltaDias: a.delta,
      modo: a.modo,
      borde: a.borde,
      calendario,
    })
    if (cambios.length === 0) return
    const conflictos = conflictosDependencia({ cambios, tareas, calendario })
    if (conflictos.length > 0) {
      setAviso({
        tipo: 'error',
        mensaje: `Movimiento bloqueado por dependencias: ${conflictos[0].motivo}. Reprograma con CPM si corresponde.`,
      })
      return
    }
    registrarPaso()
    cambios.forEach((c) =>
      actualizarItem('tareas', { id: c.id, fecha_inicio: c.fecha_inicio, fecha_fin: c.fecha_fin }),
    )
    setAviso({
      tipo: 'exito',
      mensaje:
        a.modo === 'mover'
          ? `Tarea reprogramada ${a.delta > 0 ? '+' : ''}${a.delta} día(s) (puedes deshacerlo).`
          : 'Duración ajustada en el diagrama (puedes deshacerlo).',
    })
  }

  const iniciarArrastre = (evento, tarea, modo, borde = 'fin') => {
    if (evento.button != null && evento.button !== 0) return
    if (tarea.hito && modo === 'redimensionar') return
    evento.preventDefault()
    evento.stopPropagation()
    setArrastre({
      id: tarea.id,
      tarea,
      modo,
      borde,
      x0: evento.clientX,
      delta: 0,
    })
  }

  useEffect(() => {
    if (!arrastre) return undefined
    const mover = (evento) => {
      const delta = Math.round((evento.clientX - arrastre.x0) / diaVistaRef.current)
      setArrastre((a) => (a && a.delta !== delta ? { ...a, delta } : a))
    }
    const soltar = () => finalizarArrastre(arrastreRef.current)
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
    window.addEventListener('pointercancel', soltar)
    return () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      window.removeEventListener('pointercancel', soltar)
    }
    // Solo se re-suscribe al empezar/terminar el gesto (arrastre?.id).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrastre?.id])

  // Reprogramar con CPM: solo se aplica cuando el usuario lo pide (asesor).
  const reprogramar = () => {
    if (!cpm.valido) {
      setAviso({
        tipo: 'error',
        mensaje: 'Hay ciclos entre dependencias; corrige las predecesoras antes de reprogramar.',
      })
      return
    }
    const cambios = []
    for (const t of tareas) {
      const v = cpm.porTarea[t.id]
      if (!v) continue
      if (t.fecha_inicio !== v.inicio || t.fecha_fin !== v.fin) {
        cambios.push({ id: t.id, fecha_inicio: v.inicio, fecha_fin: v.fin })
      }
    }
    if (cambios.length === 0) {
      setAviso({ tipo: 'info', mensaje: 'El cronograma ya coincide con el cálculo CPM.' })
      return
    }
    registrarPaso()
    cambios.forEach((c) => actualizarItem('tareas', c))
    setAviso({
      tipo: 'exito',
      mensaje: `Se reprogramaron ${cambios.length} tarea(s) con el motor CPM (puedes deshacerlo).`,
    })
  }

  // Exportación a Excel del cronograma (cabecera con obra, cliente y periodo).
  const exportarExcel = () => {
    const ok = descargarLibro(libroCronograma({ servicio, tareas, generado: hoy }))
    setAviso(
      ok
        ? { tipo: 'exito', mensaje: 'Cronograma exportado a Excel.' }
        : { tipo: 'error', mensaje: 'No se pudo exportar el cronograma.' },
    )
  }

  const maxIdTareas = useMemo(() => (todas.length === 0 ? 0 : Math.max(...todas.map((t) => t.id))), [todas])

  const descargarPlantilla = () => {
    const libro = plantillaCronograma({ servicio, tareas })
    const ok = descargarLibro(libro)
    setAviso(
      ok
        ? { tipo: 'exito', mensaje: 'Plantilla de cronograma descargada.' }
        : { tipo: 'error', mensaje: 'No se pudo descargar la plantilla.' },
    )
  }

  const alElegirArchivo = async (evento) => {
    const archivo = evento.target.files?.[0]
    if (evento.target) evento.target.value = ''
    if (!archivo) return
    try {
      const buffer = await archivo.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      const { hojas } = await leerXLSX(bytes)
      const hoja =
        hojas.find((h) => normalizar(h.nombre) === normalizar('Cronograma')) ??
        hojas.find((h) => normalizar(h.nombre).includes('crono')) ??
        hojas[0]
      if (!hoja) throw new Error('El archivo .xlsx no tiene hojas.')
      const previa = tareasImportadas({
        filas: hoja.filas,
        servicioId: servicio.id,
        baseId: maxIdTareas,
      })
      setImportacion({ archivo: archivo.name, ...previa })
    } catch (err) {
      setAviso({
        tipo: 'error',
        mensaje: `No se pudo leer el archivo .xlsx: ${err.message}`,
      })
    }
  }

  const confirmarImportacion = () => {
    if (!importacion || importacion.tareas.length === 0) return
    registrarPaso()
    // Cada alta pasa por el reducer central, que recalcula `tarea.avance`
    // (`recalcularAvances`): Gantt y Curva S reflejan el avance en la misma
    // sesión, sin esperar a recargar.
    importacion.tareas.forEach((t) => agregarItem('tareas', t))
    setImportacion(null)
    setAviso({
      tipo: 'exito',
      mensaje: `Se importaron ${importacion.tareas.length} tarea(s) al cronograma.`,
    })
  }

  const cancelarImportacion = () => setImportacion(null)

  // Tareas hoja con avance importado (%), para avisar que se guarda como
  // ejecutado previo / pasos / avance a mano y no se pierde.
  const importadasConAvance = importacion
    ? importacion.tareas.filter((t) => Number(t.avance) > 0).length
    : 0

  // --- Geometría de las filas para dibujar las flechas de dependencia -----
  const filaRefs = useRef(new Map())
  const [alturaFila, setAlturaFila] = useState({})
  const registrarFila = (id, el) => {
    if (el) filaRefs.current.set(id, el)
    else filaRefs.current.delete(id)
  }
  usarLayoutEffect(() => {
    const mapa = {}
    filaRefs.current.forEach((el, id) => {
      if (el) mapa[id] = { y: el.offsetTop + el.offsetHeight / 2 }
    })
    setAlturaFila((previo) =>
      Object.keys(previo).length === Object.keys(mapa).length &&
      Object.keys(mapa).every((k) => previo[k]?.y === mapa[k]?.y)
        ? previo
        : mapa,
    )
  }, [filasVisibles, diaVista, baseVigente])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            Cronograma · {servicio.nombre_servicio}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {tareas.length === 0
              ? 'Planifica las tareas del servicio en el tiempo.'
              : `${tareas.length} tareas · ${completadas} completadas · ${atrasadas} atrasadas · avance global ${avanceGlobal}%`}
          </p>
          {tareas.length > 0 && baseVigente && (
            <p className="mt-1 text-xs text-slate-500">
              Línea base v{baseVigente.version}:{' '}
              {resumenBase.conDesvio > 0 ? (
                <>
                  <span className="font-semibold text-red-700">
                    {resumenBase.atraso} con retraso
                  </span>
                  {resumenBase.adelanto > 0 && (
                    <span className="text-emerald-700"> · {resumenBase.adelanto} con adelanto</span>
                  )}
                  {resumenBase.maxAtraso > 0 && (
                    <span> · máx. +{resumenBase.maxAtraso} d</span>
                  )}
                </>
              ) : (
                <span className="text-emerald-700">sin desvíos frente al plan</span>
              )}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {tareas.length > 0 && (
            <div className="flex items-center gap-2">
              <Buscador
                valor={busqueda}
                onChange={setBusqueda}
                placeholder="Buscar tarea…"
                ariaLabel="Buscar tareas"
              />
              {termino && (
                <p className="text-sm whitespace-nowrap text-slate-500">
                  <span className="font-semibold text-slate-700">{filasFiltradas.length}</span> de{' '}
                  {filas.length}
                </p>
              )}
            </div>
          )}
          <Button variante="secundario" onClick={exportarExcel} disabled={tareas.length === 0}>
            Exportar Excel
          </Button>
          <Button variante="secundario" onClick={descargarPlantilla}>
            Plantilla
          </Button>
          <Button
            variante="secundario"
            onClick={() => {
              if (archivoRef.current) archivoRef.current.click()
            }}
          >
            Importar Excel
          </Button>
          <input
            ref={archivoRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={alElegirArchivo}
          />
          <Button variante="secundario" onClick={() => setCalendarioAbierto(true)}>
            Calendario
          </Button>
          <Button variante="secundario" onClick={reprogramar}>
            Reprogramar (CPM)
          </Button>
          <Button
            variante={vistaRed ? 'primario' : 'secundario'}
            onClick={() => setVistaRed((v) => !v)}
            aria-pressed={vistaRed}
            title="Alternar entre Gantt y red PERT"
          >
            {vistaRed ? 'Gantt' : 'Red PERT'}
          </Button>
          <Button onClick={() => setModal({ modo: 'crear' })}>Nueva tarea</Button>
        </div>
      </div>

      {tareas.length > 0 && !vistaRed && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => {
                const conHijas = new Set(tareas.filter((t) => tareas.some((x) => x.padre_id === t.id)).map((t) => t.id))
                const hayColapsada = [...conHijas].some((id) => colapsadas[id])
                if (hayColapsada) {
                  setColapsadas({})
                } else {
                  setColapsadas(Object.fromEntries([...conHijas].map((id) => [id, true])))
                }
              }}
              className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100"
              title="Expandir o colapsar todos los grupos"
            >
              {[...tareas.filter((t) => tareas.some((x) => x.padre_id === t.id)).map((t) => t.id)].some((id) => colapsadas[id])
                ? 'Expandir todo'
                : 'Colapsar todo'}
            </button>
            <span className="h-5 w-px bg-slate-200" aria-hidden="true" />
            <button
              type="button"
              onClick={deshacer}
              disabled={atras.length === 0}
              className="rounded-md px-2.5 py-1.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Deshacer cambio"
              title="Deshacer cambio"
            >
              ↩
            </button>
            <button
              type="button"
              onClick={rehacer}
              disabled={adelante.length === 0}
              className="rounded-md px-2.5 py-1.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Rehacer cambio"
              title="Rehacer cambio"
            >
              ↪
            </button>
          </div>
          <div className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setZoomManual((previo) => indicePaso(previo ?? diaVista, -1))}
              className="rounded-md p-1.5 text-slate-600 transition-colors hover:bg-slate-100"
              aria-label="Alejar: ver más meses"
              title="Alejar: ver más meses"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                className="size-5"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5M8.5 11h5" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => {
                // Alterna entre vista de trimestres y vista de días.
                if (esTrimestre) {
                  setZoomManual(DIA_PX_MIN)
                } else {
                  setZoomManual((previo) => (previo === null ? 16 : null))
                }
              }}
              className="min-w-20 rounded-md px-1 py-1.5 text-center text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100"
              title={esTrimestre ? 'Cambiar a vista de días' : 'Cambiar a vista de trimestres'}
            >
              {esTrimestre ? 'Trimestres' : 'Días'}
            </button>
            <button
              type="button"
              onClick={() => setZoomManual((previo) => indicePaso(previo ?? diaVista, 1))}
              className="rounded-md p-1.5 text-slate-600 transition-colors hover:bg-slate-100"
              aria-label="Acercar: ver más detalle"
              title="Acercar: ver más detalle"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                className="size-5"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5M11 8.5v5M8.5 11h5" />
              </svg>
            </button>
          </div>
          <div className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => desplazar(-1)}
              className="rounded-md px-2.5 py-1.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100"
              aria-label="Retroceder en el tiempo"
              title="Retroceder"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={irAHoy}
              className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100"
              title="Centrar en hoy"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => desplazar(1)}
              className="rounded-md px-2.5 py-1.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100"
              aria-label="Adelantar en el tiempo"
              title="Adelantar"
            >
              ›
            </button>
          </div>
          <div className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setLookahead((v) => !v)}
              aria-pressed={lookahead}
              className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                lookahead ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Ver solo las próximas semanas"
            >
              Look-ahead
            </button>
            <select
              value={semanasLA}
              onChange={(e) => {
                setSemanasLA(Number(e.target.value))
                setLookahead(true)
              }}
              aria-label="Semanas del look-ahead"
              className="rounded-md border border-slate-300 bg-white px-1.5 py-1 text-xs font-semibold text-slate-600"
            >
              {SEMANAS_LOOKAHEAD.map((n) => (
                <option key={n} value={n}>
                  {n} sem.
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {tareas.length === 0 ? (
        <Card>
          <div className="py-8 text-center">
            <p className="font-medium text-slate-800">Sin tareas todavía</p>
            <p className="mt-1 text-sm text-slate-500">
              Agrega la primera tarea para ver el diagrama de Gantt.
            </p>
            <div className="mt-4">
              <Button onClick={() => setModal({ modo: 'crear' })}>Nueva tarea</Button>
            </div>
          </div>
        </Card>
      ) : vistaRed ? (
        <RedPERT servicio={servicio} tareas={tareas} cpm={cpm} calendario={calendario} />
      ) : (
        <div>
          <section ref={envolturaRef} className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-4 shadow-sm">
          <div ref={scrollRef} className={`overflow-x-auto ${arrastre ? 'cursor-grabbing select-none' : ''}`}>
            <div style={{ width: ANCHO_ETIQUETA + rango.totalDias * diaVista }}>
              {/* Encabezado: no se mueve al cambiar de vista. Con look-ahead se
                  agrega una fila con el número/rango de cada semana. */}
              <div className={`mb-1 flex border-b border-slate-200 ${lookahead ? 'h-[5.25rem]' : 'h-[3.75rem]'}`}>
                <div
                  className="sticky left-0 z-20 flex shrink-0 items-center bg-slate-50 px-3 text-xs font-semibold tracking-wide text-slate-500 uppercase"
                  style={{ width: ANCHO_ETIQUETA }}
                >
                  Tarea
                </div>
                <div className="relative flex-1">
                  {lookahead && (
                    <div className="relative h-6 border-b border-slate-200 bg-slate-50">
                      {bandasSemana.map((b, bi) => (
                        <span
                          key={b.clave}
                          className={`absolute inset-y-0 flex items-center justify-center overflow-hidden border-l text-[10px] font-semibold whitespace-nowrap text-slate-600 ${
                            bi === 0 ? 'border-l-0' : 'border-slate-200'
                          }`}
                          style={{ left: `${b.inicio}%`, width: `${b.ancho}%` }}
                          title={`Semana del ${formatearFecha(b.desde)} al ${formatearFecha(b.hasta)}`}
                        >
                          Sem {bi + 1} · {formatearFecha(b.desde).slice(0, 5)}
                        </span>
                      ))}
                    </div>
                  )}
                  {esTrimestre ? (
                    <>
                      <div className="relative h-8 border-b border-slate-100">
                        {(() => {
                          let x = 0
                          return trimestres.map((grupo, gi) => {
                            const anchoGrupo = grupo.reduce((s, m) => s + m.dias * diaVista, 0)
                            const centro = x + anchoGrupo / 2
                            x += anchoGrupo
                            return (
                              <span
                                key={gi}
                                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-bold whitespace-nowrap text-slate-700 capitalize"
                                style={{ left: centro }}
                              >
                                {etiquetaTrimestre(grupo)}
                              </span>
                            )
                          })
                        })()}
                      </div>
                      <div className="flex h-7 items-stretch border-t border-slate-100">
                        {meses.map((m) => (
                          <div
                            key={m.clave}
                            className="flex shrink-0 items-center justify-center overflow-hidden border-l border-slate-100 px-1 text-center text-[11px] font-semibold whitespace-nowrap text-slate-500 capitalize"
                            style={{ width: m.dias * diaVista }}
                          >
                            {MESES[m.fecha.getMonth()]}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex h-8">
                        {meses.map((m) => (
                          <div
                            key={m.clave}
                            className="flex items-center border-l border-slate-200 px-2 text-xs font-semibold text-slate-600 capitalize"
                            style={{ width: m.dias * diaVista }}
                          >
                            {MESES[m.fecha.getMonth()]} {m.fecha.getFullYear()}
                          </div>
                        ))}
                      </div>
                      <div className="flex h-7 items-stretch border-t border-slate-100">
                        {dias.map((d, i) => (
                          <div
                            key={i}
                            className={`flex shrink-0 items-center justify-center text-center text-xs tabular-nums ${
                              esLaborable(isoDe(d), calendario)
                                ? 'text-slate-500'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                            style={{ width: diaVista }}
                          >
                            {d.getDate()}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  {posHoy >= 0 && posHoy <= 100 && (
                    <div
                      className="absolute -top-1 z-10 size-2 -translate-x-1/2 rounded-full bg-red-500"
                      style={{ left: `${posHoy}%` }}
                      title="Hoy"
                    />
                  )}
                </div>
              </div>

              {/* Filas agrupadas: tareas y subtareas multinivel */}
              {filasVisibles.length === 0 && (termino || ventana) && (
                <div className="flex h-16 items-center px-4 text-sm text-slate-500">
                  {ventana && !termino
                    ? 'Ninguna tarea cae en la ventana del look-ahead.'
                    : 'Ninguna tarea coincide con el filtro.'}
                </div>
              )}
              <div className="relative">
                {/* Sombreado de domingos y feriados: una sola capa de fondo. */}
                <div
                  className="pointer-events-none absolute inset-y-0 z-0"
                  style={{ left: ANCHO_ETIQUETA, right: 0 }}
                  aria-hidden="true"
                >
                  {bandasNoLaborable.map((b) => (
                    <span
                      key={b.clave}
                      className="absolute inset-y-0 bg-slate-100/70"
                      style={{ left: `${b.izq}%`, width: `${b.ancho}%` }}
                    />
                  ))}
                </div>
                <FlechasDependencia
                  filas={filasVisibles}
                  geometria={alturaFila}
                  rango={rango}
                  diaVista={diaVista}
                  criticas={rutaCritica}
                />
              {filasVisibles.map(({ tarea: t, nivel, numero, hijas }) => {
                const pct = avanceEfectivo(t, tareas)
                const estado = estadoTarea({ ...t, avance: pct }, hoy)
                const esPadre = hijas.length > 0
                const colapsada = esPadre && colapsadas[t.id]
                const tonoBarra = COLORES_BARRA[estado]
                const altoBarra = nivel === 0 ? 'h-6' : nivel === 1 ? 'h-4' : 'h-3'
                const v = cpm.porTarea[t.id]
                const esCritica = rutaCritica.has(t.id)
                const preds = t.predecesoras ?? []
                const base = basePorId.get(t.id)
                const desvio = base ? desviacionLineaBase({ tarea: t, base }) : null
                const desvioBase = Boolean(desvio && (desvio.inicio !== 0 || desvio.fin !== 0))
                const vista = previewPorId?.get(t.id)
                const iniVista = vista?.fecha_inicio ?? t.fecha_inicio
                const finVista = vista?.fecha_fin ?? t.fecha_fin
                const arrastrando = arrastre?.id === t.id
                const enVentana = !ventana || (t.fecha_fin >= ventana.inicio && t.fecha_inicio <= ventana.fin)
                const puedeArrastrar =
                  !arrastrando || arrastre.modo !== 'redimensionar' || !esPadre
                return (
                  <div
                    key={t.id}
                    ref={(el) => registrarFila(t.id, el)}
                    className={`flex items-stretch border-b border-slate-100 last:border-0 ${nivel >= 1 ? 'bg-slate-50/70' : ''} ${esPadre ? 'border-t-2 border-t-slate-200 first:border-t-0' : ''}`}
                  >
                    <div
                      className={`sticky left-0 z-20 flex min-w-0 shrink-0 items-center gap-1 bg-white px-2 py-1 ${nivel >= 1 ? 'border-l-2 border-l-slate-300' : ''}`}
                      style={{ width: ANCHO_ETIQUETA, paddingLeft: 8 + nivel * 16 }}
                    >
                      {esPadre ? (
                        <button
                          type="button"
                          onClick={() => alternarGrupo(t.id)}
                          className="w-5 shrink-0 rounded p-0.5 text-center text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                          aria-label={colapsada ? 'Expandir subtareas' : 'Colapsar subtareas'}
                          title={colapsada ? 'Expandir subtareas' : 'Colapsar subtareas'}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={`mx-auto size-4 transition-transform ${colapsada ? '-rotate-90' : ''}`}
                            aria-hidden="true"
                          >
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </button>
                      ) : (
                        <span className="w-5 shrink-0" aria-hidden="true" />
                      )}
                      <span className="w-9 shrink-0 text-center text-xs font-bold text-slate-400 tabular-nums">
                        {numero}
                      </span>
                      <button
                        type="button"
                        onClick={() => setModal({ modo: 'editar', tarea: t })}
                        className="min-w-0 flex-1 rounded px-1 py-0.5 text-left transition-colors hover:bg-primary-50/60"
                        title={`${t.nombre} · ${formatearFecha(t.fecha_inicio)} → ${formatearFecha(t.fecha_fin)} — clic para editar`}
                      >
                      <span className="block text-sm leading-snug font-medium text-slate-800 [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden">
                        {t.nombre}
                      </span>
                      {!esPadre && t.metrado != null && (
                        <span
                          className="mt-0.5 block text-[11px] leading-tight text-slate-400 tabular-nums"
                          title={`Metrado de la partida${t.unidad ? ` (${t.unidad})` : ''} al ${Number(t.avance) || 0} % de avance`}
                        >
                          {formatearCantidad(t.metrado)} {t.unidad ?? 'sin unidad'} · {Number(t.avance) || 0}%
                        </span>
                      )}
                        <span className="mt-0.5 inline-flex items-center gap-1.5">
                          <Badge variante={COLORES_ETIQUETA[estado]}>{estado}</Badge>
                          {!esPadre && t.modo_medicion === 'manual' && <BadgeModo modo="manual" />}
                          {desvio && desvio.fin !== 0 && (
                            <span
                              className={`rounded px-1 text-[10px] font-semibold tabular-nums ${
                                desvio.fin > 0
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-emerald-50 text-emerald-700'
                              }`}
                              title={`Fin ${desvio.fin > 0 ? 'retrasado' : 'adelantado'} ${Math.abs(
                                desvio.fin,
                              )} día(s) frente a la línea base${
                                baseVigente?.version ? ` v${baseVigente.version}` : ''
                              }`}
                            >
                              {desvio.fin > 0 ? '+' : '−'}
                              {Math.abs(desvio.fin)} d
                            </span>
                          )}
                          {esPadre && (
                            <span className="text-[11px] text-slate-400 tabular-nums">
                              {hijas.length} subt.
                            </span>
                          )}
                        </span>
                        {v && (
                          <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[10px] leading-tight text-slate-400 tabular-nums">
                            <span>{v.duracion} d</span>
                            {!esPadre && v.holgura !== 0 && (
                              <span title="Holgura total en días laborables">
                                · {v.holgura > 0 ? `holg. ${v.holgura} d` : `holg. -${Math.abs(v.holgura)} d`}
                              </span>
                            )}
                            {!esPadre && preds.length > 0 && (
                              <span
                                title={preds
                                  .map(
                                    (p) =>
                                      `Tarea ${p.id} · ${p.tipo ?? 'FS'}${
                                        Number(p.lag) ? ` +${p.lag} d` : ''
                                      }`,
                                  )
                                  .join('\n')}
                              >
                                · {preds.length} pred.
                              </span>
                            )}
                            {esCritica && (
                              <span className="font-semibold text-red-600">· Crítica</span>
                            )}
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setModal({ modo: 'crear', padre: t })}
                        className="rounded-lg p-1.5 text-lg leading-none font-bold text-slate-400 transition-colors hover:bg-primary-50 hover:text-primary-700"
                        aria-label={`Agregar subtarea a ${t.nombre}`}
                        title="Agregar subtarea"
                      >
                        +
                      </button>
                    </div>
                    <span className="relative flex min-w-0 flex-1 items-center">
                      {esTrimestre &&
                        bandasTrimestre.map(
                          (banda, bi) =>
                            bi % 2 === 0 && (
                              <span
                                key={banda.clave}
                                className="pointer-events-none absolute inset-y-0 bg-slate-200/50 transition-[left,width] duration-300 ease-out"
                                style={{ left: `${banda.inicio}%`, width: `${banda.ancho}%` }}
                              />
                            ),
                        )}
                      {limitesMes.map((izq, li) => (
                        <span
                          key={li}
                          className="pointer-events-none absolute inset-y-0 w-px bg-slate-300/70 transition-[left] duration-300 ease-out"
                          style={{ left: `${izq}%` }}
                        />
                      ))}
                      {ventana &&
                        limitesSemana.map((l, li) => (
                          <span
                            key={`sem-${li}`}
                            className="pointer-events-none absolute inset-y-0 w-px bg-slate-400/70"
                            style={{ left: `${l.pos}%` }}
                          />
                        ))}
                      {esTrimestre &&
                        limitesTrimestre.map((izq, li) => (
                          <span
                            key={`t-${li}`}
                            className="pointer-events-none absolute inset-y-0 w-0.5 bg-slate-400 transition-[left] duration-300 ease-out"
                            style={{ left: `${izq}%` }}
                          />
                        ))}
                      {t.hito ? (
                        <span
                          className={`absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 cursor-grab border-2 border-white bg-amber-500 shadow-sm ring-1 ring-black/20 ${
                            arrastrando ? 'ring-2 ring-primary-600' : ''
                          } ${enVentana ? '' : 'opacity-40'}`}
                          style={{ left: `${pos(iniVista)}%` }}
                          onPointerDown={(e) => iniciarArrastre(e, t, 'mover')}
                          title={`Hito · ${formatearFecha(t.fecha_inicio)} — arrastra para reprogramar`}
                        />
                      ) : (
                        <span className={`relative block w-full rounded-sm bg-slate-200 ring-1 ring-inset ring-slate-300 ${nivel === 0 ? 'h-6' : nivel === 1 ? 'h-4' : 'h-3'} ${enVentana ? '' : 'opacity-40'}`}>
                          {/* Fantasma de la línea base (plan congelado) */}
                          {base && (
                            <span
                              className={`pointer-events-none absolute inset-y-0 rounded-sm border border-dashed ${desvioBase ? 'border-amber-500' : 'border-slate-400'}`}
                              style={{
                                left: `${pos(base.fecha_inicio)}%`,
                                width: `${ancho(base.fecha_inicio, base.fecha_fin)}%`,
                              }}
                              title={`Línea base v${baseVigente?.version}: ${formatearFecha(base.fecha_inicio)} → ${formatearFecha(base.fecha_fin)}`}
                            />
                          )}
                          {/* Rango planificado (arrastrable) */}
                          <span
                            className={`absolute inset-y-0 rounded-sm transition-[left,width] duration-200 ease-out ${
                              arrastrando ? 'bg-primary-300' : 'cursor-grab bg-slate-300'
                            }`}
                            style={{ left: `${pos(iniVista)}%`, width: `${ancho(iniVista, finVista)}%` }}
                            onPointerDown={(e) => iniciarArrastre(e, t, 'mover')}
                            title={`${formatearFecha(iniVista)} → ${formatearFecha(finVista)} — arrastra para mover; usa los extremos para cambiar la duración`}
                          />
                          {/* Avance real */}
                          <span
                            className={`pointer-events-none absolute inset-y-0 flex items-center justify-end overflow-hidden rounded-sm shadow-sm ring-1 ring-inset ring-black/10 transition-[left,width] duration-200 ease-out ${tonoBarra}`}
                            style={{
                              left: `${pos(iniVista)}%`,
                              width: `${(ancho(iniVista, finVista) * pct) / 100}%`,
                            }}
                          >
                            {pct > 0 && (
                              <span className="pr-1.5 text-[10px] font-bold whitespace-nowrap text-white tabular-nums">
                                {pct}%
                              </span>
                            )}
                          </span>
                          {/* Ruta crítica: contorno rojo sobre el rango planificado */}
                          {esCritica && (
                            <span
                              className="pointer-events-none absolute inset-y-0 rounded-sm ring-2 ring-inset ring-red-600"
                              style={{ left: `${pos(iniVista)}%`, width: `${ancho(iniVista, finVista)}%` }}
                              title="Actividad en la ruta crítica"
                            />
                          )}
                          {/* Asas de redimensionado (solo en hojas) */}
                          {!esPadre && (
                            <>
                              <span
                                className="absolute inset-y-0 z-10 w-1.5 cursor-ew-resize hover:bg-primary-600/50"
                                style={{ left: `${pos(iniVista)}%` }}
                                onPointerDown={(e) => iniciarArrastre(e, t, 'redimensionar', 'inicio')}
                                title="Ajustar fecha de inicio"
                              />
                              <span
                                className="absolute inset-y-0 z-10 w-1.5 cursor-ew-resize hover:bg-primary-600/50"
                                style={{ left: `calc(${pos(finVista)}% - 6px)` }}
                                onPointerDown={(e) => iniciarArrastre(e, t, 'redimensionar', 'fin')}
                                title="Ajustar fecha de fin"
                              />
                            </>
                          )}
                          {arrastrando && arrastre.delta !== 0 && (
                            <span
                              className="pointer-events-none absolute -top-6 z-20 -translate-x-1/2 rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap text-white shadow"
                              style={{ left: `${pos(iniVista)}%` }}
                            >
                              {formatearFecha(iniVista)} → {formatearFecha(finVista)}
                            </span>
                          )}
                        </span>
                      )}
                      {/* Línea de hoy */}
                      {posHoy >= 0 && posHoy <= 100 && (
                        <span
                          className="absolute top-0 bottom-0 z-10 w-0.5 -translate-x-1/2 bg-red-500"
                          style={{ left: `${posHoy}%` }}
                          title="Hoy"
                        />
                      )}
                    </span>
                  </div>
                )
              })}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-blue-800" /> En curso
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-slate-500" /> Pendiente
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-emerald-600" /> Completada
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-red-700" /> Atrasada
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-px w-4 bg-red-400" /> Hoy
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm ring-2 ring-red-600 ring-inset" /> Ruta crítica
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rotate-45 bg-amber-500" /> Hito
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-4 rounded border border-dashed border-amber-500" /> Línea base
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-px w-4 border-t border-dashed border-slate-400" /> Dependencia
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-slate-100" /> No laborable
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Arrastra una barra para reprogramarla y sus extremos para cambiar la duración;
            los movimientos que rompen una dependencia se bloquean y todo se puede deshacer.
          </p>
          </section>
        </div>
      )}

      {/* Histograma semanal de recursos: personal planificado y equipos usados. */}
      {tareas.length > 0 && (
        <Card
          className="mt-4"
          titulo="Recursos por semana"
          descripcion={`Horas planificadas de personal y horas usadas de equipos · ${
            lookahead ? `${semanasLA} semanas (look-ahead)` : 'próximas 6 semanas'
          }`}
        >
          {histograma.totalAlertas > 0 ? (
            <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <span className="font-semibold">
                {histograma.totalAlertas} alerta{histograma.totalAlertas === 1 ? '' : 's'} de recursos
              </span>
              :{' '}
              {histograma.alertas
                .slice(0, 3)
                .map((a) =>
                  a.cruce ? `${a.nombre} (cruce de servicios)` : `${a.nombre} · sem. ${a.semana + 1}`,
                )
                .join(' · ')}
              {histograma.alertas.length > 3 ? ` y ${histograma.alertas.length - 3} más` : ''}
            </div>
          ) : (
            <p className="mb-3 text-sm text-slate-500">
              Sin sobreasignaciones en el periodo: cada recurso tiene horas dentro de su capacidad
              semanal (días laborables × 8 h).
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-300 bg-slate-100 text-xs font-bold tracking-wide text-primary-700 uppercase">
                  <th className="px-2 py-1 text-left">Recurso</th>
                  {histograma.semanas.map((s, i) => (
                    <th key={i} className="px-2 py-1 text-center">
                      <span className="block">Sem {i + 1}</span>
                      <span className="block text-[10px] font-normal text-slate-400">
                        {formatearFecha(s.inicio).slice(0, 5)}
                      </span>
                    </th>
                  ))}
                  <th className="px-2 py-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {histograma.personal.length === 0 && histograma.equipos.length === 0 && (
                  <tr>
                    <td
                      colSpan={histograma.semanas.length + 2}
                      className="px-2 py-3 text-center text-sm text-slate-500"
                    >
                      Sin personal ni equipos con horas en el periodo.
                    </td>
                  </tr>
                )}
                {histograma.personal.length > 0 && (
                  <tr>
                    <td
                      colSpan={histograma.semanas.length + 2}
                      className="pt-2 pb-1 text-[11px] font-semibold tracking-wide text-slate-500 uppercase"
                    >
                      Personal (plan)
                    </td>
                  </tr>
                )}
                {histograma.personal.map((f) => (
                  <tr key={`p-${f.id}`} className={f.excede ? 'bg-red-50/60' : ''}>
                    <td className="max-w-[220px] px-2 py-1">
                      <span className="block truncate font-medium text-slate-700">{f.nombre}</span>
                      {f.excede && (
                        <span className="text-[10px] font-semibold text-red-700">sobreasignado</span>
                      )}
                    </td>
                    {f.valores.map((h, i) => (
                      <CeldaHistograma
                        key={i}
                        horas={h}
                        capacidad={histograma.capacidad[i]}
                        maxHoras={histograma.maxHoras}
                        tono="bg-slate-500"
                      />
                    ))}
                    <td className="px-2 py-1 text-right font-semibold text-slate-700 tabular-nums">
                      {f.total} h
                    </td>
                  </tr>
                ))}
                {histograma.equipos.length > 0 && (
                  <tr>
                    <td
                      colSpan={histograma.semanas.length + 2}
                      className="pt-2 pb-1 text-[11px] font-semibold tracking-wide text-slate-500 uppercase"
                    >
                      Equipos (uso real)
                    </td>
                  </tr>
                )}
                {histograma.equipos.map((f) => (
                  <tr key={`e-${f.id}`} className={f.excede || f.cruce ? 'bg-red-50/60' : ''}>
                    <td className="max-w-[220px] px-2 py-1">
                      <span className="block truncate font-medium text-slate-700">{f.nombre}</span>
                      {f.cruce && (
                        <span className="text-[10px] font-semibold text-red-700">
                          cruce de servicios
                        </span>
                      )}
                    </td>
                    {f.valores.map((h, i) => (
                      <CeldaHistograma
                        key={i}
                        horas={h}
                        capacidad={histograma.capacidad[i]}
                        maxHoras={histograma.maxHoras}
                        tono="bg-blue-800"
                      />
                    ))}
                    <td className="px-2 py-1 text-right font-semibold text-slate-700 tabular-nums">
                      {f.total} h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {modal && (
        <ModalTarea
          servicio={servicio}
          tarea={modal.modo === 'editar' ? modal.tarea : null}
          padre={modal.modo === 'crear' ? modal.padre ?? null : null}
          costos={
            modal.modo === 'editar'
              ? registros
                  .filter((r) => r.tarea_id === modal.tarea.id)
                  .map((r) => ({
                    id: r.id,
                    monto_calculado: r.monto_calculado,
                    texto: `${nombreReferencia(r, estado)} · ${formatearFecha(r.fecha)}`,
                  }))
              : []
          }
          tieneHijos={
            modal.modo === 'editar'
              ? tareas.some((x) => x.padre_id === modal.tarea.id)
              : false
          }
          avanceDerivado={
            modal.modo === 'editar' ? avanceEfectivo(modal.tarea, tareas) : null
          }
          candidatas={candidatas}
          onCerrar={() => setModal(null)}
          onGuardar={guardar}
          onEliminar={eliminar}
        />
      )}

      {calendarioAbierto && (
        <ModalCalendario
          servicio={servicio}
          calendario={calendario}
          onCerrar={() => setCalendarioAbierto(false)}
          onGuardar={guardarCalendario}
        />
      )}

      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />

      {importacion && (
        <Modal
          abierto
          titulo="Importar cronograma desde Excel"
          descripcion={`Archivo: ${importacion.archivo}`}
          onCerrar={cancelarImportacion}
          ancho="lg"
          pie={
            <div className="flex items-center justify-end gap-2">
              <Button variante="secundario" onClick={cancelarImportacion}>
                Cancelar
              </Button>
              <Button onClick={confirmarImportacion} disabled={importacion.tareas.length === 0}>
                Agregar {importacion.tareas.length} tarea{importacion.tareas.length === 1 ? '' : 's'}
              </Button>
            </div>
          }
        >
          {importacion.errores.length > 0 && (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              <p className="mb-2 font-semibold">
                {importacion.errores.length} fila{importacion.errores.length === 1 ? '' : 's'} con advertencia/omisión
              </p>
              <ul className="list-disc space-y-1 pl-4">
                {importacion.errores.slice(0, 8).map((e, i) => (
                  <li key={i}>
                    Fila {e.fila}: {e.motivo}
                  </li>
                ))}
                {importacion.errores.length > 8 && (
                  <li>…y {importacion.errores.length - 8} más.</li>
                )}
              </ul>
            </div>
          )}
          {(importacion.avisos ?? []).length > 0 && (
            <div className="mb-4 rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm text-orange-800">
              <p className="mb-2 font-semibold">
                {importacion.avisos.length} aviso{importacion.avisos.length === 1 ? '' : 's'} (la
                importación continúa)
              </p>
              <ul className="list-disc space-y-1 pl-4">
                {importacion.avisos.slice(0, 8).map((a, i) => (
                  <li key={i}>
                    Fila {a.fila}: {a.motivo}
                  </li>
                ))}
                {importacion.avisos.length > 8 && (
                  <li>…y {importacion.avisos.length - 8} más.</li>
                )}
              </ul>
            </div>
          )}
          {importadasConAvance > 0 && (
            <p className="mb-4 rounded-lg border border-primary-200 bg-primary-50 p-3 text-sm text-primary-800">
              {importadasConAvance} tarea{importadasConAvance === 1 ? '' : 's'} trae(n) un avance
              importado: se guarda como <b>ejecutado previo</b> (metrado o costo), como pasos
              (hitos) o como avance a mano, según el modo de cada tarea, para no mover cifras ya
              valorizadas.
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-300 bg-slate-100 text-xs font-bold tracking-wide text-primary-700 uppercase">
                  <th className="px-2 py-1 text-left">N°</th>
                  <th className="px-2 py-1 text-left">Tarea</th>
                  <th className="px-2 py-1 text-left">Inicio</th>
                  <th className="px-2 py-1 text-left">Fin</th>
                  <th className="px-2 py-1 text-center">Hito</th>
                  <th className="px-2 py-1 text-right">Monto</th>
                  <th className="px-2 py-1 text-right">Días</th>
                  <th className="px-2 py-1 text-left">Modo</th>
                  <th className="px-2 py-1 text-left">Predecesoras</th>
                </tr>
              </thead>
              <tbody>
                {importacion.tareas.slice(0, 20).map((t) => (
                  <tr key={t.id} className="border-t border-slate-100">
                    <td className="px-2 py-1 text-slate-600 tabular-nums">{t.numero ?? ''}</td>
                    <td className="max-w-[280px] truncate px-2 py-1 text-slate-800">{t.nombre}</td>
                    <td className="px-2 py-1 text-slate-600 tabular-nums">{t.fecha_inicio}</td>
                    <td className="px-2 py-1 text-slate-600 tabular-nums">{t.fecha_fin}</td>
                    <td className="px-2 py-1 text-center text-slate-600">{t.hito ? 'SI' : 'NO'}</td>
                    <td className="px-2 py-1 text-right text-slate-600 tabular-nums">
                      {formatearMoneda(t.monto)}
                    </td>
                    <td className="px-2 py-1 text-right text-slate-600 tabular-nums">
                      {diasTareaImportada(t)}
                    </td>
                    <td className="px-2 py-1 text-slate-600">
                      {t.modo_medicion ? ETIQUETAS_CORTAS_MODO[t.modo_medicion] : 'Padre'}
                    </td>
                    <td className="px-2 py-1 text-slate-500">
                      {(t.predecesoras ?? []).map((p, i) => (
                        <span key={i}>
                          {p.ref ?? p.id}
                          {p.tipo !== 'FS' || p.lag ? ` (${p.tipo}${p.lag ? `+${p.lag}` : ''})` : ''}
                          {i < (t.predecesoras ?? []).length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
                {importacion.tareas.length > 20 && (
                  <tr>
                    <td colSpan={9} className="px-2 py-2 text-center text-xs text-slate-500">
                      y {importacion.tareas.length - 20} tareas más
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  )
}
