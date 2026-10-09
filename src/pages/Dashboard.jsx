import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../context/useData'
import { Card } from '../components/ui/Card'
import { StatCard } from '../components/ui/StatCard'
import { Badge, BadgeEstatus } from '../components/ui/Badge'
import { Table, TableBody, TableEmpty, TableHead, TableRow, Td, Th } from '../components/ui/Table'
import { Icono } from '../components/layout/Sidebar'
import { Button } from '../components/ui/Button'
import { Aviso } from '../components/ui/Aviso'
import { COLECCIONES } from '../data/mockData'
import {
  formatearCantidad,
  formatearFecha,
  formatearMoneda,
} from '../utils/formatters'
import {
  consumoPresupuesto,
  desglosePorTipo,
  diasRestantes,
  nombreReferencia,
  ordenarPorFechaDesc,
  rentabilidadServicio,
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

function nombreRespaldo() {
  const ahora = new Date()
  const mes = String(ahora.getMonth() + 1).padStart(2, '0')
  const dia = String(ahora.getDate()).padStart(2, '0')
  return `promcoser-respaldo-${ahora.getFullYear()}-${mes}-${dia}.json`
}

export function Dashboard() {
  const { estado, restablecer, reemplazarColeccion } = useData()
  const [aviso, setAviso] = useState(null)
  const inputArchivo = useRef(null)

  const exportarRespaldo = () => {
    const blob = new Blob([JSON.stringify(estado, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = nombreRespaldo()
    document.body.appendChild(enlace)
    enlace.click()
    enlace.remove()
    URL.revokeObjectURL(url)
    setAviso({ tipo: 'exito', mensaje: 'Respaldo descargado. Guárdalo en un lugar seguro.' })
  }

  const importarRespaldo = (evento) => {
    const archivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!archivo) return

    const lector = new FileReader()
    lector.onload = () => {
      try {
        const datos = JSON.parse(lector.result)
        const valido =
          datos &&
          typeof datos === 'object' &&
          COLECCIONES.every((coleccion) => Array.isArray(datos[coleccion]))
        if (!valido) {
          setAviso({ tipo: 'error', mensaje: 'Archivo inválido: no es un respaldo PROMCOSER.' })
          return
        }
        for (const coleccion of COLECCIONES) {
          reemplazarColeccion(coleccion, datos[coleccion])
        }
        setAviso({ tipo: 'exito', mensaje: 'Respaldo importado correctamente.' })
      } catch {
        setAviso({ tipo: 'error', mensaje: 'No se pudo leer el archivo JSON.' })
      }
    }
    lector.readAsText(archivo)
  }

  const {
    personal,
    materiales,
    equipos,
    servicios,
    registros_servicio: registros,
    tareas: todasLasTareas,
  } = estado

  const presupuestoTotal = servicios.reduce(
    (total, servicio) => total + (Number(servicio.presupuesto_asignado) || 0),
    0,
  )
  const gastadoTotal = sumarMontos(registros)
  const serviciosEnCurso = servicios.filter((s) => s.estatus === 'En curso').length
  const totalPersonal = personal.length
  const totalEquipos = equipos.length

  const metricas = servicios.map((servicio) => {
    const tareas = todasLasTareas.filter((t) => t.servicio_id === servicio.id)
    const consumo = consumoPresupuesto(servicio, registros)
    const rent = rentabilidadServicio(servicio, registros, tareas)
    const dias = diasRestantes(servicio.fecha_fin_estimada)
    const motivos = []
    if (consumo.excedido) motivos.push('excedido')
    else if (rent.cpi != null && rent.cpi < 0.9) motivos.push('CPI crítico')
    if (dias !== null && dias < 0) motivos.push('plazo vencido')
    else if (dias !== null && dias <= 15) motivos.push('plazo cercano')
    return { servicio, consumo, rent, dias, motivos, margen: consumo.disponible }
  })
  const margenTotal = metricas.reduce((t, m) => t + m.margen, 0)
  const enRiesgo = metricas.filter((m) => m.motivos.length > 0)
  const rankingMargen = [...metricas].sort((a, b) => {
    const pa = a.servicio.presupuesto_asignado || 0
    const pb = b.servicio.presupuesto_asignado || 0
    return b.margen / Math.max(1, pb) - a.margen / Math.max(1, pa)
  })

  const ultimosRegistros = ordenarPorFechaDesc(registros).slice(0, 8)
  const serviciosPorConsumo = [...metricas].sort(
    (a, b) => b.consumo.porcentaje - a.consumo.porcentaje,
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
        <div className="flex flex-wrap gap-2">
          <Button variante="secundario" onClick={exportarRespaldo}>
            Exportar respaldo
          </Button>
          <Button variante="secundario" onClick={() => inputArchivo.current?.click()}>
            Importar respaldo
          </Button>
          <Button variante="secundario" onClick={restablecer}>
            Restablecer datos de ejemplo
          </Button>
          <input
            ref={inputArchivo}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Importar respaldo JSON"
            onChange={importarRespaldo}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          titulo="Margen total"
          valor={formatearMoneda(margenTotal)}
          detalle={`${servicios.length} servicios · ${serviciosEnCurso} en curso`}
          tono={margenTotal < 0 ? 'danger' : 'success'}
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
            {serviciosPorConsumo.map(({ servicio, consumo, rent }) => (
              <li key={servicio.id}>
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <Link
                      to={`/servicios/${servicio.id}`}
                      className="truncate text-sm font-medium text-primary-700 hover:underline"
                    >
                      {servicio.nombre_servicio}
                    </Link>
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
                  {rent.margenProyectado != null && (
                    <> · margen proy. {formatearMoneda(rent.margenProyectado)}</>
                  )}
                </p>
              </li>
            ))}
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card
          titulo="Obras en riesgo"
          descripcion="Servicios que requieren atención inmediata"
          className="xl:col-span-3"
        >
          {enRiesgo.length === 0 ? (
            <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              Sin obras en riesgo. Todos los servicios van dentro de lo esperado.
            </p>
          ) : (
            <ul className="space-y-3">
              {enRiesgo.map(({ servicio, motivos, consumo, rent }) => (
                <li
                  key={servicio.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50/40 px-4 py-3"
                >
                  <div className="min-w-0">
                    <Link
                      to={`/servicios/${servicio.id}`}
                      className="font-medium text-slate-900 hover:text-primary-700 hover:underline"
                    >
                      {servicio.nombre_servicio}
                    </Link>
                    <p className="mt-0.5 text-xs text-red-700">
                      {motivos.join(' · ')}
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-600 tabular-nums">
                    <p>
                      Gastado {formatearMoneda(consumo.gastado)} ({consumo.porcentaje.toFixed(1)}%)
                    </p>
                    {rent.margenProyectado != null && (
                      <p className="mt-0.5 font-semibold">
                        Margen proy. {formatearMoneda(rent.margenProyectado)}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          titulo="Ranking de margen"
          descripcion="De mayor a menor margen % proyectado"
          className="xl:col-span-2"
        >
          <ul className="space-y-3">
            {rankingMargen.map(({ servicio, rent, consumo }) => {
              const pct = servicio.presupuesto_asignado
                ? ((rent.margenProyectado ?? consumo.disponible) / servicio.presupuesto_asignado) * 100
                : 0
              return (
                <li key={servicio.id}>
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                    <Link
                      to={`/servicios/${servicio.id}`}
                      className="truncate font-medium text-slate-800 hover:text-primary-700 hover:underline"
                    >
                      {servicio.nombre_servicio}
                    </Link>
                    <span
                      className={`font-semibold tabular-nums ${pct < 0 ? 'text-red-600' : 'text-slate-900'}`}
                    >
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${pct < 10 ? 'bg-red-500' : pct < 20 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
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
                  <Td>{nombreReferencia(registro, { personal, materiales, equipos })}</Td>
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

      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />
    </div>
  )
}