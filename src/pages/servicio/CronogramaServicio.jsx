import { useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useData } from '../../context/useData'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Campo, Input } from '../../components/ui/Field'

import { Modal } from '../../components/ui/Modal'
import { Aviso } from '../../components/ui/Aviso'
import { Badge } from '../../components/ui/Badge'
import { formatearFecha, formatearMoneda } from '../../utils/formatters'
import { avanceEfectivo, estadoTarea, hoyISO, nombreReferencia, sumarMontos } from '../../utils/calculadora'

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

const COLORES_BARRA = {
  completada: 'bg-emerald-500',
  atrasada: 'bg-red-500',
  'en curso': 'bg-blue-700',
  pendiente: 'bg-slate-400',
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

function ModalTarea({ servicio, tarea, padre, costos, tieneHijos, avanceDerivado, onCerrar, onGuardar, onEliminar }) {
  const enEdicion = Boolean(tarea)
  const [confirmando, setConfirmando] = useState(false)
  const esGrupo = enEdicion && tieneHijos

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm({
    defaultValues: tarea
      ? {
          nombre: tarea.nombre,
          fecha_inicio: tarea.fecha_inicio,
          fecha_fin: tarea.fecha_fin,
          avance: tarea.avance ?? 0,
        }
      : { nombre: '', fecha_inicio: hoyISO(), fecha_fin: hoyISO(), avance: 0 },
    mode: 'onBlur',
  })

  const enviar = (valores) => {
    const nombreTarea = valores.nombre.trim()
    onGuardar({
      id: tarea?.id,
      servicio_id: servicio.id,
      padre_id: tarea?.padre_id ?? padre?.id ?? null,
      monto: tarea?.monto ?? 0,
      nombre: nombreTarea,
      fecha_inicio: valores.fecha_inicio,
      fecha_fin: valores.fecha_fin,
      // Con hijas, el avance se calcula solo desde las subtareas.
      avance: esGrupo
        ? Number(tarea.avance) || 0
        : Math.min(100, Math.max(0, Number(valores.avance) || 0)),
    })
  }

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
            <Campo label="Fin" error={errors.fecha_fin?.message} htmlFor="tarea-fin">
              <Input
                id="tarea-fin"
                type="date"
                min={padre?.fecha_inicio}
                max={padre?.fecha_fin}
                {...register('fecha_fin', {
                  required: 'Indica el fin',
                  validate: (valor) => {
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
              <Campo label="Avance (%)" error={errors.avance?.message} htmlFor="tarea-avance">
                <Input
                  id="tarea-avance"
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  {...register('avance', {
                    valueAsNumber: true,
                    min: { value: 0, message: 'Mínimo: 0' },
                    max: { value: 100, message: 'Máximo: 100' },
                  })}
                />
              </Campo>
            )}
          </div>
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

export function CronogramaServicio() {
  const { servicio } = useOutletContext()
  const { estado, agregarItem, actualizarItem, eliminarItem, reemplazarColeccion } = useData()
  const { tareas: todas } = estado

  const [aviso, setAviso] = useState(null)
  const [modal, setModal] = useState(null) // null | { modo: 'crear', padre? } | { modo: 'editar', tarea }
  const [colapsadas, setColapsadas] = useState({})
  const [zoomManual, setZoomManual] = useState(null) // px por día elegido con +/−; null = ajuste automático
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

  // Filas planas para la lista y el diagrama, con numeración jerárquica
  // 1, 1.1, 1.1.1… Respetan los grupos colapsados.
  const filas = useMemo(() => {
    const lista = []
    const recorrer = (nodo, nivel, numero) => {
      const hijas = nodo.hijas
      lista.push({ tarea: nodo.tarea, nivel, numero, hijas: hijas.map((h) => h.tarea) })
      if (hijas.length > 0 && !colapsadas[nodo.tarea.id]) {
        hijas.forEach((hija, j) => recorrer(hija, nivel + 1, `${numero}.${j + 1}`))
      }
    }
    arbol.forEach((nodo, i) => recorrer(nodo, 0, `${i + 1}`))
    return lista
  }, [arbol, colapsadas])

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

  const rango = useMemo(() => {
    if (tareas.length === 0) return null
    const inicios = tareas.map((t) => t.fecha_inicio)
    const fines = tareas.map((t) => t.fecha_fin)
    let minimo = inicios.reduce((a, b) => (a < b ? a : b))
    let maximo = fines.reduce((a, b) => (a > b ? a : b))
    if (servicio.fecha_inicio && servicio.fecha_inicio < minimo) minimo = servicio.fecha_inicio
    if (servicio.fecha_fin_estimada && servicio.fecha_fin_estimada > maximo) {
      maximo = servicio.fecha_fin_estimada
    }
    if (hoy < minimo) minimo = hoy
    // Horizonte acotado: el cronograma continúa 12 meses más allá de hoy
    // (cruza de año sin problemas) en vez de cortarse en diciembre.
    const horizonte = sumarMeses(hoy, 12)
    if (horizonte > maximo) maximo = horizonte
    // Un día de aire al inicio.
    const base = parsearFecha(minimo).getTime() - DIA_MS
    const totalDias = diasEntre(
      new Date(base).getFullYear() +
        '-' +
        String(new Date(base).getMonth() + 1).padStart(2, '0') +
        '-' +
        String(new Date(base).getDate()).padStart(2, '0'),
      maximo,
    ) + 1
    return { inicioMs: base, totalDias }
  }, [tareas, servicio.fecha_inicio, servicio.fecha_fin_estimada, hoy])

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
  const desplazar = (direccion) => {
    scrollRef.current?.scrollBy({ left: direccion * scrollRef.current.clientWidth * 0.8, behavior: 'smooth' })
  }

  const irAHoy = () => {
    const contenedor = scrollRef.current
    if (!contenedor || !rango || posHoy < 0 || posHoy > 100) return
    const anchoPista = (rango.totalDias * diaPx)
    contenedor.scrollTo({ left: Math.max(0, (posHoy / 100) * anchoPista - contenedor.clientWidth / 2), behavior: 'smooth' })
  }

  const pos = (fechaISO) => ((parsearFecha(fechaISO).getTime() - rango.inicioMs) / DIA_MS / rango.totalDias) * 100
  const ancho = (desdeISO, hastaISO) => ((diasEntre(desdeISO, hastaISO) + 1) / rango.totalDias) * 100
  const posHoy = rango
    ? ((parsearFecha(hoy).getTime() - rango.inicioMs) / DIA_MS / rango.totalDias) * 100
    : -1

  // Foco inicial en el mes actual (solo una vez, cuando ya se midió el ancho).
  useEffect(() => {
    if (enfocadoHoy.current || !rango || tareas.length === 0 || anchoCaja === 0) {
      return
    }
    const contenedor = scrollRef.current
    if (!contenedor) return
    const xHoy = (posHoy / 100) * (rango.totalDias * diaPx)
    contenedor.scrollTo({ left: Math.max(0, xHoy - contenedor.clientWidth * 0.25), behavior: 'auto' })
    enfocadoHoy.current = true
  }, [rango, diaPx, anchoCaja, tareas.length, posHoy])

  const conEstado = tareas.map((t) => ({ ...t, estado: estadoTarea(t, hoy) }))
  const completadas = conEstado.filter((t) => t.estado === 'completada').length
  const atrasadas = conEstado.filter((t) => t.estado === 'atrasada').length
  const duracionTotal = conEstado.reduce((s, t) => s + diasEntre(t.fecha_inicio, t.fecha_fin) + 1, 0)
  const avanceGlobal = duracionTotal
    ? Math.round(
        conEstado.reduce(
          (s, t) => s + (Number(t.avance) || 0) * (diasEntre(t.fecha_inicio, t.fecha_fin) + 1),
          0,
        ) / duracionTotal,
      )
    : 0

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
        </div>
        <Button onClick={() => setModal({ modo: 'crear' })}>Nueva tarea</Button>
      </div>

      {tareas.length > 0 && (
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
              onClick={() => setZoomManual((previo) => indicePaso(previo ?? diaPx, -1))}
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
              onClick={() => setZoomManual(null)}
              className="min-w-20 rounded-md px-1 py-1.5 text-center text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100"
              title="Volver al ajuste automático"
            >
              {esTrimestre ? 'Trimestres' : 'Días'}
            </button>
            <button
              type="button"
              onClick={() => setZoomManual((previo) => indicePaso(previo ?? diaPx, 1))}
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
      ) : (
        <div>
          <section ref={envolturaRef} className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-4 shadow-sm">
          <div ref={scrollRef} className="overflow-x-auto">
            <div className="transition-[width] duration-300 ease-out" style={{ width: ANCHO_ETIQUETA + rango.totalDias * diaPx }}>
              {/* Encabezado de altura fija: no se mueve al cambiar de vista */}
              <div className="mb-1 flex h-[60px] border-b border-slate-200">
                <div
                  className="sticky left-0 z-20 shrink-0 bg-white px-3 py-2 text-xs font-semibold text-slate-500"
                  style={{ width: ANCHO_ETIQUETA }}
                >
                  Tarea
                </div>
                <div className="relative flex-1">
                  {esTrimestre ? (
                    <>
                      <div className="relative h-8 border-b border-slate-100">
                        {(() => {
                          let x = 0
                          return trimestres.map((grupo, gi) => {
                            const anchoGrupo = grupo.reduce((s, m) => s + m.dias * diaPx, 0)
                            const centro = x + anchoGrupo / 2
                            x += anchoGrupo
                            return (
                              <span
                                key={gi}
                                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-bold whitespace-nowrap text-slate-700 capitalize transition-[left] duration-300 ease-out"
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
                            className="flex shrink-0 items-center justify-center overflow-hidden border-l border-slate-100 px-1 text-center text-[11px] font-semibold whitespace-nowrap text-slate-500 capitalize transition-[width] duration-300 ease-out"
                            style={{ width: m.dias * diaPx }}
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
                            className="flex items-center border-l border-slate-200 px-2 text-xs font-semibold text-slate-600 capitalize transition-[width] duration-300 ease-out"
                            style={{ width: m.dias * diaPx }}
                          >
                            {MESES[m.fecha.getMonth()]} {m.fecha.getFullYear()}
                          </div>
                        ))}
                      </div>
                      <div className="flex h-7 items-stretch border-t border-slate-100">
                        {dias.map((d, i) => (
                          <div
                            key={i}
                            className="flex shrink-0 items-center justify-center text-center text-xs text-slate-500 tabular-nums transition-[width] duration-300 ease-out"
                            style={{ width: diaPx }}
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
              {filas.map(({ tarea: t, nivel, numero, hijas }) => {
                const pct = avanceEfectivo(t, tareas)
                const estado = estadoTarea({ ...t, avance: pct }, hoy)
                const esPadre = hijas.length > 0
                const colapsada = esPadre && colapsadas[t.id]
                const tonoBarra = nivel === 0 ? COLORES_BARRA[estado] : nivel === 1 ? 'bg-violet-500' : 'bg-teal-500'
                const altoBarra = nivel === 0 ? 'h-6' : nivel === 1 ? 'h-4' : 'h-3'
                return (
                  <div
                    key={t.id}
                    className={`flex items-stretch border-b border-slate-100 last:border-0 ${nivel >= 1 ? 'bg-slate-50/70' : ''} ${esPadre ? 'border-t-2 border-t-slate-200 first:border-t-0' : ''}`}
                  >
                    <div
                      className={`sticky left-0 z-20 flex min-w-0 shrink-0 items-center gap-1 bg-white px-2 py-1 ${nivel >= 1 ? 'border-l-2 border-l-violet-300' : ''}`}
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
                        <span className="mt-0.5 inline-flex items-center gap-1.5">
                          <Badge variante={COLORES_ETIQUETA[estado]}>{estado}</Badge>
                          {esPadre && (
                            <span className="text-[11px] text-slate-400 tabular-nums">
                              {hijas.length} subt.
                            </span>
                          )}
                        </span>
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
                      {esTrimestre &&
                        limitesTrimestre.map((izq, li) => (
                          <span
                            key={`t-${li}`}
                            className="pointer-events-none absolute inset-y-0 w-0.5 bg-slate-400 transition-[left] duration-300 ease-out"
                            style={{ left: `${izq}%` }}
                          />
                        ))}
                      <span className={`relative block w-full overflow-hidden rounded-full bg-slate-200 ring-1 ring-inset ring-slate-300 ${nivel === 0 ? 'h-6' : nivel === 1 ? 'h-4' : 'h-3'}`}>
                        {/* Rango planificado */}
                        <span
                          className={`absolute inset-y-0 rounded-full transition-[left,width] duration-300 ease-out ${nivel === 0 ? 'bg-slate-400' : 'bg-violet-300'}`}
                          style={{ left: `${pos(t.fecha_inicio)}%`, width: `${ancho(t.fecha_inicio, t.fecha_fin)}%` }}
                        />
                        {/* Avance real */}
                        <span
                          className={`absolute inset-y-0 flex items-center justify-end overflow-hidden rounded-full shadow-sm ring-1 ring-inset ring-black/20 transition-[left,width] duration-300 ease-out ${tonoBarra}`}
                          style={{
                            left: `${pos(t.fecha_inicio)}%`,
                            width: `${(ancho(t.fecha_inicio, t.fecha_fin) * pct) / 100}%`,
                          }}
                        >
                          {pct > 0 && (
                            <span className="pr-1.5 text-[10px] font-bold whitespace-nowrap text-white tabular-nums">
                              {pct}%
                            </span>
                          )}
                        </span>
                      </span>
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

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-blue-700" /> En curso
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-slate-400" /> Pendiente
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-emerald-500" /> Completada
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-red-500" /> Atrasada
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-violet-500" /> Subtarea
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-px w-4 bg-red-400" /> Hoy
            </span>
          </div>
          </section>
        </div>
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
          onCerrar={() => setModal(null)}
          onGuardar={guardar}
          onEliminar={eliminar}
        />
      )}

      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />
    </div>
  )
}
