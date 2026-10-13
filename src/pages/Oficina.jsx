import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useData } from '../context/useData'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Campo, Input, Select } from '../components/ui/Field'
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
import { consumoPresupuesto } from '../utils/calculadora'
import { REGLAS_INDIRECTOS, distribuirIndirectos } from '../utils/finanzas'
import { cobradoServicio } from '../utils/calculadora'
import { leerConfig } from '../data/store'

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
  const { estado, agregarItem, actualizarItem, eliminarItem } = useData()
  const { personal, servicios, registros_servicio, costos_oficina: costos } = estado
  const config = leerConfig(estado)
  const regla = config.distribucion_indirectos ?? 'ninguna'

  const [mes, setMes] = useState(mesActual())
  const [aviso, setAviso] = useState(null)
  const [porEliminar, setPorEliminar] = useState(null)

  const margenes = useMemo(
    () =>
      servicios.map((s) => {
        const consumo = consumoPresupuesto(s, registros_servicio)
        return { servicio: s, margen: consumo.disponible }
      }),
    [servicios, registros_servicio],
  )
  const margenTotal = margenes.reduce((t, m) => t + m.margen, 0)

  const costosMes = useMemo(
    () => costos.filter((c) => c.mes === mes),
    [costos, mes],
  )
  const totalOficina = costosMes.reduce((t, c) => t + (Number(c.monto_calculado) || 0), 0)
  const resultado = margenTotal - totalOficina

  // Distribución de indirectos del mes por regla configurable. Bases del
  // mismo mes que la oficina (coherencia de periodo). Sin regla, se muestran
  // por separado (no se oculta el margen directo).
  const distribucion = useMemo(() => {
    if (regla === 'ninguna') return { regla: 'ninguna', distribuido: [], sinDistribuir: totalOficina }
    const enMesSel = (fecha) => typeof fecha === 'string' && fecha.slice(0, 7) === mes
    const bases = servicios.map((s) => {
      const regs = registros_servicio.filter((r) => r.servicio_id === s.id && enMesSel(r.fecha))
      const base =
        regla === 'horas'
          ? regs.filter((r) => r.tipo_registro === 'personal').reduce((t, r) => t + Number(r.cantidad_o_horas), 0)
          : regla === 'ingresos'
            ? (estado.cobros ?? []).filter((c) => c.servicio_id === s.id && enMesSel(c.fecha)).reduce((t, c) => t + Number(c.monto), 0)
            : regs.reduce((t, r) => t + Number(r.monto_calculado), 0)
      return { servicio_id: s.id, base }
    })
    return distribuirIndirectos(totalOficina, bases)
  }, [regla, servicios, registros_servicio, estado.cobros, totalOficina, mes])

  const cambiarRegla = (nueva) => {
    actualizarItem('config', { id: 1, distribucion_indirectos: nueva })
    setAviso({ tipo: 'exito', mensaje: `Regla de distribución: ${nueva}.` })
  }

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
          <p className="text-sm text-slate-500">Margen total de servicios</p>
          <p className={`mt-1 text-xl font-bold tabular-nums ${margenTotal < 0 ? 'text-red-600' : 'text-slate-900'}`}>
            {formatearMoneda(margenTotal)}
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
          <p className="mt-0.5 text-xs text-slate-500">Márgenes menos oficina</p>
        </Card>
      </div>

      <Card
        titulo="Margen por servicio"
        descripcion="Presupuesto menos gastado de cada servicio."
      >
        <Table>
          <TableHead>
            <TableRow>
              <Th>Servicio</Th>
              <Th alinear="right">Margen</Th>
            </TableRow>
          </TableHead>
          <TableBody>
            {margenes.length === 0 ? (
              <TableEmpty colSpan={2} mensaje="No hay servicios." />
            ) : (
              margenes.map(({ servicio, margen }) => (
                <TableRow key={servicio.id}>
                  <Td>
                    <span className="font-medium text-slate-900">{servicio.nombre_servicio}</span>
                    <span className="block text-xs text-slate-500">{servicio.cliente}</span>
                  </Td>
                  <Td alinear="right" className={`font-semibold tabular-nums ${margen < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                    {formatearMoneda(margen)}
                  </Td>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Card
        titulo="Distribución de indirectos"
        descripcion="Regla configurable para atribuir la oficina a cada servicio. Sin regla se muestran por separado."
        acciones={
          <Campo label="Regla" htmlFor="ofi-regla" className="w-44">
            <Select id="ofi-regla" value={regla} onChange={(e) => cambiarRegla(e.target.value)}>
              {REGLAS_INDIRECTOS.map((r) => (
                <option key={r} value={r}>
                  {r === 'ninguna' ? 'Sin distribuir' : `Por ${r}`}
                </option>
              ))}
            </Select>
          </Campo>
        }
      >
        {distribucion.regla === 'ninguna' ? (
          <p className="text-sm text-slate-500">
            Sin regla: {formatearMoneda(distribucion.sinDistribuir)} de oficina no se atribuyen a
            ningún servicio (el margen directo no se oculta).
          </p>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <Th>Servicio</Th>
                <Th alinear="right">Base ({regla})</Th>
                <Th alinear="right">Atribuido</Th>
              </TableRow>
            </TableHead>
            <TableBody>
              {distribucion.distribuido.length === 0 ? (
                <TableEmpty colSpan={3} mensaje="Sin bases para distribuir este mes." />
              ) : (
                distribucion.distribuido.map((d) => {
                  const servicio = servicios.find((s) => s.id === d.servicio_id)
                  return (
                    <TableRow key={d.servicio_id}>
                      <Td className="font-medium text-slate-800">
                        {servicio?.nombre_servicio ?? 'Servicio eliminado'}
                      </Td>
                      <Td alinear="right" className="tabular-nums">{formatearMoneda(d.base)}</Td>
                      <Td alinear="right" className="font-semibold tabular-nums">{formatearMoneda(d.monto)}</Td>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        )}
        <p className="mt-2 text-xs text-slate-400">
          Criterio aplicado: {regla === 'ninguna' ? 'ninguno (separado)' : `prorrateo por ${regla} del mes ${mes}`}.
          Suma exacta por redondeo al mayor.
        </p>
      </Card>

      <Card
        titulo="Costo de oficina del mes"
        descripcion="Personal de Oficina: sueldo o costo mensual. No afecta el margen de ningún servicio."
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
