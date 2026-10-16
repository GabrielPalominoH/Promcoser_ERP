import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useData } from '../../context/useData'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Campo, Input } from '../../components/ui/Field'
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
import { Buscador, BarraFiltros, textoCoincide } from '../../components/ui/FiltroBusqueda'
import { normalizar } from '../../components/ui/ComboBox'
import { formatearFecha, formatearMoneda } from '../../utils/formatters'
import { metricasCronograma } from '../../utils/calculadora'
import {
  armarLectura,
  armarLineaBase,
  compararConLineaBase,
  lineaBaseVigente,
  presupuestoLineaBase,
} from '../../utils/lineaBase'

const HOY = () => new Date().toISOString().slice(0, 10)

function EtiquetaDesvio({ valor, sufijo = '', invertir = false }) {
  if (valor == null) return <span className="text-slate-400">—</span>
  if (valor === 0) return <span className="text-slate-500 tabular-nums">0{sufijo}</span>
  const malo = invertir ? valor < 0 : valor > 0
  return (
    <span className={`tabular-nums font-medium ${malo ? 'text-red-600' : 'text-emerald-700'}`}>
      {valor > 0 ? '+' : ''}
      {valor}
      {sufijo}
    </span>
  )
}

export function ModalNota({ titulo, descripcion, etiqueta, onCerrar, onGuardar }) {
  const [nota, setNota] = useState('')
  return (
    <Modal
      abierto
      ancho="sm"
      titulo={titulo}
      descripcion={descripcion}
      onCerrar={onCerrar}
      pie={
        <>
          <Button variante="secundario" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button onClick={() => onGuardar(nota)}>{etiqueta}</Button>
        </>
      }
    >
      <Campo label="Nota (opcional)" htmlFor="lb-nota">
        <Input
          id="lb-nota"
          autoFocus
          value={nota}
          placeholder="Motivo o referencia"
          onChange={(e) => setNota(e.target.value)}
        />
      </Campo>
    </Modal>
  )
}

export function LineaBaseServicio() {
  const { servicio } = useOutletContext()
  const { estado, agregarItem } = useData()
  const [aviso, setAviso] = useState(null)
  const [modal, setModal] = useState(null) // 'linea' | 'lectura'
  const [compararVersion, setCompararVersion] = useState(null)
  const [busquedaVersion, setBusquedaVersion] = useState('')
  const [busquedaComparacion, setBusquedaComparacion] = useState('')
  const [busquedaLecturas, setBusquedaLecturas] = useState('')

  const tareas = useMemo(
    () =>
      (estado.tareas ?? [])
        .filter((t) => t.servicio_id === servicio.id)
        .sort(
          (a, b) =>
            (a.fecha_inicio || '').localeCompare(b.fecha_inicio || '') || a.id - b.id,
        ),
    [estado.tareas, servicio.id],
  )
  const lineas = useMemo(
    () =>
      (estado.lineas_base ?? [])
        .filter((l) => l.servicio_id === servicio.id)
        .sort((a, b) => (Number(b.version) || 0) - (Number(a.version) || 0)),
    [estado.lineas_base, servicio.id],
  )
  const lecturas = useMemo(
    () =>
      (estado.lecturas_avance ?? [])
        .filter((l) => l.servicio_id === servicio.id)
        .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [estado.lecturas_avance, servicio.id],
  )

  const vigente = lineaBaseVigente(servicio.id, estado.lineas_base)
  const avanceActual = metricasCronograma(tareas).avanceGlobal
  const yaHoy = lecturas.some((l) => l.fecha === HOY())

  const comparacion = useMemo(() => {
    const base = compararVersion
      ? (estado.lineas_base ?? []).find((l) => l.id === compararVersion)
      : vigente
    return compararConLineaBase({ tareas, lineaBase: base })
  }, [compararVersion, estado.lineas_base, vigente, tareas])

  const terminoVersion = normalizar(busquedaVersion).trim()
  const versionesFiltradas = useMemo(
    () =>
      terminoVersion
        ? lineas.filter(
            (l) =>
              textoCoincide(`v${l.version}`, terminoVersion) ||
              textoCoincide(l.nota, terminoVersion) ||
              textoCoincide(l.fecha, terminoVersion),
          )
        : lineas,
    [lineas, terminoVersion],
  )

  const terminoComparacion = normalizar(busquedaComparacion).trim()
  const filasComparacion = useMemo(
    () =>
      terminoComparacion
        ? comparacion.filas.filter((f) => textoCoincide(f.nombre, terminoComparacion))
        : comparacion.filas,
    [comparacion.filas, terminoComparacion],
  )
  const nuevasFiltradas = useMemo(
    () =>
      terminoComparacion
        ? comparacion.nuevas.filter((t) => textoCoincide(t.nombre, terminoComparacion))
        : comparacion.nuevas,
    [comparacion.nuevas, terminoComparacion],
  )

  const terminoLecturas = normalizar(busquedaLecturas).trim()
  const lecturasFiltradas = useMemo(
    () =>
      terminoLecturas
        ? lecturas.filter(
            (l) => textoCoincide(l.nota, terminoLecturas) || textoCoincide(l.fecha, terminoLecturas),
          )
        : lecturas,
    [lecturas, terminoLecturas],
  )

  const congelar = (nota) => {
    const linea = armarLineaBase({ servicio, tareas, lineasBase: estado.lineas_base ?? [], nota })
    agregarItem('lineas_base', linea)
    setModal(null)
    setAviso({
      tipo: 'exito',
      mensaje: `Línea base v${linea.version} congelada con ${linea.tareas.length} tareas.`,
    })
  }

  const registrarLectura = (nota) => {
    const lectura = armarLectura({ servicio, tareas, avance: avanceActual, nota })
    agregarItem('lecturas_avance', lectura)
    setModal(null)
    setAviso({ tipo: 'exito', mensaje: `Lectura de avance (${avanceActual}%) registrada.` })
  }

  return (
    <div className="space-y-6">
      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />

      <Card
        titulo="Línea base"
        descripcion="El plan aprobado y congelado. El valor planificado (PV) de la Curva S sale de aquí, no del cronograma vivo."
        acciones={
          <Button onClick={() => setModal('linea')} disabled={tareas.length === 0}>
            Congelar nueva versión
          </Button>
        }
      >
        {vigente ? (
          <div className="grid grid-cols-1 gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Versión vigente
              </p>
              <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
                v{vigente.version}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Congelada el
              </p>
              <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
                {formatearFecha(vigente.fecha)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Presupuesto de la línea base
              </p>
              <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
                {formatearMoneda(presupuestoLineaBase(vigente))}
              </p>
            </div>
            {vigente.nota && (
              <p className="sm:col-span-3 text-sm text-slate-500">{vigente.nota}</p>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
            <p className="text-sm text-slate-500">
              Sin línea base. Congela el cronograma actual para controlar la obra contra un plan
              estable.
            </p>
          </div>
        )}

        {lineas.length > 0 && (
          <div className="mt-5">
            <BarraFiltros
              contador={
                terminoVersion ? (
                  <>
                    <span className="font-semibold text-slate-700">{versionesFiltradas.length}</span>{' '}
                    de {lineas.length}
                  </>
                ) : null
              }
            >
              <Buscador
                valor={busquedaVersion}
                onChange={setBusquedaVersion}
                placeholder="Buscar versión…"
                ariaLabel="Buscar versiones de la línea base"
              />
            </BarraFiltros>
            <Table>
              <TableHead>
                <TableRow>
                  <Th>Versión</Th>
                  <Th>Fecha</Th>
                  <Th alinear="right">Tareas</Th>
                  <Th alinear="right">Presupuesto</Th>
                  <Th>Nota</Th>
                  <Th alinear="right" className="w-40">
                    Acciones
                  </Th>
                </TableRow>
              </TableHead>
              <TableBody>
                {versionesFiltradas.length === 0 ? (
                  <TableEmpty colSpan={6} mensaje="Ninguna versión coincide con el filtro." />
                ) : (
                  versionesFiltradas.map((l) => (
                    <TableRow key={l.id}>
                      <Td>
                        <span className="font-semibold text-slate-900">v{l.version}</span>{' '}
                        {l.id === vigente?.id && (
                          <Badge variante="info" className="ml-1">
                            Vigente
                          </Badge>
                        )}
                      </Td>
                      <Td className="tabular-nums">{formatearFecha(l.fecha)}</Td>
                      <Td alinear="right" className="tabular-nums">
                        {l.tareas.length}
                      </Td>
                      <Td alinear="right" className="tabular-nums">
                        {formatearMoneda(l.presupuesto)}
                      </Td>
                      <Td className="text-slate-500">{l.nota || '—'}</Td>
                      <Td alinear="right">
                        <Button
                          variante="secundario"
                          tamano="sm"
                          onClick={() => setCompararVersion(l.id)}
                        >
                          Comparar
                        </Button>
                      </Td>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Card
        titulo="Comparación cronograma vs. línea base"
        descripcion={
          compararVersion
            ? `Contra la versión ${lineas.find((l) => l.id === compararVersion)?.version ?? ''}`
            : 'Contra la línea base vigente'
        }
        acciones={
          compararVersion ? (
            <Button variante="fantasma" tamano="sm" onClick={() => setCompararVersion(null)}>
              Volver a la vigente
            </Button>
          ) : null
        }
      >
        {!vigente ? (
          <p className="text-sm text-slate-400">Congela una línea base para comparar.</p>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Desvío de costo</p>
                <p className="mt-1 text-lg font-bold">
                  <EtiquetaDesvio valor={comparacion.desvioMonto} />
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Desvío de plazo (días)</p>
                <p className="mt-1 text-lg font-bold">
                  <EtiquetaDesvio valor={comparacion.desvioPlazo} sufijo=" d" />
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Tareas en plan</p>
                <p className="mt-1 text-lg font-bold tabular-nums">{comparacion.planTareas}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Tareas nuevas</p>
                <p className="mt-1 text-lg font-bold tabular-nums">{comparacion.nuevasTareas}</p>
              </div>
            </div>
            <BarraFiltros
              contador={
                terminoComparacion ? (
                  <>
                    <span className="font-semibold text-slate-700">{filasComparacion.length}</span> de{' '}
                    {comparacion.filas.length}
                  </>
                ) : null
              }
            >
              <Buscador
                valor={busquedaComparacion}
                onChange={setBusquedaComparacion}
                placeholder="Buscar partida…"
                ariaLabel="Buscar partidas en la comparación"
              />
            </BarraFiltros>
            <Table>
              <TableHead>
                <TableRow>
                  <Th>Partida</Th>
                  <Th>Inicio plan</Th>
                  <Th>Inicio real</Th>
                  <Th alinear="right">Δ días</Th>
                  <Th>Fin plan</Th>
                  <Th>Fin real</Th>
                  <Th alinear="right">Δ días</Th>
                  <Th alinear="right">Monto plan</Th>
                  <Th alinear="right">Monto real</Th>
                  <Th alinear="right">Δ monto</Th>
                </TableRow>
              </TableHead>
              <TableBody>
                {comparacion.filas.length === 0 ? (
                  <TableEmpty colSpan={10} mensaje="Sin tareas para comparar." />
                ) : filasComparacion.length === 0 ? (
                  <TableEmpty colSpan={10} mensaje="Ninguna partida coincide con el filtro." />
                ) : (
                  filasComparacion.map((f) => (
                    <TableRow key={f.id}>
                      <Td className="font-medium text-slate-800">
                        {f.nombre}
                        {!f.existe && (
                          <Badge variante="danger" className="ml-2">
                            Eliminada
                          </Badge>
                        )}
                      </Td>
                      <Td className="tabular-nums text-slate-500">
                        {formatearFecha(f.plan_inicio)}
                      </Td>
                      <Td className="tabular-nums">
                        {f.real_inicio ? formatearFecha(f.real_inicio) : '—'}
                      </Td>
                      <Td alinear="right">
                        <EtiquetaDesvio valor={f.desvio_inicio} sufijo=" d" />
                      </Td>
                      <Td className="tabular-nums text-slate-500">
                        {formatearFecha(f.plan_fin)}
                      </Td>
                      <Td className="tabular-nums">
                        {f.real_fin ? formatearFecha(f.real_fin) : '—'}
                      </Td>
                      <Td alinear="right">
                        <EtiquetaDesvio valor={f.desvio_fin} sufijo=" d" />
                      </Td>
                      <Td alinear="right" className="tabular-nums">
                        {formatearMoneda(f.plan_monto)}
                      </Td>
                      <Td alinear="right" className="tabular-nums">
                        {f.real_monto == null ? '—' : formatearMoneda(f.real_monto)}
                      </Td>
                      <Td alinear="right">
                        <EtiquetaDesvio valor={f.desvio_monto} />
                      </Td>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {nuevasFiltradas.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-slate-700">
                  Tareas agregadas después de la línea base
                </p>
                <ul className="space-y-1 text-sm text-slate-600">
                  {nuevasFiltradas.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-3">
                      <span>{t.nombre}</span>
                      <span className="tabular-nums">
                        {formatearFecha(t.real_inicio)} – {formatearFecha(t.real_fin)} ·{' '}
                        {formatearMoneda(t.real_monto)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </Card>

      <Card
        titulo="Lecturas de avance"
        descripcion="Cortes de avance firmados. El valor ganado (EV) histórico sale de estas lecturas."
        acciones={
          <Button
            variante="secundario"
            onClick={() => setModal('lectura')}
            disabled={tareas.length === 0}
          >
            Registrar avance de hoy ({avanceActual}%)
          </Button>
        }
      >
        {lecturas.length === 0 ? (
          <p className="text-sm text-slate-400">
            Aún no hay lecturas. Registra el avance al cierre de cada periodo para dejar traza
            auditable.
          </p>
        ) : (
          <>
            <BarraFiltros
              contador={
                terminoLecturas ? (
                  <>
                    <span className="font-semibold text-slate-700">{lecturasFiltradas.length}</span>{' '}
                    de {lecturas.length}
                  </>
                ) : null
              }
            >
              <Buscador
                valor={busquedaLecturas}
                onChange={setBusquedaLecturas}
                placeholder="Buscar lectura…"
                ariaLabel="Buscar lecturas de avance"
              />
            </BarraFiltros>
            <Table>
              <TableHead>
                <TableRow>
                  <Th>Fecha</Th>
                  <Th alinear="right">Avance</Th>
                  <Th>Nota</Th>
                </TableRow>
              </TableHead>
              <TableBody>
                {lecturasFiltradas.length === 0 ? (
                  <TableEmpty colSpan={3} mensaje="Ninguna lectura coincide con el filtro." />
                ) : (
                  lecturasFiltradas.map((l) => (
                    <TableRow key={l.id}>
                      <Td className="tabular-nums">{formatearFecha(l.fecha)}</Td>
                      <Td alinear="right" className="tabular-nums font-medium">
                        {l.avance}%
                      </Td>
                      <Td className="text-slate-500">{l.nota || '—'}</Td>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </>
        )}
        {yaHoy && (
          <p className="mt-3 text-xs text-slate-500">
            Ya existe una lectura con fecha de hoy; guardar otra crea un duplicado.
          </p>
        )}
      </Card>

      {modal === 'linea' && (
        <ModalNota
          titulo="Congelar línea base"
          descripcion="Se guardará una foto del cronograma actual (fechas y montos)."
          etiqueta="Congelar"
          onCerrar={() => setModal(null)}
          onGuardar={congelar}
        />
      )}
      {modal === 'lectura' && (
        <ModalNota
          titulo="Registrar lectura de avance"
          descripcion={`Se guardará el avance de hoy: ${avanceActual}%.`}
          etiqueta="Registrar"
          onCerrar={() => setModal(null)}
          onGuardar={registrarLectura}
        />
      )}
    </div>
  )
}
