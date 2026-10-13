import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../context/useData'
import { Card } from '../components/ui/Card'
import { StatCard } from '../components/ui/StatCard'
import { Badge, BadgeEstatus } from '../components/ui/Badge'
import { Table, TableBody, TableEmpty, TableHead, TableRow, Td, Th } from '../components/ui/Table'
import { Modal } from '../components/ui/Modal'
import { Icono } from '../components/layout/Sidebar'
import { Campo, Select } from '../components/ui/Field'
import { Button } from '../components/ui/Button'
import { Aviso } from '../components/ui/Aviso'
import { COLECCIONES } from '../data/mockData'
import {
  nombreRespaldo,
  normalizarRespaldo,
  serializarRespaldo,
  validarRespaldo,
} from '../data/store'
import {
  formatearCantidad,
  formatearFecha,
  formatearMes,
  formatearMoneda,
} from '../utils/formatters'
import {
  cobradoServicio,
  desglosePorTipo,
  metricasCronograma,
  nombreReferencia,
  ordenarPorFechaDesc,
  porCobrar,
} from '../utils/calculadora'
import {
  analizarServicios,
  flujoCajaMensualReal,
  kpisEmpresa,
  proyeccionCierre,
  proyeccionMensualPersonal,
  rentabilidadPorCliente,
} from '../utils/gerencial'

function descargarCSV(nombre, filas) {
  const contenido = filas.map((fila) => fila.join(',')).join('\n')
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}

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

// Barra comparativa para la evolución mensual (cobrado vs egresado).
function BarraMes({ valor, maximo, tono }) {
  const ancho = maximo > 0 ? Math.min(100, Math.max(0, (valor / maximo) * 100)) : 0
  const colores = { exito: 'bg-emerald-500', peligro: 'bg-red-500', proyectado: 'bg-amber-400' }
  return (
    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${colores[tono] ?? colores.exito}`} style={{ width: `${ancho}%` }} />
    </div>
  )
}

export function Dashboard() {
  const { estado, restablecer, reemplazarColeccion } = useData()
  const [aviso, setAviso] = useState(null)
  const [datosAbierto, setDatosAbierto] = useState(false)
  const [movimientosAbierto, setMovimientosAbierto] = useState(false)
  const inputArchivo = useRef(null)

  const exportarRespaldo = () => {
    const blob = new Blob([serializarRespaldo(estado)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = nombreRespaldo()
    document.body.appendChild(enlace)
    enlace.click()
    enlace.remove()
    URL.revokeObjectURL(url)
    setDatosAbierto(false)
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
        const { ok, errores } = validarRespaldo(datos)
        if (!ok) {
          setAviso({ tipo: 'error', mensaje: `Archivo inválido: ${errores[0]}` })
          return
        }
        const normalizado = normalizarRespaldo(datos)
        for (const coleccion of COLECCIONES) {
          reemplazarColeccion(coleccion, normalizado[coleccion])
        }
        setDatosAbierto(false)
        setAviso({ tipo: 'exito', mensaje: 'Respaldo importado correctamente.' })
      } catch {
        setAviso({ tipo: 'error', mensaje: 'No se pudo leer el archivo JSON.' })
      }
    }
    lector.readAsText(archivo)
  }

  const {
    personal,
    equipos,
    servicios,
    registros_servicio: registros,
    tareas: todasLasTareas,
    cobros: todosLosCobros,
    asignaciones: todasLasAsignaciones,
    costos_oficina: costosOficina,
  } = estado

  // Filtros (cliente/tipo/estado): alcanzan a todo lo que es por servicio.
  // Oficina y resultado empresa son de la empresa y no se filtran (se indica).
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const clientes = [...new Set(servicios.map((s) => s.cliente))].sort((a, b) => a.localeCompare(b, 'es'))
  const tipos = [...new Set(servicios.map((s) => s.tipo ?? 'Obra'))].sort((a, b) => a.localeCompare(b, 'es'))
  const estados = [...new Set(servicios.map((s) => s.estatus))].sort((a, b) => a.localeCompare(b, 'es'))
  const filtrado = filtroCliente !== '' || filtroTipo !== '' || filtroEstado !== ''
  const serviciosF = servicios.filter(
    (s) =>
      (!filtroCliente || s.cliente === filtroCliente) &&
      (!filtroTipo || (s.tipo ?? 'Obra') === filtroTipo) &&
      (!filtroEstado || s.estatus === filtroEstado),
  )
  const idsF = new Set(serviciosF.map((s) => s.id))
  const registrosF = registros.filter((r) => idsF.has(r.servicio_id))
  const cobrosF = (todosLosCobros ?? []).filter((c) => idsF.has(c.servicio_id))
  const tareasF = (todasLasTareas ?? []).filter((t) => idsF.has(t.servicio_id))
  const asigF = (todasLasAsignaciones ?? []).filter((a) => idsF.has(a.servicio_id))

  // --- Indicadores gerenciales (todo compuesto desde utils) ---
  const analisis = analizarServicios({ servicios: serviciosF, registros: registrosF, tareas: tareasF })
  const kpis = kpisEmpresa({
    servicios: serviciosF,
    registros: registrosF,
    cobros: cobrosF,
    costosOficina,
    analisis,
  })
  const porCliente = rentabilidadPorCliente({
    servicios: serviciosF,
    registros: registrosF,
    cobros: cobrosF,
    tareas: tareasF,
  })
  const cajaReal = flujoCajaMensualReal({
    registros: registrosF,
    cobros: cobrosF,
    costosOficina,
  })
  const personalProyectado = proyeccionMensualPersonal({
    asignaciones: asigF,
    servicios: serviciosF,
    registros: registrosF,
  })
  const cierre = proyeccionCierre({ analisis })

  const totalPersonal = personal.length
  const totalEquipos = equipos.length
  const enRiesgo = analisis.filter((a) => a.motivos.length > 0)
  const serviciosPorConsumo = [...analisis].sort((a, b) => b.consumo.porcentaje - a.consumo.porcentaje)
  const rankingMargen = [...analisis].sort((a, b) => {
    const pa = a.servicio.presupuesto_asignado || 0
    const pb = b.servicio.presupuesto_asignado || 0
    const ma = a.rent.margenProyectado ?? a.consumo.disponible
    const mb = b.rent.margenProyectado ?? b.consumo.disponible
    return mb / Math.max(1, pb) - ma / Math.max(1, pa)
  })

  // Cobros por servicio: quién debe + desglose por concepto.
  const cobrosPorServicio = serviciosF
    .map((servicio) => ({
      servicio,
      cobrado: cobradoServicio(cobrosF, servicio.id),
      pendiente: porCobrar(servicio, cobrosF),
    }))
    .sort((a, b) => b.pendiente - a.pendiente)
  const cobrosPorConcepto = cobrosF.reduce((acum, c) => {
    const clave = c.concepto || 'otro'
    acum[clave] = (acum[clave] || 0) + (Number(c.monto) || 0)
    return acum
  }, {})

  // Cronograma global: avance por obra en curso + vencimientos.
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const diasPara = (fechaISO) => {
    const [anio, mes, dia] = fechaISO.split('-').map(Number)
    return Math.round((new Date(anio, mes - 1, dia) - hoy) / 86400000)
  }
  const tieneHijas = (id) => tareasF.some((t) => t.padre_id === id)
  const cronogramaGlobal = serviciosF
    .filter((s) => s.estatus === 'En curso')
    .map((servicio) => {
      const tareas = tareasF.filter((t) => t.servicio_id === servicio.id)
      return { servicio, metricas: metricasCronograma(tareas) }
    })
  const vencimientos = tareasF
    .filter(
      (t) =>
        !tieneHijas(t.id) &&
        (t.avance ?? 0) < 100 &&
        t.fecha_fin &&
        diasPara(t.fecha_fin) >= 0 &&
        diasPara(t.fecha_fin) <= 15,
    )
    .sort((a, b) => a.fecha_fin.localeCompare(b.fecha_fin))
    .slice(0, 6)

  const ultimosRegistros = ordenarPorFechaDesc(registrosF).slice(0, 8)
  const maxCaja = Math.max(
    1,
    ...cajaReal.map((f) => Math.max(f.cobrado, f.egresoObra + f.oficina)),
  )
  const maxPersonal = Math.max(1, ...personalProyectado.map((m) => m.monto))

  const exportarCSVServicios = () => {
    const paraCSV = (texto) => `"${String(texto ?? '').replace(/"/g, '""')}"`
    descargarCSV('promcoser-rentabilidad-servicios.csv', [
      ['servicio', 'cliente', 'tipo', 'presupuesto', 'gastado', 'cobrado', 'por_cobrar', 'utilidad', 'margen_pct'],
      ...analisis.map(({ servicio, consumo }) => {
        const cobrado = cobradoServicio(cobrosF, servicio.id)
        const pendiente = porCobrar(servicio, cobrosF)
        const utilidad = cobrado - consumo.gastado
        const margen = cobrado > 0 ? Math.round((utilidad / cobrado) * 100 * 100) / 100 : ''
        return [
          paraCSV(servicio.nombre_servicio),
          paraCSV(servicio.cliente),
          paraCSV(servicio.tipo ?? 'Obra'),
          servicio.presupuesto_asignado,
          consumo.gastado,
          cobrado,
          pendiente,
          utilidad,
          margen,
        ]
      }),
    ])
    setAviso({ tipo: 'exito', mensaje: 'CSV descargado con la rentabilidad por servicio.' })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Panel gerencial
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Resultado, caja, riesgos y rentabilidad de PROMCOSER en una sola vista.
          </p>
        </div>
        <Button variante="secundario" onClick={() => setDatosAbierto(true)}>
          Datos y respaldo
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Campo label="Cliente" htmlFor="dash-cliente" className="w-56">
          <Select id="dash-cliente" value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)}>
            <option value="">Todos</option>
            {clientes.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </Campo>
        <Campo label="Tipo" htmlFor="dash-tipo" className="w-44">
          <Select id="dash-tipo" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
            <option value="">Todos</option>
            {tipos.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </Campo>
        <Campo label="Estado" htmlFor="dash-estado" className="w-44">
          <Select id="dash-estado" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="">Todos</option>
            {estados.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </Select>
        </Campo>
        {filtrado && (
          <Button
            variante="secundario"
            tamano="sm"
            onClick={() => { setFiltroCliente(''); setFiltroTipo(''); setFiltroEstado('') }}
          >
            Limpiar filtros
          </Button>
        )}
        <p className="w-full text-xs text-slate-500">
          Los filtros alcanzan a todo lo por servicio. Oficina y resultado empresa son de la
          empresa y no se filtran.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          titulo="Resultado empresa"
          valor={formatearMoneda(kpis.resultadoEmpresa)}
          detalle={`Margen ${kpis.margenPct == null ? 'N/D' : `${kpis.margenPct}%`} · oficina ${formatearMoneda(kpis.oficina)}`}
          tono={kpis.resultadoEmpresa < 0 ? 'danger' : 'success'}
          icono={<Icono nombre="grid" className="size-5" />}
        />
        <StatCard
          titulo="Presupuesto"
          valor={formatearMoneda(kpis.presupuesto)}
          detalle={
            kpis.ejecucion == null
              ? 'Sin presupuesto'
              : `Ejecución ${kpis.ejecucion}% · gastado ${formatearMoneda(kpis.gastado)}`
          }
          tono={kpis.gastado > kpis.presupuesto ? 'danger' : 'slate'}
          icono={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-5" aria-hidden="true">
              <path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
        <StatCard
          titulo="Cobrado"
          valor={formatearMoneda(kpis.cobrado)}
          detalle={`Por cobrar ${formatearMoneda(kpis.porCobrar)}`}
          tono="success"
          icono={<Icono nombre="billete" className="size-5" />}
        />
        <StatCard
          titulo="Servicios"
          valor={`${kpis.enCurso} / ${kpis.total}`}
          detalle={`${kpis.enRiesgo} en riesgo · ${kpis.total - kpis.enCurso} fuera de curso`}
          tono={kpis.enRiesgo > 0 ? 'warning' : 'slate'}
          icono={<Icono nombre="clipboard" className="size-5" />}
        />
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
          titulo="Resultado empresa"
          descripcion="Margen de servicios menos oficina"
          className="xl:col-span-2"
        >
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Margen servicios</dt>
              <dd className="font-semibold tabular-nums">{formatearMoneda(kpis.margenTotal)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">
                <Link to="/oficina" className="text-primary-700 hover:underline">
                  Gasto oficina
                </Link>
              </dt>
              <dd className="font-semibold tabular-nums">{formatearMoneda(kpis.oficina)}</dd>
            </div>
            <div className="flex justify-between gap-2 border-t border-slate-200 pt-3">
              <dt className="font-medium text-slate-700">Resultado</dt>
              <dd className={`text-lg font-bold tabular-nums ${kpis.resultadoEmpresa < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                {formatearMoneda(kpis.resultadoEmpresa)}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-slate-500">
            Proyección al cierre: {cierre.costoFinal == null
              ? 'sin datos de avance suficientes'
              : `${formatearMoneda(cierre.costoFinal)} de costo final · margen ${formatearMoneda(cierre.margenProyectado)}`}
            {cierre.servicios > 0 ? ` (${cierre.servicios} servicio(s))` : ''}.
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card
          titulo="Caja real por mes"
          descripcion="Cobrado vs egresos realizados (obra + oficina)"
          className="xl:col-span-3"
        >
          {cajaReal.length === 0 ? (
            <p className="text-sm text-slate-400">Aún no hay movimientos de caja.</p>
          ) : (
            <ul className="space-y-4">
              {cajaReal.map((fila) => (
                <li key={fila.mes}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium text-slate-700 capitalize">{formatearMes(fila.mes)}</span>
                    <span className={`font-semibold tabular-nums ${fila.margenReal < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                      {formatearMoneda(fila.margenReal)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-16 shrink-0 text-xs text-slate-500">Cobrado</span>
                      <BarraMes valor={fila.cobrado} maximo={maxCaja} tono="exito" />
                      <span className="w-24 shrink-0 text-right text-xs text-slate-500 tabular-nums">
                        {formatearMoneda(fila.cobrado)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-16 shrink-0 text-xs text-slate-500">Egresos</span>
                      <BarraMes valor={fila.egresoObra + fila.oficina} maximo={maxCaja} tono="peligro" />
                      <span className="w-24 shrink-0 text-right text-xs text-slate-500 tabular-nums">
                        {formatearMoneda(fila.egresoObra + fila.oficina)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          titulo="Proyección"
          descripcion="Personal proyectado por mes y cierre estimado"
          className="xl:col-span-2"
        >
          {personalProyectado.length === 0 ? (
            <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              Sin costo futuro: no hay asignaciones vigentes por devengar.
            </p>
          ) : (
            <ul className="space-y-3">
              {personalProyectado.map((fila) => (
                <li key={fila.mes}>
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium text-slate-700 capitalize">{formatearMes(fila.mes)}</span>
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {formatearMoneda(fila.monto)}
                    </span>
                  </div>
                  <BarraMes valor={fila.monto} maximo={maxPersonal} tono="proyectado" />
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-slate-500">
            Solo se proyecta el costo de personal (con datos de asignaciones). Los cobros futuros
            no se proyectan porque no hay una regla de facturación: quedan como «Por cobrar».
          </p>
        </Card>
      </div>

      <Card
        titulo="Rentabilidad por cliente"
        descripcion="Consolidado de todas las obras del cliente"
      >
        <Table>
          <TableHead>
            <TableRow>
              <Th>Cliente</Th>
              <Th alinear="right">Servicios</Th>
              <Th alinear="right">Presupuesto</Th>
              <Th alinear="right">Gastado</Th>
              <Th alinear="right">Cobrado</Th>
              <Th alinear="right">Por cobrar</Th>
              <Th alinear="right">Margen proy.</Th>
              <Th alinear="right">Margen %</Th>
            </TableRow>
          </TableHead>
          <TableBody>
            {porCliente.length === 0 ? (
              <TableEmpty colSpan={8} mensaje="Sin servicios para el filtro actual." />
            ) : (
              porCliente.map((fila) => (
                <TableRow key={fila.cliente}>
                  <Td className="font-medium text-slate-800">{fila.cliente}</Td>
                  <Td alinear="right" className="tabular-nums text-slate-500">{fila.servicios}</Td>
                  <Td alinear="right" className="tabular-nums">{formatearMoneda(fila.presupuesto)}</Td>
                  <Td alinear="right" className="tabular-nums">{formatearMoneda(fila.gastado)}</Td>
                  <Td alinear="right" className="tabular-nums">{formatearMoneda(fila.cobrado)}</Td>
                  <Td alinear="right" className="tabular-nums">{formatearMoneda(fila.porCobrar)}</Td>
                  <Td alinear="right" className="tabular-nums">
                    {fila.tieneProyeccion ? formatearMoneda(fila.margenProyectado) : '—'}
                  </Td>
                  <Td
                    alinear="right"
                    className={`tabular-nums font-semibold ${fila.margenPct != null && fila.margenPct < 0 ? 'text-red-600' : 'text-slate-900'}`}
                  >
                    {fila.margenPct == null ? '—' : `${fila.margenPct.toFixed(1)}%`}
                  </Td>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card
          titulo="Consumo por servicio"
          descripcion="Ordenado de mayor a menor avance presupuestal"
          className="xl:col-span-3"
          acciones={
            <Button variante="secundario" tamano="sm" onClick={exportarCSVServicios}>
              Exportar CSV
            </Button>
          }
        >
          {serviciosPorConsumo.length === 0 ? (
            <p className="text-sm text-slate-400">Sin servicios para el filtro actual.</p>
          ) : (
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card
          titulo="Quién debe"
          descripcion="Por cobrar por servicio"
          className="xl:col-span-3"
        >
          {cobrosPorServicio.filter((c) => c.pendiente > 0).length === 0 ? (
            <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              Sin saldos por cobrar.
            </p>
          ) : (
            <ul className="space-y-3">
              {cobrosPorServicio
                .filter((c) => c.pendiente > 0)
                .slice(0, 6)
                .map(({ servicio, pendiente, cobrado }) => (
                  <li key={servicio.id}>
                    <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                      <Link
                        to={`/servicios/${servicio.id}/ingresos`}
                        className="truncate font-medium text-slate-800 hover:text-primary-700 hover:underline"
                      >
                        {servicio.nombre_servicio}
                      </Link>
                      <span className="font-semibold text-amber-700 tabular-nums">
                        {formatearMoneda(pendiente)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 tabular-nums">
                      Cobrado {formatearMoneda(cobrado)} de {formatearMoneda(servicio.presupuesto_asignado)}
                    </p>
                  </li>
                ))}
            </ul>
          )}
          {Object.keys(cobrosPorConcepto).length > 0 && (
            <div className="mt-4 border-t border-slate-200 pt-3">
              <p className="mb-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Por concepto
              </p>
              <ul className="space-y-1 text-sm">
                {Object.entries(cobrosPorConcepto).map(([concepto, monto]) => (
                  <li key={concepto} className="flex justify-between gap-2">
                    <span className="text-slate-600 capitalize">{concepto}</span>
                    <span className="tabular-nums">{formatearMoneda(monto)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card
          titulo="Estructura del gasto"
          descripcion="Acumulado por tipo de registro"
          className="xl:col-span-2"
        >
          <ul className="space-y-4">
            {Object.entries(desglosePorTipo(registrosF)).map(([tipo, monto]) => {
              const porcentaje = kpis.gastado ? (monto / kpis.gastado) * 100 : 0

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
                  <p className="mt-1 text-xs text-slate-500">
                    {porcentaje.toFixed(1)}% del gasto total
                  </p>
                </li>
              )
            })}
          </ul>

          <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-200 pt-5 text-sm">
            <div>
              <dt className="text-slate-500">Personal registrado</dt>
              <dd className="font-semibold text-slate-800">{totalPersonal}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Equipos registrados</dt>
              <dd className="font-semibold text-slate-800">{totalEquipos}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Servicios finalizados</dt>
              <dd className="font-semibold text-slate-800">
                {serviciosF.filter((s) => s.estatus === 'Finalizado').length}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card
        titulo="Cronograma global"
        descripcion="Avance de obras en curso y próximos vencimientos"
      >
        {cronogramaGlobal.length === 0 ? (
          <p className="text-sm text-slate-400">Sin obras en curso.</p>
        ) : (
          <ul className="space-y-4">
            {cronogramaGlobal.map(({ servicio, metricas }) => (
              <li key={servicio.id}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                  <Link
                    to={`/servicios/${servicio.id}/cronograma`}
                    className="truncate font-medium text-slate-800 hover:text-primary-700 hover:underline"
                  >
                    {servicio.nombre_servicio}
                  </Link>
                  <span className="tabular-nums">
                    {metricas.avanceGlobal.toFixed(0)}% · {metricas.atrasadas} atrasada(s)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-primary-600"
                    style={{ width: `${Math.min(100, Math.max(0, metricas.avanceGlobal))}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 mb-2 text-sm font-medium text-slate-700">Vencen en 15 días</p>
        {vencimientos.length === 0 ? (
          <p className="text-sm text-slate-400">Sin vencimientos próximos.</p>
        ) : (
          <ul className="space-y-1.5">
            {vencimientos.map((t) => (
              <li key={t.id} className="flex justify-between gap-2 text-sm">
                <Link
                  to={`/servicios/${t.servicio_id}/cronograma`}
                  className="min-w-0 truncate text-slate-700 hover:text-primary-700 hover:underline"
                >
                  {t.nombre}
                </Link>
                <span className="shrink-0 whitespace-nowrap text-slate-500 tabular-nums">
                  {formatearFecha(t.fecha_fin)} ({diasPara(t.fecha_fin)} d)
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        titulo="Movimientos recientes"
        descripcion="Detalle operativo (segundo plano)"
        acciones={
          <Button
            variante="secundario"
            tamano="sm"
            onClick={() => setMovimientosAbierto((valor) => !valor)}
          >
            {movimientosAbierto ? 'Ocultar' : 'Mostrar'}
          </Button>
        }
      >
        {movimientosAbierto ? (
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
                      {serviciosF.find((s) => s.id === registro.servicio_id)?.nombre_servicio ??
                        'Servicio eliminado'}
                    </Td>
                    <Td>{nombreReferencia(registro, { personal, equipos })}</Td>
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
        ) : (
          <p className="text-sm text-slate-400">
            Detalle oculto. Pulsa «Mostrar» para ver los últimos movimientos por servicio.
          </p>
        )}
      </Card>

      <Modal
        abierto={datosAbierto}
        titulo="Datos y respaldo"
        descripcion="Tu información vive en este navegador. Exporta un respaldo con frecuencia."
        onCerrar={() => setDatosAbierto(false)}
        ancho="sm"
        pie={
          <Button variante="secundario" onClick={() => setDatosAbierto(false)}>
            Cerrar
          </Button>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            «Exportar» descarga un archivo JSON con todo. «Importar» reemplaza los datos actuales
            por los del archivo. «Restablecer» vuelve a los datos de ejemplo.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variante="secundario" onClick={exportarRespaldo}>
              Exportar respaldo
            </Button>
            <Button variante="secundario" onClick={() => inputArchivo.current?.click()}>
              Importar respaldo
            </Button>
            <Button variante="peligro" onClick={restablecer}>
              Restablecer datos de ejemplo
            </Button>
          </div>
          <input
            ref={inputArchivo}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Importar respaldo JSON"
            onChange={importarRespaldo}
          />
        </div>
      </Modal>

      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />
    </div>
  )
}
