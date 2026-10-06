import { Link } from 'react-router-dom'
import { useData } from '../context/useData'
import { Card } from '../components/ui/Card'
import { StatCard } from '../components/ui/StatCard'
import { Badge, BadgeEstatus } from '../components/ui/Badge'
import { Table, TableBody, TableEmpty, TableHead, TableRow, Td, Th } from '../components/ui/Table'
import { Icono } from '../components/layout/Sidebar'
import { Button } from '../components/ui/Button'
import {
  formatearCantidad,
  formatearFecha,
  formatearMoneda,
} from '../utils/formatters'
import {
  consumoPresupuesto,
  desglosePorTipo,
  nombreReferencia,
  ordenarPorFechaDesc,
  sumarMontos,
} from '../utils/calculadora'

function BarraPresupuesto({ porcentaje, excedido }) {
  const ancho = Math.min(100, Math.max(0, porcentaje))

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full transition-all ${
          excedido ? 'bg-red-500' : porcentaje > 85 ? 'bg-amber-500' : 'bg-primary-600'
        }`}
        style={{ width: `${ancho}%` }}
      />
    </div>
  )
}

export function Dashboard() {
  const { estado, restablecer } = useData()
  const { personal, materiales, equipos, servicios, registros_servicio: registros } = estado

  const presupuestoTotal = servicios.reduce(
    (total, servicio) => total + (Number(servicio.presupuesto_asignado) || 0),
    0,
  )
  const gastadoTotal = sumarMontos(registros)
  const serviciosEnCurso = servicios.filter((s) => s.estatus === 'En curso').length
  const totalPersonal = personal.length
  const totalEquipos = equipos.length

  const ultimosRegistros = ordenarPorFechaDesc(registros).slice(0, 8)
  const serviciosPorConsumo = [...servicios].sort(
    (a, b) =>
      consumoPresupuesto(b, registros).porcentaje -
      consumoPresupuesto(a, registros).porcentaje,
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Resumen de servicios, presupuesto y recursos de PROMCOSER.
          </p>
        </div>
        <Button variante="secundario" onClick={restablecer}>
          Restablecer datos de ejemplo
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          titulo="Servicios"
          valor={servicios.length}
          detalle={`${serviciosEnCurso} en curso`}
          tono="primary"
          icono={<Icono nombre="clipboard" className="size-5" />}
        />
        <StatCard
          titulo="Presupuesto asignado"
          valor={formatearMoneda(presupuestoTotal)}
          detalle="Suma de todos los servicios"
          tono="slate"
          icono={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-5" aria-hidden="true">
              <path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
        <StatCard
          titulo="Gasto consumido"
          valor={formatearMoneda(gastadoTotal)}
          detalle={
            presupuestoTotal
              ? `${((gastadoTotal / presupuestoTotal) * 100).toFixed(1)}% del presupuesto total`
              : 'Sin presupuesto'
          }
          tono={gastadoTotal > presupuestoTotal ? 'danger' : 'success'}
          icono={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-5" aria-hidden="true">
              <path d="M3 17l6-6 4 4 8-8M21 7h-5m5 0v5" />
            </svg>
          }
        />
        <StatCard
          titulo="Recursos"
          valor={`${totalPersonal} / ${totalEquipos}`}
          detalle="Personal registrado / equipos registrados"
          tono="warning"
          icono={<Icono nombre="users" className="size-5" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card
          titulo="Consumo por servicio"
          descripcion="Ordenado de mayor a menor avance presupuestal"
          className="xl:col-span-3"
        >
          <ul className="space-y-5">
            {serviciosPorConsumo.map((servicio) => {
              const consumo = consumoPresupuesto(servicio, registros)

              return (
                <li key={servicio.id}>
                  <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-medium text-slate-800">
                        {servicio.nombre_servicio}
                      </span>
                      <BadgeEstatus estatus={servicio.estatus} />
                    </div>
                    <span
                      className={`text-sm font-semibold tabular-nums ${
                        consumo.excedido ? 'text-red-600' : 'text-slate-700'
                      }`}
                    >
                      {consumo.porcentaje.toFixed(1)}%
                    </span>
                  </div>
                  <BarraPresupuesto
                    porcentaje={consumo.porcentaje}
                    excedido={consumo.excedido}
                  />
                  <p className="mt-1.5 text-xs text-slate-500">
                    {formatearMoneda(consumo.gastado)} de{' '}
                    {formatearMoneda(consumo.presupuesto)} · {servicio.cliente}
                  </p>
                </li>
              )
            })}
          </ul>
        </Card>

        <Card
          titulo="Estructura del gasto"
          descripcion="Acumulado por tipo de registro"
          className="xl:col-span-2"
        >
          <ul className="space-y-4">
            {Object.entries(desglosePorTipo(registros)).map(([tipo, monto]) => {
              const porcentaje = gastadoTotal ? (monto / gastadoTotal) * 100 : 0

              return (
                <li key={tipo}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700 capitalize">{tipo}</span>
                    <span className="text-slate-500 tabular-nums">
                      {formatearMoneda(monto)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-primary-600"
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {porcentaje.toFixed(1)}% del gasto total
                  </p>
                </li>
              )
            })}
          </ul>

          <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-200 pt-5 text-sm">
            <div>
              <dt className="text-slate-500">Materiales en catálogo</dt>
              <dd className="font-semibold text-slate-800">
                {materiales.length}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Personal registrado</dt>
              <dd className="font-semibold text-slate-800">
                {personal.length}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Equipos registrados</dt>
              <dd className="font-semibold text-slate-800">
                {equipos.length}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Servicios finalizados</dt>
              <dd className="font-semibold text-slate-800">
                {servicios.filter((s) => s.estatus === 'Finalizado').length}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card
        titulo="Movimientos recientes"
        descripcion="Últimos registros agregados a los servicios"
        acciones={
          <Link to="/servicios">
            <Button variante="secundario" tamano="sm">
              Ir a Servicios
            </Button>
          </Link>
        }
      >
        <Table>
          <TableHead>
            <TableRow>
              <Th>Fecha</Th>
              <Th>Servicio</Th>
              <Th>Concepto</Th>
              <Th>Tipo</Th>
              <Th alinear="right">Cantidad</Th>
              <Th alinear="right">Monto</Th>
            </TableRow>
          </TableHead>
          <TableBody>
            {ultimosRegistros.length === 0 ? (
              <TableEmpty colSpan={6} mensaje="Aún no hay movimientos registrados." />
            ) : (
              ultimosRegistros.map((registro) => (
                <TableRow key={registro.id}>
                  <Td className="whitespace-nowrap text-slate-500">
                    {formatearFecha(registro.fecha)}
                  </Td>
                  <Td className="max-w-xs truncate">
                    {servicios.find((s) => s.id === registro.servicio_id)?.nombre_servicio ??
                      'Servicio eliminado'}
                  </Td>
                  <Td>{nombreReferencia(registro, { personal, materiales })}</Td>
                  <Td>
                    <Badge variante={registro.tipo_registro === 'gasto' ? 'warning' : 'info'}>
                      {registro.tipo_registro}
                    </Badge>
                  </Td>
                  <Td alinear="right" className="tabular-nums">
                    {formatearCantidad(registro.cantidad_o_horas)}
                  </Td>
                  <Td alinear="right" className="font-medium text-slate-900 tabular-nums">
                    {formatearMoneda(registro.monto_calculado)}
                  </Td>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}