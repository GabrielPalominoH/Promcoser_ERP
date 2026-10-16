import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useData } from '../../context/useData'
import { Button } from '../../components/ui/Button'
import { Campo, Input, Select } from '../../components/ui/Field'
import { CampoMonto } from '../../components/ui/Monto'
import { Modal } from '../../components/ui/Modal'
import { Aviso } from '../../components/ui/Aviso'
import { ESTATUS_SERVICIO, TIPOS_SERVICIO } from '../../data/mockData'

const TEXTO_CONFIRMACION = 'Eliminar servicio'

const PanelServicioContext = createContext(null)

export function usePanelServicio() {
  const ctx = useContext(PanelServicioContext)
  if (!ctx) {
    throw new Error('usePanelServicio debe usarse dentro de <PanelProveedor>')
  }
  return ctx
}

function FormularioEditarServicio({ servicio, onGuardar }) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      nombre_servicio: servicio.nombre_servicio,
      cliente: servicio.cliente,
      tipo: servicio.tipo ?? 'Obra',
      presupuesto_asignado: servicio.presupuesto_asignado,
      fecha_inicio: servicio.fecha_inicio,
      fecha_fin_estimada: servicio.fecha_fin_estimada ?? '',
      estatus: servicio.estatus,
      igv_pct: servicio.igv_pct ?? 18,
      detraccion_pct: servicio.detraccion_pct ?? 0,
      fondo_garantia_pct: servicio.fondo_garantia_pct ?? 0,
      tolerancia_metrado: servicio.tolerancia_metrado ?? 5,
      alerta_inactividad_dias: servicio.alerta_inactividad_dias ?? 3,
      umbral_rendimiento_pct: servicio.umbral_rendimiento_pct ?? 70,
    },
    mode: 'onBlur',
  })

  useEffect(() => {
    reset({
      nombre_servicio: servicio.nombre_servicio,
      cliente: servicio.cliente,
      tipo: servicio.tipo ?? 'Obra',
      presupuesto_asignado: servicio.presupuesto_asignado,
      fecha_inicio: servicio.fecha_inicio,
      fecha_fin_estimada: servicio.fecha_fin_estimada ?? '',
      estatus: servicio.estatus,
      igv_pct: servicio.igv_pct ?? 18,
      detraccion_pct: servicio.detraccion_pct ?? 0,
      fondo_garantia_pct: servicio.fondo_garantia_pct ?? 0,
      tolerancia_metrado: servicio.tolerancia_metrado ?? 5,
      alerta_inactividad_dias: servicio.alerta_inactividad_dias ?? 3,
      umbral_rendimiento_pct: servicio.umbral_rendimiento_pct ?? 70,
    })
  }, [servicio, reset])

  return (
    <form id="form-editar-servicio" onSubmit={handleSubmit(onGuardar)} noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo
          label="Nombre del servicio"
          error={errors.nombre_servicio?.message}
          htmlFor="nombre_servicio"
          className="sm:col-span-2"
        >
          <Input
            id="nombre_servicio"
            {...register('nombre_servicio', { required: 'Nombre del servicio es obligatorio' })}
          />
        </Campo>
        <Campo label="Cliente" error={errors.cliente?.message} htmlFor="cliente">
          <Input
            id="cliente"
            {...register('cliente', { required: 'Cliente es obligatorio' })}
          />
        </Campo>
        <Campo label="Fecha de inicio" error={errors.fecha_inicio?.message} htmlFor="fecha_inicio">
          <Input
            id="fecha_inicio"
            type="date"
            {...register('fecha_inicio', { required: 'Fecha es obligatoria' })}
          />
        </Campo>
        <Campo
          label="Presupuesto inicial (S/)"
          error={errors.presupuesto_asignado?.message}
          htmlFor="presupuesto_asignado"
        >
          <CampoMonto
            id="presupuesto_asignado"
            control={control}
            name="presupuesto_asignado"
            rules={{
              required: 'Presupuesto es obligatorio',
              validate: (v) =>
                v === '' || Number.isNaN(v) ? 'Presupuesto requiere un número válido' : true,
              min: { value: 0, message: 'Mínimo permitido: 0' },
            }}
          />
        </Campo>
        <Campo label="Fecha fin estimada" error={errors.fecha_fin_estimada?.message} htmlFor="fecha_fin_estimada">
          <Input
            id="fecha_fin_estimada"
            type="date"
            {...register('fecha_fin_estimada')}
          />
        </Campo>
        <Campo label="Tipo" error={errors.tipo?.message} htmlFor="tipo">
          <Select id="tipo" {...register('tipo', { required: 'Tipo es obligatorio' })}>
            <option value="" disabled>Selecciona una opción…</option>
            {TIPOS_SERVICIO.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </Campo>
        <Campo label="Estatus" error={errors.estatus?.message} htmlFor="estatus">
          <Select id="estatus" {...register('estatus', { required: 'Estatus es obligatorio' })}>
            <option value="" disabled>Selecciona una opción…</option>
            {ESTATUS_SERVICIO.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </Select>
        </Campo>
        <Campo
          label="IGV (%)"
          error={errors.igv_pct?.message}
          htmlFor="igv_pct"
          hint="Impuesto aplicado a cada valorización (18 % en Perú)."
        >
          <Input id="igv_pct" type="number" step="0.01" min="0" {...register('igv_pct')} />
        </Campo>
        <Campo
          label="Detracción (%)"
          error={errors.detraccion_pct?.message}
          htmlFor="detraccion_pct"
          hint="Retención del cliente por detracción (según contrato)."
        >
          <Input
            id="detraccion_pct"
            type="number"
            step="0.01"
            min="0"
            {...register('detraccion_pct')}
          />
        </Campo>
        <Campo
          label="Fondo de garantía (%)"
          error={errors.fondo_garantia_pct?.message}
          htmlFor="fondo_garantia_pct"
          hint="Retención sobre el bruto de cada valorización."
        >
          <Input
            id="fondo_garantia_pct"
            type="number"
            step="0.01"
            min="0"
            {...register('fondo_garantia_pct')}
          />
        </Campo>
        <Campo
          label="Tolerancia de metrado (%)"
          error={errors.tolerancia_metrado?.message}
          htmlFor="tolerancia_metrado"
          hint="Tope del acumulado valorizado por partida (contratado + tolerancia)."
        >
          <Input
            id="tolerancia_metrado"
            type="number"
            step="0.01"
            min="0"
            {...register('tolerancia_metrado')}
          />
        </Campo>
        <Campo
          label="Alerta por inactividad (días)"
          error={errors.alerta_inactividad_dias?.message}
          htmlFor="alerta_inactividad_dias"
          hint="Días sin partes para alertar una partida iniciada."
        >
          <Input
            id="alerta_inactividad_dias"
            type="number"
            step="1"
            min="0"
            {...register('alerta_inactividad_dias')}
          />
        </Campo>
        <Campo
          label="Umbral de rendimiento (%)"
          error={errors.umbral_rendimiento_pct?.message}
          htmlFor="umbral_rendimiento_pct"
          hint="Desvío real/plan bajo el cual se alerta una partida."
        >
          <Input
            id="umbral_rendimiento_pct"
            type="number"
            step="0.01"
            min="0"
            {...register('umbral_rendimiento_pct')}
          />
        </Campo>
      </div>
    </form>
  )
}

// Provee el servicio actual + las acciones de Opciones (editar / eliminar)
// para el sidebar del servicio y todas sus páginas.
export function PanelProveedor({ servicio, children }) {
  const navegar = useNavigate()
  const { actualizarItem, eliminarItem } = useData()

  const [aviso, setAviso] = useState(null)
  const [mostrarEditar, setMostrarEditar] = useState(false)
  const [mostrarEliminar, setMostrarEliminar] = useState(false)
  const [textoEliminar, setTextoEliminar] = useState('')

  const confirmacionValida = textoEliminar.trim() === TEXTO_CONFIRMACION

  const abrirEditar = useCallback(() => setMostrarEditar(true), [])
  const cerrarEditar = useCallback(() => setMostrarEditar(false), [])
  const abrirEliminar = useCallback(() => {
    setTextoEliminar('')
    setMostrarEliminar(true)
  }, [])
  const cerrarEliminar = useCallback(() => {
    setMostrarEliminar(false)
    setTextoEliminar('')
  }, [])

  const guardarEdicion = (valores) => {
    actualizarItem('servicios', {
      id: servicio.id,
      nombre_servicio: valores.nombre_servicio.trim(),
      cliente: valores.cliente.trim(),
      tipo: valores.tipo || 'Obra',
      presupuesto_asignado: Number(valores.presupuesto_asignado),
      fecha_inicio: valores.fecha_inicio,
      fecha_fin_estimada: valores.fecha_fin_estimada || '',
      estatus: valores.estatus,
      igv_pct: Number(valores.igv_pct) || 0,
      detraccion_pct: Number(valores.detraccion_pct) || 0,
      fondo_garantia_pct: Number(valores.fondo_garantia_pct) || 0,
      tolerancia_metrado: Number.isFinite(Number(valores.tolerancia_metrado))
        ? Number(valores.tolerancia_metrado)
        : 5,
      alerta_inactividad_dias: Number.isFinite(Number(valores.alerta_inactividad_dias))
        ? Math.max(0, Math.floor(Number(valores.alerta_inactividad_dias)))
        : 3,
      umbral_rendimiento_pct: Number.isFinite(Number(valores.umbral_rendimiento_pct))
        ? Math.max(0, Number(valores.umbral_rendimiento_pct))
        : 70,
    })
    setAviso({ tipo: 'exito', mensaje: 'Servicio actualizado correctamente.' })
    setMostrarEditar(false)
  }

  const confirmarEliminar = () => {
    if (!confirmacionValida) return
    eliminarItem('servicios', servicio.id)
    navegar('/servicios')
  }

  return (
    <PanelServicioContext.Provider
      value={{ servicio, abrirEditar, abrirEliminar }}
    >
      {children}

      {mostrarEditar && (
        <Modal
          abierto
          ancho="md"
          titulo="Editar servicio"
          descripcion="Modifica los datos del servicio."
          onCerrar={cerrarEditar}
          pie={
            <>
              <Button variante="secundario" onClick={cerrarEditar}>
                Cancelar
              </Button>
              <Button type="submit" form="form-editar-servicio">
                Guardar cambios
              </Button>
            </>
          }
        >
          <FormularioEditarServicio servicio={servicio} onGuardar={guardarEdicion} />
        </Modal>
      )}

      {mostrarEliminar && (
        <Modal
          abierto
          ancho="sm"
          titulo="Eliminar servicio"
          descripcion="Esta acción no se puede deshacer."
          onCerrar={cerrarEliminar}
          pie={
            <>
              <Button variante="secundario" onClick={cerrarEliminar}>
                Cancelar
              </Button>
              <Button
                variante="peligro"
                onClick={confirmarEliminar}
                disabled={!confirmacionValida}
              >
                Eliminar servicio
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Se eliminará{' '}
              <span className="font-semibold text-slate-900">
                {servicio.nombre_servicio}
              </span>{' '}
              junto con sus registros asociados. Para confirmar, escribe{' '}
              <span className="font-semibold text-slate-900">
                “{TEXTO_CONFIRMACION}”
              </span>{' '}
              en el campo.
            </p>
            <Campo label="Confirmación" htmlFor="confirmar_eliminar">
              <Input
                id="confirmar_eliminar"
                placeholder={TEXTO_CONFIRMACION}
                value={textoEliminar}
                onChange={(e) => setTextoEliminar(e.target.value)}
                autoComplete="off"
              />
            </Campo>
          </div>
        </Modal>
      )}

      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />
    </PanelServicioContext.Provider>
  )
}
