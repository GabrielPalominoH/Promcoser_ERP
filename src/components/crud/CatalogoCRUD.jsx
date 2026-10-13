import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useData } from '../../context/useData'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Campo, Input, Select } from '../ui/Field'
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

function FormularioCatalogo({ config, item, onCancelar, onGuardar }) {
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

      <div className="mt-6 flex justify-end gap-2">
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

  const termino = busqueda.trim().toLowerCase()
  const visibles = useMemo(() => {
    const filtrados = termino
      ? items.filter((item) =>
          String(config.claveBusqueda(item)).toLowerCase().includes(termino),
        )
      : [...items]
    if (typeof config.ordenar === 'function') {
      filtrados.sort(config.ordenar)
    }
    return filtrados
  }, [items, termino, config])

  const activos = config.tieneActivo ? items.filter((item) => item.activo).length : null

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

  const abrirEliminar = (item) => {
    setPorEliminar(item)
    setModal('eliminar')
  }

  const guardar = (valores) => {
    if (modal === 'editar') {
      actualizarItem(config.coleccion, { ...valores, id: editando.id })
      setAviso({ tipo: 'exito', mensaje: `Registro actualizado en ${config.titulo}.` })
    } else {
      agregarItem(config.coleccion, valores)
      setAviso({ tipo: 'exito', mensaje: `Registro agregado a ${config.titulo}.` })
    }
    cerrar()
  }

  const confirmarEliminar = () => {
    const etiqueta = config.columnas[0].render(porEliminar)
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
    setAviso({
      tipo: 'info',
      mensaje: `${item.nombre} quedó como ${item.activo ? 'inactivo' : 'activo'}.`,
    })
  }

  const contextoColumnas = { estado }

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
          <div className="relative w-full max-w-sm">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            >
              <path d="m21 21-4.3-4.3M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
            </svg>
            <Input
              type="search"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder={config.placeholderBusqueda}
              className="pl-9"
              aria-label={`Buscar en ${config.titulo}`}
            />
          </div>

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

        <Table className={config.claseTabla ?? ''}>
          <TableHead>
            <TableRow>
              {config.columnas.map((columna) => (
                <Th key={columna.etiqueta} alinear={columna.alinear}>
                  {columna.etiqueta}
                </Th>
              ))}
              <Th alinear="right">Acciones</Th>
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
                    <Td key={columna.etiqueta} alinear={columna.alinear} className={columna.clase}>
                      {columna.render(item, contextoColumnas)}
                    </Td>
                  ))}

                  <Td alinear="right">
                    <div className="flex items-center justify-end gap-1.5">
                      {config.accionesExtra?.(item, contextoColumnas)}

                      {config.tieneActivo && (
                        <Button
                          variante="secundario"
                          tamano="sm"
                          onClick={() => cambiarActivo(item)}
                        >
                          {item.activo ? 'Desactivar' : 'Activar'}
                        </Button>
                      )}

                      {!config.soloDetalle && (
                        <>
                          <Button variante="secundario" tamano="sm" onClick={() => abrirEditar(item)}>
                            Editar
                          </Button>

                          <Button variante="peligro" tamano="sm" onClick={() => abrirEliminar(item)}>
                            Eliminar
                          </Button>
                        </>
                      )}
                    </div>
                  </Td>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

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
            onCancelar={cerrar}
            onGuardar={guardar}
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