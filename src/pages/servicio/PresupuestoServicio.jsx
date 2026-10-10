import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useData } from '../../context/useData'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Campo, Input, Select } from '../../components/ui/Field'
import { CampoComboBox } from '../../components/ui/ComboBox'
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
import { CATEGORIAS_PRESUPUESTO } from '../../data/mockData'
import { formatearMoneda, redondearMonto } from '../../utils/formatters'
import {
  desviacionCategoria,
  presupuestoPorCategoria,
  realPorCategoria,
} from '../../utils/finanzas'
import { fechaHoyISO, reglasNumeroMayorACero } from './compartido'

// Presupuesto por categorías con adicionales: inicial + adicionales =
// vigente; se compara contra el costo real (una sola fuente, sin duplicar).
export function PresupuestoServicio() {
  const { servicio } = useOutletContext()
  const { estado, agregarItem, eliminarItem } = useData()
  const [aviso, setAviso] = useState(null)
  const [porEliminar, setPorEliminar] = useState(null)

  const lineas = (estado.presupuestos ?? [])
    .filter((p) => p.servicio_id === servicio.id)
    .sort((a, b) => a.categoria.localeCompare(b.categoria, 'es') || a.id - b.id)
  const ppto = presupuestoPorCategoria(estado.presupuestos, servicio.id)
  const real = realPorCategoria(estado.registros_servicio, servicio.id, estado.equipos)
  const realTotal = Object.values(real.porCategoria).reduce((s, m) => s + m, 0)
  const desvTotal = desviacionCategoria(ppto.vigenteTotal, realTotal + real.sinCategoria)
  const categorias = [...new Set([...Object.keys(ppto.porCategoria), ...Object.keys(real.porCategoria)])].sort((a, b) =>
    a.localeCompare(b, 'es'),
  )
  const excedidas = categorias.filter((c) => {
    const d = desviacionCategoria(ppto.porCategoria[c]?.vigente ?? 0, real.porCategoria[c] ?? 0)
    return d.excedida
  })

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: { categoria: '', monto: '', version: 'inicial', motivo: '', fecha: fechaHoyISO() },
  })
  const version = watch('version')

  const enviar = ({ categoria, monto, version: ver, motivo, fecha }) => {
    if (ver === 'adicional' && !motivo.trim()) {
      setAviso({ tipo: 'error', mensaje: 'El adicional requiere motivo (aprobación).' })
      return
    }
    agregarItem('presupuestos', {
      servicio_id: servicio.id,
      categoria,
      monto: redondearMonto(monto),
      version: ver,
      motivo: ver === 'adicional' ? motivo.trim() : null,
      fecha,
    })
    setAviso({
      tipo: 'exito',
      mensaje: ver === 'adicional' ? 'Adicional aprobado registrado.' : 'Presupuesto inicial registrado.',
    })
    reset()
  }

  const confirmarEliminar = () => {
    eliminarItem('presupuestos', porEliminar)
    setPorEliminar(null)
    setAviso({ tipo: 'info', mensaje: 'Línea de presupuesto eliminada. Se conserva el historial de costos.' })
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <p className="text-sm text-slate-500">Inicial</p>
          <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">{formatearMoneda(ppto.inicialTotal)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Adicionales</p>
          <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">{formatearMoneda(ppto.adicionalTotal)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Vigente</p>
          <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">{formatearMoneda(ppto.vigenteTotal)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Desviación</p>
          <p className={`mt-1 text-xl font-bold tabular-nums ${desvTotal.desviacion > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
            {formatearMoneda(desvTotal.desviacion)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
            Ejecución {desvTotal.ejecucion == null ? 'no disponible' : `${desvTotal.ejecucion}%`}
          </p>
        </Card>
      </div>

      {excedidas.length > 0 && (
        <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
          Categorías excedidas: {excedidas.join(', ')}.
        </p>
      )}
      {real.sinCategoria > 0 && (
        <p className="rounded-lg bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800">
          {formatearMoneda(real.sinCategoria)} en gastos sin categoría: asígnala para controlarlos.
        </p>
      )}

      <Card
        titulo="Registrar presupuesto"
        descripcion="Inicial una vez; adicionales con motivo de aprobación. No es gasto real."
      >
        <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Campo
              label="Categoría"
              error={errors.categoria?.message}
              htmlFor="pre-categoria"
              className="sm:col-span-2"
            >
              <CampoComboBox
                id="pre-categoria"
                control={control}
                name="categoria"
                rules={{ required: 'Selecciona una categoría' }}
                placeholder="Escribe para buscar…"
                opciones={CATEGORIAS_PRESUPUESTO.map((c) => ({ valor: c, etiqueta: c }))}
              />
            </Campo>
            <Campo label="Monto (S/)" error={errors.monto?.message} htmlFor="pre-monto">
              <Input
                id="pre-monto"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('monto', reglasNumeroMayorACero('Ingresa el monto'))}
              />
            </Campo>
            <Campo label="Versión" error={errors.version?.message} htmlFor="pre-version">
              <Select id="pre-version" {...register('version', { required: true })}>
                <option value="inicial">Inicial</option>
                <option value="adicional">Adicional</option>
              </Select>
            </Campo>
            {version === 'adicional' && (
              <Campo
                label="Motivo (aprobación)"
                error={errors.motivo?.message}
                htmlFor="pre-motivo"
                className="sm:col-span-3"
              >
                <Input
                  id="pre-motivo"
                  placeholder="Ej. Adicional N°1 aprobado por cliente"
                  {...register('motivo')}
                />
              </Campo>
            )}
            <Campo label="Fecha" error={errors.fecha?.message} htmlFor="pre-fecha">
              <Input id="pre-fecha" type="date" {...register('fecha', { required: 'Indica la fecha' })} />
            </Campo>
          </div>
          <div className="flex justify-end">
            <Button type="submit">Agregar al presupuesto</Button>
          </div>
        </form>
      </Card>

      <Card titulo="Presupuesto frente a costo real" descripcion="Por categoría, con desviación y ejecución.">
        <Table>
          <TableHead>
            <TableRow>
              <Th>Categoría</Th>
              <Th alinear="right">Inicial</Th>
              <Th alinear="right">Adicional</Th>
              <Th alinear="right">Vigente</Th>
              <Th alinear="right">Real</Th>
              <Th alinear="right">Desviación</Th>
              <Th alinear="right">Ejecución</Th>
            </TableRow>
          </TableHead>
          <TableBody>
            {categorias.length === 0 && real.sinCategoria === 0 ? (
              <TableEmpty colSpan={7} mensaje="Sin presupuesto: define montos por categoría para controlar desviaciones." />
            ) : (
              categorias.map((cat) => {
                const p = ppto.porCategoria[cat] ?? { inicial: 0, adicional: 0, vigente: 0 }
                const r = real.porCategoria[cat] ?? 0
                const d = desviacionCategoria(p.vigente, r)
                return (
                  <TableRow key={cat}>
                    <Td className="font-medium text-slate-800">{cat}</Td>
                    <Td alinear="right" className="tabular-nums">{formatearMoneda(p.inicial)}</Td>
                    <Td alinear="right" className="tabular-nums">{formatearMoneda(p.adicional)}</Td>
                    <Td alinear="right" className="tabular-nums">{formatearMoneda(p.vigente)}</Td>
                    <Td alinear="right" className="tabular-nums">{formatearMoneda(r)}</Td>
                    <Td alinear="right" className={`font-semibold tabular-nums ${d.desviacion > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                      {formatearMoneda(d.desviacion)}
                    </Td>
                    <Td alinear="right" className="tabular-nums">
                      {d.ejecucion == null ? 'N/D' : `${d.ejecucion}%`}
                    </Td>
                  </TableRow>
                )
              })
            )}

            {(categorias.length > 0 || real.sinCategoria > 0) && (
              <TableRow className="bg-slate-50 font-semibold">
                <Td className="text-slate-600">
                  Total
                  {real.sinCategoria > 0 && (
                    <span className="block text-xs font-normal">
                      + {formatearMoneda(real.sinCategoria)} sin categoría
                    </span>
                  )}
                </Td>
                <Td alinear="right" className="tabular-nums">{formatearMoneda(ppto.inicialTotal)}</Td>
                <Td alinear="right" className="tabular-nums">{formatearMoneda(ppto.adicionalTotal)}</Td>
                <Td alinear="right" className="tabular-nums">{formatearMoneda(ppto.vigenteTotal)}</Td>
                <Td alinear="right" className="tabular-nums">{formatearMoneda(realTotal + real.sinCategoria)}</Td>
                <Td alinear="right" className="tabular-nums">{formatearMoneda(desvTotal.desviacion)}</Td>
                <Td alinear="right" className="tabular-nums">
                  {desvTotal.ejecucion == null ? 'N/D' : `${desvTotal.ejecucion}%`}
                </Td>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {lineas.length > 0 && (
        <Card titulo="Líneas registradas" descripcion="Historial de inicial y adicionales.">
          <ul className="space-y-1.5">
            {lineas.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="min-w-0 truncate text-slate-700">
                  <span className={`mr-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${l.version === 'adicional' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'}`}>
                    {l.version}
                  </span>
                  {l.categoria} · <span className="tabular-nums">{formatearMoneda(l.monto)}</span>
                  {l.motivo && <span className="text-slate-500"> · {l.motivo}</span>}
                </span>
                <Button variante="peligro" tamano="sm" onClick={() => setPorEliminar(l.id)}>
                  Eliminar
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {porEliminar != null && (
        <Modal
          abierto
          ancho="sm"
          titulo="Eliminar línea"
          descripcion="Esta acción no se puede deshacer."
          onCerrar={() => setPorEliminar(null)}
          pie={
            <>
              <Button variante="secundario" onClick={() => setPorEliminar(null)}>Cancelar</Button>
              <Button variante="peligro" onClick={confirmarEliminar}>Sí, eliminar</Button>
            </>
          }
        >
          <p className="text-sm text-slate-600">Se eliminará la línea de presupuesto. Los costos reales no se tocan.</p>
        </Modal>
      )}

      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />
    </div>
  )
}
