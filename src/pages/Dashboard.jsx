import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../context/useData'
import { Card } from '../components/ui/Card'
import { StatCard } from '../components/ui/StatCard'
import { Badge } from '../components/ui/Badge'
import { Table, TableBody, TableEmpty, TableHead, TableRow, Td, Th } from '../components/ui/Table'
import { Icono } from '../components/layout/Sidebar'
import { Select } from '../components/ui/Field'
import { Button } from '../components/ui/Button'
import { Aviso } from '../components/ui/Aviso'
import { leerConfig } from '../data/store'
import { formatearCantidad, formatearFecha, formatearMes, formatearMoneda } from '../utils/formatters'
import { cobradoServicio, cuentaComoManoDeObra, desglosePorTipo, hoyISO, metricasCronograma } from '../utils/calculadora'
import {
  analizarServicios,
  avanceMetaIngreso,
  desfaseMensualProyectos,
  estadoEmpresa,
  flujoCajaMensualReal,
  kpisEmpresa,
  proyeccionMensualPersonal,
  rentabilidadPorCliente,
  variacionMensual,
} from '../utils/gerencial'
import { GraficoComboCartera } from '../components/charts/GraficoComboCartera'
import { GraficoCurvaSCartera, GraficoHistogramaHH } from '../components/charts/GraficosControl'
import { controlCPMCartera, evmCartera } from '../utils/cartera'
import { serieHorasHombre } from '../utils/horasHombre'
import { alertasCentro } from '../utils/alertasCentro'
import { servicioConPresupuestoVigente } from '../utils/modificaciones'
import { libroFlujoCaja } from '../utils/exportaciones'
import { descargarBlob, descargarLibro } from '../utils/descargas'

// Umbrales de lectura para los índices de valor ganado.
const UMBRAL_INDICE = 0.9
const MAX_ALERTAS = 6

const ETIQUETA_MOTIVO = {
  excedido: 'Presupuesto excedido',
  'plazo vencido': 'Plazo vencido',
  'plazo cercano': 'Plazo cercano',
  atraso: 'Atraso (SPI)',
  sobrecosto: 'Sobrecosto proyectado',
}
const MOTIVOS_GRAVES = new Set(['excedido', 'plazo vencido', 'sobrecosto'])

const tonoIndice = (v) =>
  v == null ? 'text-slate-400' : v >= 1 ? 'text-emerald-700' : v >= UMBRAL_INDICE ? 'text-amber-700' : 'text-red-600'
const indice = (v) => (v == null ? '—' : v.toFixed(2))
const dinero = (v) => (v == null ? '—' : formatearMoneda(v))
const pct = (v, dec = 1) => (v == null || !Number.isFinite(v) ? '—' : `${v.toFixed(dec)}%`)

function flecha(v) {
  if (v == null || v.porcentaje == null) return null
  if (v.porcentaje === 0) return '→ igual que el mes anterior'
  return `${v.porcentaje > 0 ? '▲' : '▼'} ${Math.abs(v.porcentaje)}% vs mes anterior`
}

function Indicador({ etiqueta, valor, detalle, tono = 'text-slate-900' }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{etiqueta}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${tono}`}>{valor}</p>
      {detalle && <p className="mt-0.5 text-xs text-slate-500">{detalle}</p>}
    </div>
  )
}

function BarraEjecucion({ porcentaje, avance }) {
  const ancho = Math.min(100, Math.max(0, porcentaje ?? 0))
  const marca = avance == null ? null : Math.min(100, Math.max(0, avance))
  const color = porcentaje > 100 ? 'bg-red-600' : marca != null && porcentaje > marca + 10 ? 'bg-amber-500' : 'bg-primary-600'
  return (
    <div className="relative mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${ancho}%` }} />
      {marca != null && <span className="absolute top-0 h-full w-0.5 bg-slate-900/60" style={{ left: `${marca}%` }} />}
    </div>
  )
}

function Leyenda({ items }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
      {items.map(([color, texto, forma = 'linea']) => (
        <span key={texto} className="flex items-center gap-1.5">
          <span
            className={forma === 'linea' ? 'h-0.5 w-5' : 'h-2.5 w-4 rounded-sm'}
            style={{ backgroundColor: color }}
          />
          {texto}
        </span>
      ))}
    </div>
  )
}

export function Dashboard() {
  const { estado } = useData()
  const [aviso, setAviso] = useState(null)
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroAlertaObra, setFiltroAlertaObra] = useState('')
  const [todasAlertas, setTodasAlertas] = useState(false)

  const {
    servicios,
    registros_servicio: registros,
    tareas: todasLasTareas,
    cobros: todosLosCobros,
    asignaciones: todasLasAsignaciones,
    costos_oficina: costosOficina,
    partes_diario: todosLosPartes,
  } = estado
  const hoy = hoyISO()
  const mesActual = hoy.slice(0, 7)

  // ---- Filtros de cartera (Oficina y resultado empresa no se filtran) ----
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
  const partesF = (todosLosPartes ?? []).filter((p) => idsF.has(p.servicio_id))
  const serviciosVig = serviciosF.map((s) => servicioConPresupuestoVigente(s, estado.modificaciones))

  // ---- Cálculos (todo compuesto desde utils, sin fórmulas propias) ----
  const analisis = analizarServicios({ servicios: serviciosVig, registros: registrosF, cobros: cobrosF })
  const kpis = kpisEmpresa({ servicios: serviciosVig, registros: registrosF, cobros: cobrosF, costosOficina, analisis })
  const registrosCurva = registrosF.filter(cuentaComoManoDeObra)
  const carteraEVM = evmCartera({
    servicios: serviciosVig,
    tareas: tareasF,
    registros: registrosCurva,
    lineasBase: estado.lineas_base ?? [],
    lecturas: estado.lecturas_avance ?? [],
  })
  const evmPorObra = new Map((carteraEVM.porServicio ?? []).map((e) => [e.servicio_id, e]))
  const comboCartera = desfaseMensualProyectos({ servicios: serviciosF, tareas: tareasF, registros: registrosF })
  const controlP6 = controlCPMCartera({ servicios: serviciosF, tareas: tareasF, hoy })
  const serieHH = serieHorasHombre({ asignaciones: asigF, servicios: serviciosF, registros: registrosCurva })
  // Solo interesa la ruta crítica que aún no termina.
  const criticasPendientes = controlP6.criticas.filter((a) => !a.fin || a.fin >= hoy)
  const hhPlan = serieHH.reduce((s, m) => s + m.plan, 0)
  const hhReal = serieHH.reduce((s, m) => s + m.real, 0)
  const porCliente = rentabilidadPorCliente({ servicios: serviciosF, registros: registrosF, cobros: cobrosF })
  const cajaReal = flujoCajaMensualReal({ registros: registrosF, cobros: cobrosF, costosOficina })
  const personalFuturo = proyeccionMensualPersonal({ asignaciones: asigF, servicios: serviciosF, registros: registrosF }).filter(
    (m) => m.mes > mesActual,
  )
  const metaIngreso = Number(leerConfig(estado)?.meta_ingreso) || 0
  const cobradoEmpresa = servicios.reduce((t, s) => t + cobradoServicio(todosLosCobros ?? [], s.id), 0)
  const meta = avanceMetaIngreso({ cobrado: cobradoEmpresa, meta: metaIngreso })

  // ---- Cartera de obras: una fila por obra con riesgo ampliado ----
  // Además de los motivos de `analizarServicios` (excedido, plazo), se marcan
  // atraso (SPI < 0.9) y sobrecosto proyectado (EAC sobre el presupuesto).
  const cartera = analisis.map((a) => {
    const evm = evmPorObra.get(a.servicio.id) ?? null
    const tareasObra = tareasF.filter((t) => t.servicio_id === a.servicio.id)
    const avance = evm ? evm.avance : metricasCronograma(tareasObra).avanceGlobal ?? null
    const motivos = [...a.motivos]
    if (evm?.spi != null && evm.spi < UMBRAL_INDICE) motivos.push('atraso')
    if (evm?.eac != null && a.estado.presupuesto > 0 && evm.eac > a.estado.presupuesto) motivos.push('sobrecosto')
    const margen = a.cobrado > 0 ? (a.utilidad / a.cobrado) * 100 : null
    return { ...a, evm, avance, motivos, margen }
  })
  const gravedad = (f) => f.motivos.filter((m) => MOTIVOS_GRAVES.has(m)).length * 10 + f.motivos.length
  const carteraOrdenada = [...cartera].sort((x, y) => gravedad(y) - gravedad(x) || y.gastado - x.gastado)
  const enRiesgo = carteraOrdenada.filter((f) => f.motivos.length > 0)
  const totalPresupuesto = cartera.reduce((s, f) => s + (f.estado.presupuesto || 0), 0)
  const ejecucionCartera = totalPresupuesto > 0 ? (kpis.gastado / totalPresupuesto) * 100 : null

  // ---- Tendencias y semáforo ----
  const cajaTendencia = cajaReal.map((f) => ({
    mes: f.mes,
    cobrado: f.cobrado,
    gastado: f.egresoObra + f.oficina,
    resultado: f.margenReal,
  }))
  const tCobrado = variacionMensual(cajaTendencia, 'cobrado')
  const tResultado = variacionMensual(cajaTendencia, 'resultado')
  const semaforo = estadoEmpresa({
    resultadoEmpresa: kpis.resultadoEmpresa,
    enRiesgo: enRiesgo.length,
    ultimoMargenCaja: cajaReal.length > 0 ? cajaReal[cajaReal.length - 1].margenReal : null,
  })

  // ---- Alertas de partidas (misma fuente única que la campana) ----
  const alertasCartera = alertasCentro({
    estado: {
      servicios: serviciosF,
      tareas: tareasF,
      registros_servicio: registrosF,
      cobros: cobrosF,
      facturas: estado.facturas ?? [],
      valorizaciones: estado.valorizaciones ?? [],
      config: estado.config ?? [],
      modificaciones: estado.modificaciones ?? [],
      partes_diario: partesF,
    },
    hoy,
    alertasEstado: estado.alertasEstado,
  }).filter((a) => a.tipo.startsWith('partida_'))
  const alertasFiltradas = filtroAlertaObra
    ? alertasCartera.filter((a) => a.obraId === Number(filtroAlertaObra))
    : alertasCartera
  const alertasVisibles = todasAlertas ? alertasFiltradas : alertasFiltradas.slice(0, MAX_ALERTAS)

  // ---- Próximos 15 días: vencimientos de partidas ----
  const diasHasta = (iso) => {
    const [a, m, d] = iso.split('-').map(Number)
    const [ah, mh, dh] = hoy.split('-').map(Number)
    return Math.round((new Date(a, m - 1, d) - new Date(ah, mh - 1, dh)) / 86400000)
  }
  const tieneHijas = (id) => tareasF.some((t) => t.padre_id === id)
  const nombreObra = (id) => serviciosF.find((s) => s.id === id)?.nombre_servicio ?? ''
  const vencimientos = tareasF
    .filter((t) => !tieneHijas(t.id) && (t.avance ?? 0) < 100 && t.fecha_fin && diasHasta(t.fecha_fin) >= 0 && diasHasta(t.fecha_fin) <= 15)
    .sort((a, b) => a.fecha_fin.localeCompare(b.fecha_fin))
    .slice(0, 6)

  // ---- Flujo de caja con acumulado ----
  const flujo = cajaReal.reduce((filas, f) => {
    const previo = filas.length ? filas[filas.length - 1].acumulado : 0
    return [...filas, { ...f, acumulado: Math.round((previo + f.margenReal) * 100) / 100 }]
  }, [])
  const desglose = desglosePorTipo(registrosF)
  const clienteConVarias = porCliente.some((c) => c.servicios > 1)

  // ---- Exportaciones ----
  const exportarCartera = () => {
    const celda = (t) => `"${String(t ?? '').replace(/"/g, '""')}"`
    const filas = [
      ['obra', 'cliente', 'estado', 'presupuesto', 'gastado', 'ejecucion_pct', 'cobrado', 'utilidad', 'margen_pct', 'avance_pct', 'spi', 'cpi', 'eac', 'riesgos'],
      ...carteraOrdenada.map((f) => [
        celda(f.servicio.nombre_servicio),
        celda(f.servicio.cliente),
        celda(f.servicio.estatus),
        f.estado.presupuesto,
        f.gastado,
        f.estado.porcentaje ?? '',
        f.cobrado,
        f.utilidad,
        f.margen == null ? '' : Math.round(f.margen * 100) / 100,
        f.avance ?? '',
        f.evm?.spi ?? '',
        f.evm?.cpi ?? '',
        f.evm?.eac ?? '',
        celda(f.motivos.map((m) => ETIQUETA_MOTIVO[m] ?? m).join(' / ')),
      ]),
    ]
    const ok = descargarBlob(
      new Blob([filas.map((f) => f.join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' }),
      'promcoser-cartera-de-obras.csv',
    )
    if (ok) setAviso({ tipo: 'exito', mensaje: 'Cartera de obras exportada (CSV).' })
  }
  const exportarExcelCaja = () => {
    const ok = descargarLibro(libroFlujoCaja({ flujo: cajaReal }))
    setAviso(
      ok
        ? { tipo: 'exito', mensaje: 'Flujo de caja exportado a Excel.' }
        : { tipo: 'error', mensaje: 'No se pudo exportar el flujo de caja.' },
    )
  }

  const tonoSemaforo = {
    verde: { caja: 'border-emerald-200 bg-emerald-50', texto: 'text-emerald-800', punto: 'bg-emerald-500', badge: 'success' },
    amarillo: { caja: 'border-amber-200 bg-amber-50', texto: 'text-amber-800', punto: 'bg-amber-500', badge: 'warning' },
    rojo: { caja: 'border-red-200 bg-red-50', texto: 'text-red-700', punto: 'bg-red-500', badge: 'danger' },
  }[semaforo.nivel]

  return (
    <div className="space-y-6">
      {/* Encabezado + filtros */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Panel gerencial</h1>
          <p className="mt-1 text-sm text-slate-500">Resultado, desempeño y riesgos de la cartera de obras.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-52">
            <Select aria-label="Filtrar por cliente" value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)}>
            <option value="">Todos los clientes</option>
            {clientes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select></div>
          <div className="w-40">
            <Select aria-label="Filtrar por tipo" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
            <option value="">Todos los tipos</option>
            {tipos.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select></div>
          <div className="w-40">
            <Select aria-label="Filtrar por estado" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {estados.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select></div>
          {filtrado && (
            <Button variante="fantasma" tamano="sm" onClick={() => { setFiltroCliente(''); setFiltroTipo(''); setFiltroEstado('') }}>
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Semáforo */}
      <div className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${tonoSemaforo.caja}`}>
        <Badge variante={tonoSemaforo.badge}>
          <span className={`mr-1.5 inline-block size-2 rounded-full align-middle ${tonoSemaforo.punto}`} aria-hidden="true" />
          {semaforo.titulo}
        </Badge>
        <p className={`text-sm font-medium ${tonoSemaforo.texto}`}>{semaforo.mensaje}</p>
        {filtrado && <span className="ml-auto text-xs text-slate-500">Vista filtrada · Oficina y resultado empresa no se filtran</span>}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          titulo="Resultado empresa"
          valor={formatearMoneda(kpis.resultadoEmpresa)}
          detalle={`Utilidad de obras ${formatearMoneda(kpis.utilidadServicios)} − oficina ${formatearMoneda(kpis.oficina)}${flecha(tResultado) ? ` · ${flecha(tResultado)}` : ''}`}
          tono={kpis.resultadoEmpresa < 0 ? 'danger' : 'success'}
          icono={<Icono nombre="grid" className="size-5" />}
          nota="Resultado = (cobrado − gastado de obras) − gasto de oficina."
        />
        <StatCard
          titulo="Cobrado"
          valor={formatearMoneda(kpis.cobrado)}
          detalle={
            meta.meta > 0
              ? `${pct(meta.porcentaje, 0)} de la meta de ${formatearMoneda(meta.meta)}`
              : `Ingresos recibidos${flecha(tCobrado) ? ` · ${flecha(tCobrado)}` : ''}`
          }
          tono="success"
          icono={<Icono nombre="billete" className="size-5" />}
          nota="Suma de ingresos registrados. La meta se define en Configuración → Empresa."
        />
        <StatCard
          titulo="Gastado"
          valor={formatearMoneda(kpis.gastado)}
          detalle={`${pct(ejecucionCartera)} del presupuesto vigente (${formatearMoneda(totalPresupuesto)})`}
          tono={ejecucionCartera != null && carteraEVM.avance != null && ejecucionCartera > carteraEVM.avance + 10 ? 'warning' : 'slate'}
          icono={<Icono nombre="recibo" className="size-5" />}
          nota="Materiales, personal, equipos y gastos de obra frente al presupuesto vigente de las obras filtradas."
        />
        <StatCard
          titulo="Avance de la cartera"
          valor={carteraEVM.hayDatos ? `${carteraEVM.avance}%` : '—'}
          detalle={carteraEVM.hayDatos ? `SPI ${indice(carteraEVM.spi)} · CPI ${indice(carteraEVM.cpi)}` : 'Sin cronograma con montos'}
          tono={carteraEVM.spi != null && carteraEVM.spi < UMBRAL_INDICE ? 'warning' : 'primary'}
          icono={<Icono nombre="barras" className="size-5" />}
          nota="Valor ganado ÷ presupuesto. SPI = EV ÷ PV (plazo); CPI = EV ÷ AC (costo). Menor a 1 = peor que lo planeado."
        />
        <StatCard
          titulo="Obras"
          valor={`${kpis.enCurso} en curso`}
          detalle={`${enRiesgo.length} con riesgo · ${kpis.total} en total`}
          tono={enRiesgo.length > 0 ? 'warning' : 'slate'}
          icono={<Icono nombre="clipboard" className="size-5" />}
          destino="/servicios"
        />
      </div>

      {/* Atención inmediata */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card titulo="Obras con riesgo" descripcion="Presupuesto, plazo, atraso o sobrecosto proyectado">
          {enRiesgo.length === 0 ? (
            <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              Ninguna obra con señales de riesgo.
            </p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {enRiesgo.map((f) => (
                <li key={f.servicio.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <Link to={`/servicios/${f.servicio.id}`} className="min-w-0 text-sm font-semibold text-slate-900 hover:text-primary-700 hover:underline">
                      {f.servicio.nombre_servicio}
                    </Link>
                    <span className={`text-sm font-semibold tabular-nums ${f.utilidad < 0 ? 'text-red-600' : 'text-slate-700'}`}>
                      {formatearMoneda(f.utilidad)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {f.motivos.map((m) => (
                      <Badge key={m} variante={MOTIVOS_GRAVES.has(m) ? 'danger' : 'warning'}>
                        {ETIQUETA_MOTIVO[m] ?? m}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">
                    Ejecutado {pct(f.estado.porcentaje)} · avance {pct(f.avance)} · SPI {indice(f.evm?.spi)} · CPI {indice(f.evm?.cpi)}
                    {f.dias != null && ` · ${f.dias < 0 ? `vencida hace ${-f.dias} d` : `${f.dias} d para el fin`}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {vencimientos.length > 0 && (
            <div className="mt-5 border-t border-slate-200 pt-4">
              <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Partidas que vencen en 15 días</p>
              <ul className="space-y-1.5">
                {vencimientos.map((t) => (
                  <li key={t.id} className="flex justify-between gap-3 text-sm">
                    <Link to={`/servicios/${t.servicio_id}/cronograma`} className="min-w-0 truncate text-slate-700 hover:text-primary-700 hover:underline" title={nombreObra(t.servicio_id)}>
                      {t.nombre}
                    </Link>
                    <span className="shrink-0 text-slate-500 tabular-nums">
                      {formatearFecha(t.fecha_fin)} · {diasHasta(t.fecha_fin)} d · {Math.round(t.avance ?? 0)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card
          titulo="Alertas de partidas"
          descripcion={`${alertasFiltradas.length} alerta(s): vencidas, sin partes o con bajo rendimiento`}
          acciones={
            alertasCartera.length > 0 && (
              <div className="w-48">
                <Select aria-label="Filtrar alertas por obra" value={filtroAlertaObra} onChange={(e) => setFiltroAlertaObra(e.target.value)}>
                <option value="">Todas las obras</option>
                {serviciosF.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre_servicio}
                  </option>
                ))}
              </Select></div>
            )
          }
        >
          {alertasFiltradas.length === 0 ? (
            <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">Sin alertas de partidas.</p>
          ) : (
            <>
              <ul className="space-y-2">
                {alertasVisibles.map((a) => (
                  <li key={a.id}>
                    <Link
                      to={a.enlace}
                      className={`block rounded-lg border px-3 py-2 transition-colors hover:bg-slate-50 ${
                        a.gravedad === 'alta' ? 'border-red-200' : 'border-amber-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900">{a.titulo}</p>
                        <Badge variante={a.gravedad === 'alta' ? 'danger' : 'warning'}>{a.gravedad === 'alta' ? 'Alta' : 'Media'}</Badge>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {a.obra} · {a.mensaje}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
              {alertasFiltradas.length > MAX_ALERTAS && (
                <Button variante="fantasma" tamano="sm" className="mt-3" onClick={() => setTodasAlertas((v) => !v)}>
                  {todasAlertas ? 'Ver menos' : `Ver las ${alertasFiltradas.length}`}
                </Button>
              )}
            </>
          )}
        </Card>
      </div>

      {/* Cartera de obras */}
      <Card
        titulo="Cartera de obras"
        descripcion="Una fila por obra, ordenada por riesgo. La marca en la barra de ejecución es el avance: si el gasto la supera, se gasta más rápido de lo que se avanza."
        acciones={
          <Button variante="secundario" tamano="sm" onClick={exportarCartera} disabled={cartera.length === 0}>
            Exportar CSV
          </Button>
        }
      >
        <Table>
          <TableHead>
            <TableRow>
              <Th>Obra</Th>
              <Th alinear="right">Presupuesto</Th>
              <Th>Gastado / ejecución</Th>
              <Th alinear="right">Cobrado</Th>
              <Th alinear="right">Utilidad real</Th>
              <Th alinear="right">Avance</Th>
              <Th alinear="right">SPI</Th>
              <Th alinear="right">CPI</Th>
              <Th alinear="right">Costo final (EAC)</Th>
            </TableRow>
          </TableHead>
          <TableBody>
            {carteraOrdenada.length === 0 ? (
              <TableEmpty colSpan={9} mensaje="Sin obras para el filtro actual." />
            ) : (
              carteraOrdenada.map((f) => (
                <TableRow key={f.servicio.id}>
                  <Td>
                    <Link to={`/servicios/${f.servicio.id}`} className="font-medium text-slate-900 hover:text-primary-700 hover:underline">
                      {f.servicio.nombre_servicio}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {f.servicio.cliente} · {f.servicio.estatus}
                      {f.motivos.length > 0 && (
                        <span className="ml-1 font-medium text-amber-700">· {f.motivos.length} riesgo(s)</span>
                      )}
                    </p>
                  </Td>
                  <Td alinear="right" className="tabular-nums">{formatearMoneda(f.estado.presupuesto)}</Td>
                  <Td className="min-w-40">
                    <div className="flex justify-between gap-2 text-sm tabular-nums">
                      <span>{formatearMoneda(f.gastado)}</span>
                      <span className={f.estado.porcentaje > 100 ? 'font-semibold text-red-600' : 'text-slate-500'}>{pct(f.estado.porcentaje)}</span>
                    </div>
                    <BarraEjecucion porcentaje={f.estado.porcentaje} avance={f.avance} />
                  </Td>
                  <Td alinear="right" className="tabular-nums">{formatearMoneda(f.cobrado)}</Td>
                  <Td alinear="right" className="tabular-nums">
                    <span className={f.utilidad < 0 ? 'font-semibold text-red-600' : 'font-semibold text-slate-900'}>{formatearMoneda(f.utilidad)}</span>
                    <p className="text-xs text-slate-500">{f.margen == null ? 'sin cobros' : `margen ${pct(f.margen)}`}</p>
                  </Td>
                  <Td alinear="right" className="tabular-nums">{pct(f.avance, 0)}</Td>
                  <Td alinear="right" className={`tabular-nums font-semibold ${tonoIndice(f.evm?.spi)}`}>{indice(f.evm?.spi)}</Td>
                  <Td alinear="right" className={`tabular-nums font-semibold ${tonoIndice(f.evm?.cpi)}`}>{indice(f.evm?.cpi)}</Td>
                  <Td alinear="right" className="tabular-nums">
                    <span className={f.evm?.eac != null && f.evm.eac > f.estado.presupuesto ? 'font-semibold text-red-600' : ''}>{dinero(f.evm?.eac)}</span>
                  </Td>
                </TableRow>
              ))
            )}
          </TableBody>
          {carteraOrdenada.length > 1 && (
            <tfoot>
              <TableRow className="bg-slate-50 font-semibold">
                <Td>Total cartera</Td>
                <Td alinear="right" className="tabular-nums">{formatearMoneda(totalPresupuesto)}</Td>
                <Td className="tabular-nums">
                  {formatearMoneda(kpis.gastado)} <span className="font-normal text-slate-500">· {pct(ejecucionCartera)}</span>
                </Td>
                <Td alinear="right" className="tabular-nums">{formatearMoneda(kpis.cobrado)}</Td>
                <Td alinear="right" className={`tabular-nums ${kpis.utilidadServicios < 0 ? 'text-red-600' : ''}`}>{formatearMoneda(kpis.utilidadServicios)}</Td>
                <Td alinear="right" className="tabular-nums">{carteraEVM.hayDatos ? `${carteraEVM.avance}%` : '—'}</Td>
                <Td alinear="right" className={`tabular-nums ${tonoIndice(carteraEVM.spi)}`}>{indice(carteraEVM.spi)}</Td>
                <Td alinear="right" className={`tabular-nums ${tonoIndice(carteraEVM.cpi)}`}>{indice(carteraEVM.cpi)}</Td>
                <Td alinear="right" className="tabular-nums">{dinero(carteraEVM.eac)}</Td>
              </TableRow>
            </tfoot>
          )}
        </Table>
      </Card>

      {/* Desempeño de la cartera */}
      <Card
        titulo="Desempeño de la cartera"
        descripcion="Valor ganado consolidado: lo planificado (PV), lo realmente gastado (AC) y lo que vale lo ejecutado (EV)."
      >
        {!carteraEVM.hayDatos ? (
          <p className="text-sm text-slate-400">Sin datos suficientes. Planifica partidas con montos y registra avance.</p>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Indicador etiqueta="SPI · plazo" valor={indice(carteraEVM.spi)} tono={tonoIndice(carteraEVM.spi)} detalle="EV ÷ PV · 1 = según plan" />
              <Indicador etiqueta="CPI · costo" valor={indice(carteraEVM.cpi)} tono={tonoIndice(carteraEVM.cpi)} detalle="EV ÷ AC · 1 = según presupuesto" />
              <Indicador etiqueta="Costo final estimado" valor={dinero(carteraEVM.eac)} detalle={`Presupuesto ${dinero(carteraEVM.presupuesto)}`} />
              <Indicador
                etiqueta="Desviación al cierre"
                valor={dinero(carteraEVM.vac)}
                tono={carteraEVM.vac == null ? 'text-slate-400' : carteraEVM.vac >= 0 ? 'text-emerald-700' : 'text-red-600'}
                detalle="Presupuesto − costo final estimado"
              />
            </div>
            <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Curva S consolidada</p>
                <GraficoCurvaSCartera serie={carteraEVM.serie} indiceHoy={carteraEVM.indiceHoy} />
                <Leyenda items={[['#2563eb', 'Planificado (PV)'], ['#dc2626', 'Costo real (AC)'], ['#059669', 'Valor ganado (EV)']]} />
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Retraso y sobrecosto por mes</p>
                <GraficoComboCartera serie={comboCartera.serie} maxVolumen={comboCartera.maxVolumen} mesHoy={comboCartera.mesHoy} />
                <p className="mt-2 text-xs text-slate-500">
                  Columnas: obras activas. Líneas: % de obras detrás de su avance esperado y sobrecosto promedio frente al valor ganado.
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Caja */}
      <Card
        titulo="Flujo de caja"
        descripcion="Cobrado frente a egresos reales (obra + oficina) y saldo acumulado. Abajo, el costo de personal ya comprometido para los próximos meses."
        acciones={
          <Button variante="secundario" tamano="sm" onClick={exportarExcelCaja} disabled={cajaReal.length === 0}>
            Exportar Excel
          </Button>
        }
      >
        {flujo.length === 0 ? (
          <p className="text-sm text-slate-400">Aún no hay movimientos de caja.</p>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <Th>Mes</Th>
                <Th alinear="right">Cobrado</Th>
                <Th alinear="right">Egresos obra</Th>
                <Th alinear="right">Oficina</Th>
                <Th alinear="right">Neto del mes</Th>
                <Th alinear="right">Saldo acumulado</Th>
              </TableRow>
            </TableHead>
            <TableBody>
              {flujo.map((f) => (
                <TableRow key={f.mes}>
                  <Td className="capitalize">{formatearMes(f.mes)}</Td>
                  <Td alinear="right" className="tabular-nums text-emerald-700">{formatearMoneda(f.cobrado)}</Td>
                  <Td alinear="right" className="tabular-nums">{formatearMoneda(f.egresoObra)}</Td>
                  <Td alinear="right" className="tabular-nums">{formatearMoneda(f.oficina)}</Td>
                  <Td alinear="right" className={`tabular-nums font-semibold ${f.margenReal < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                    {formatearMoneda(f.margenReal)}
                  </Td>
                  <Td alinear="right" className={`tabular-nums font-semibold ${f.acumulado < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                    {formatearMoneda(f.acumulado)}
                  </Td>
                </TableRow>
              ))}
              {personalFuturo.map((m) => (
                <TableRow key={`p-${m.mes}`} className="bg-slate-50">
                  <Td className="capitalize text-slate-500">
                    {formatearMes(m.mes)} <span className="text-xs">(comprometido)</span>
                  </Td>
                  <Td alinear="right" className="text-slate-400">—</Td>
                  <Td alinear="right" className="tabular-nums text-slate-500">{formatearMoneda(m.monto)}</Td>
                  <Td alinear="right" className="text-slate-400">—</Td>
                  <Td alinear="right" className="text-xs text-slate-500">solo personal</Td>
                  <Td alinear="right" className="text-slate-400">—</Td>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Estructura y recursos */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card titulo="Estructura del gasto" descripcion="En qué se va el dinero de las obras">
          <ul className="space-y-4">
            {Object.entries(desglose)
              .sort((a, b) => b[1] - a[1])
              .map(([tipo, monto]) => {
                const p = kpis.gastado ? (monto / kpis.gastado) * 100 : 0
                return (
                  <li key={tipo}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700 capitalize">{tipo === 'gasto' ? 'Gastos generales' : tipo === 'equipo' ? 'Equipos' : tipo === 'material' ? 'Materiales' : 'Personal'}</span>
                      <span className="text-slate-500 tabular-nums">
                        {formatearMoneda(monto)} · {p.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-primary-600" style={{ width: `${p}%` }} />
                    </div>
                  </li>
                )
              })}
          </ul>
        </Card>

        <Card className="xl:col-span-2" titulo="Horas-hombre" descripcion={`Comprometidas por asignaciones frente a las registradas · plan ${formatearCantidad(hhPlan)} h · real ${formatearCantidad(hhReal)} h`}>
          {serieHH.length === 0 ? (
            <p className="text-sm text-slate-400">Sin asignaciones ni registros de personal.</p>
          ) : (
            <>
              <GraficoHistogramaHH serie={serieHH} />
              <Leyenda items={[['#94a3b8', 'Planificadas', 'barra'], ['#0f766e', 'Reales', 'barra']]} />
            </>
          )}
        </Card>
      </div>

      {clienteConVarias && (
        <Card titulo="Utilidad por cliente" descripcion="Consolidado de las obras de cada cliente">
          <Table>
            <TableHead>
              <TableRow>
                <Th>Cliente</Th>
                <Th alinear="right">Obras</Th>
                <Th alinear="right">Gastado</Th>
                <Th alinear="right">Cobrado</Th>
                <Th alinear="right">Utilidad</Th>
                <Th alinear="right">Margen</Th>
              </TableRow>
            </TableHead>
            <TableBody>
              {porCliente.map((c) => (
                <TableRow key={c.cliente}>
                  <Td className="font-medium text-slate-800">{c.cliente}</Td>
                  <Td alinear="right" className="tabular-nums">{c.servicios}</Td>
                  <Td alinear="right" className="tabular-nums">{formatearMoneda(c.gastado)}</Td>
                  <Td alinear="right" className="tabular-nums">{formatearMoneda(c.cobrado)}</Td>
                  <Td alinear="right" className={`tabular-nums font-semibold ${c.utilidad < 0 ? 'text-red-600' : ''}`}>{formatearMoneda(c.utilidad)}</Td>
                  <Td alinear="right" className="tabular-nums">{c.utilidadPct == null ? '—' : `${c.utilidadPct.toFixed(1)}%`}</Td>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Programación */}
      <Card titulo="Programación" descripcion="Lo que arranca en las próximas 3 semanas y las actividades sin holgura (ruta crítica).">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Inician pronto</p>
            {controlP6.proximas.length === 0 ? (
              <p className="text-sm text-slate-400">Sin actividades programadas para las próximas semanas.</p>
            ) : (
              <ul className="space-y-1.5">
                {controlP6.proximas.slice(0, 8).map((a) => (
                  <li key={`${a.servicio_id}-${a.tarea_id}`} className="flex justify-between gap-2 text-sm">
                    <Link to={`/servicios/${a.servicio_id}/cronograma`} className="min-w-0 truncate text-slate-700 hover:text-primary-700 hover:underline" title={nombreObra(a.servicio_id)}>
                      {a.tarea}
                    </Link>
                    <span className="shrink-0 whitespace-nowrap text-slate-500 tabular-nums">
                      {formatearFecha(a.inicio)}
                      {a.critica && <span className="ml-2 font-semibold text-red-600">crítica</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Ruta crítica pendiente · {criticasPendientes.length} actividad(es)
            </p>
            {criticasPendientes.length === 0 ? (
              <p className="text-sm text-slate-400">Sin actividades críticas pendientes.</p>
            ) : (
              <ul className="space-y-1.5">
                {criticasPendientes.slice(0, 8).map((a) => (
                  <li key={`${a.servicio_id}-${a.tarea_id}`} className="flex justify-between gap-2 text-sm">
                    <Link to={`/servicios/${a.servicio_id}/cronograma`} className="min-w-0 truncate text-slate-700 hover:text-primary-700 hover:underline" title={nombreObra(a.servicio_id)}>
                      {a.tarea}
                    </Link>
                    <span className="shrink-0 whitespace-nowrap text-slate-500 tabular-nums">
                      {formatearFecha(a.inicio)} → {formatearFecha(a.fin)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>

      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />
    </div>
  )
}
