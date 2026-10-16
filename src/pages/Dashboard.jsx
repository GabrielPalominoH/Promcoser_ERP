import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../context/useData'
import { Card } from '../components/ui/Card'
import { StatCard } from '../components/ui/StatCard'
import { Badge, BadgeEstatus } from '../components/ui/Badge'
import { Table, TableBody, TableEmpty, TableHead, TableRow, Td, Th } from '../components/ui/Table'
import { Modal } from '../components/ui/Modal'
import { Icono } from '../components/layout/Sidebar'
import { Campo, Select } from '../components/ui/Field'
import { InputMonto } from '../components/ui/Monto'
import { Button } from '../components/ui/Button'
import { Aviso } from '../components/ui/Aviso'
import { COLECCIONES } from '../data/mockData'
import {
  leerConfig,
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
  cuentaComoManoDeObra,
  desglosePorTipo,
  hoyISO,
  metricasCronograma,
  nombreReferencia,
  ordenarPorFechaDesc,
} from '../utils/calculadora'
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
import { alertasDeCartera } from '../utils/alertas'
import { servicioConPresupuestoVigente } from '../utils/modificaciones'
import { libroFlujoCaja } from '../utils/exportaciones'
import { descargarLibro } from '../utils/descargas'

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

function BarraGasto({ monto, maximo }) {
  const ancho = maximo > 0 ? Math.min(100, Math.max(0, (monto / maximo) * 100)) : 0

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-primary-600 transition-all"
        style={{ width: `${ancho}%` }}
      />
    </div>
  )
}

// Indicador con lectura para el control de proyecto (SPI/CPI/EAC/VAC…).
// `tono` colorea el número: verde favorable, ámbar en observación, rojo mal.
function IndicadorP6({ etiqueta, valor, detalle, tono = 'text-slate-900' }) {
  return (
    <div className="rounded-xl border border-slate-300 p-4">
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{etiqueta}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${tono}`}>{valor}</p>
      <p className="mt-0.5 text-xs text-slate-500">{detalle}</p>
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

// Datos y respaldo: exportar/importar/restablecer/vaciar. Extraído para poder
// montarlo abierto en pruebas; el contenido es el mismo del bloque inline.
// `inputArchivo` es el ref del input de archivo (vive en el padre).
export function ModalDatosRespaldo({
  abierto,
  vaciarArmado,
  inputArchivo,
  onCerrar,
  onExportar,
  onImportarArchivo,
  onRestablecer,
  onVaciar,
}) {
  return (
    <Modal
      abierto={abierto}
      titulo="Datos y respaldo"
      descripcion="Tu información vive en este navegador. Exporta un respaldo con frecuencia."
      onCerrar={onCerrar}
      ancho="sm"
      pie={
        <Button variante="secundario" onClick={onCerrar}>
          Cerrar
        </Button>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          «Exportar» descarga un archivo JSON con todo. «Importar» reemplaza los datos actuales
          por los del archivo. «Restablecer» vuelve a los datos de ejemplo.
          «Vaciar todo» borra todo para empezar de cero (conserva la configuración).
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variante="secundario" onClick={onExportar}>
            Exportar respaldo
          </Button>
          <Button variante="secundario" onClick={() => inputArchivo.current?.click()}>
            Importar respaldo
          </Button>
          <Button variante="peligro" onClick={onRestablecer}>
            Restablecer datos de ejemplo
          </Button>
          <Button variante={vaciarArmado ? 'peligro' : 'secundario'} onClick={onVaciar}>
            {vaciarArmado ? 'Pulsa de nuevo para vaciar todo' : 'Vaciar todo'}
          </Button>
        </div>
        <input
          ref={inputArchivo}
          type="file"
          accept="application/json,.json"
          className="hidden"
          aria-label="Importar respaldo JSON"
          onChange={onImportarArchivo}
        />
      </div>
    </Modal>
  )
}

export function Dashboard() {
  const { estado, restablecer, reemplazarColeccion, actualizarItem } = useData()
  const [aviso, setAviso] = useState(null)
  const [datosAbierto, setDatosAbierto] = useState(false)
  const [vaciarArmado, setVaciarArmado] = useState(false)
  const [movimientosAbierto, setMovimientosAbierto] = useState(false)
  const [metaTexto, setMetaTexto] = useState('')
  const inputArchivo = useRef(null)

  const cerrarDatos = () => {
    setDatosAbierto(false)
    setVaciarArmado(false)
  }

  // Vacía todas las colecciones para empezar de cero en producción.
  // Conserva la configuración (empresa, moneda, meta). Pide dos clics.
  const vaciarTodo = () => {
    if (!vaciarArmado) {
      setVaciarArmado(true)
      return
    }
    for (const coleccion of COLECCIONES) {
      if (coleccion === 'config') continue
      reemplazarColeccion(coleccion, [])
    }
    cerrarDatos()
    setAviso({ tipo: 'exito', mensaje: 'Datos vaciados. Listo para cargar información real.' })
  }

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
    cerrarDatos()
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
        cerrarDatos()
        setAviso({ tipo: 'exito', mensaje: 'Respaldo importado correctamente.' })
      } catch {
        setAviso({ tipo: 'error', mensaje: 'No se pudo leer el archivo JSON.' })
      }
    }
    lector.readAsText(archivo)
  }

  // Guarda la meta de ingreso en la config (0 = sin meta). Se redondea a
  // céntimos y viaja en el respaldo, como el resto de la configuración.
  const guardarMeta = (evento) => {
    evento.preventDefault()
    const valor = Number(metaTexto)
    const limpio = Number.isFinite(valor) && valor > 0 ? Math.round(valor * 100) / 100 : 0
    actualizarItem('config', { id: 1, meta_ingreso: limpio })
    setAviso({
      tipo: 'exito',
      mensaje: limpio > 0 ? 'Meta de ingreso actualizada.' : 'Meta de ingreso eliminada.',
    })
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
    partes_diario: todosLosPartes,
  } = estado

  // Meta de ingreso: es de la empresa (total cobrado), no la afectan los filtros.
  const metaIngreso = Number(leerConfig(estado)?.meta_ingreso) || 0
  const cobradoEmpresa = servicios.reduce(
    (total, servicio) => total + cobradoServicio(todosLosCobros ?? [], servicio.id),
    0,
  )

  // Mantiene el campo sincronizado si la meta cambia (importar/restablecer).
  useEffect(() => {
    setMetaTexto(metaIngreso > 0 ? String(metaIngreso) : '')
  }, [metaIngreso])

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
  const partesF = (todosLosPartes ?? []).filter((p) => idsF.has(p.servicio_id))

  // Presupuesto contractual vigente: los adicionales/deductivos aprobados
  // ajustan el presupuesto que alimenta el control de cartera. El original se
  // conserva en `presupuesto_original`.
  const serviciosVig = serviciosF.map((s) =>
    servicioConPresupuestoVigente(s, estado.modificaciones),
  )

  // --- Indicadores gerenciales (todo compuesto desde utils) ---
  const analisis = analizarServicios({ servicios: serviciosVig, registros: registrosF, cobros: cobrosF })
  const kpis = kpisEmpresa({
    servicios: serviciosVig,
    registros: registrosF,
    cobros: cobrosF,
    costosOficina,
    analisis,
  })
  const meta = avanceMetaIngreso({ cobrado: cobradoEmpresa, meta: metaIngreso })
  const porCliente = rentabilidadPorCliente({
    servicios: serviciosF,
    registros: registrosF,
    cobros: cobrosF,
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
  // Gráfico combinado de cartera: volumen de obras + desfases de tiempo y costo.
  const comboCartera = desfaseMensualProyectos({
    servicios: serviciosF,
    tareas: tareasF,
    registros: registrosF,
  })

  // --- Control de proyecto (P6): valor ganado de cartera + recursos --------
  // Los registros que alimentan la curva excluyen los domingos de personal
  // (cuenta como mano de obra), igual que la Curva S de cada servicio.
  const registrosCurva = registrosF.filter(cuentaComoManoDeObra)
  const carteraEVM = evmCartera({
    servicios: serviciosVig,
    tareas: tareasF,
    registros: registrosCurva,
    lineasBase: estado.lineas_base ?? [],
    lecturas: estado.lecturas_avance ?? [],
  })
  const controlP6 = controlCPMCartera({ servicios: serviciosF, tareas: tareasF, hoy: hoyISO() })
  const serieHH = serieHorasHombre({
    asignaciones: asigF,
    servicios: serviciosF,
    registros: registrosCurva,
  })
  const hhPlanTotal = serieHH.reduce((s, m) => s + m.plan, 0)
  const hhRealTotal = serieHH.reduce((s, m) => s + m.real, 0)
  const dinero = (v) => (v == null ? '—' : formatearMoneda(v))
  const tonoIndice = (v) =>
    v == null ? 'text-slate-400' : v >= 1 ? 'text-emerald-700' : v >= 0.9 ? 'text-amber-700' : 'text-red-600'

  const totalPersonal = personal.length
  const totalEquipos = equipos.length
  const enRiesgo = analisis.filter((a) => a.motivos.length > 0)
  // Alertas de partidas de la cartera (Fase E), con filtro por obra.
  const [filtroAlertaObra, setFiltroAlertaObra] = useState('')
  const alertasCartera = alertasDeCartera({
    servicios: serviciosF,
    tareas: tareasF,
    partes: partesF,
    hoy: hoyISO(),
  })
  const alertasFiltradas = filtroAlertaObra
    ? alertasCartera.filter((a) => a.servicio_id === Number(filtroAlertaObra))
    : alertasCartera
  const serviciosPorGasto = [...analisis].sort((a, b) => b.gastado - a.gastado)
  const maxGasto = Math.max(1, ...serviciosPorGasto.map((a) => a.gastado))
  const rankingUtilidad = [...analisis].sort((a, b) => b.utilidad - a.utilidad)
  const maxUtilidad = Math.max(1, ...rankingUtilidad.map((a) => a.utilidad))

  // Cobros por concepto: desglose de lo cobrado.
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

  // Tendencias mes actual vs. anterior para los KPIs (respeta filtros).
  const cajaTendencia = cajaReal.map((f) => ({
    mes: f.mes,
    cobrado: f.cobrado,
    gastado: f.egresoObra + f.oficina,
    resultado: f.margenReal,
  }))
  const tCobrado = variacionMensual(cajaTendencia, 'cobrado')
  const tGastado = variacionMensual(cajaTendencia, 'gastado')
  const tResultado = variacionMensual(cajaTendencia, 'resultado')
  const flecha = (v) => {
    if (v == null || v.porcentaje == null) return null
    if (v.porcentaje === 0) return '→ 0% vs mes anterior'
    return `${v.porcentaje > 0 ? '▲' : '▼'} ${Math.abs(v.porcentaje)}% vs mes anterior`
  }
  const semaforoEmpresa = estadoEmpresa({
    resultadoEmpresa: kpis.resultadoEmpresa,
    enRiesgo: kpis.enRiesgo,
    ultimoMargenCaja: cajaReal.length > 0 ? cajaReal[cajaReal.length - 1].margenReal : null,
  })

  const exportarCSVServicios = () => {
    const paraCSV = (texto) => `"${String(texto ?? '').replace(/"/g, '""')}"`
    descargarCSV('promcoser-rentabilidad-servicios.csv', [
      ['servicio', 'cliente', 'tipo', 'gastado', 'cobrado', 'utilidad', 'utilidad_pct'],
      ...analisis.map(({ servicio, gastado, cobrado, utilidad }) => {
        const margen = cobrado > 0 ? Math.round((utilidad / cobrado) * 100 * 100) / 100 : ''
        return [
          paraCSV(servicio.nombre_servicio),
          paraCSV(servicio.cliente),
          paraCSV(servicio.tipo ?? 'Obra'),
          gastado,
          cobrado,
          utilidad,
          margen,
        ]
      }),
    ])
    setAviso({ tipo: 'exito', mensaje: 'CSV descargado con la rentabilidad por servicio.' })
  }

  // Exportación a Excel del flujo de caja mensual (cobrado vs egresos).
  const exportarExcelCaja = () => {
    const ok = descargarLibro(libroFlujoCaja({ flujo: cajaReal }))
    setAviso(
      ok
        ? { tipo: 'exito', mensaje: 'Flujo de caja exportado a Excel.' }
        : { tipo: 'error', mensaje: 'No se pudo exportar el flujo de caja.' },
    )
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

      <Card
        titulo="Meta de ingreso"
        descripcion="Cobrado acumulado de la empresa frente a la meta"
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {meta.definida ? (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
                    {formatearMoneda(meta.logrado)}
                  </p>
                  <p className="text-sm text-slate-500 tabular-nums">
                    de {formatearMoneda(meta.meta)}
                  </p>
                </div>
                <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${
                      meta.cumplida ? 'bg-emerald-500' : 'bg-primary-600'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, meta.porcentaje))}%` }}
                  />
                </div>
                <p className="mt-2 text-sm">
                  <span
                    className={`font-semibold tabular-nums ${
                      meta.cumplida ? 'text-emerald-700' : 'text-slate-900'
                    }`}
                  >
                    {meta.porcentaje.toFixed(1)}%
                  </span>{' '}
                  {meta.cumplida ? (
                    <span className="font-medium text-emerald-700">· ¡Meta cumplida!</span>
                  ) : (
                    <span className="text-slate-600">
                      · Falta{' '}
                      <span className="font-semibold text-slate-900">
                        {formatearMoneda(meta.falta)}
                      </span>
                    </span>
                  )}
                </p>
              </>
            ) : (
              <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Aún no hay una meta de ingreso. Escribe un monto y pulsa «Guardar meta» para
                ver cuánto falta para la meta.
              </p>
            )}
          </div>

          <form
            className="lg:border-l lg:border-slate-200 lg:pl-6"
            onSubmit={guardarMeta}
          >
            <Campo
              label="Meta de ingreso (S/)"
              htmlFor="dash-meta"
              hint="Es el total cobrado de la empresa; no lo afectan los filtros."
            >
              <InputMonto
                id="dash-meta"
                placeholder="0.00"
                value={metaTexto}
                onChange={setMetaTexto}
              />
            </Campo>
            <div className="mt-3">
              <Button type="submit" tamano="sm">
                Guardar meta
              </Button>
            </div>
          </form>
        </div>
      </Card>

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
          detalle={`Utilidad ${formatearMoneda(kpis.utilidadServicios)} · oficina ${formatearMoneda(kpis.oficina)}${flecha(tResultado) ? ` · ${flecha(tResultado)}` : ''}`}
          tono={kpis.resultadoEmpresa < 0 ? 'danger' : 'success'}
          icono={<Icono nombre="grid" className="size-5" />}
          destino="/oficina"
          nota="Resultado = utilidad de servicios (cobrado − gastado) menos gasto de oficina."
        />
        <StatCard
          titulo="Gastado"
          valor={formatearMoneda(kpis.gastado)}
          detalle={`Egresos de obra acumulados${flecha(tGastado) ? ` · ${flecha(tGastado)}` : ''}`}
          tono="slate"
          icono={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-5" aria-hidden="true">
              <path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
          nota="Gastado = suma de materiales, personal, equipos y gastos registrados en obra."
        />
        <StatCard
          titulo="Cobrado"
          valor={formatearMoneda(kpis.cobrado)}
          detalle={`Ingresos efectivamente recibidos${flecha(tCobrado) ? ` · ${flecha(tCobrado)}` : ''}`}
          tono="success"
          icono={<Icono nombre="billete" className="size-5" />}
          nota="Cobrado = suma de ingresos registrados por servicio."
        />
        <StatCard
          titulo="Servicios"
          valor={`${kpis.enCurso} / ${kpis.total}`}
          detalle={`${kpis.enRiesgo} en riesgo · ${kpis.total - kpis.enCurso} fuera de curso`}
          tono={kpis.enRiesgo > 0 ? 'warning' : 'slate'}
          icono={<Icono nombre="clipboard" className="size-5" />}
          destino="/servicios"
        />
      </div>

      <div
        className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${
          semaforoEmpresa.nivel === 'verde'
            ? 'border-emerald-200 bg-emerald-50'
            : semaforoEmpresa.nivel === 'amarillo'
              ? 'border-amber-200 bg-amber-50'
              : 'border-red-200 bg-red-50'
        }`}
      >
        <Badge
          variante={
            semaforoEmpresa.nivel === 'verde'
              ? 'success'
              : semaforoEmpresa.nivel === 'amarillo'
                ? 'warning'
                : 'danger'
          }
        >
          <span
            className={`mr-1.5 inline-block size-2 rounded-full align-middle ${
              semaforoEmpresa.nivel === 'verde'
                ? 'bg-emerald-500'
                : semaforoEmpresa.nivel === 'amarillo'
                  ? 'bg-amber-500'
                  : 'bg-red-500'
            }`}
            aria-hidden="true"
          />
          {semaforoEmpresa.titulo}
        </Badge>
        <p
          className={`text-sm font-medium ${
            semaforoEmpresa.nivel === 'verde'
              ? 'text-emerald-800'
              : semaforoEmpresa.nivel === 'amarillo'
                ? 'text-amber-800'
                : 'text-red-700'
          }`}
        >
          {semaforoEmpresa.mensaje}
        </p>
      </div>

      <Card
        titulo="Gráfico combinado de columnas y líneas con doble eje Y"
        descripcion="Dual-Axis Combo Chart · columnas = obras activas (eje derecho); líneas = desfase de tiempo y de costo (eje izquierdo, 0–100 %)"
      >
        <GraficoComboCartera
          serie={comboCartera.serie}
          maxVolumen={comboCartera.maxVolumen}
          mesHoy={comboCartera.mesHoy}
        />
        <details className="mt-4 text-xs text-slate-500">
          <summary className="cursor-pointer font-medium hover:text-slate-700">
            ¿Cómo se calcula?
          </summary>
          <p className="mt-1">
            Volumen = obras con ventana planificada que cubre el mes. Desfase de tiempo = % de obras
            activas detrás de su avance esperado. Desfase de costo = sobrecosto promedio de las obras
            activas (gasto real frente al valor ganado; 0 % si van bajo presupuesto). Los meses futuros
            no muestran desfase: todavía no hay avance real que medir.
          </p>
        </details>
      </Card>

      <Card
        titulo="Control de proyecto (P6)"
        descripcion="Valor ganado y recursos de toda la cartera: desempeño (SPI/CPI), proyección (EAC/VAC), curva S consolidada e histograma de horas-hombre."
      >
        {!carteraEVM.hayDatos ? (
          <p className="text-sm text-slate-400">
            Sin datos suficientes. Planifica tareas y registra avances para ver el control de
            proyecto.
          </p>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              <IndicadorP6
                etiqueta="SPI · Plazo"
                valor={carteraEVM.spi == null ? '—' : carteraEVM.spi.toFixed(2)}
                tono={tonoIndice(carteraEVM.spi)}
                detalle="EV ÷ PV · mayor a 1 = adelantado"
              />
              <IndicadorP6
                etiqueta="CPI · Costo"
                valor={carteraEVM.cpi == null ? '—' : carteraEVM.cpi.toFixed(2)}
                tono={tonoIndice(carteraEVM.cpi)}
                detalle="EV ÷ AC · mayor a 1 = eficiente"
              />
              <IndicadorP6
                etiqueta="Avance valorizado"
                valor={`${carteraEVM.avance}%`}
                detalle={`EV ${dinero(carteraEVM.ev)} de ${dinero(carteraEVM.presupuesto)}`}
              />
              <IndicadorP6
                etiqueta="EAC · Costo final"
                valor={dinero(carteraEVM.eac)}
                detalle={`Proyección sobre ${dinero(carteraEVM.presupuesto)}`}
              />
              <IndicadorP6
                etiqueta="VAC · Desviación final"
                valor={dinero(carteraEVM.vac)}
                tono={
                  carteraEVM.vac == null
                    ? 'text-slate-400'
                    : carteraEVM.vac >= 0
                      ? 'text-emerald-700'
                      : 'text-red-600'
                }
                detalle="Presupuesto − EAC · mayor a 0 = margen"
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">
                Curva S consolidada de la cartera
              </p>
              <GraficoCurvaSCartera serie={carteraEVM.serie} indiceHoy={carteraEVM.indiceHoy} />
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-5" style={{ backgroundColor: '#2563eb' }} /> Costo
                  planificado (PV)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-5" style={{ backgroundColor: '#dc2626' }} /> Costo real
                  (AC)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-5" style={{ backgroundColor: '#059669' }} /> Valor ganado
                  (EV)
                </span>
              </div>
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-slate-700">
                  Histograma de horas-hombre
                </p>
                <span className="text-xs text-slate-500 tabular-nums">
                  Plan {formatearCantidad(hhPlanTotal)} h · Real {formatearCantidad(hhRealTotal)} h
                </span>
              </div>
              <GraficoHistogramaHH serie={serieHH} />
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-4 rounded-sm" style={{ backgroundColor: '#94a3b8' }} /> HH
                  planificadas
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-4 rounded-sm" style={{ backgroundColor: '#0f766e' }} /> HH
                  reales
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">
                  Look-ahead · próximas 3 semanas
                </p>
                {controlP6.proximas.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    Sin actividades programadas para las próximas semanas.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {controlP6.proximas.slice(0, 8).map((a) => (
                      <li key={`${a.servicio_id}-${a.tarea_id}`} className="flex justify-between gap-2 text-sm">
                        <Link
                          to={`/servicios/${a.servicio_id}/cronograma`}
                          className="min-w-0 truncate text-slate-700 hover:text-primary-700 hover:underline"
                        >
                          {a.tarea}
                        </Link>
                        <span className="shrink-0 whitespace-nowrap text-slate-500 tabular-nums">
                          {formatearFecha(a.inicio)}
                          {a.critica && (
                            <span className="ml-2 font-semibold text-red-600">crítica</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">
                  Ruta crítica · {controlP6.totalCriticas} actividad(es)
                </p>
                {controlP6.criticas.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    Sin actividades críticas: todas tienen holgura.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {controlP6.criticas.slice(0, 8).map((a) => (
                      <li key={`${a.servicio_id}-${a.tarea_id}`} className="flex justify-between gap-2 text-sm">
                        <Link
                          to={`/servicios/${a.servicio_id}/cronograma`}
                          className="min-w-0 truncate text-slate-700 hover:text-primary-700 hover:underline"
                        >
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

            <details className="rounded-lg bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
              <summary className="cursor-pointer font-medium text-slate-700">
                ¿Cómo se calcula?
              </summary>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  SPI y CPI son la suma de EV, PV y AC de todos los servicios (mismo criterio que la
                  Curva S de cada obra).
                </li>
                <li>
                  EAC proyecta el costo final al ritmo actual; VAC es el margen que quedaría.
                </li>
                <li>
                  El histograma compara las horas comprometidas por las asignaciones (plan) con las
                  horas registradas (real).
                </li>
                <li>
                  El look-ahead y la ruta crítica salen del motor CPM con las predecesoras del
                  cronograma de cada obra.
                </li>
              </ul>
            </details>
          </div>
        )}
      </Card>

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
              {enRiesgo.map(({ servicio, motivos, gastado, cobrado }) => (
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
                      Gastado {formatearMoneda(gastado)} · cobrado {formatearMoneda(cobrado)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          titulo="Resultado empresa"
          descripcion="Utilidad de servicios menos oficina"
          className="xl:col-span-2"
        >
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Utilidad servicios</dt>
              <dd className="font-semibold tabular-nums">{formatearMoneda(kpis.utilidadServicios)}</dd>
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
        </Card>
      </div>

      <Card
        titulo="Alertas de partidas"
        descripcion="Inactividad, bajo rendimiento y partidas vencidas de la cartera"
        acciones={
          <Select
            value={filtroAlertaObra}
            onChange={(e) => setFiltroAlertaObra(e.target.value)}
            aria-label="Filtrar alertas por obra"
          >
            <option value="">Todas las obras</option>
            {serviciosF.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre_servicio}
              </option>
            ))}
          </Select>
        }
      >
        {alertasFiltradas.length === 0 ? (
          <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            Sin alertas en las partidas. Toda la cartera va dentro de lo esperado.
          </p>
        ) : (
          <>
            <ul className="space-y-2">
              {alertasFiltradas.slice(0, 15).map((a) => (
                <li
                  key={`${a.servicio_id}-${a.tipo}-${a.tarea_id}`}
                  className={`rounded-lg border px-4 py-2.5 text-sm ${
                    a.tipo === 'vencida'
                      ? 'border-red-200 bg-red-50/40'
                      : 'border-amber-200 bg-amber-50/40'
                  }`}
                >
                  <p className="text-xs text-slate-500">
                    <Link
                      to={`/servicios/${a.servicio_id}`}
                      className="font-medium text-slate-600 hover:text-primary-700 hover:underline"
                    >
                      {a.servicio}
                    </Link>
                    {' · '}
                    <span
                      className={`font-semibold ${
                        a.tipo === 'vencida' ? 'text-red-700' : 'text-amber-800'
                      }`}
                    >
                      {a.tipo === 'vencida'
                        ? 'Vencida'
                        : a.tipo === 'rendimiento'
                          ? 'Bajo rendimiento'
                          : 'Sin partes'}
                    </span>
                  </p>
                  <Link
                    to={`/servicios/${a.servicio_id}/partidas?tarea=${a.tarea_id}`}
                    className="font-medium text-slate-900 hover:text-primary-700 hover:underline"
                  >
                    {a.tarea}
                  </Link>
                  <p className="mt-0.5 text-xs text-slate-600">{a.detalle}</p>
                </li>
              ))}
            </ul>
            {alertasFiltradas.length > 15 && (
              <p className="mt-2 text-center text-xs text-slate-500">
                …y {alertasFiltradas.length - 15} alerta(s) más. Filtra por obra para verlas.
              </p>
            )}
          </>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card
          titulo="Caja real por mes"
          descripcion="Cobrado vs egresos realizados (obra + oficina)"
          className="xl:col-span-3"
          acciones={
            <Button
              variante="secundario"
              tamano="sm"
              onClick={exportarExcelCaja}
              disabled={cajaReal.length === 0}
            >
              Exportar Excel
            </Button>
          }
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
          descripcion="Personal proyectado por mes"
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
            no se proyectan porque no hay una regla de facturación.
          </p>
        </Card>
      </div>

      <Card
        titulo="Utilidad por cliente"
        descripcion="Consolidado de todas las obras del cliente"
      >
        <Table>
          <TableHead>
            <TableRow>
              <Th>Cliente</Th>
              <Th alinear="right">Servicios</Th>
              <Th alinear="right">Gastado</Th>
              <Th alinear="right">Cobrado</Th>
              <Th alinear="right">Utilidad</Th>
              <Th alinear="right">Utilidad %</Th>
            </TableRow>
          </TableHead>
          <TableBody>
            {porCliente.length === 0 ? (
              <TableEmpty colSpan={6} mensaje="Sin servicios para el filtro actual." />
            ) : (
              porCliente.map((fila) => (
                <TableRow key={fila.cliente}>
                  <Td className="font-medium text-slate-800">{fila.cliente}</Td>
                  <Td alinear="right" className="tabular-nums text-slate-500">{fila.servicios}</Td>
                  <Td alinear="right" className="tabular-nums">{formatearMoneda(fila.gastado)}</Td>
                  <Td alinear="right" className="tabular-nums">{formatearMoneda(fila.cobrado)}</Td>
                  <Td alinear="right" className="tabular-nums">{formatearMoneda(fila.utilidad)}</Td>
                  <Td
                    alinear="right"
                    className={`tabular-nums font-semibold ${fila.utilidadPct != null && fila.utilidadPct < 0 ? 'text-red-600' : 'text-slate-900'}`}
                  >
                    {fila.utilidadPct == null ? '—' : `${fila.utilidadPct.toFixed(1)}%`}
                  </Td>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card
          titulo="Gasto por servicio"
          descripcion="Ordenado de mayor a menor gasto"
          className="xl:col-span-3"
          acciones={
            <Button variante="secundario" tamano="sm" onClick={exportarCSVServicios}>
              Exportar CSV
            </Button>
          }
        >
          {serviciosPorGasto.length === 0 ? (
            <p className="text-sm text-slate-400">Sin servicios para el filtro actual.</p>
          ) : (
            <ul className="space-y-5">
              {serviciosPorGasto.map(({ servicio, gastado, cobrado, utilidad, estado }) => (
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
                    <span className="text-sm font-semibold text-slate-700 tabular-nums">
                      {formatearMoneda(gastado)} ({estado.porcentaje.toFixed(1)}%)
                    </span>
                  </div>
                  <BarraGasto monto={gastado} maximo={maxGasto} />
                  <p className="mt-1.5 text-xs text-slate-500">
                    Gastado {formatearMoneda(gastado)} de {formatearMoneda(estado.presupuesto)} · cobrado {formatearMoneda(cobrado)} · utilidad {formatearMoneda(utilidad)} · {servicio.cliente}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          titulo="Ranking de utilidad"
          descripcion="De mayor a menor utilidad (cobrado − gastado)"
          className="xl:col-span-2"
        >
          <ul className="space-y-3">
            {rankingUtilidad.map(({ servicio, utilidad }) => (
              <li key={servicio.id}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                  <Link
                    to={`/servicios/${servicio.id}`}
                    className="truncate font-medium text-slate-800 hover:text-primary-700 hover:underline"
                  >
                    {servicio.nombre_servicio}
                  </Link>
                  <span
                    className={`font-semibold tabular-nums ${utilidad < 0 ? 'text-red-600' : 'text-slate-900'}`}
                  >
                    {formatearMoneda(utilidad)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${utilidad < 0 ? 'bg-red-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, Math.max(0, (utilidad / maxUtilidad) * 100))}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card
          titulo="Estructura del gasto"
          descripcion="Acumulado por tipo de registro"
          className="xl:col-span-3"
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

        <Card
          titulo="Cobros por concepto"
          descripcion="Lo cobrado según su concepto"
          className="xl:col-span-2"
        >
          {Object.keys(cobrosPorConcepto).length === 0 ? (
            <p className="text-sm text-slate-400">Aún no hay ingresos registrados.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {Object.entries(cobrosPorConcepto).map(([concepto, monto]) => (
                <li key={concepto} className="flex justify-between gap-2">
                  <span className="text-slate-600 capitalize">{concepto}</span>
                  <span className="tabular-nums">{formatearMoneda(monto)}</span>
                </li>
              ))}
            </ul>
          )}
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
                      {registro.unidad ? ` ${registro.unidad}` : ''}
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

      <ModalDatosRespaldo
        abierto={datosAbierto}
        vaciarArmado={vaciarArmado}
        inputArchivo={inputArchivo}
        onCerrar={cerrarDatos}
        onExportar={exportarRespaldo}
        onImportarArchivo={importarRespaldo}
        onRestablecer={restablecer}
        onVaciar={vaciarTodo}
      />

      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />
    </div>
  )
}
