import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useData } from '../../context/useData'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Campo, Input, Select } from '../ui/Field'
import { Buscador, textoCoincide } from '../ui/FiltroBusqueda'
import { CampoComboBox, normalizar } from '../ui/ComboBox'
import { CampoMonto } from '../ui/Monto'
import { Toggle } from '../ui/Toggle'
import { Modal } from '../ui/Modal'
import { Aviso } from '../ui/Aviso'
import {
  Table,
  TableBody,
  TableEmpty,
  TableHead,
  TableRow,
  Td,
  Th,
} from '../ui/Table'

// ============================================================
//  Formulario de alta / edición, genérico y dirigido por config
// ============================================================

export function FormularioCatalogo({ config, item, estado, onCancelar, onGuardar, onEliminar }) {
  const enEdicion = Boolean(item)

  const valoresBase = useMemo(() => {
    const base = config.valoresIniciales
    const vacios = typeof base === 'function' ? base() : base
    return enEdicion ? { ...vacios, ...item } : vacios
  }, [])

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: valoresBase,
    mode: 'onBlur',
  })

  const reglasBase = (campo) => {
    const reglas = {}
    if (campo.requerido) reglas.required = `${campo.etiqueta} es obligatorio`
    if (campo.min !== undefined) {
      reglas.min = { value: campo.min, message: `Mínimo permitido: ${campo.min}` }
    }
    return reglas
  }

  const registrar = (campo) => register(campo.name, reglasBase(campo))

  // Monto con CampoMonto (Controller): el campo vacío llega como '' y un valor
  // válido como número. Evita dejar NaN en el estado.
  const reglasMonto = (campo) => ({
    ...reglasBase(campo),
    validate: (valor) =>
      valor === '' || Number.isNaN(valor) ? `${campo.etiqueta} requiere un número válido` : true,
  })

  const enviar = (valores) => onGuardar(config.normalizar(valores))

  return (
    <form id="formulario-catalogo" onSubmit={handleSubmit(enviar)} noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {config.campos.map((campo) => {
          const id = `campo-${campo.name}`
          const error = errors[campo.name]
          const ancho = campo.ancho === 'completo' ? 'sm:col-span-2' : ''

          if (campo.tipo === 'booleano') {
            return (
              <div key={campo.name} className={ancho}>
                <Toggle
                  id={id}
                  etiqueta={campo.etiqueta}
                  descripcion={campo.descripcion}
                  {...registrar(campo)}
                />
              </div>
            )
          }

          if (campo.tipo === 'select') {
            return (
              <Campo
                key={campo.name}
                label={campo.etiqueta}
                error={error?.message}
                htmlFor={id}
                className={ancho}
              >
                <Select id={id} {...registrar(campo)}>
                  <option value="" disabled>
                    {campo.placeholderOpcion ?? 'Selecciona una opción…'}
                  </option>
                  {campo.opciones.map((opcion) => (
                    <option key={opcion.valor} value={opcion.valor}>
                      {opcion.texto}
                    </option>
                  ))}
                </Select>
              </Campo>
            )
          }

          if (campo.tipo === 'combo') {
            // Selector con búsqueda. `campo.opciones` puede ser un arreglo fijo
            // o una función (estado, item) => [{ valor, etiqueta }] para
            // catálogos que dependen de otra colección (ej. el cargo del
            // personal, tomado de /cargos).
            const opciones =
              typeof campo.opciones === 'function'
                ? campo.opciones(estado, item)
                : campo.opciones

            return (
              <Campo
                key={campo.name}
                label={campo.etiqueta}
                error={error?.message}
                hint={campo.hint}
                htmlFor={id}
                className={ancho}
              >
                <CampoComboBox
                  id={id}
                  control={control}
                  name={campo.name}
                  rules={reglasBase(campo)}
                  placeholder={campo.placeholder}
                  opciones={opciones}
                  error={error?.message}
                />
              </Campo>
            )
          }

          if (campo.tipo === 'numero') {
            return (
              <Campo
                key={campo.name}
                label={campo.etiqueta}
                error={error?.message}
                hint={campo.hint}
                htmlFor={id}
                className={ancho}
              >
                <CampoMonto
                  id={id}
                  control={control}
                  name={campo.name}
                  placeholder={campo.placeholder}
                  rules={reglasMonto(campo)}
                />
              </Campo>
            )
          }

          return (
            <Campo
              key={campo.name}
              label={campo.etiqueta}
              error={error?.message}
              hint={campo.hint}
              htmlFor={id}
              className={ancho}
            >
              <Input
                id={id}
                type={campo.tipo === 'fecha' ? 'date' : 'text'}
                step={campo.paso}
                min={campo.min}
                placeholder={campo.placeholder}
                {...registrar(campo)}
              />
            </Campo>
          )
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
        {onEliminar && (
          <Button variante="peligro" className="mr-auto" onClick={onEliminar}>
            Eliminar {config.nombreSingular}
          </Button>
        )}
        <Button variante="secundario" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {enEdicion ? 'Guardar cambios' : `Registrar ${config.nombreSingular}`}
        </Button>
      </div>
    </form>
  )
}

// ============================================================
//  CRUD completo de un catálogo
// ============================================================

export function CatalogoCRUD({ config }) {
  const { estado, agregarItem, actualizarItem, eliminarItem, alternarActivo } = useData()
  const items = estado[config.coleccion]

  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState(null)
  const [editando, setEditando] = useState(null)
  const [porEliminar, setPorEliminar] = useState(null)
  const [aviso, setAviso] = useState(null)

  const termino = normalizar(busqueda).trim()
  const visibles = useMemo(() => {
    const filtrados = termino
      ? items.filter((item) => textoCoincide(config.claveBusqueda(item), termino))
      : [...items]
    if (typeof config.ordenar === 'function') {
      filtrados.sort(config.ordenar)
    }
    return filtrados
  }, [items, termino, config])

  const activos = config.tieneActivo
    ? items.filter((item) => item.activo !== false).length
    : null

  const cerrar = () => {
    setModal(null)
    setEditando(null)
    setPorEliminar(null)
  }

  const abrirCrear = () => {
    setEditando(null)
    setModal('crear')
  }

  const abrirEditar = (item) => {
    setEditando(item)
    setModal('editar')
  }

  // Abre la confirmación de borrado. Si el catálogo define `bloquearEliminar`
  // y devuelve un motivo, no se abre el modal: se explica en el aviso.
  // Se usa desde el botón de la fila y (si `eliminarEnEdicion`) desde el modal
  // de edición.
  const solicitarEliminar = (item) => {
    const motivo = config.bloquearEliminar?.(item, estado)
    if (motivo) {
      setAviso({ tipo: 'error', mensaje: motivo })
      return
    }
    setPorEliminar(item)
    setModal('eliminar')
  }

  const guardar = (valores) => {
    if (modal === 'editar') {
      actualizarItem(config.coleccion, { ...valores, id: editando.id })
      // Efectos en otras colecciones al editar (ej. renombrar un cargo
      // arrastra el nombre a las fichas de personal vinculadas).
      config.alActualizar?.(editando, valores, { estado, actualizarItem })
      setAviso({ tipo: 'exito', mensaje: `Registro actualizado en ${config.titulo}.` })
    } else {
      // Los catálogos con estado nacen activos (no dependen del formulario).
      agregarItem(config.coleccion, {
        ...valores,
        ...(config.tieneActivo ? { activo: true } : {}),
      })
      setAviso({ tipo: 'exito', mensaje: `Registro agregado a ${config.titulo}.` })
    }
    cerrar()
  }

  const confirmarEliminar = () => {
    const etiqueta = config.etiquetaItem?.(porEliminar) ?? `#${porEliminar.id}`
    eliminarItem(config.coleccion, porEliminar.id)
    setAviso({
      tipo: 'info',
      mensaje: `«${etiqueta}» eliminado${
        config.coleccion === 'servicios' ? ' junto con sus registros' : ''
      }.`,
    })
    cerrar()
  }

  const cambiarActivo = (item) => {
    alternarActivo(config.coleccion, item.id)
    const etiqueta = config.etiquetaItem?.(item) ?? `#${item.id}`
    setAviso({
      tipo: 'info',
      mensaje: `«${etiqueta}» quedó como ${item.activo !== false ? 'inactivo' : 'activo'}.`,
    })
  }

  const contextoColumnas = { estado }
  // Vistas soportadas por el listado: tabla (por defecto) o cuadrícula de
  // tarjetas, cuando el catálogo define `vista: 'tarjetas'` y un
  // `renderTarjeta`. El buscador y el contador son comunes a ambas.
  const esTarjetas = config.vista === 'tarjetas'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {config.titulo}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{config.descripcion}</p>
        </div>
        <Button onClick={abrirCrear}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="size-4"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nuevo registro
        </Button>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Buscador
            valor={busqueda}
            onChange={setBusqueda}
            placeholder={config.placeholderBusqueda}
            ariaLabel={`Buscar en ${config.titulo}`}
          />

          <p className="text-sm text-slate-500">
            {termino ? (
              <>
                <span className="font-semibold text-slate-700">{visibles.length}</span> de{' '}
                {items.length} {config.etiquetaContador}
              </>
            ) : (
              <>
                <span className="font-semibold text-slate-700">{items.length}</span>{' '}
                {config.etiquetaContador}
                {activos !== null && ` · ${activos} activos`}
              </>
            )}
          </p>
        </div>

        {esTarjetas && visibles.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-400">
            {termino ? config.mensajeVacio : config.mensajeSinRegistros}
          </p>
        )}

        {!esTarjetas && (
          <Table className={config.claseTabla ?? ''}>
            <TableHead>
              <TableRow>
                {config.columnas.map((columna) => (
                  <Th key={columna.etiqueta} alinear={columna.alinear}>
                    {columna.etiqueta}
                  </Th>
                ))}
                <Th alinear="right" className={config.claseAcciones ?? ''}>
                  Acciones
                </Th>
              </TableRow>
            </TableHead>

            <TableBody>
              {visibles.length === 0 ? (
                <TableEmpty
                  colSpan={config.columnas.length + 1}
                  mensaje={termino ? config.mensajeVacio : config.mensajeSinRegistros}
                />
              ) : (
                visibles.map((item) => (
                  <TableRow key={item.id}>
                    {config.columnas.map((columna) => (
                      <Td
                        key={columna.etiqueta}
                        alinear={columna.alinear}
                        className={columna.clase}
                      >
                        {columna.render(item, contextoColumnas)}
                      </Td>
                    ))}

                    <Td alinear="right" className={config.claseAcciones ?? ''}>
                      <div className="flex items-center justify-end gap-1.5">
                        {config.accionesExtra?.(item, contextoColumnas)}

                        {config.tieneActivo &&
                          (config.activoIcono ? (
                            <button
                              type="button"
                              onClick={() => cambiarActivo(item)}
                              title={item.activo !== false ? 'Desactivar' : 'Activar'}
                              aria-label={`${item.activo !== false ? 'Desactivar' : 'Activar'} ${config.etiquetaItem?.(item) ?? item.id}`}
                              className={`rounded-lg border border-slate-300 bg-white p-1.5 text-slate-600 transition-colors hover:bg-slate-100 ${
                                item.activo !== false
                                  ? 'hover:text-red-600'
                                  : 'hover:text-emerald-700'
                              }`}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="size-4"
                                aria-hidden="true"
                              >
                                {item.activo !== false ? (
                                  <>
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                                  </>
                                ) : (
                                  <>
                                    <path d="M17.94 17.94A10.1 10.1 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94" />
                                    <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                    <path d="M1 1l22 22" />
                                  </>
                                )}
                              </svg>
                            </button>
                          ) : (
                            <Button
                              variante="secundario"
                              tamano="sm"
                              onClick={() => cambiarActivo(item)}
                            >
                              {item.activo !== false ? 'Desactivar' : 'Activar'}
                            </Button>
                          ))}

                        {!config.soloDetalle && (
                          <>
                            {config.editarIcono ? (
                              <button
                                type="button"
                                onClick={() => abrirEditar(item)}
                                title="Editar"
                                aria-label={`Editar ${config.etiquetaItem?.(item) ?? item.id}`}
                                className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="size-4"
                                  aria-hidden="true"
                                >
                                  <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                                </svg>
                              </button>
                            ) : (
                              <Button
                                variante="secundario"
                                tamano="sm"
                                onClick={() => abrirEditar(item)}
                              >
                                Editar
                              </Button>
                            )}

                            {!config.eliminarEnEdicion && (
                              <Button
                                variante="peligro"
                                tamano="sm"
                                onClick={() => solicitarEliminar(item)}
                              >
                                Eliminar
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </Td>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Vista en tarjetas: fuera del panel del buscador, para que cada
          tarjeta resalte sobre el fondo de la página. */}
      {esTarjetas && visibles.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibles.map((item) => (
            <div key={item.id} className="h-full">
              {config.renderTarjeta(item, contextoColumnas)}
            </div>
          ))}
        </div>
      )}

      {(modal === 'crear' || (modal === 'editar' && !config.soloDetalle)) && (
        <Modal
          abierto
          titulo={
            modal === 'editar'
              ? `Editar ${config.nombreSingular}`
              : `Nuevo ${config.nombreSingular}`
          }
          descripcion={
            modal === 'editar'
              ? 'Los cambios se guardan solo en el estado local del navegador.'
              : `Alta de ${config.nombreSingular} en el catálogo local.`
          }
          onCerrar={cerrar}
          ancho="md"
        >
          <FormularioCatalogo
            config={config}
            item={modal === 'editar' ? editando : null}
            estado={estado}
            onCancelar={cerrar}
            onGuardar={guardar}
            onEliminar={
              modal === 'editar' && config.eliminarEnEdicion
                ? () => solicitarEliminar(editando)
                : undefined
            }
          />
        </Modal>
      )}

      {modal === 'eliminar' && porEliminar && !config.soloDetalle && (
        <Modal
          abierto
          ancho="sm"
          titulo="Confirmar eliminación"
          descripcion="Esta acción no se puede deshacer."
          onCerrar={cerrar}
          pie={
            <>
              <Button variante="secundario" onClick={cerrar}>
                Cancelar
              </Button>
              <Button variante="peligro" onClick={confirmarEliminar}>
                Sí, eliminar
              </Button>
            </>
          }
        >
          <p className="text-sm text-slate-600">
            Se eliminará{' '}
            <span className="font-semibold text-slate-900">
              {config.columnas[0].render(porEliminar)}
            </span>{' '}
            del catálogo de{' '}
            <span className="font-semibold text-slate-900">
              {config.titulo.toLowerCase()}
            </span>
            .
          </p>
          {config.coleccion === 'servicios' && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              También se eliminarán sus registros de materiales, personal y gastos asociados.
            </p>
          )}
        </Modal>
      )}

      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />
    </div>
  )
}