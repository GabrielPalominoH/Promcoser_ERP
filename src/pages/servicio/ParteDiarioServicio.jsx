import { useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useData } from '../../context/useData'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Campo, Input, Select, Textarea } from '../../components/ui/Field'
import { ComboBox, normalizar } from '../../components/ui/ComboBox'
import { Modal } from '../../components/ui/Modal'
import { Aviso } from '../../components/ui/Aviso'
import {
  Buscador,
  BarraFiltros,
  SelectFiltro,
  textoCoincide,
} from '../../components/ui/FiltroBusqueda'
import {
  Table,
  TableBody,
  TableEmpty,
  TableHead,
  TableRow,
  Td,
  Th,
} from '../../components/ui/Table'
import { formatearCantidad, formatearFecha, formatearMes } from '../../utils/formatters'
import { hoyISO } from '../../utils/calculadora'
import { avancePorHitos, avancePorMetrado } from '../../utils/avance'
import {
  CLIMAS,
  TOLERANCIA_METRADO_DEFECTO,
  avanceAcumulado,
  evaluarFilasMetrado,
  marcarPasosCumplidos,
  matrizCalendario,
  mesDeFecha,
  metradoDeFila,
  metradoEjecutadoAcumulado,
  ordenarPartesDesc,
  parteDeFecha,
  partidasMedibles,
  partesDeServicio,
  personalPresenteSugerido,
  resumenParte,
  resumenPeriodo,
} from '../../utils/partesDiario'
import { avisoMetradoValorizado } from '../../utils/valorizaciones'
import { htmlParteDiario, imprimirHTML } from '../../utils/reportes'
import {
  CALIDAD_FOTO,
  MAX_LADO_FOTO,
  borrarFoto,
  comprimirImagen,
  disponible as fotosDisponibles,
  guardarFoto,
  leerFoto,
} from '../../data/fotos'
import { tamanoEstado } from '../../data/store'

const MAX_FOTOS = 6
// Cuota típica de localStorage ~5 MB. Avisamos bastante antes para que dé
// tiempo a exportar y depurar sin que el guardado empiece a fallar.
const UMBRAL_ALMACENAMIENTO = 4_000_000
const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function Dato({ etiqueta, valor, nota, tono = 'text-slate-900' }) {
  return (
    <div className="rounded-xl border border-slate-300 p-4">
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{etiqueta}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${tono}`}>{valor}</p>
      {nota && <p className="mt-0.5 text-xs text-slate-500">{nota}</p>}
    </div>
  )
}

function Alerta({ tono = 'info', children }) {
  const estilos = {
    info: 'border-primary-200 bg-primary-50 text-primary-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    danger: 'border-red-200 bg-red-50 text-red-800',
  }
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${estilos[tono] ?? estilos.info}`}>
      {children}
    </div>
  )
}

// Miniatura de una foto cargada desde IndexedDB (URL temporal revocada al salir).
function Miniatura({ foto }) {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    let activo = true
    let objectUrl = null
    leerFoto(foto.id).then((blob) => {
      if (!activo || !blob) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    })
    return () => {
      activo = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [foto.id])

  return (
    <figure className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      <div className="flex h-24 items-center justify-center">
        {url ? (
          <img src={url} alt={foto.nombre ?? 'Foto de avance'} className="h-24 w-full object-cover" />
        ) : (
          <span className="text-xs text-slate-400">Cargando…</span>
        )}
      </div>
      <figcaption className="truncate px-2 py-1 text-[11px] text-slate-500" title={foto.nombre}>
        {foto.nombre}
      </figcaption>
    </figure>
  )
}

function nombrePersona(persona, id) {
  if (!persona) return `Personal ${id}`
  return `${persona.nombre} ${persona.apellido ?? ''}`.trim()
}

// Una fila de "Partidas ejecutadas": captura el METRADO del día (modo metrado),
// los pasos cumplidos (modo hitos) o muestra el registro legado (solo lectura).
export function FilaPartida({
  i,
  fila,
  tipo,
  tarea,
  estado,
  opcionesMetrado,
  opcionesHitos,
  onCambiar,
  onAlternarHito,
  onQuitar,
}) {
  const idPartida = `pd-partida-${i}`
  const idNota = `pd-nota-${i}`
  const quitar = (
    <Button type="button" variante="peligro" tamano="sm" onClick={() => onQuitar(i)}>
      Quitar
    </Button>
  )

  if (tipo === 'hitos') {
    const pasos = Array.isArray(tarea?.pasos) ? tarea.pasos : []
    const marcados = fila.hitos ?? []
    return (
      <div className="rounded-lg border border-slate-200 p-3">
        <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-12">
          <Campo label="Partida (hitos)" className="sm:col-span-4" htmlFor={idPartida}>
            <ComboBox
              id={idPartida}
              opciones={opcionesHitos}
              value={fila.tarea_id}
              onChange={(v) => onCambiar(i, 'tarea_id', v)}
              placeholder="Buscar partida…"
            />
          </Campo>
          <div className="sm:col-span-5">
            <p className="mb-1.5 text-sm font-medium text-slate-700">Pasos cumplidos hoy</p>
            {pasos.length === 0 ? (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                {tarea ? 'Esta partida no tiene pasos definidos.' : 'Elige una partida con hitos.'}
              </p>
            ) : (
              <ul className="space-y-1">
                {pasos.map((paso) => {
                  const cumplido = paso.estado === 'cumplido'
                  return (
                    <li key={paso.id} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        className="size-4 shrink-0 accent-primary-600"
                        checked={cumplido || marcados.includes(paso.id)}
                        disabled={cumplido}
                        onChange={() => onAlternarHito(i, paso.id)}
                      />
                      <span className="min-w-0 flex-1 truncate">{paso.nombre}</span>
                      <span className="shrink-0 text-xs text-slate-500 tabular-nums">
                        {formatearCantidad(paso.peso)} %
                      </span>
                      {cumplido && (
                        <span className="shrink-0 text-xs text-emerald-600">
                          {paso.fecha_cumplimiento
                            ? `Cumplido ${formatearFecha(paso.fecha_cumplimiento)}`
                            : 'Cumplido'}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          <Campo label="Nota" className="sm:col-span-2" htmlFor={idNota}>
            <Input
              id={idNota}
              value={fila.nota}
              onChange={(e) => onCambiar(i, 'nota', e.target.value)}
            />
          </Campo>
          <div className="flex justify-end sm:col-span-1">{quitar}</div>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Al guardar se registra el responsable del parte y la fecha en cada paso marcado.
        </p>
      </div>
    )
  }

  if (tipo === 'legado') {
    const metrado = metradoDeFila(fila)
    const unidad = tarea?.unidad ?? ''
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-12">
          <Campo label="Partida" className="sm:col-span-5" htmlFor={idPartida}>
            <ComboBox
              id={idPartida}
              opciones={opcionesMetrado}
              value={fila.tarea_id}
              onChange={() => {}}
              disabled
            />
          </Campo>
          <div className="sm:col-span-3">
            <p className="mb-1.5 text-sm font-medium text-slate-700">Registro del día (legado)</p>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 tabular-nums">
              {metrado != null
                ? `${formatearCantidad(metrado)} ${unidad}`.trim()
                : `${formatearCantidad(fila.avance_dia)} %`}
            </div>
          </div>
          <Campo label="Nota" className="sm:col-span-2" htmlFor={idNota}>
            <Input
              id={idNota}
              value={fila.nota}
              onChange={(e) => onCambiar(i, 'nota', e.target.value)}
            />
          </Campo>
          <div className="flex justify-end sm:col-span-2">{quitar}</div>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Registro anterior a la medición por metrado (solo lectura): su partida no se mide por
          metrado.
        </p>
      </div>
    )
  }

  const sinTarea = fila.tarea_id === '' || fila.tarea_id == null
  const sinContratado = !estado || estado.contratado <= 0
  const excede = Boolean(estado?.excede)
  return (
    <div
      className={`rounded-lg border p-3 ${
        excede ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200'
      }`}
    >
      <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-12">
        <Campo label="Partida" className="sm:col-span-4" htmlFor={idPartida}>
          <ComboBox
            id={idPartida}
            opciones={opcionesMetrado}
            value={fila.tarea_id}
            onChange={(v) => onCambiar(i, 'tarea_id', v)}
            placeholder="Buscar partida…"
          />
        </Campo>
        <Campo
          label="Metrado ejecutado hoy"
          className="sm:col-span-2"
          htmlFor={`pd-met-${i}`}
          hint={estado?.unidad || undefined}
        >
          <Input
            id={`pd-met-${i}`}
            type="number"
            min="0"
            step="any"
            value={fila.metrado_dia}
            onChange={(e) => onCambiar(i, 'metrado_dia', e.target.value)}
          />
        </Campo>
        <Campo label="Nota" className="sm:col-span-3" htmlFor={idNota}>
          <Input
            id={idNota}
            value={fila.nota}
            onChange={(e) => onCambiar(i, 'nota', e.target.value)}
            placeholder="Frente, sector…"
          />
        </Campo>
        <div className="flex justify-end sm:col-span-3">{quitar}</div>
      </div>
      {sinTarea ? (
        <p className="mt-2 text-xs text-slate-500">
          Elige la partida para ver su metrado contratado, el acumulado y el %.
        </p>
      ) : sinContratado ? (
        <p className="mt-2 text-xs text-amber-700">
          Esta partida no tiene metrado contratado: define su metrado en Partidas para poder
          calcular el %.
        </p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          <span>
            Contratado:{' '}
            <b className="tabular-nums">
              {formatearCantidad(estado.contratado)} {estado.unidad}
            </b>
          </span>
          <span>
            Ejecutado previo:{' '}
            <b className="tabular-nums">
              {formatearCantidad(estado.previo)} {estado.unidad}
            </b>
          </span>
          <span>
            Acumulado en partes:{' '}
            <b className="tabular-nums">
              {formatearCantidad(estado.acumuladoPartes)} {estado.unidad}
            </b>
          </span>
          <span>
            Total acumulado:{' '}
            <b className="tabular-nums">
              {formatearCantidad(estado.acumulado)} {estado.unidad}
            </b>
          </span>
          <span>
            Saldo por ejecutar:{' '}
            <b className="tabular-nums">
              {formatearCantidad(estado.saldo)} {estado.unidad}
            </b>
          </span>
          <span>
            % resultante: <b className="tabular-nums">{formatearCantidad(estado.porcentaje)} %</b>
          </span>
          <span>
            Rendimiento del día:{' '}
            <b className="tabular-nums">
              {formatearCantidad(estado.rendimiento)} {estado.unidad} (
              {formatearCantidad(estado.rendimientoPct)} %)
            </b>
          </span>
        </div>
      )}
      {excede && (
        <p className="mt-1 text-xs font-medium text-amber-700">
          Supera el tope de {formatearCantidad(estado.tope)} {estado.unidad} (contratado +{' '}
          {formatearCantidad(estado.tolerancia)} %): justifica el exceso en la nota del parte.
        </p>
      )}
    </div>
  )
}

function FormularioParte({
  servicio,
  parte,
  fechaInicial,
  personal,
  equipos,
  tareasServicio,
  asignaciones,
  partesServicio,
  onGuardar,
  onCerrar,
}) {
  const esEdicion = Boolean(parte)
  const idbDisponible = fotosDisponibles()

  const [fecha, setFecha] = useState(parte?.fecha ?? fechaInicial ?? hoyISO())
  const [clima, setClima] = useState(parte?.clima ?? CLIMAS[0])
  const [temperatura, setTemperatura] = useState(parte?.temperatura ?? '')
  const [responsable, setResponsable] = useState(parte?.responsable ?? '')
  const [incidencias, setIncidencias] = useState(parte?.incidencias ?? '')
  const [observaciones, setObservaciones] = useState(parte?.observaciones ?? '')
  const [fotos, setFotos] = useState(() => parte?.fotos ?? [])
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState(null)
  // Ids de fotos subidas en esta sesión: sirven para limpiar IndexedDB si se
  // cancela o se quitan antes de guardar (evita binarios huérfanos).
  const idsNuevas = useRef(new Set())

  // Solo las hojas con modo `metrado` se capturan por metrado; las de modo
  // `hitos` se marcan por pasos. El resto queda como registro legado.
  const opcionesMetrado = useMemo(
    () =>
      partidasMedibles(tareasServicio, 'metrado').map((t) => ({
        valor: t.id,
        etiqueta: `${t.nombre}${t.unidad ? ` (${t.unidad})` : ''}`,
      })),
    [tareasServicio],
  )
  const opcionesHitos = useMemo(
    () =>
      partidasMedibles(tareasServicio, 'hitos').map((t) => ({
        valor: t.id,
        etiqueta: t.nombre,
      })),
    [tareasServicio],
  )

  const [filasPartidas, setFilasPartidas] = useState(() =>
    parte?.partidas?.length
      ? parte.partidas.map((p) => ({
          tarea_id: p.tarea_id ?? '',
          metrado_dia: p.metrado_dia ?? '',
          avance_dia: p.avance_dia ?? '',
          hitos: Array.isArray(p.hitos) ? p.hitos : [],
          nota: p.nota ?? '',
        }))
      : [],
  )
  const [tolerancia, setTolerancia] = useState(
    parte?.tolerancia_metrado ?? TOLERANCIA_METRADO_DEFECTO,
  )
  const [notaExceso, setNotaExceso] = useState(parte?.nota_exceso ?? '')

  const tareaDeFila = (f) => tareasServicio.find((t) => t.id === f.tarea_id) ?? null
  // Tipo de fila: según el modo de su tarea; una fila nueva conserva el tipo con
  // el que se agregó y una fila sin tarea (borrada) queda como legado.
  const tipoDeFila = (f) => {
    const tarea = tareaDeFila(f)
    if (tarea) {
      if (tarea.modo_medicion === 'metrado') return 'metrado'
      if (tarea.modo_medicion === 'hitos') return 'hitos'
      return 'legado'
    }
    return f.tipo ?? 'metrado'
  }

  const filasMetrado = filasPartidas.filter((f) => tipoDeFila(f) === 'metrado')
  const evaluadas = evaluarFilasMetrado({
    filas: filasMetrado,
    tareas: tareasServicio,
    partes: partesServicio,
    parteId: parte?.id ?? null,
    tolerancia,
  })
  const estadoDeFila = (f) => evaluadas.find((e) => e.tarea_id === f.tarea_id) ?? null
  const conExceso = evaluadas.filter((e) => e.excede)

  const [filasPersonal, setFilasPersonal] = useState(() => {
    const base = personalPresenteSugerido({ asignaciones, personal, servicio, fecha })
    if (!parte?.personal?.length) return base.map((b) => ({ ...b, incluido: true }))
    const filas = base.map((b) => {
      const reg = parte.personal.find((p) => p.personal_id === b.personal_id)
      return {
        ...b,
        incluido: Boolean(reg),
        horas: reg?.horas ?? b.horas,
        tarea_id: reg?.tarea_id ?? b.tarea_id,
      }
    })
    for (const reg of parte.personal) {
      if (!base.some((b) => b.personal_id === reg.personal_id)) {
        const persona = personal.find((p) => p.id === reg.personal_id)
        filas.push({
          personal_id: reg.personal_id,
          nombre: nombrePersona(persona, reg.personal_id),
          cargo: persona?.cargo ?? '',
          horas: reg.horas ?? 8,
          tarea_id: reg.tarea_id ?? null,
          incluido: true,
        })
      }
    }
    return filas
  })

  const [filasEquipos, setFilasEquipos] = useState(() => {
    const filas = equipos.map((e) => {
      const reg = (parte?.equipos ?? []).find((x) => x.equipo_id === e.id)
      return { equipo_id: e.id, nombre: e.nombre, incluido: Boolean(reg), horas: reg?.horas ?? 8 }
    })
    for (const reg of parte?.equipos ?? []) {
      if (!equipos.some((e) => e.id === reg.equipo_id)) {
        filas.push({
          equipo_id: reg.equipo_id,
          nombre: `Equipo ${reg.equipo_id}`,
          incluido: true,
          horas: reg.horas ?? 8,
        })
      }
    }
    return filas
  })

  const alternarPersonal = (i) =>
    setFilasPersonal((fs) => fs.map((f, j) => (j === i ? { ...f, incluido: !f.incluido } : f)))
  const cambiarPersonal = (i, campo, valor) =>
    setFilasPersonal((fs) => fs.map((f, j) => (j === i ? { ...f, [campo]: valor } : f)))
  const alternarEquipo = (i) =>
    setFilasEquipos((fs) => fs.map((f, j) => (j === i ? { ...f, incluido: !f.incluido } : f)))
  const cambiarEquipo = (i, valor) =>
    setFilasEquipos((fs) => fs.map((f, j) => (j === i ? { ...f, horas: valor } : f)))
  const cambiarPartida = (i, campo, valor) =>
    setFilasPartidas((fs) => fs.map((f, j) => (j === i ? { ...f, [campo]: valor } : f)))
  const agregarPartida = (tipo) =>
    setFilasPartidas((fs) => [
      ...fs,
      { tarea_id: '', tipo, metrado_dia: '', avance_dia: '', hitos: [], nota: '' },
    ])
  const alternarHito = (i, pasoId) =>
    setFilasPartidas((fs) =>
      fs.map((f, j) => {
        if (j !== i) return f
        const hitos = f.hitos ?? []
        return {
          ...f,
          hitos: hitos.includes(pasoId) ? hitos.filter((id) => id !== pasoId) : [...hitos, pasoId],
        }
      }),
    )

  const agregarFotos = async (lista) => {
    if (!idbDisponible) {
      setError('El navegador no permite guardar fotos (IndexedDB no disponible).')
      return
    }
    const archivos = Array.from(lista ?? [])
    if (archivos.length === 0) return
    const libres = MAX_FOTOS - fotos.length
    if (libres <= 0) {
      setError(`Máximo ${MAX_FOTOS} fotos por parte.`)
      return
    }
    if (archivos.length > libres) {
      setError(`Solo se agregarán ${libres} foto(s): el máximo es ${MAX_FOTOS} por parte.`)
    }
    setSubiendo(true)
    const nuevas = []
    for (const archivo of archivos.slice(0, libres)) {
      const comprimida = await comprimirImagen(archivo, {
        maxLado: MAX_LADO_FOTO,
        calidad: CALIDAD_FOTO,
      })
      if (!comprimida) continue
      const id = `foto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const ok = await guardarFoto(id, comprimida.blob)
      if (!ok) continue
      idsNuevas.current.add(id)
      nuevas.push({
        id,
        nombre: archivo.name,
        mime: 'image/jpeg',
        tamano: comprimida.tamano,
        ancho: comprimida.ancho,
        alto: comprimida.alto,
      })
    }
    setFotos((fs) => [...fs, ...nuevas])
    setSubiendo(false)
    if (nuevas.length === 0) setError('No se pudo procesar ninguna imagen.')
  }

  const quitarFoto = (foto) => setFotos((fs) => fs.filter((f) => f.id !== foto.id))

  const cancelar = () => {
    // Las fotos agregadas en esta sesión y no guardadas se descartan.
    idsNuevas.current.forEach((id) => borrarFoto(id))
    onCerrar()
  }

  const guardar = () => {
    if (!fecha) {
      setError('Indica la fecha del parte.')
      return
    }
    const otro = parteDeFecha(partesServicio, servicio.id, fecha)
    if (otro && otro.id !== parte?.id) {
      setError('Ya existe un parte para esa fecha. Edítalo en lugar de crear otro.')
      return
    }
    if (!responsable.trim()) {
      setError('Indica el responsable del parte.')
      return
    }

    const personalSel = filasPersonal
      .filter((f) => f.incluido && Number(f.horas) > 0)
      .map((f) => ({
        personal_id: f.personal_id,
        horas: Number(f.horas),
        tarea_id: f.tarea_id === '' ? null : f.tarea_id,
      }))
    const equiposSel = filasEquipos
      .filter((f) => f.incluido && Number(f.horas) > 0)
      .map((f) => ({ equipo_id: f.equipo_id, horas: Number(f.horas) }))
    const partidasSel = filasPartidas.flatMap((f) => {
      if (f.tarea_id === '') return []
      const nota = (f.nota ?? '').trim() || null
      const tipo = tipoDeFila(f)
      if (tipo === 'legado') {
        // Registro anterior a la Fase B: se conserva tal cual (solo lectura).
        const metrado = metradoDeFila(f)
        if (metrado != null) return [{ tarea_id: f.tarea_id, metrado_dia: metrado, nota }]
        const avance = Number(f.avance_dia)
        if (Number.isFinite(avance)) return [{ tarea_id: f.tarea_id, avance_dia: avance, nota }]
        return []
      }
      if (tipo === 'hitos') {
        return f.hitos?.length ? [{ tarea_id: f.tarea_id, hitos: f.hitos, nota }] : []
      }
      const metrado = Number(f.metrado_dia)
      if (!Number.isFinite(metrado) || metrado <= 0) return []
      return [{ tarea_id: f.tarea_id, metrado_dia: metrado, nota }]
    })

    if (partidasSel.length === 0) {
      setError('Registra al menos una partida con su metrado ejecutado del día.')
      return
    }
    const ids = partidasSel.map((p) => p.tarea_id)
    if (new Set(ids).size !== ids.length) {
      setError('Hay partidas repetidas: consolida el metrado del día en una sola fila.')
      return
    }
    if (conExceso.length > 0 && !notaExceso.trim()) {
      setError(
        'El metrado acumulado supera el tope con tolerancia: escribe una nota que justifique el exceso.',
      )
      return
    }

    // Pasos cumplidos HOY: se marcan en la tarea (quién y cuándo). Un paso ya
    // cumplido no se re-fecha.
    const tareasHitos = []
    for (const f of filasPartidas) {
      if (tipoDeFila(f) !== 'hitos' || f.tarea_id === '' || !f.hitos?.length) continue
      const { pasos, cambio } = marcarPasosCumplidos(tareaDeFila(f)?.pasos, f.hitos, {
        fecha,
        por: responsable.trim(),
      })
      if (cambio) tareasHitos.push({ id: f.tarea_id, pasos })
    }

    onGuardar(
      {
        fecha,
        clima,
        temperatura: temperatura === '' ? null : Number(temperatura),
        responsable: responsable.trim(),
        personal: personalSel,
        equipos: equiposSel,
        partidas: partidasSel,
        tolerancia_metrado: Number(tolerancia) || 0,
        nota_exceso: notaExceso.trim() || null,
        incidencias: incidencias.trim(),
        observaciones: observaciones.trim(),
        fotos,
      },
      tareasHitos,
    )
    // Borra de IndexedDB las fotos que ya no quedan en el parte (quitadas
    // durante la edición o subidas y descartadas antes de guardar).
    const conservar = new Set(fotos.map((f) => f.id))
    const candidatas = new Set([
      ...(parte?.fotos ?? []).map((f) => f.id),
      ...idsNuevas.current,
    ])
    candidatas.forEach((id) => {
      if (!conservar.has(id)) borrarFoto(id)
    })
    onCerrar()
  }

  return (
    <Modal
      abierto
      ancho="lg"
      titulo={esEdicion ? `Parte diario del ${formatearFecha(fecha)}` : 'Nuevo parte diario'}
      descripcion="Registra la jornada: personal, equipos, metrado ejecutado de las partidas y pasos cumplidos."
      onCerrar={cancelar}
      pie={
        <>
          <Button variante="secundario" onClick={cancelar}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={subiendo}>
            {esEdicion ? 'Guardar' : 'Registrar'}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Campo label="Fecha" htmlFor="pd-fecha">
            <Input
              id="pd-fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </Campo>
          <Campo label="Clima" htmlFor="pd-clima">
            <Select id="pd-clima" value={clima} onChange={(e) => setClima(e.target.value)}>
              {CLIMAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo label="Temperatura (°C)" hint="Opcional" htmlFor="pd-temp">
            <Input
              id="pd-temp"
              type="number"
              value={temperatura}
              onChange={(e) => setTemperatura(e.target.value)}
            />
          </Campo>
          <Campo label="Responsable" error={error} htmlFor="pd-resp">
            <Input
              id="pd-resp"
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
              placeholder="Ing. de obra"
            />
          </Campo>
        </div>

        {/* Personal presente */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Personal presente</p>
            <p className="text-xs text-slate-500">
              Sugerido desde las asignaciones vigentes ese día.
            </p>
          </div>
          {filasPersonal.length === 0 ? (
            <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
              No hay asignaciones vigentes para esa fecha.
            </p>
          ) : (
            <div className="space-y-2">
              {filasPersonal.map((f, i) => (
                <div
                  key={f.personal_id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2"
                >
                  <label className="flex min-w-0 flex-1 items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={f.incluido}
                      onChange={() => alternarPersonal(i)}
                      className="size-4 accent-primary-600"
                    />
                    <span className="min-w-0 truncate">
                      {f.nombre}
                      {f.cargo ? <span className="text-slate-400"> · {f.cargo}</span> : null}
                    </span>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    className="w-24"
                    disabled={!f.incluido}
                    value={f.horas}
                    onChange={(e) => cambiarPersonal(i, 'horas', e.target.value)}
                    aria-label={`Horas de ${f.nombre}`}
                  />
                  <span className="text-xs text-slate-400">horas</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Equipos */}
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Equipos usados</p>
          {filasEquipos.length === 0 ? (
            <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
              No hay equipos registrados.
            </p>
          ) : (
            <div className="space-y-2">
              {filasEquipos.map((f, i) => (
                <div
                  key={f.equipo_id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2"
                >
                  <label className="flex min-w-0 flex-1 items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={f.incluido}
                      onChange={() => alternarEquipo(i)}
                      className="size-4 accent-primary-600"
                    />
                    <span className="min-w-0 truncate">{f.nombre}</span>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    className="w-24"
                    disabled={!f.incluido}
                    value={f.horas}
                    onChange={(e) => cambiarEquipo(i, e.target.value)}
                    aria-label={`Horas de ${f.nombre}`}
                  />
                  <span className="text-xs text-slate-400">horas</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Partidas ejecutadas: metrado del día o pasos cumplidos */}
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-700">Partidas ejecutadas</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variante="secundario"
                tamano="sm"
                disabled={opcionesMetrado.length === 0}
                onClick={() => agregarPartida('metrado')}
              >
                Agregar partida
              </Button>
              <Button
                type="button"
                variante="secundario"
                tamano="sm"
                disabled={opcionesHitos.length === 0}
                onClick={() => agregarPartida('hitos')}
              >
                Agregar hito
              </Button>
            </div>
          </div>
          <p className="mb-2 text-xs text-slate-500">
            Registra el metrado ejecutado HOY (con la unidad de la partida); el acumulado total
            (ejecutado previo + partes), el saldo y el % se calculan sumando lo previo y todos los
            partes. Las partidas por hitos se marcan por pasos.
          </p>
          {filasPartidas.length === 0 ? (
            <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Sin partidas en el parte: agrega una partida (metrado) o un hito.
            </p>
          ) : (
            <div className="space-y-2">
              {filasPartidas.map((f, i) => (
                <FilaPartida
                  key={i}
                  i={i}
                  fila={f}
                  tipo={tipoDeFila(f)}
                  tarea={tareaDeFila(f)}
                  estado={estadoDeFila(f)}
                  opcionesMetrado={opcionesMetrado}
                  opcionesHitos={opcionesHitos}
                  onCambiar={cambiarPartida}
                  onAlternarHito={alternarHito}
                  onQuitar={(j) => setFilasPartidas((fs) => fs.filter((_, k) => k !== j))}
                />
              ))}
            </div>
          )}
          {filasMetrado.length > 0 && (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-12">
              <Campo
                label="Tolerancia de metrado (%)"
                className="sm:col-span-3"
                htmlFor="pd-tolerancia"
                hint="Margen sobre el metrado contratado."
              >
                <Input
                  id="pd-tolerancia"
                  type="number"
                  min="0"
                  step="any"
                  value={tolerancia}
                  onChange={(e) => setTolerancia(e.target.value)}
                />
              </Campo>
              {conExceso.length > 0 && (
                <Campo
                  label="Nota de justificación del exceso"
                  className="sm:col-span-9"
                  htmlFor="pd-exceso"
                  error={
                    notaExceso.trim() ? undefined : 'Obligatoria para guardar con exceso de metrado.'
                  }
                >
                  <Input
                    id="pd-exceso"
                    value={notaExceso}
                    onChange={(e) => setNotaExceso(e.target.value)}
                    placeholder="Motivo por el que se ejecutó más metrado que el contratado…"
                  />
                </Campo>
              )}
            </div>
          )}
        </div>

        {/* Fotos */}
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">
            Fotos de avance ({fotos.length}/{MAX_FOTOS})
          </p>
          {!idbDisponible && (
            <p className="mb-2 rounded-lg bg-amber-50 px-4 py-2 text-xs text-amber-800">
              Este navegador no permite guardar fotos (IndexedDB no disponible). El resto del parte
              funciona con normalidad.
            </p>
          )}
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={!idbDisponible || subiendo || fotos.length >= MAX_FOTOS}
            onChange={(e) => {
              agregarFotos(e.target.files)
              e.target.value = ''
            }}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-primary-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-primary-700 disabled:text-slate-400"
          />
          {subiendo && <p className="mt-1 text-xs text-slate-500">Comprimiendo y guardando…</p>}
          {fotos.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {fotos.map((f) => (
                <div key={f.id} className="relative">
                  <Miniatura foto={f} />
                  <button
                    type="button"
                    onClick={() => quitarFoto(f)}
                    className="absolute top-1 right-1 rounded-full bg-slate-900/70 px-1.5 text-xs text-white"
                    aria-label={`Quitar ${f.nombre}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo label="Incidencias" htmlFor="pd-inc">
            <Textarea
              id="pd-inc"
              rows={3}
              value={incidencias}
              onChange={(e) => setIncidencias(e.target.value)}
              placeholder="Paralizaciones, accidentes, falta de material…"
            />
          </Campo>
          <Campo label="Observaciones" htmlFor="pd-obs">
            <Textarea
              id="pd-obs"
              rows={3}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Notas generales de la jornada"
            />
          </Campo>
        </div>
      </div>
    </Modal>
  )
}

function ModalVerParte({ parte, personal, equipos, tareasServicio, partesServicio, onCerrar, onImprimir }) {
  const resumen = resumenParte(parte, { tareas: tareasServicio })
  const tareaDe = (id) => tareasServicio.find((t) => t.id === id)
  const personaDe = (id) => personal.find((p) => p.id === id)
  const equipoDe = (id) => equipos.find((e) => e.id === id)

  return (
    <Modal
      abierto
      ancho="lg"
      titulo={`Parte diario del ${formatearFecha(parte.fecha)}`}
      descripcion={`${parte.clima ?? '—'}${parte.responsable ? ` · Responsable: ${parte.responsable}` : ''}`}
      onCerrar={onCerrar}
      pie={
        <>
          <Button variante="secundario" onClick={onCerrar}>
            Cerrar
          </Button>
          <Button onClick={() => onImprimir(parte)}>Imprimir / PDF</Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Dato etiqueta="Personal" valor={resumen.personal} nota={`${formatearCantidad(resumen.horasPersonal)} h`} />
          <Dato etiqueta="Equipos" valor={resumen.equipos} nota={`${formatearCantidad(resumen.horasEquipos)} h`} />
          <Dato etiqueta="Partidas" valor={resumen.partidas} nota={`${formatearCantidad(resumen.avanceTotal)} % del día`} />
          <Dato
            etiqueta="Temperatura"
            valor={parte.temperatura != null && parte.temperatura !== '' ? `${formatearCantidad(parte.temperatura)} °C` : '—'}
          />
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">Personal presente</p>
          {parte.personal?.length ? (
            <Table>
              <TableHead>
                <TableRow>
                  <Th>Personal</Th>
                  <Th>Tarea</Th>
                  <Th alinear="right">Horas</Th>
                </TableRow>
              </TableHead>
              <TableBody>
                {parte.personal.map((x, i) => (
                  <TableRow key={i}>
                    <Td className="font-medium text-slate-800">
                      {nombrePersona(personaDe(x.personal_id), x.personal_id)}
                    </Td>
                    <Td className="text-slate-600">{tareaDe(x.tarea_id)?.nombre ?? '—'}</Td>
                    <Td alinear="right" className="tabular-nums">
                      {formatearCantidad(x.horas)}
                    </Td>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-slate-500">Sin personal registrado.</p>
          )}
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">Equipos</p>
          {parte.equipos?.length ? (
            <Table>
              <TableHead>
                <TableRow>
                  <Th>Equipo</Th>
                  <Th alinear="right">Horas</Th>
                </TableRow>
              </TableHead>
              <TableBody>
                {parte.equipos.map((x, i) => (
                  <TableRow key={i}>
                    <Td className="font-medium text-slate-800">
                      {equipoDe(x.equipo_id)?.nombre ?? `Equipo ${x.equipo_id}`}
                    </Td>
                    <Td alinear="right" className="tabular-nums">
                      {formatearCantidad(x.horas)}
                    </Td>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-slate-500">Sin equipos registrados.</p>
          )}
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">Partidas ejecutadas</p>
          <Table>
            <TableHead>
              <TableRow>
                <Th>Partida</Th>
                <Th>UM</Th>
                <Th alinear="right">Registro del día</Th>
                <Th alinear="right">Ejecutado previo</Th>
                <Th alinear="right">Acumulado en partes</Th>
                <Th alinear="right">Total acumulado</Th>
                <Th alinear="right">%</Th>
              </TableRow>
            </TableHead>
            <TableBody>
              {(parte.partidas ?? []).map((x, i) => {
                const tarea = tareaDe(x.tarea_id)
                const metrado = metradoDeFila(x)
                const esMetrado = metrado != null
                const previo = esMetrado ? Number(tarea?.metrado_previo) || 0 : 0
                const acumuladoPartes = esMetrado
                  ? metradoEjecutadoAcumulado(partesServicio, x.tarea_id)
                  : avanceAcumulado(partesServicio, x.tarea_id)
                const total = esMetrado ? previo + acumuladoPartes : acumuladoPartes
                const pasos = Array.isArray(x.hitos)
                  ? x.hitos
                      .map((id) => tarea?.pasos?.find((p) => p.id === id))
                      .filter(Boolean)
                  : []
                return (
                  <TableRow key={i}>
                    <Td className="font-medium text-slate-800">
                      {tarea?.nombre ?? 'Sin tarea'}
                      {x.nota ? <span className="block text-xs text-slate-400">{x.nota}</span> : null}
                      {pasos.length > 0 ? (
                        <span className="block text-xs text-slate-400">
                          {pasos.map((p) => p.nombre).join(', ')}
                        </span>
                      ) : null}
                    </Td>
                    <Td className="text-slate-600">{tarea?.unidad ?? '—'}</Td>
                    <Td alinear="right" className="tabular-nums">
                      {esMetrado
                        ? `${formatearCantidad(metrado)} ${tarea?.unidad ?? ''}`.trim()
                        : pasos.length > 0
                          ? `${pasos.length} paso(s)`
                          : `${formatearCantidad(x.avance_dia)} %`}
                    </Td>
                    <Td alinear="right" className="tabular-nums">
                      {esMetrado
                        ? `${formatearCantidad(previo)} ${tarea?.unidad ?? ''}`.trim()
                        : '—'}
                    </Td>
                    <Td alinear="right" className="tabular-nums">
                      {esMetrado
                        ? `${formatearCantidad(acumuladoPartes)} ${tarea?.unidad ?? ''}`.trim()
                        : `${formatearCantidad(acumuladoPartes)} %`}
                    </Td>
                    <Td alinear="right" className="tabular-nums">
                      {esMetrado
                        ? `${formatearCantidad(total)} ${tarea?.unidad ?? ''}`.trim()
                        : `${formatearCantidad(total)} %`}
                    </Td>
                    <Td alinear="right" className="tabular-nums">
                      {esMetrado
                        ? `${formatearCantidad(avancePorMetrado({ metrado: tarea?.metrado, ejecutado: total }))} %`
                        : tarea?.modo_medicion === 'hitos'
                          ? `${formatearCantidad(avancePorHitos(tarea?.pasos))} %`
                          : '—'}
                    </Td>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {parte.nota_exceso ? (
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">Exceso de metrado</p>
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {parte.nota_exceso}
            </p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">Incidencias</p>
            <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm whitespace-pre-wrap text-slate-600">
              {parte.incidencias || 'Sin incidencias.'}
            </p>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">Observaciones</p>
            <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm whitespace-pre-wrap text-slate-600">
              {parte.observaciones || 'Sin observaciones.'}
            </p>
          </div>
        </div>

        {parte.fotos?.length > 0 && (
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">
              Fotos de avance ({parte.fotos.length})
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {parte.fotos.map((f) => (
                <Miniatura key={f.id} foto={f} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export function ParteDiarioServicio() {
  const { servicio } = useOutletContext()
  const { estado, agregarItem, actualizarItem, eliminarItem } = useData()

  const [aviso, setAviso] = useState(null)
  const [vista, setVista] = useState('lista')
  const [mesCalendario, setMesCalendario] = useState(() => mesDeFecha(hoyISO()))
  const [filtroMes, setFiltroMes] = useState(() => mesDeFecha(hoyISO()))
  const [busqueda, setBusqueda] = useState('')
  const [filtroClima, setFiltroClima] = useState('')
  const [modal, setModal] = useState(null) // { parte? , fecha? }
  const [verId, setVerId] = useState(null)

  const personal = estado.personal ?? []
  const equipos = estado.equipos ?? []
  const asignaciones = estado.asignaciones ?? []

  const partes = useMemo(
    () => partesDeServicio(estado.partes_diario, servicio.id),
    [estado.partes_diario, servicio.id],
  )
  const tareasServicio = useMemo(
    () => (estado.tareas ?? []).filter((t) => t.servicio_id === servicio.id),
    [estado.tareas, servicio.id],
  )
  const partesOrdenados = useMemo(() => ordenarPartesDesc(partes), [partes])

  const termino = normalizar(busqueda).trim()
  const partesFiltrados = useMemo(
    () =>
      partesOrdenados.filter(
        (p) =>
          (!filtroMes || mesDeFecha(p.fecha) === filtroMes) &&
          (!filtroClima || p.clima === filtroClima) &&
          (!termino ||
            textoCoincide(p.responsable, termino) ||
            textoCoincide(p.clima, termino) ||
            textoCoincide(p.incidencias, termino) ||
            textoCoincide(p.observaciones, termino) ||
            textoCoincide(formatearFecha(p.fecha), termino)),
      ),
    [partesOrdenados, filtroMes, filtroClima, termino],
  )

  const resumen = resumenPeriodo(partes, `${mesCalendario}-01`, `${mesCalendario}-31`)
  const porFecha = useMemo(() => new Map(partes.map((p) => [p.fecha, p])), [partes])

  const tamano = useMemo(() => tamanoEstado(estado), [estado])
  const idbDisponible = fotosDisponibles()

  const abrirNuevo = (fecha) => {
    const existente = parteDeFecha(partes, servicio.id, fecha)
    if (existente) {
      setModal({ parte: existente })
      return
    }
    setModal({ fecha })
  }

  const imprimir = (parte) => {
    const html = htmlParteDiario({
      servicio,
      parte,
      refs: { personal, equipos, tareas: tareasServicio },
      partes,
      generado: formatearFecha(hoyISO()),
    })
    if (!imprimirHTML(html)) {
      setAviso({ tipo: 'error', mensaje: 'No se pudo abrir la impresión del parte.' })
    }
  }

  // El avance de `tarea.avance` lo recalcula el reducer central a partir de los
  // partes y del modo de cada tarea: aquí solo se guardan los datos.
  const guardarParte = (datos, existente, tareasHitos = []) => {
    // Los pasos marcados en el parte se aplican a la tarea (quién y cuándo).
    tareasHitos.forEach((cambio) => actualizarItem('tareas', cambio))

    if (existente) {
      actualizarItem('partes_diario', { id: existente.id, ...datos })
    } else {
      agregarItem('partes_diario', { servicio_id: servicio.id, ...datos })
    }

    const avisoValorizado = avisoMetradoValorizado(estado.valorizaciones, datos.partidas)
    setAviso(
      avisoValorizado ?? {
        tipo: 'exito',
        mensaje: `Parte del ${formatearFecha(datos.fecha)} ${existente ? 'actualizado' : 'registrado'}.`,
      },
    )
  }

  const eliminarParte = (parte) => {
    ;(parte.fotos ?? []).forEach((f) => borrarFoto(f.id))
    eliminarItem('partes_diario', parte.id)
    // El avance retrocede solo (lo recalcula el reducer); lo ya valorizado no.
    setAviso(
      avisoMetradoValorizado(estado.valorizaciones, parte.partidas) ?? {
        tipo: 'info',
        mensaje: `Parte del ${formatearFecha(parte.fecha)} eliminado.`,
      },
    )
  }

  const moverMes = (delta) => {
    const [anio, m] = mesCalendario.split('-').map(Number)
    const d = new Date(anio, m - 1 + delta, 1)
    setMesCalendario(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const semanas = useMemo(() => matrizCalendario(mesCalendario), [mesCalendario])
  const parteVer = verId != null ? partes.find((p) => p.id === verId) : null

  return (
    <div className="space-y-6">
      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />

      {!idbDisponible && (
        <Alerta tono="warning">
          Este navegador no permite guardar fotos (IndexedDB no disponible). El parte diario funciona
          sin fotos.
        </Alerta>
      )}
      {tamano > UMBRAL_ALMACENAMIENTO && (
        <Alerta tono="danger">
          El respaldo se acerca al límite de localStorage (~{(tamano / 1_000_000).toFixed(1)} MB de
          ~5 MB). Exporta un respaldo y depura datos para evitar que el guardado falle.
        </Alerta>
      )}

      <Card
        titulo="Parte diario de obra"
        descripcion="Jornada por jornada: clima, personal, equipos, partidas ejecutadas e incidencias. El avance alimenta el cronograma."
        acciones={
          <div className="flex flex-wrap gap-2">
            <Button
              variante="secundario"
              onClick={() => setVista(vista === 'lista' ? 'calendario' : 'lista')}
            >
              {vista === 'lista' ? 'Ver calendario' : 'Ver lista'}
            </Button>
            <Button onClick={() => abrirNuevo(hoyISO())}>Nuevo parte</Button>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Dato etiqueta={`Partes de ${formatearMes(mesCalendario)}`} valor={resumen.cantidad} />
          <Dato etiqueta="Horas de personal" valor={formatearCantidad(resumen.horasPersonal)} />
          <Dato etiqueta="Horas de equipos" valor={formatearCantidad(resumen.horasEquipos)} />
          <Dato etiqueta="Partidas ejecutadas" valor={resumen.partidas} nota={`${resumen.fotos} foto(s)`} />
        </div>
      </Card>

      {vista === 'lista' ? (
        <Card
          titulo="Partes registrados"
          descripcion="Filtra por mes, clima o texto. Cada parte guarda el avance del día de sus partidas."
        >
          {partes.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
              Sin partes registrados. Crea el primero con “Nuevo parte”.
            </p>
          ) : (
            <>
              <BarraFiltros
                contador={
                  <span className="font-semibold text-slate-700">{partesFiltrados.length}</span>
                }
              >
                <Buscador
                  valor={busqueda}
                  onChange={setBusqueda}
                  placeholder="Buscar en partes…"
                  ariaLabel="Buscar partes"
                />
                <SelectFiltro
                  label="Mes"
                  value={filtroMes}
                  onChange={setFiltroMes}
                >
                  <option value="">Todos los meses</option>
                  {[...new Set(partes.map((p) => mesDeFecha(p.fecha)))]
                    .sort()
                    .reverse()
                    .map((m) => (
                      <option key={m} value={m}>
                        {formatearMes(m)}
                      </option>
                    ))}
                </SelectFiltro>
                <SelectFiltro label="Clima" value={filtroClima} onChange={setFiltroClima}>
                  <option value="">Todos los climas</option>
                  {CLIMAS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </SelectFiltro>
              </BarraFiltros>

              <Table>
                <TableHead>
                  <TableRow>
                    <Th>Fecha</Th>
                    <Th>Clima</Th>
                    <Th>Responsable</Th>
                    <Th alinear="right">Personal</Th>
                    <Th alinear="right">Equipos</Th>
                    <Th alinear="right">Partidas</Th>
                    <Th alinear="right">Fotos</Th>
                    <Th alinear="right" className="w-52">
                      Acciones
                    </Th>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {partesFiltrados.length === 0 ? (
                    <TableEmpty colSpan={8} mensaje="Ningún parte coincide con el filtro." />
                  ) : (
                    partesFiltrados.map((p) => {
                      const r = resumenParte(p, { tareas: tareasServicio })
                      return (
                        <TableRow key={p.id}>
                          <Td className="font-medium tabular-nums text-slate-900">
                            {formatearFecha(p.fecha)}
                          </Td>
                          <Td className="text-slate-600">{p.clima ?? '—'}</Td>
                          <Td className="max-w-[10rem] truncate text-slate-600">
                            {p.responsable ?? '—'}
                          </Td>
                          <Td alinear="right" className="tabular-nums">
                            {r.personal}{' '}
                            <span className="text-slate-400">({formatearCantidad(r.horasPersonal)} h)</span>
                          </Td>
                          <Td alinear="right" className="tabular-nums">
                            {r.equipos}{' '}
                            <span className="text-slate-400">({formatearCantidad(r.horasEquipos)} h)</span>
                          </Td>
                          <Td alinear="right" className="tabular-nums">
                            {r.partidas}
                          </Td>
                          <Td alinear="right" className="tabular-nums">
                            {r.fotos > 0 ? <Badge variante="info">{r.fotos}</Badge> : '—'}
                          </Td>
                          <Td alinear="right">
                            <div className="flex justify-end gap-2">
                              <Button variante="secundario" tamano="sm" onClick={() => setVerId(p.id)}>
                                Ver
                              </Button>
                              <Button
                                variante="secundario"
                                tamano="sm"
                                onClick={() => setModal({ parte: p })}
                              >
                                Editar
                              </Button>
                              <Button
                                variante="secundario"
                                tamano="sm"
                                onClick={() => imprimir(p)}
                              >
                                PDF
                              </Button>
                              <Button variante="peligro" tamano="sm" onClick={() => eliminarParte(p)}>
                                Eliminar
                              </Button>
                            </div>
                          </Td>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </>
          )}
        </Card>
      ) : (
        <Card
          titulo="Calendario de partes"
          descripcion="Clic en un día para ver o registrar su parte."
          acciones={
            <div className="flex items-center gap-2">
              <Button variante="secundario" tamano="sm" onClick={() => moverMes(-1)}>
                ‹
              </Button>
              <span className="w-28 text-center text-sm font-medium text-slate-700">
                {formatearMes(mesCalendario)}
              </span>
              <Button variante="secundario" tamano="sm" onClick={() => moverMes(1)}>
                ›
              </Button>
            </div>
          }
        >
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold tracking-wide text-slate-400 uppercase">
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {semanas.flat().map((dia, i) => {
              if (!dia) return <div key={`v-${i}`} className="min-h-20 rounded-lg bg-slate-50/60" />
              const parte = porFecha.get(dia)
              const numero = Number(dia.slice(8))
              const esHoy = dia === hoyISO()
              return (
                <button
                  key={dia}
                  type="button"
                  onClick={() => abrirNuevo(dia)}
                  className={`min-h-20 rounded-lg border p-1.5 text-left transition-colors ${
                    parte
                      ? 'border-primary-300 bg-primary-50 hover:bg-primary-100'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                      esHoy ? 'bg-primary-600 text-white' : 'text-slate-600'
                    }`}
                  >
                    {numero}
                  </span>
                  {parte && (
                    <span className="mt-1 block space-y-0.5">
                      <span className="block truncate text-[11px] font-medium text-primary-700">
                        {parte.clima}
                      </span>
                      <span className="block text-[11px] text-slate-500">
                        {resumenParte(parte).partidas} partida(s)
                      </span>
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </Card>
      )}

      {modal && (
        <FormularioParte
          servicio={servicio}
          parte={modal.parte ?? null}
          fechaInicial={modal.fecha ?? null}
          personal={personal}
          equipos={equipos}
          tareasServicio={tareasServicio}
          asignaciones={asignaciones}
          partesServicio={partes}
          onGuardar={(datos, tareasHitos) => guardarParte(datos, modal.parte ?? null, tareasHitos)}
          onCerrar={() => setModal(null)}
        />
      )}

      {parteVer && (
        <ModalVerParte
          parte={parteVer}
          personal={personal}
          equipos={equipos}
          tareasServicio={tareasServicio}
          partesServicio={partes}
          onCerrar={() => setVerId(null)}
          onImprimir={imprimir}
        />
      )}
    </div>
  )
}
