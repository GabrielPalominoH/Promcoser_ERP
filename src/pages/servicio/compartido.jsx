import { useState } from 'react'
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
  formatearMoneda,
  formatearFecha,
  redondearMonto,
} from '../../utils/formatters'
import {
  cuentaComoManoDeObra,
  esDomingo,
  nombreReferencia,
  ordenarPorFechaDesc,
  sumarMontos,
} from '../../utils/calculadora'

export function fechaHoyISO() {
  return new Date().toISOString().slice(0, 10)
}

export function reglasNumeroMayorACero(mensajeRequerido) {
  return {
    valueAsNumber: true,
    required: mensajeRequerido,
    validate: (valor) =>
      Number.isNaN(valor) || valor <= 0
        ? 'Debe ser un número mayor que cero'
        : true,
  }
}

function conceptoRegistro(registro, refs) {
  return (
    registro.concepto ?? nombreReferencia(registro, refs)
  )
}

function FilaRegistro({ registro, refs, conCantidad, conUnidad, onEliminar, onEditar }) {
  return (
    <TableRow>
      <Td className="whitespace-nowrap text-slate-500">
        {formatearFecha(registro.fecha)}
      </Td>
      <Td>
        <span className="font-medium text-slate-800">
          {conceptoRegistro(registro, refs)}
        </span>
        {registro.tipo_registro === 'personal' &&
          (() => {
            const persona = refs.personal.find((p) => p.id === registro.referencia_id)
            return persona?.cargo ? (
              <span className="block text-xs text-slate-500">{persona.cargo}</span>
            ) : null
          })()}
        {registro.tipo_registro === 'personal' &&
          registro.modalidad !== 'mensual' &&
          esDomingo(registro.fecha) && (
            <span className="mt-0.5 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
              domingo · no suma
            </span>
          )}
        {registro.tipo_registro === 'gasto' && registro.documento && (
          <span className="block text-xs text-slate-500">Doc. {registro.documento}</span>
        )}
        {registro.tarea_id != null &&
          (() => {
            const tarea = (refs.tareas ?? []).find((t) => t.id === registro.tarea_id)
            return tarea ? (
              <span className="block text-xs text-slate-500">↳ {tarea.nombre}</span>
            ) : null
          })()}


      </Td>
      {conUnidad && (
        <Td className="whitespace-nowrap text-slate-500">
          {registro.unidad || '—'}
        </Td>
      )}
      {conCantidad && (
        <Td alinear="right" className="tabular-nums">
          {formatearCantidad(registro.cantidad_o_horas)}
        </Td>
      )}
      <Td alinear="right" className="font-semibold text-slate-900 tabular-nums">
        {formatearMoneda(registro.monto_calculado)}
      </Td>
      <Td alinear="right">
        <span className="inline-flex gap-1.5">
          {onEditar && (
            <Button variante="secundario" tamano="sm" onClick={() => onEditar(registro)}>
              Editar
            </Button>
          )}
          <Button variante="peligro" tamano="sm" onClick={() => onEliminar(registro)}>
            Eliminar
          </Button>
        </span>
      </Td>
    </TableRow>
  )
}

// Edición de un gasto: concepto, monto, fecha, tarea y comprobante.
// Los demás tipos no son editables por ahora.
function ModalEdicionGasto({ registro, tareas, onGuardar, onCerrar }) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: {
      concepto: registro.concepto ?? '',
      monto: registro.monto_calculado ?? '',
      fecha: registro.fecha ?? '',
      tarea_id: registro.tarea_id != null ? String(registro.tarea_id) : '',
      documento: registro.documento ?? '',
    },
  })

  const enviar = ({ concepto, monto, fecha, tarea_id, documento }) => {
    onGuardar({
      id: registro.id,
      concepto: concepto.trim(),
      monto_calculado: redondearMonto(monto),
      fecha,
      tarea_id: tarea_id ? Number(tarea_id) : null,
      documento: documento.trim() || null,
    })
  }

  return (
    <Modal
      abierto
      titulo="Editar gasto"
      descripcion="Se actualiza el gastado del servicio automáticamente."
      onCerrar={onCerrar}
      pie={
        <>
          <Button variante="secundario" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit(enviar)}>Guardar cambios</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-4">
        <Campo label="Concepto del gasto" error={errors.concepto?.message} htmlFor="edg-concepto">
          <Input id="edg-concepto" {...register('concepto', { required: 'Describe el gasto' })} />
        </Campo>
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Monto (S/)" error={errors.monto?.message} htmlFor="edg-monto">
            <CampoMonto
              id="edg-monto"
              control={control}
              name="monto"
              rules={reglasMontoMayorACero('Ingresa el monto')}
            />
          </Campo>
          <Campo label="Fecha" error={errors.fecha?.message} htmlFor="edg-fecha">
            <Input id="edg-fecha" type="date" {...register('fecha', { required: 'Indica la fecha' })} />
          </Campo>
        </div>
        {tareas.length > 0 && (
          <Campo label="Tarea (opcional)" error={errors.tarea_id?.message} htmlFor="edg-tarea">
            <CampoComboBox
              id="edg-tarea"
              control={control}
              name="tarea_id"
              placeholder="Sin tarea…"
              opciones={tareas.map((t) => ({ valor: String(t.id), etiqueta: t.nombre }))}
            />
          </Campo>
        )}
        <Campo
          label="N° factura / comprobante (opcional)"
          error={errors.documento?.message}
          htmlFor="edg-doc"
        >
          <Input id="edg-doc" placeholder="F001-000123" {...register('documento')} />
        </Campo>
      </form>
    </Modal>
  )
}

// Sección genérica de una pestaña del panel: formulario + su tabla.
// Con `tablaAgrupada` se puede reemplazar la tabla por una vista propia
// (recibe { registros, refs, onEliminar }); `porEliminar` acepta un
// registro o un grupo { ids, titulo } para borrado múltiple.
// Con `permitirEditar` (solo gastos por ahora) cada fila tiene Editar.
export function SeccionRegistros({
  servicio,
  tipo,
  titulo,
  descripcion,
  columnaCantidad,
  etiquetaCantidad,
  columnaUnidad = false,
  mensajeVacio,
  mensajeExito,
  tablaAgrupada,
  tarjetas,
  permitirEditar = false,
  // Registro en modal: si se pasa { boton, titulo, descripcion }, el
  // formulario (children) vive en un modal que se abre con el botón en la
  // tarjeta de registros, en vez de mostrarse siempre arriba.
  modalRegistro = null,
  children,
}) {
  const { estado, agregarItem, actualizarItem, eliminarItem } = useData()
  const { personal, equipos, registros_servicio: todos, tareas: todasTareas } = estado

  const [aviso, setAviso] = useState(null)
  const [porEliminar, setPorEliminar] = useState(null)
  const [porEditar, setPorEditar] = useState(null)
  const [mostrarRegistro, setMostrarRegistro] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtroTarea, setFiltroTarea] = useState('todas')
  const editable = permitirEditar && tipo === 'gasto'

  const refs = {
    personal,
    equipos,
    tareas: (todasTareas ?? []).filter((t) => t.servicio_id === servicio.id),
  }
  const registros = ordenarPorFechaDesc(
    todos.filter(
      (r) => r.servicio_id === servicio.id && r.tipo_registro === tipo,
    ),
  )
  // Los domingos no generan costo de mano de obra: se muestran con
  // insignia pero no suman a los totales.
  const registrosQueSuman =
    tipo === 'personal' ? registros.filter(cuentaComoManoDeObra) : registros
  const totalMonto = sumarMontos(registrosQueSuman)
  const totalCantidad = registrosQueSuman.reduce(
    (total, r) => total + (Number(r.cantidad_o_horas) || 0),
    0,
  )

  // Filtro de la lista: texto (concepto, tarea, documento, fecha, monto) y
  // por tarea asignada. El total del pie refleja lo que se ve.
  const termino = normalizar(busqueda).trim()
  const registrosFiltrados = registros.filter((registro) => {
    if (filtroTarea === 'con' && registro.tarea_id == null) return false
    if (filtroTarea === 'sin' && registro.tarea_id != null) return false
    if (!termino) return true
    const persona =
      registro.tipo_registro === 'personal'
        ? refs.personal.find((p) => p.id === registro.referencia_id)
        : null
    const tarea = (refs.tareas ?? []).find((t) => t.id === registro.tarea_id)
    const haystack = [
      conceptoRegistro(registro, refs),
      persona?.cargo ?? '',
      tarea?.nombre ?? '',
      registro.documento ?? '',
      formatearFecha(registro.fecha),
      formatearMoneda(registro.monto_calculado),
    ].join(' ')
    return textoCoincide(haystack, termino)
  })
  const filtradosQueSuman =
    tipo === 'personal' ? registrosFiltrados.filter(cuentaComoManoDeObra) : registrosFiltrados
  const totalFiltrado = sumarMontos(filtradosQueSuman)
  const cantidadFiltrada = filtradosQueSuman.reduce(
    (total, r) => total + (Number(r.cantidad_o_horas) || 0),
    0,
  )
  // El metrado solo se puede sumar si todos los registros comparten unidad;
  // si hay unidades mezcladas (o ninguna), el total de la columna no aplica.
  const unidadesDistintas = new Set(
    filtradosQueSuman.map((r) => r.unidad).filter(Boolean),
  )
  const unidadUnica = unidadesDistintas.size === 1 ? [...unidadesDistintas][0] : null
  const hayFiltro = termino !== '' || filtroTarea !== 'todas'

  const registrar = (datos) => {
    agregarItem('registros_servicio', datos)
    setAviso({ tipo: 'exito', mensaje: mensajeExito(datos) })
    setMostrarRegistro(false)
  }

  const registrarLote = (items, mensaje) => {
    items.forEach((datos) => agregarItem('registros_servicio', datos))
    setAviso({ tipo: 'exito', mensaje })
  }

  const notificar = (tipo, mensaje) => setAviso({ tipo, mensaje })

  const confirmarEliminar = () => {
    if (Array.isArray(porEliminar.ids)) {
      porEliminar.ids.forEach((id) => eliminarItem('registros_servicio', id))
      setAviso({ tipo: 'info', mensaje: `${porEliminar.ids.length} registros eliminados.` })
    } else {
      eliminarItem('registros_servicio', porEliminar.id)
      setAviso({ tipo: 'info', mensaje: 'Registro eliminado.' })
    }
    setPorEliminar(null)
  }

  const confirmarEdicion = (cambios) => {
    actualizarItem('registros_servicio', cambios)
    setPorEditar(null)
    setAviso({ tipo: 'exito', mensaje: 'Gasto actualizado.' })
  }

  const columnas = 4 + (columnaCantidad ? 1 : 0) + (columnaUnidad ? 1 : 0)

  return (
    <div className="space-y-6">
      {tarjetas ? tarjetas({ registros, registrosQueSuman, totalMonto, totalCantidad, refs }) : null}
      {modalRegistro == null && (
        <Card titulo={titulo} descripcion={descripcion}>
          {children({ servicio, personal, equipos, registrar, registrarLote, notificar })}
        </Card>
      )}

      <Card
        titulo={`Registros de ${titulo.toLowerCase()}`}
        acciones={
          modalRegistro == null ? undefined : (
            <Button tamano="sm" onClick={() => setMostrarRegistro(true)}>
              {modalRegistro.boton}
            </Button>
          )
        }
      >
        {tablaAgrupada ? (
          tablaAgrupada({ registros: registrosFiltrados, refs, onEliminar: setPorEliminar })
        ) : (
        <>
        {registros.length > 0 && (
          <BarraFiltros
            contador={
              hayFiltro ? (
                <>
                  <span className="font-semibold text-slate-700">{registrosFiltrados.length}</span> de{' '}
                  {registros.length}
                </>
              ) : null
            }
          >
            <Buscador
              valor={busqueda}
              onChange={setBusqueda}
              placeholder={`Buscar en ${titulo.toLowerCase()}…`}
              ariaLabel={`Buscar en registros de ${titulo.toLowerCase()}`}
            />
            <SelectFiltro label="Filtrar por tarea" value={filtroTarea} onChange={setFiltroTarea}>
              <option value="todas">Con o sin tarea</option>
              <option value="con">Con tarea</option>
              <option value="sin">Sin tarea</option>
            </SelectFiltro>
          </BarraFiltros>
        )}
        <Table>
          <TableHead>
            <TableRow>
              <Th>Fecha</Th>
              <Th>{titulo === 'Equipos' ? 'Equipo' : 'Concepto'}</Th>
              {columnaUnidad && <Th>UM</Th>}
              {columnaCantidad && <Th alinear="right">{etiquetaCantidad}</Th>}
              <Th alinear="right">Monto</Th>
              <Th alinear="right">Acción</Th>
            </TableRow>
          </TableHead>
          <TableBody>
            {registros.length === 0 ? (
              <TableEmpty colSpan={columnas} mensaje={mensajeVacio} />
            ) : registrosFiltrados.length === 0 ? (
              <TableEmpty colSpan={columnas} mensaje="Ningún registro coincide con el filtro." />
            ) : (
              registrosFiltrados.map((registro) => (
                <FilaRegistro
                  key={registro.id}
                  registro={registro}
                  refs={refs}
                  conCantidad={columnaCantidad}
                  conUnidad={columnaUnidad}
                  onEliminar={setPorEliminar}
                  onEditar={editable ? setPorEditar : null}
                />
              ))
            )}

            {registrosFiltrados.length > 0 && (
              <TableRow className="bg-slate-50 font-semibold">
                <Td className="text-slate-600" colSpan={2}>
                  Total
                </Td>
                {columnaUnidad && (
                  <Td className="text-slate-600">{unidadUnica ?? '—'}</Td>
                )}
                {columnaCantidad && (
                  <Td alinear="right" className="text-slate-900 tabular-nums">
                    {columnaUnidad && !unidadUnica ? '—' : formatearCantidad(cantidadFiltrada)}
                    {tipo === 'equipo' && !columnaUnidad ? ' h' : ''}
                  </Td>
                )}
                <Td alinear="right" className="text-slate-900 tabular-nums">
                  {formatearMoneda(totalFiltrado)}
                </Td>
                <Td />
              </TableRow>
            )}
          </TableBody>
        </Table>
        </>
        )}
      </Card>

      {modalRegistro != null && mostrarRegistro && (
        <Modal
          abierto
          titulo={modalRegistro.titulo}
          descripcion={modalRegistro.descripcion}
          onCerrar={() => setMostrarRegistro(false)}
          pie={
            <>
              <Button variante="secundario" onClick={() => setMostrarRegistro(false)}>
                Cancelar
              </Button>
              <Button type="submit" form="form-registro">
                {modalRegistro.boton}
              </Button>
            </>
          }
        >
          {children({ servicio, personal, equipos, registrar, registrarLote, notificar })}
        </Modal>
      )}

      {porEliminar && (
        <Modal
          abierto
          ancho="sm"
          titulo={Array.isArray(porEliminar.ids) ? 'Eliminar grupo' : 'Eliminar registro'}
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
            {Array.isArray(porEliminar.ids) ? (
              <>
                Se eliminarán los{' '}
                <span className="font-semibold text-slate-900">
                  {porEliminar.ids.length} registros
                </span>{' '}
                de{' '}
                <span className="font-semibold text-slate-900">
                  {porEliminar.titulo}
                </span>
                . El gastado del servicio se actualiza automáticamente.
              </>
            ) : (
              <>
                Se eliminará{' '}
                <span className="font-semibold text-slate-900">
                  {conceptoRegistro(porEliminar, refs)}
                </span>{' '}
                del {formatearFecha(porEliminar.fecha)}. El gastado del servicio se
                actualiza automáticamente.
              </>
            )}
          </p>
        </Modal>
      )}

      {porEditar && (
        <ModalEdicionGasto
          registro={porEditar}
          tareas={refs.tareas}
          onGuardar={confirmarEdicion}
          onCerrar={() => setPorEditar(null)}
        />
      )}

      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />
    </div>
  )
}
