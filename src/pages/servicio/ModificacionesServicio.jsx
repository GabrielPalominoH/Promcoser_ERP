import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useData } from '../../context/useData'
import { siguienteId } from '../../context/DataContext'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Campo, Input, Select, Textarea } from '../../components/ui/Field'
import { InputMonto } from '../../components/ui/Monto'
import { Modal } from '../../components/ui/Modal'
import { Aviso } from '../../components/ui/Aviso'
import {
  Buscador,
  BarraFiltros,
  SelectFiltro,
  textoCoincide,
} from '../../components/ui/FiltroBusqueda'
import { normalizar } from '../../components/ui/ComboBox'
import {
  Table,
  TableBody,
  TableEmpty,
  TableHead,
  TableRow,
  Td,
  Th,
} from '../../components/ui/Table'
import { formatearFecha, formatearMoneda } from '../../utils/formatters'
import { hoyISO } from '../../utils/calculadora'
import { calendarioDe, sumarDiasISO } from '../../utils/calendario'
import { programar } from '../../utils/cpm'
import {
  ESTADOS_MODIFICACION,
  ETIQUETA_ESTADO,
  ETIQUETA_TIPO,
  aplicarTransicion,
  importeModificacion,
  importePartida,
  partidasATareas,
  resumenModificaciones,
  siguienteNumero,
} from '../../utils/modificaciones'

const TONO_ESTADO = {
  borrador: 'neutral',
  presentado: 'info',
  aprobado: 'success',
  rechazado: 'danger',
}

const partidaVacia = () => ({ nombre: '', unidad: '', metrado: '', precio_unitario: '' })

function Dato({ etiqueta, valor, tono = 'text-slate-900', nota }) {
  return (
    <div className="rounded-xl border border-slate-300 p-4">
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{etiqueta}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${tono}`}>{valor}</p>
      {nota && <p className="mt-0.5 text-xs text-slate-500">{nota}</p>}
    </div>
  )
}

// Editor de partidas (metrado × precio unitario) de un adicional/deductivo.
function EditorPartidas({ partidas, onChange }) {
  const actualizar = (i, campo, valor) => {
    onChange(partidas.map((p, j) => (j === i ? { ...p, [campo]: valor } : p)))
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">Partidas afectadas</p>
        <Button
          type="button"
          variante="secundario"
          tamano="sm"
          onClick={() => onChange([...partidas, partidaVacia()])}
        >
          Agregar partida
        </Button>
      </div>
      {partidas.length === 0 && (
        <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
          Agrega al menos una partida con metrado y precio unitario.
        </p>
      )}
      {partidas.map((p, i) => (
        <div
          key={i}
          className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-12"
        >
          <Campo label="Descripción" className="sm:col-span-4" htmlFor={`pa-nombre-${i}`}>
            <Input
              id={`pa-nombre-${i}`}
              value={p.nombre}
              onChange={(e) => actualizar(i, 'nombre', e.target.value)}
              placeholder="Partida adicional"
            />
          </Campo>
          <Campo label="UM" className="sm:col-span-2" htmlFor={`pa-um-${i}`}>
            <Input
              id={`pa-um-${i}`}
              value={p.unidad ?? ''}
              onChange={(e) => actualizar(i, 'unidad', e.target.value)}
              placeholder="m³"
            />
          </Campo>
          <Campo label="Metrado" className="sm:col-span-2" htmlFor={`pa-met-${i}`}>
            <Input
              id={`pa-met-${i}`}
              type="number"
              min="0"
              step="any"
              value={p.metrado}
              onChange={(e) => actualizar(i, 'metrado', e.target.value)}
            />
          </Campo>
          <Campo label="P. Unit. (S/)" className="sm:col-span-3" htmlFor={`pa-pu-${i}`}>
            <InputMonto
              id={`pa-pu-${i}`}
              value={p.precio_unitario}
              onChange={(v) => actualizar(i, 'precio_unitario', v)}
            />
          </Campo>
          <div className="flex items-end justify-between gap-2 sm:col-span-1">
            <p className="text-xs text-slate-500 tabular-nums sm:hidden">
              {formatearMoneda(importePartida(p))}
            </p>
            <Button
              type="button"
              variante="peligro"
              tamano="sm"
              onClick={() => onChange(partidas.filter((_, j) => j !== i))}
            >
              Quitar
            </Button>
          </div>
        </div>
      ))}
      {partidas.length > 0 && (
        <p className="text-right text-sm text-slate-600">
          Importe total:{' '}
          <span className="font-semibold text-slate-900 tabular-nums">
            {formatearMoneda(partidas.reduce((s, p) => s + importePartida(p), 0))}
          </span>
        </p>
      )}
    </div>
  )
}

export function ModalModificacion({ servicio, tipo, modificacion, modificaciones, onCerrar, onGuardar }) {
  const esEdicion = Boolean(modificacion)
  const [numero, setNumero] = useState(() =>
    modificacion ? modificacion.numero : siguienteNumero(modificaciones, servicio.id),
  )
  const [fecha, setFecha] = useState(modificacion?.fecha ?? hoyISO())
  const [descripcion, setDescripcion] = useState(modificacion?.descripcion ?? '')
  const [documento, setDocumento] = useState(modificacion?.documento ?? '')
  const [partidas, setPartidas] = useState(() => {
    if (modificacion?.partidas?.length) {
      return modificacion.partidas.map((p) => ({
        nombre: p.nombre ?? '',
        unidad: p.unidad ?? '',
        metrado: p.metrado ?? '',
        precio_unitario: p.precio_unitario ?? '',
      }))
    }
    return [partidaVacia()]
  })
  const [error, setError] = useState(null)

  const titulo = esEdicion
    ? `${ETIQUETA_TIPO[tipo]} N° ${numero}`
    : tipo === 'adicional'
      ? 'Nuevo adicional de obra'
      : 'Nuevo deductivo de obra'

  const guardar = () => {
    const validas = partidas
      .map((p) => ({
        nombre: p.nombre?.trim(),
        unidad: p.unidad?.trim() || null,
        metrado: Number(p.metrado),
        precio_unitario: Number(p.precio_unitario),
      }))
      .filter(
        (p) =>
          p.nombre &&
          Number.isFinite(p.metrado) &&
          p.metrado > 0 &&
          Number.isFinite(p.precio_unitario) &&
          p.precio_unitario > 0,
      )
    if (validas.length === 0) {
      setError('Cada partida necesita descripción, metrado y precio unitario mayores que cero.')
      return
    }
    if (!descripcion.trim()) {
      setError('Describe el sustento de la modificación.')
      return
    }
    onGuardar({
      numero: Number(numero) || 1,
      fecha,
      descripcion: descripcion.trim(),
      documento: documento.trim(),
      partidas: validas,
    })
    onCerrar()
  }

  return (
    <Modal
      abierto
      ancho="lg"
      titulo={titulo}
      descripcion={
        tipo === 'adicional'
          ? 'Suma partidas al contrato. Al aprobarse, sus partidas entran al cronograma y se pueden valorizar.'
          : 'Resta partidas del contrato. Al aprobarse, reduce el presupuesto contractual vigente.'
      }
      onCerrar={onCerrar}
      pie={
        <>
          <Button variante="secundario" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar}>{esEdicion ? 'Guardar' : 'Registrar'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Número" htmlFor="mo-numero">
            <Input
              id="mo-numero"
              type="number"
              min="1"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
            />
          </Campo>
          <Campo label="Fecha" htmlFor="mo-fecha">
            <Input
              id="mo-fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </Campo>
        </div>
        <Campo label="Descripción / sustento" error={error} htmlFor="mo-desc">
          <Textarea
            id="mo-desc"
            rows={2}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Motivo y alcance de la modificación"
          />
        </Campo>
        <Campo
          label="Documento de sustento"
          hint="Referencia del expediente, carta o informe (opcional)."
          htmlFor="mo-doc"
        >
          <Input
            id="mo-doc"
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
            placeholder="CARTA-001-2026"
          />
        </Campo>

        <EditorPartidas partidas={partidas} onChange={setPartidas} />
      </div>
    </Modal>
  )
}

export function ModalAmpliacion({ servicio, ampliacion, ampliaciones, onCerrar, onGuardar }) {
  const esEdicion = Boolean(ampliacion)
  const [numero, setNumero] = useState(() =>
    ampliacion ? ampliacion.numero : siguienteNumero(ampliaciones, servicio.id),
  )
  const [fecha, setFecha] = useState(ampliacion?.fecha_solicitud ?? hoyISO())
  const [diasSolicitados, setDiasSolicitados] = useState(ampliacion?.dias_solicitados ?? '')
  const [motivo, setMotivo] = useState(ampliacion?.motivo ?? '')
  const [documento, setDocumento] = useState(ampliacion?.documento ?? '')
  const [error, setError] = useState(null)

  const guardar = () => {
    const dias = Number(diasSolicitados)
    if (!Number.isFinite(dias) || dias <= 0) {
      setError('Los días solicitados deben ser mayores que cero.')
      return
    }
    if (!motivo.trim()) {
      setError('Indica el motivo de la ampliación.')
      return
    }
    onGuardar({
      numero: Number(numero) || 1,
      fecha_solicitud: fecha,
      dias_solicitados: dias,
      motivo: motivo.trim(),
      documento: documento.trim(),
    })
    onCerrar()
  }

  return (
    <Modal
      abierto
      ancho="md"
      titulo={esEdicion ? `Ampliación de plazo N° ${numero}` : 'Nueva ampliación de plazo'}
      descripcion="Al aprobarse se desplaza la fecha fin contractual y se recalcula el cronograma con CPM."
      onCerrar={onCerrar}
      pie={
        <>
          <Button variante="secundario" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar}>{esEdicion ? 'Guardar' : 'Registrar'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Número" htmlFor="ap-numero">
            <Input
              id="ap-numero"
              type="number"
              min="1"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
            />
          </Campo>
          <Campo label="Fecha de solicitud" htmlFor="ap-fecha">
            <Input
              id="ap-fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </Campo>
        </div>
        <Campo label="Días solicitados" error={error} htmlFor="ap-dias">
          <Input
            id="ap-dias"
            type="number"
            min="1"
            value={diasSolicitados}
            onChange={(e) => setDiasSolicitados(e.target.value)}
          />
        </Campo>
        <Campo label="Motivo" htmlFor="ap-motivo">
          <Textarea
            id="ap-motivo"
            rows={2}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Causa de la ampliación (lluvias, adicionales, etc.)"
          />
        </Campo>
        <Campo
          label="Documento de sustento"
          hint="Referencia del expediente o carta (opcional)."
          htmlFor="ap-doc"
        >
          <Input
            id="ap-doc"
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
            placeholder="CARTA-002-2026"
          />
        </Campo>
      </div>
    </Modal>
  )
}

// Historial de estados (fecha + estado) que comparten ambos modales de detalle.
function Historial({ historial = [] }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-slate-700">Historial de cambios</p>
      <ul className="space-y-1 text-sm text-slate-600">
        {historial.map((h, i) => (
          <li key={i} className="flex items-center justify-between gap-3">
            <span>{ETIQUETA_ESTADO[h.estado] ?? h.estado}</span>
            <span className="tabular-nums text-slate-500">{formatearFecha(h.fecha)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ModalVerModificacion({ modificacion, onCerrar, onCambiarEstado }) {
  const [estado, setEstado] = useState(modificacion.estado)
  const importe = importeModificacion(modificacion)
  const signo = modificacion.tipo === 'deductivo' ? '−' : '+'

  return (
    <Modal
      abierto
      ancho="lg"
      titulo={`${ETIQUETA_TIPO[modificacion.tipo]} N° ${modificacion.numero}`}
      descripcion={`Fecha ${formatearFecha(modificacion.fecha)}${
        modificacion.documento ? ` · ${modificacion.documento}` : ''
      }`}
      onCerrar={onCerrar}
      pie={
        <>
          <Button variante="secundario" onClick={onCerrar}>
            Cerrar
          </Button>
          <Button
            onClick={() => onCambiarEstado(modificacion, estado)}
            disabled={estado === modificacion.estado}
          >
            Guardar estado
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="text-sm font-medium text-slate-700">Importe</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
            {signo}
            {formatearMoneda(importe)}
          </p>
          {modificacion.descripcion && (
            <p className="mt-1 text-sm text-slate-500">{modificacion.descripcion}</p>
          )}
        </div>

        <Table>
          <TableHead>
            <TableRow>
              <Th>Partida</Th>
              <Th>UM</Th>
              <Th alinear="right">Metrado</Th>
              <Th alinear="right">P. Unit.</Th>
              <Th alinear="right">Importe</Th>
            </TableRow>
          </TableHead>
          <TableBody>
            {(modificacion.partidas ?? []).map((p, i) => (
              <TableRow key={i}>
                <Td className="font-medium text-slate-800">{p.nombre}</Td>
                <Td className="text-slate-600">{p.unidad ?? '—'}</Td>
                <Td alinear="right" className="tabular-nums">
                  {p.metrado ?? '—'}
                </Td>
                <Td alinear="right" className="tabular-nums">
                  {formatearMoneda(p.precio_unitario)}
                </Td>
                <Td alinear="right" className="tabular-nums">
                  {formatearMoneda(importePartida(p))}
                </Td>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo
            label="Estado"
            hint="Aprobar un adicional lo materializa como tareas del cronograma."
            htmlFor="mo-estado"
          >
            <Select id="mo-estado" value={estado} onChange={(e) => setEstado(e.target.value)}>
              {ESTADOS_MODIFICACION.map((e) => (
                <option key={e} value={e}>
                  {ETIQUETA_ESTADO[e]}
                </option>
              ))}
            </Select>
          </Campo>
          <Historial historial={modificacion.historial} />
        </div>
      </div>
    </Modal>
  )
}

export function ModalVerAmpliacion({ ampliacion, onCerrar, onCambiarEstado }) {
  const [estado, setEstado] = useState(ampliacion.estado)
  const [diasAprobados, setDiasAprobados] = useState(
    ampliacion.dias_aprobados || ampliacion.dias_solicitados || 0,
  )
  const aplicados = Number(ampliacion.dias_aplicados) || 0

  return (
    <Modal
      abierto
      ancho="md"
      titulo={`Ampliación de plazo N° ${ampliacion.numero}`}
      descripcion={`Solicitud ${formatearFecha(ampliacion.fecha_solicitud)}${
        ampliacion.documento ? ` · ${ampliacion.documento}` : ''
      }`}
      onCerrar={onCerrar}
      pie={
        <>
          <Button variante="secundario" onClick={onCerrar}>
            Cerrar
          </Button>
          <Button
            onClick={() =>
              onCambiarEstado(ampliacion, estado, Number(diasAprobados) || 0)
            }
            disabled={
              estado === ampliacion.estado && Number(diasAprobados) === Number(ampliacion.dias_aprobados || 0)
            }
          >
            Guardar estado
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Dato etiqueta="Días solicitados" valor={ampliacion.dias_solicitados} />
          <Dato
            etiqueta="Días aprobados"
            valor={ampliacion.estado === 'aprobado' ? aplicados : (ampliacion.dias_aprobados || 0)}
            tono="text-primary-700"
          />
        </div>
        {ampliacion.motivo && <p className="text-sm text-slate-600">{ampliacion.motivo}</p>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo
            label="Estado"
            hint="Al aprobar se desplaza la fecha fin contractual y se reprograma el cronograma."
            htmlFor="ap-estado"
          >
            <Select id="ap-estado" value={estado} onChange={(e) => setEstado(e.target.value)}>
              {ESTADOS_MODIFICACION.map((e) => (
                <option key={e} value={e}>
                  {ETIQUETA_ESTADO[e]}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo label="Días aprobados" htmlFor="ap-dias-ap">
            <Input
              id="ap-dias-ap"
              type="number"
              min="0"
              value={diasAprobados}
              disabled={estado !== 'aprobado'}
              onChange={(e) => setDiasAprobados(e.target.value)}
            />
          </Campo>
        </div>

        <Historial historial={ampliacion.historial} />
      </div>
    </Modal>
  )
}

export function ModificacionesServicio() {
  const { servicio } = useOutletContext()
  const { estado, agregarItem, actualizarItem, eliminarItem } = useData()
  const [aviso, setAviso] = useState(null)
  const [modal, setModal] = useState(null) // { tipo:'adicional'|'deductivo'|'ampliacion', id? }
  const [verMod, setVerMod] = useState(null)
  const [verAmp, setVerAmp] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  const modificaciones = useMemo(
    () =>
      (estado.modificaciones ?? [])
        .filter((m) => m.servicio_id === servicio.id)
        .sort(
          (a, b) =>
            (a.fecha || '').localeCompare(b.fecha || '') ||
            (Number(a.numero) || 0) - (Number(b.numero) || 0),
        ),
    [estado.modificaciones, servicio.id],
  )
  const ampliaciones = useMemo(
    () =>
      (estado.ampliaciones_plazo ?? [])
        .filter((a) => a.servicio_id === servicio.id)
        .sort(
          (a, b) =>
            (a.fecha_solicitud || '').localeCompare(b.fecha_solicitud || '') ||
            (Number(a.numero) || 0) - (Number(b.numero) || 0),
        ),
    [estado.ampliaciones_plazo, servicio.id],
  )
  const tareas = useMemo(
    () => (estado.tareas ?? []).filter((t) => t.servicio_id === servicio.id),
    [estado.tareas, servicio.id],
  )

  const resumen = resumenModificaciones({ servicio, modificaciones, ampliaciones })

  const termino = normalizar(busqueda).trim()
  const coincide = (m) =>
    !termino ||
    textoCoincide(m.descripcion, termino) ||
    textoCoincide(m.documento, termino) ||
    textoCoincide(`N° ${m.numero}`, termino) ||
    textoCoincide(ETIQUETA_TIPO[m.tipo], termino) ||
    textoCoincide(ETIQUETA_ESTADO[m.estado], termino)
  const modificacionesFiltradas = useMemo(
    () =>
      modificaciones.filter(
        (m) => coincide(m) && (!filtroEstado || m.estado === filtroEstado),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [modificaciones, termino, filtroEstado],
  )

  // --- Materialización de adicionales aprobados ---------------------------
  // Crea/elimina las tareas hoja que representan las partidas del adicional.
  const materializar = (modificacion, nuevoEstado) => {
    const generadas = modificacion.tareas_generadas ?? []
    if (nuevoEstado === 'aprobado' && modificacion.tipo === 'adicional') {
      let proximo = siguienteId(estado.tareas ?? [])
      const ids = []
      partidasATareas({ servicio, modificacion: { ...modificacion, estado: 'aprobado' } }).forEach(
        (tarea) => {
          const guardada = agregarItem('tareas', { ...tarea, id: proximo++ })
          ids.push(guardada.id)
        },
      )
      return ids
    }
    // Salir de aprobado: se retiran las tareas generadas (los costos quedan
    // sin tarea, no se borran).
    generadas.forEach((id) => eliminarItem('tareas', id))
    return []
  }

  const cambiarEstadoModificacion = (modificacion, nuevoEstado) => {
    let tareasGeneradas = modificacion.tareas_generadas ?? []
    if (nuevoEstado !== modificacion.estado) {
      tareasGeneradas = materializar(modificacion, nuevoEstado)
    }
    const actualizada = {
      ...aplicarTransicion(modificacion, nuevoEstado),
      tareas_generadas: tareasGeneradas,
    }
    actualizarItem('modificaciones', actualizada)
    setVerMod(null)
    setAviso({
      tipo: 'exito',
      mensaje: `${ETIQUETA_TIPO[modificacion.tipo]} N° ${modificacion.numero}: ${ETIQUETA_ESTADO[nuevoEstado]}.`,
    })
  }

  // --- Ampliación de plazo ------------------------------------------------
  const recalcularCronograma = () => {
    const calendario = calendarioDe(servicio)
    const cpm = programar({ tareas, servicio, calendario })
    if (!cpm.valido) return 0
    let cambios = 0
    for (const t of tareas) {
      const v = cpm.porTarea[t.id]
      if (v && (t.fecha_inicio !== v.inicio || t.fecha_fin !== v.fin)) {
        actualizarItem('tareas', { id: t.id, fecha_inicio: v.inicio, fecha_fin: v.fin })
        cambios += 1
      }
    }
    return cambios
  }

  const cambiarEstadoAmpliacion = (ampliacion, nuevoEstado, diasAprobados) => {
    const aplicadosPrevio = Number(ampliacion.dias_aplicados) || 0
    let aplicadosNuevos = aplicadosPrevio
    let reprogramadas = 0

    if (nuevoEstado === 'aprobado') {
      aplicadosNuevos = Math.max(0, Number(diasAprobados) || 0)
      const delta = aplicadosNuevos - aplicadosPrevio
      if (delta !== 0 && servicio.fecha_fin_estimada) {
        actualizarItem('servicios', {
          id: servicio.id,
          fecha_fin_estimada: sumarDiasISO(servicio.fecha_fin_estimada, delta),
        })
      }
      reprogramadas = recalcularCronograma()
    } else if (aplicadosPrevio !== 0 && servicio.fecha_fin_estimada) {
      actualizarItem('servicios', {
        id: servicio.id,
        fecha_fin_estimada: sumarDiasISO(servicio.fecha_fin_estimada, -aplicadosPrevio),
      })
      aplicadosNuevos = 0
    }

    const actualizada = {
      ...aplicarTransicion(ampliacion, nuevoEstado),
      dias_aprobados: nuevoEstado === 'aprobado' ? aplicadosNuevos : ampliacion.dias_aprobados,
      dias_aplicados: aplicadosNuevos,
    }
    actualizarItem('ampliaciones_plazo', actualizada)
    setVerAmp(null)
    setAviso({
      tipo: 'exito',
      mensaje:
        nuevoEstado === 'aprobado'
          ? `Ampliación N° ${ampliacion.numero} aprobada: +${aplicadosNuevos} días.${
              reprogramadas ? ` ${reprogramadas} tarea(s) reprogramada(s).` : ''
            }`
          : `Ampliación N° ${ampliacion.numero}: ${ETIQUETA_ESTADO[nuevoEstado]}.`,
    })
  }

  // --- Alta / edición -----------------------------------------------------
  const guardarModificacion = (tipo, datos, existente) => {
    if (existente) {
      actualizarItem('modificaciones', { id: existente.id, ...datos })
      setAviso({
        tipo: 'exito',
        mensaje: `${ETIQUETA_TIPO[tipo]} N° ${datos.numero} actualizado.`,
      })
      return
    }
    agregarItem('modificaciones', {
      servicio_id: servicio.id,
      tipo,
      ...datos,
      estado: 'borrador',
      historial: [{ estado: 'borrador', fecha: hoyISO() }],
      tareas_generadas: [],
    })
    setAviso({
      tipo: 'exito',
      mensaje: `${ETIQUETA_TIPO[tipo]} N° ${datos.numero} registrado como borrador.`,
    })
  }

  const guardarAmpliacion = (datos, existente) => {
    if (existente) {
      actualizarItem('ampliaciones_plazo', { id: existente.id, ...datos })
      setAviso({ tipo: 'exito', mensaje: `Ampliación N° ${datos.numero} actualizada.` })
      return
    }
    agregarItem('ampliaciones_plazo', {
      servicio_id: servicio.id,
      ...datos,
      dias_aprobados: 0,
      dias_aplicados: 0,
      estado: 'borrador',
      historial: [{ estado: 'borrador', fecha: hoyISO() }],
    })
    setAviso({
      tipo: 'exito',
      mensaje: `Ampliación N° ${datos.numero} registrada como borrador.`,
    })
  }

  const borrarModificacion = (m) => {
    ;(m.tareas_generadas ?? []).forEach((id) => eliminarItem('tareas', id))
    eliminarItem('modificaciones', m.id)
    setAviso({ tipo: 'info', mensaje: `${ETIQUETA_TIPO[m.tipo]} N° ${m.numero} eliminado.` })
  }

  const modalMod = modal?.tipo === 'adicional' || modal?.tipo === 'deductivo' ? modal : null
  const modalAmp = modal?.tipo === 'ampliacion' ? modal : null

  return (
    <div className="space-y-6">
      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />

      <Card
        titulo="Modificaciones contractuales"
        descripcion="Adicionales, deductivos y ampliaciones de plazo. Solo lo aprobado altera el contrato vigente."
        acciones={
          <div className="flex flex-wrap gap-2">
            <Button variante="secundario" onClick={() => setModal({ tipo: 'deductivo' })}>
              Nuevo deductivo
            </Button>
            <Button variante="secundario" onClick={() => setModal({ tipo: 'ampliacion' })}>
              Nueva ampliación
            </Button>
            <Button onClick={() => setModal({ tipo: 'adicional' })}>Nuevo adicional</Button>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Dato etiqueta="Presupuesto original" valor={formatearMoneda(resumen.original)} />
          <Dato etiqueta="Presupuesto vigente" valor={formatearMoneda(resumen.vigente)} />
          <Dato
            etiqueta="Variación"
            valor={`${resumen.variacion >= 0 ? '+' : '−'}${formatearMoneda(Math.abs(resumen.variacion))}`}
            tono={resumen.variacion >= 0 ? 'text-emerald-700' : 'text-red-700'}
            nota={`Adic. ${formatearMoneda(resumen.adicionales)} · Ded. ${formatearMoneda(resumen.deductivos)}`}
          />
          <Dato
            etiqueta="Plazo ampliado"
            valor={`${resumen.plazoAprobado} días`}
            tono="text-primary-700"
            nota={`Fin vigente ${resumen.fechaFinVigente ? formatearFecha(resumen.fechaFinVigente) : '—'}`}
          />
        </div>
      </Card>

      <Card
        titulo="Adicionales y deductivos"
        descripcion="Partidas con metrado × precio unitario que modifican el presupuesto del contrato."
      >
        {modificaciones.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
            Sin modificaciones. Registra un adicional o deductivo para ajustar el contrato.
          </p>
        ) : (
          <>
            <BarraFiltros
              contador={
                termino || filtroEstado ? (
                  <>
                    <span className="font-semibold text-slate-700">
                      {modificacionesFiltradas.length}
                    </span>{' '}
                    de {modificaciones.length}
                  </>
                ) : null
              }
            >
              <Buscador
                valor={busqueda}
                onChange={setBusqueda}
                placeholder="Buscar modificación…"
                ariaLabel="Buscar modificaciones"
              />
              <SelectFiltro label="Estado" value={filtroEstado} onChange={setFiltroEstado}>
                <option value="">Todos los estados</option>
                {ESTADOS_MODIFICACION.map((e) => (
                  <option key={e} value={e}>
                    {ETIQUETA_ESTADO[e]}
                  </option>
                ))}
              </SelectFiltro>
            </BarraFiltros>
            <Table>
              <TableHead>
                <TableRow>
                  <Th>N°</Th>
                  <Th>Tipo</Th>
                  <Th>Fecha</Th>
                  <Th>Descripción</Th>
                  <Th alinear="right">Importe</Th>
                  <Th>Estado</Th>
                  <Th alinear="right" className="w-44">
                    Acciones
                  </Th>
                </TableRow>
              </TableHead>
              <TableBody>
                {modificacionesFiltradas.length === 0 ? (
                  <TableEmpty colSpan={7} mensaje="Ninguna modificación coincide con el filtro." />
                ) : (
                  modificacionesFiltradas.map((m) => (
                    <TableRow key={m.id}>
                      <Td className="font-semibold text-slate-900">N° {m.numero}</Td>
                      <Td>{ETIQUETA_TIPO[m.tipo]}</Td>
                      <Td className="tabular-nums">{formatearFecha(m.fecha)}</Td>
                      <Td className="max-w-xs truncate text-slate-600">{m.descripcion}</Td>
                      <Td
                        alinear="right"
                        className={`tabular-nums font-medium ${
                          m.tipo === 'deductivo' ? 'text-red-700' : 'text-emerald-700'
                        }`}
                      >
                        {m.tipo === 'deductivo' ? '−' : '+'}
                        {formatearMoneda(importeModificacion(m))}
                      </Td>
                      <Td>
                        <Badge variante={TONO_ESTADO[m.estado]}>{ETIQUETA_ESTADO[m.estado]}</Badge>
                      </Td>
                      <Td alinear="right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variante="secundario"
                            tamano="sm"
                            onClick={() => setVerMod(m.id)}
                          >
                            Ver
                          </Button>
                          <Button
                            variante="secundario"
                            tamano="sm"
                            disabled={m.estado === 'aprobado'}
                            onClick={() => setModal({ tipo: m.tipo, id: m.id })}
                          >
                            Editar
                          </Button>
                          <Button variante="peligro" tamano="sm" onClick={() => borrarModificacion(m)}>
                            Eliminar
                          </Button>
                        </div>
                      </Td>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </>
        )}
      </Card>

      <Card
        titulo="Ampliaciones de plazo"
        descripcion="Días solicitados y aprobados. Al aprobar se desplaza la fecha fin y se recalcula el cronograma."
      >
        {ampliaciones.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
            Sin ampliaciones de plazo registradas.
          </p>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <Th>N°</Th>
                <Th>Solicitud</Th>
                <Th>Motivo</Th>
                <Th alinear="right">Días sol.</Th>
                <Th alinear="right">Días aprob.</Th>
                <Th>Estado</Th>
                <Th alinear="right" className="w-40">
                  Acciones
                </Th>
              </TableRow>
            </TableHead>
            <TableBody>
              {ampliaciones.map((a) => (
                <TableRow key={a.id}>
                  <Td className="font-semibold text-slate-900">N° {a.numero}</Td>
                  <Td className="tabular-nums">{formatearFecha(a.fecha_solicitud)}</Td>
                  <Td className="max-w-xs truncate text-slate-600">{a.motivo}</Td>
                  <Td alinear="right" className="tabular-nums">
                    {a.dias_solicitados}
                  </Td>
                  <Td alinear="right" className="tabular-nums font-medium">
                    {a.estado === 'aprobado' ? Number(a.dias_aplicados) || 0 : a.dias_aprobados || 0}
                  </Td>
                  <Td>
                    <Badge variante={TONO_ESTADO[a.estado]}>{ETIQUETA_ESTADO[a.estado]}</Badge>
                  </Td>
                  <Td alinear="right">
                    <div className="flex justify-end gap-2">
                      <Button variante="secundario" tamano="sm" onClick={() => setVerAmp(a.id)}>
                        Ver
                      </Button>
                      <Button
                        variante="secundario"
                        tamano="sm"
                        disabled={a.estado === 'aprobado'}
                        onClick={() => setModal({ tipo: 'ampliacion', id: a.id })}
                      >
                        Editar
                      </Button>
                      <Button
                        variante="peligro"
                        tamano="sm"
                        onClick={() => {
                          eliminarItem('ampliaciones_plazo', a.id)
                          setAviso({
                            tipo: 'info',
                            mensaje: `Ampliación N° ${a.numero} eliminada.`,
                          })
                        }}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </Td>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {modalMod && (
        <ModalModificacion
          servicio={servicio}
          tipo={modalMod.tipo}
          modificacion={
            modalMod.id ? modificaciones.find((m) => m.id === modalMod.id) : null
          }
          modificaciones={modificaciones.filter((m) => m.tipo === modalMod.tipo)}
          onCerrar={() => setModal(null)}
          onGuardar={(datos) =>
            guardarModificacion(
              modalMod.tipo,
              datos,
              modalMod.id ? modificaciones.find((m) => m.id === modalMod.id) : null,
            )
          }
        />
      )}
      {modalAmp && (
        <ModalAmpliacion
          servicio={servicio}
          ampliacion={modalAmp.id ? ampliaciones.find((a) => a.id === modalAmp.id) : null}
          ampliaciones={ampliaciones}
          onCerrar={() => setModal(null)}
          onGuardar={(datos) =>
            guardarAmpliacion(
              datos,
              modalAmp.id ? ampliaciones.find((a) => a.id === modalAmp.id) : null,
            )
          }
        />
      )}
      {verMod && (
        <ModalVerModificacion
          modificacion={modificaciones.find((m) => m.id === verMod) ?? {}}
          onCerrar={() => setVerMod(null)}
          onCambiarEstado={cambiarEstadoModificacion}
        />
      )}
      {verAmp && (
        <ModalVerAmpliacion
          ampliacion={ampliaciones.find((a) => a.id === verAmp) ?? {}}
          onCerrar={() => setVerAmp(null)}
          onCambiarEstado={cambiarEstadoAmpliacion}
        />
      )}
    </div>
  )
}
