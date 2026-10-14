import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useData } from '../context/useData'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Campo, Input } from '../components/ui/Field'
import { normalizar } from '../components/ui/ComboBox'
import { Buscador, BarraFiltros, textoCoincide } from '../components/ui/FiltroBusqueda'
import { CampoMonto, reglasMontoMayorACero } from '../components/ui/Monto'
import { CampoComboBox } from '../components/ui/ComboBox'
import { Modal } from '../components/ui/Modal'
import { Aviso } from '../components/ui/Aviso'
import {
  Table,
  TableBody,
  TableEmpty,
  TableHead,
  TableRow,
  Td,
  Th,
} from '../components/ui/Table'
import { formatearMoneda, redondearMonto } from '../utils/formatters'
import { cobradoServicio, registrosDeServicio, sumarMontos, utilidadReal } from '../utils/calculadora'

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function mesActual() {
  const ahora = new Date()
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`
}

function etiquetaMes(mesISO) {
  if (!mesISO) return '—'
  const [anio, mes] = mesISO.split('-').map(Number)
  return `${MESES[mes - 1]} ${anio}`
}

function nombreCompleto(item) {
  return `${item.nombre} ${item.apellido ?? ''}`.trim()
}

function FormularioCostoOficina({ personal, mesFijo, onGuardar }) {
  const elegibles = useMemo(
    () =>
      [...personal]
        .filter((p) => (p.ambito ?? 'Obra') === 'Oficina')
        .sort((a, b) => nombreCompleto(a).localeCompare(nombreCompleto(b), 'es')),
    [personal],
  )

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: { personal_id: '', mes: mesFijo, monto: '' },
  })

  const enviar = ({ personal_id, mes, monto }) => {
    onGuardar({
      personal_id: Number(personal_id),
      mes,
      monto_calculado: redondearMonto(monto),
    })
    reset({ personal_id: '', mes: mesFijo, monto: '' })
  }

  if (elegibles.length === 0) {
    return (
      <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
        No hay personal de Oficina registrado. Marca el ámbito en el módulo Personal.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Campo
          label="Persona"
          error={errors.personal_id?.message}
          htmlFor="ofi-persona"
        >
          <CampoComboBox
            id="ofi-persona"
            control={control}
            name="personal_id"
            rules={{ required: 'Selecciona a una persona' }}
            placeholder="Escribe para buscar…"
            opciones={elegibles.map((item) => ({
              valor: String(item.id),
              etiqueta: `${nombreCompleto(item)} — ${item.cargo}`,
            }))}
          />
        </Campo>
        <Campo label="Mes" error={errors.mes?.message} htmlFor="ofi-mes">
          <Input
            id="ofi-mes"
            type="month"
            {...register('mes', { required: 'Indica el mes' })}
          />
        </Campo>
        <Campo label="Costo mensual (S/)" error={errors.monto?.message} htmlFor="ofi-monto">
          <CampoMonto
            id="ofi-monto"
            control={control}
            name="monto"
            placeholder="0.00"
            rules={reglasMontoMayorACero('Ingresa el monto')}
          />
        </Campo>
      </div>
      <div className="flex justify-end">
        <Button type="submit">Agregar costo</Button>
      </div>
    </form>
  )
}

export function Oficina() {
  const { estado, agregarItem, eliminarItem } = useData()
  const { personal, servicios, registros_servicio, costos_oficina: costos, cobros: todosLosCobros } = estado

  const [mes, setMes] = useState(mesActual())
  const [aviso, setAviso] = useState(null)
  const [porEliminar, setPorEliminar] = useState(null)
  const [busquedaUtilidad, setBusquedaUtilidad] = useState('')

  const utilidades = useMemo(
    () =>
      servicios.map((s) => {
        const gastado = sumarMontos(registrosDeServicio(registros_servicio, s.id))
        return { servicio: s, utilidad: utilidadReal(cobradoServicio(todosLosCobros ?? [], s.id), gastado) }
      }),
    [servicios, registros_servicio, todosLosCobros],
  )
  const utilidadTotal = utilidades.reduce((t, m) => t + m.utilidad, 0)

  // Filtro de la tabla: texto sobre el nombre del servicio o el cliente.
  const terminoUtilidad = normalizar(busquedaUtilidad).trim()
  const utilidadesFiltradas = utilidades.filter(({ servicio }) =>
    textoCoincide(`${servicio.nombre_servicio} ${servicio.cliente ?? ''}`, terminoUtilidad),
  )

  const costosMes = useMemo(
    () => costos.filter((c) => c.mes === mes),
    [costos, mes],
  )
  const totalOficina = costosMes.reduce((t, c) => t + (Number(c.monto_calculado) || 0), 0)
  const resultado = utilidadTotal - totalOficina

  const nombrePersona = (id) => {
    const p = personal.find((x) => x.id === id)
    return p ? { nombre: nombreCompleto(p), cargo: p.cargo } : { nombre: 'Personal eliminado', cargo: '' }
  }

  const registrar = (datos) => {
    agregarItem('costos_oficina', datos)
    setAviso({ tipo: 'exito', mensaje: `Costo de ${etiquetaMes(datos.mes)} agregado.` })
  }

  const confirmarEliminar = () => {
    eliminarItem('costos_oficina', porEliminar.id)
    setAviso({ tipo: 'info', mensaje: 'Costo eliminado.' })
    setPorEliminar(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Oficina y empresa
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Costo mensual del personal de Oficina y resultado global de la empresa.
          </p>
        </div>
        <Campo label="Mes" htmlFor="filtro-mes" className="w-44">
          <Input
            id="filtro-mes"
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
          />
        </Campo>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">Utilidad total de servicios</p>
          <p className={`mt-1 text-xl font-bold tabular-nums ${utilidadTotal < 0 ? 'text-red-600' : 'text-slate-900'}`}>
            {formatearMoneda(utilidadTotal)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 capitalize">{etiquetaMes(mes)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Costo de oficina</p>
          <p className="mt-1 text-xl font-bold text-red-600 tabular-nums">
            {formatearMoneda(totalOficina)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 capitalize">{etiquetaMes(mes)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Resultado empresa</p>
          <p className={`mt-1 text-xl font-bold tabular-nums ${resultado < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
            {formatearMoneda(resultado)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Utilidad menos oficina</p>
        </Card>
      </div>

      <Card
        titulo="Utilidad por servicio"
        descripcion="Cobrado menos gastado de cada servicio."
      >
        {utilidades.length > 0 && (
          <BarraFiltros
            contador={
              terminoUtilidad ? (
                <>
                  <span className="font-semibold text-slate-700">{utilidadesFiltradas.length}</span> de{' '}
                  {utilidades.length}
                </>
              ) : null
            }
          >
            <Buscador
              valor={busquedaUtilidad}
              onChange={setBusquedaUtilidad}
              placeholder="Buscar por servicio o cliente…"
              ariaLabel="Buscar servicios"
            />
          </BarraFiltros>
        )}
        <Table>
          <TableHead>
            <TableRow>
              <Th>Servicio</Th>
              <Th alinear="right">Utilidad</Th>
            </TableRow>
          </TableHead>
          <TableBody>
            {utilidades.length === 0 ? (
              <TableEmpty colSpan={2} mensaje="No hay servicios." />
            ) : utilidadesFiltradas.length === 0 ? (
              <TableEmpty colSpan={2} mensaje="Ningún servicio coincide con el filtro." />
            ) : (
              utilidadesFiltradas.map(({ servicio, utilidad }) => (
                <TableRow key={servicio.id}>
                  <Td>
                    <span className="font-medium text-slate-900">{servicio.nombre_servicio}</span>
                    <span className="block text-xs text-slate-500">{servicio.cliente}</span>
                  </Td>
                  <Td alinear="right" className={`font-semibold tabular-nums ${utilidad < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                    {formatearMoneda(utilidad)}
                  </Td>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Card
        titulo="Costo de oficina del mes"
        descripcion="Personal de Oficina: sueldo o costo mensual. No afecta la utilidad de ningún servicio."
      >
        <div className="mb-5">
          <FormularioCostoOficina personal={personal} mesFijo={mes} onGuardar={registrar} />
        </div>
        <Table>
          <TableHead>
            <TableRow>
              <Th>Persona</Th>
              <Th>Mes</Th>
              <Th alinear="right">Monto</Th>
              <Th alinear="right">Acción</Th>
            </TableRow>
          </TableHead>
          <TableBody>
            {costosMes.length === 0 ? (
              <TableEmpty colSpan={4} mensaje={`Sin costos registrados en ${etiquetaMes(mes)}.`} />
            ) : (
              costosMes.map((c) => {
                const persona = nombrePersona(c.personal_id)
                return (
                  <TableRow key={c.id}>
                    <Td>
                      <span className="font-medium text-slate-900">{persona.nombre}</span>
                      {persona.cargo && (
                        <span className="block text-xs text-slate-500">{persona.cargo}</span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-slate-500 capitalize">
                      {etiquetaMes(c.mes)}
                    </Td>
                    <Td alinear="right" className="font-semibold text-slate-900 tabular-nums">
                      {formatearMoneda(c.monto_calculado)}
                    </Td>
                    <Td alinear="right">
                      <Button variante="peligro" tamano="sm" onClick={() => setPorEliminar(c)}>
                        Eliminar
                      </Button>
                    </Td>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {porEliminar && (
        <Modal
          abierto
          ancho="sm"
          titulo="Eliminar costo"
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
            Se eliminará el costo de{' '}
            <span className="font-semibold text-slate-900">
              {formatearMoneda(porEliminar.monto_calculado)}
            </span>{' '}
            de {etiquetaMes(porEliminar.mes)}.
          </p>
        </Modal>
      )}

      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />
    </div>
  )
}
