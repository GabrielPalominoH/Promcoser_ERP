import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useData } from '../../context/useData'
import { usePanelServicio } from './panel'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Campo, Input, Select } from '../../components/ui/Field'
import { InputMonto } from '../../components/ui/Monto'
import { Modal } from '../../components/ui/Modal'
import { Aviso } from '../../components/ui/Aviso'
import { Buscador, BarraFiltros, textoCoincide } from '../../components/ui/FiltroBusqueda'
import { normalizar } from '../../components/ui/ComboBox'
import {
  Table,
  TableBody,
  TableEmpty,
  TableHead,
  TableRow,
  Td,
  Th,
} from '../../components/ui/Table'
import { formatearFecha, formatearMoneda } from '../../utils/formatters'
import { hoyISO } from '../../utils/calculadora'
import {
  calcularValorizacion,
  configValorizacion,
  evaluarAjuste,
  resumenValorizaciones,
  saldoAdelantos,
  toleranciaMetrado,
} from '../../utils/valorizaciones'
import { servicioConPresupuestoVigente } from '../../utils/modificaciones'
import { libroValorizaciones } from '../../utils/exportaciones'
import { descargarLibro } from '../../utils/descargas'
import { htmlValorizacion, imprimirHTML } from '../../utils/reportes'

function Dato({ etiqueta, valor, tono = 'text-slate-900', nota }) {
  return (
    <div className="rounded-xl border border-slate-300 p-4">
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{etiqueta}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${tono}`}>{valor}</p>
      {nota && <p className="mt-0.5 text-xs text-slate-500">{nota}</p>}
    </div>
  )
}

export function ModalAdelanto({ onCerrar, onGuardar }) {
  const [tipo, setTipo] = useState('directo')
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState(hoyISO())
  const [error, setError] = useState(null)

  const guardar = () => {
    const valor = Number(monto)
    if (!monto || Number.isNaN(valor) || valor <= 0) {
      setError('Ingresa un monto mayor que cero.')
      return
    }
    onGuardar({ tipo, monto: valor, fecha, nota: 'Adelanto registrado' })
    onCerrar()
  }

  return (
    <Modal
      abierto
      ancho="sm"
      titulo="Registrar adelanto"
      descripcion="Adelanto directo o de materiales entregado por el cliente."
      onCerrar={onCerrar}
      pie={
        <>
          <Button variante="secundario" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar}>Registrar</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Campo label="Tipo" htmlFor="ad-tipo">
          <Select id="ad-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="directo">Adelanto directo</option>
            <option value="materiales">Adelanto de materiales</option>
          </Select>
        </Campo>
        <Campo label="Monto (S/)" error={error} htmlFor="ad-monto">
          <InputMonto id="ad-monto" value={monto} onChange={setMonto} />
        </Campo>
        <Campo label="Fecha" htmlFor="ad-fecha">
          <Input
            id="ad-fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </Campo>
      </div>
    </Modal>
  )
}

// Vista de una valorización cerrada (con sus ajustes y notas si los tiene).
// Extraída para poder montarla abierta en pruebas; el contenido es el mismo
// del bloque inline.
export function ModalVerValorizacion({ valorizacion, onCerrar, onImprimir }) {
  const ver = valorizacion
  if (!ver) return null
  return (
    <Modal
      abierto
      ancho="lg"
      titulo={`Valorización N° ${ver.numero}`}
      descripcion={`Fecha ${formatearFecha(ver.fecha)}`}
      onCerrar={onCerrar}
      pie={
        <>
          <Button variante="secundario" onClick={onCerrar}>
            Cerrar
          </Button>
          <Button onClick={() => onImprimir(ver)}>Imprimir / PDF</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Table>
          <TableHead>
            <TableRow>
              <Th>Partida</Th>
              <Th>UM</Th>
              <Th alinear="right">Metrado</Th>
              <Th alinear="right">P. Unit.</Th>
              <Th alinear="right">Importe</Th>
            </TableRow>
          </TableHead>
          <TableBody>
            {ver.items.filter((i) => i.metrado_periodo > 0).length === 0 ? (
              <TableEmpty colSpan={5} mensaje="Esta valorización no tiene partidas con periodo." />
            ) : (
              ver.items
                .filter((i) => i.metrado_periodo > 0)
                .map((i) => (
                  <TableRow key={i.tarea_id}>
                    <Td className="font-medium text-slate-800">
                      {i.nombre}
                      {i.ajuste ? (
                        <span className="block text-xs font-normal text-amber-700">
                          Ajuste {i.ajuste > 0 ? '+' : '−'}
                          {Math.abs(i.ajuste)} · {i.nota_ajuste || 'sin nota'}
                        </span>
                      ) : null}
                    </Td>
                    <Td className="text-slate-600">{i.unidad ?? '—'}</Td>
                    <Td alinear="right" className="tabular-nums">
                      {i.metrado_periodo}
                      {i.ajuste ? (
                        <span className="block text-xs text-slate-500">
                          rep. {i.metrado_reportado}
                        </span>
                      ) : null}
                    </Td>
                    <Td alinear="right" className="tabular-nums">
                      {formatearMoneda(i.precio_unitario)}
                    </Td>
                    <Td alinear="right" className="tabular-nums">
                      {formatearMoneda(i.importe)}
                    </Td>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
        <ResumenCalculo calculo={ver} />
      </div>
    </Modal>
  )
}

export function ModalNuevaValorizacion({ servicio, tareas, valorizaciones, adelantos, partes, onCerrar, onGuardar }) {
  const [numero, setNumero] = useState(() => {
    const previos = valorizaciones.map((v) => Number(v.numero) || 0)
    return previos.length ? Math.max(...previos) + 1 : 1
  })
  const [fecha, setFecha] = useState(hoyISO())
  // Ajustes por partida antes de cerrar: { [tarea_id]: { acumulado, nota } }.
  // Vacío = se valoriza lo reportado (previo + partes hasta la fecha).
  const [ajustes, setAjustes] = useState({})

  const listaAjustes = useMemo(
    () =>
      Object.entries(ajustes)
        .filter(([, a]) => a?.acumulado !== '' && a?.acumulado != null)
        .map(([tarea_id, a]) => ({
          tarea_id: Number(tarea_id),
          metrado_acumulado: Number(a.acumulado) || 0,
          nota: a.nota ?? '',
        })),
    [ajustes],
  )

  const calculo = useMemo(
    () =>
      calcularValorizacion({
        servicio,
        tareas,
        valorizaciones,
        adelantos,
        partes,
        ajustes: listaAjustes,
        numero: Number(numero) || 1,
        fecha,
      }),
    [servicio, tareas, valorizaciones, adelantos, partes, listaAjustes, numero, fecha],
  )

  const tolerancia = toleranciaMetrado(servicio)
  const evaluaciones = useMemo(
    () =>
      new Map(
        calculo.items.map((i) => {
          const tarea = tareas.find((t) => t.id === i.tarea_id) ?? {}
          return [
            i.tarea_id,
            evaluarAjuste({
              tarea,
              reportado: i.metrado_reportado,
              acumulado: i.metrado_acumulado,
              nota: i.nota_ajuste,
              tolerancia,
            }),
          ]
        }),
      ),
    [calculo, tareas, tolerancia],
  )

  const conPeriodo = calculo.items.filter((i) => i.metrado_periodo > 0)
  const ajustados = calculo.items.filter((i) => i.ajuste)
  const sinNota = ajustados.filter((i) => !String(i.nota_ajuste ?? '').trim())
  const avisosTope = ajustados
    .map((i) => evaluaciones.get(i.tarea_id))
    .filter((ev) => ev?.excedeTope)
    .flatMap((ev) => ev.mensajes)

  const fijarAjuste = (tareaId, campo, valor) =>
    setAjustes((prev) => ({
      ...prev,
      [tareaId]: { acumulado: '', nota: '', ...(prev[tareaId] ?? {}), [campo]: valor },
    }))

  const signo = (x) => `${x > 0 ? '+' : '−'}${Math.abs(x)}`

  return (
    <Modal
      abierto
      ancho="lg"
      titulo={`Valorización N° ${numero}`}
      descripcion={`Periodo al ${formatearFecha(fecha)} · valoriza el avance acumulado no cobrado.`}
      onCerrar={onCerrar}
      pie={
        <>
          <Button variante="secundario" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              onGuardar(calculo)
              onCerrar()
            }}
            disabled={conPeriodo.length === 0 || sinNota.length > 0}
          >
            Emitir valorización (S/ {calculo.neto.toLocaleString('es-PE')})
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Número" htmlFor="vz-numero">
            <Input
              id="vz-numero"
              type="number"
              min="1"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
            />
          </Campo>
          <Campo label="Fecha de valorización" htmlFor="vz-fecha">
            <Input
              id="vz-fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </Campo>
        </div>

        {conPeriodo.length === 0 && listaAjustes.length === 0 ? (
          <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
            No hay metrado nuevo por valorizar: aumenta el avance de las partidas en el Cronograma.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <TableRow>
                  <Th>Partida</Th>
                  <Th>UM</Th>
                  <Th alinear="right">Reportado</Th>
                  <Th alinear="right">A valorizar</Th>
                  <Th alinear="right">Anterior</Th>
                  <Th alinear="right">Periodo</Th>
                  <Th alinear="right">P. Unit.</Th>
                  <Th alinear="right">Importe</Th>
                </TableRow>
              </TableHead>
              <TableBody>
                {calculo.items.map((i) => (
                  <TableRow key={i.tarea_id}>
                    <Td className="font-medium text-slate-800">{i.nombre}</Td>
                    <Td className="text-slate-600">{i.unidad ?? '—'}</Td>
                    <Td alinear="right" className="tabular-nums text-slate-500">
                      {i.metrado_reportado}
                    </Td>
                    <Td alinear="right" className="tabular-nums">
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        className="w-24 text-right tabular-nums"
                        aria-label={`Metrado a valorizar de ${i.nombre}`}
                        placeholder={String(i.metrado_reportado)}
                        value={ajustes[i.tarea_id]?.acumulado ?? ''}
                        onChange={(e) => fijarAjuste(i.tarea_id, 'acumulado', e.target.value)}
                      />
                      {i.ajuste ? (
                        <span className="block text-xs font-medium text-amber-700">
                          Dif. {signo(i.ajuste)}
                        </span>
                      ) : null}
                    </Td>
                    <Td alinear="right" className="tabular-nums text-slate-500">
                      {i.metrado_previo}
                    </Td>
                    <Td alinear="right" className="tabular-nums font-medium">
                      {i.metrado_periodo}
                    </Td>
                    <Td alinear="right" className="tabular-nums">
                      {formatearMoneda(i.precio_unitario)}
                    </Td>
                    <Td alinear="right" className="tabular-nums">
                      {formatearMoneda(i.importe)}
                    </Td>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {avisosTope.length > 0 && (
          <div className="rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm text-orange-800">
            <p className="mb-1 font-semibold">El acumulado supera el tope contratado + tolerancia</p>
            <ul className="list-disc space-y-1 pl-4">
              {avisosTope.map((m, k) => (
                <li key={k}>{m}</li>
              ))}
            </ul>
          </div>
        )}

        {ajustados.length > 0 && (
          <div className="space-y-3 rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-800">
              Notas de los ajustes (obligatorias, una por partida)
            </p>
            {ajustados.map((i) => (
              <Campo
                key={i.tarea_id}
                label={`${i.nombre} · diferencia ${signo(i.ajuste)}`}
                error={
                  String(i.nota_ajuste ?? '').trim()
                    ? null
                    : 'La nota es obligatoria para emitir con este ajuste.'
                }
                htmlFor={`vz-nota-${i.tarea_id}`}
              >
                <Input
                  id={`vz-nota-${i.tarea_id}`}
                  value={ajustes[i.tarea_id]?.nota ?? ''}
                  onChange={(e) => fijarAjuste(i.tarea_id, 'nota', e.target.value)}
                  placeholder="Justifica el ajuste (p. ej. mayor metrado verificado en campo)…"
                />
              </Campo>
            ))}
          </div>
        )}

        <ResumenCalculo calculo={calculo} />
      </div>
    </Modal>
  )
}

function ResumenCalculo({ calculo }) {
  const filas = [
    ['Valorización bruta', calculo.bruta],
    ['− Amortización adelanto directo', calculo.amort_directo],
    ['− Amortización adelanto de materiales', calculo.amort_materiales],
    [`− Fondo de garantía (${calculo.fondo_garantia_pct}%)`, calculo.retencion],
    ['Subtotal', calculo.subtotal],
    [`+ IGV (${calculo.igv_pct}%)`, calculo.igv],
    ['Total facturado', calculo.total],
    [`− Detracción (${calculo.detraccion_pct}%)`, calculo.detraccion],
  ]
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="rounded-xl border border-slate-300">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-100">
            {filas.map(([etiqueta, valor]) => (
              <tr key={etiqueta}>
                <td className="px-4 py-2 text-slate-600">{etiqueta}</td>
                <td className="px-4 py-2 text-right tabular-nums text-slate-800">
                  {formatearMoneda(valor)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col justify-center rounded-xl bg-primary-700 px-5 py-6 text-white">
        <p className="text-xs font-semibold tracking-wide uppercase opacity-80">Neto a pagar</p>
        <p className="mt-1 text-3xl font-bold tabular-nums">{formatearMoneda(calculo.neto)}</p>
        <p className="mt-2 text-xs opacity-80">
          Total facturado menos detracción. La valorización queda registrada para el siguiente
          periodo.
        </p>
      </div>
    </div>
  )
}

export function ValorizacionesServicio() {
  const { servicio } = useOutletContext()
  const { abrirEditar } = usePanelServicio()
  const { estado, agregarItem, eliminarItem } = useData()
  const [aviso, setAviso] = useState(null)
  const [modal, setModal] = useState(null) // 'nueva' | 'adelanto'
  const [verId, setVerId] = useState(null)
  const [busqueda, setBusqueda] = useState('')

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
  const valorizaciones = useMemo(
    () =>
      (estado.valorizaciones ?? [])
        .filter((v) => v.servicio_id === servicio.id)
        .sort((a, b) => (Number(a.numero) || 0) - (Number(b.numero) || 0)),
    [estado.valorizaciones, servicio.id],
  )
  const adelantos = useMemo(
    () =>
      (estado.adelantos ?? [])
        .filter((a) => a.servicio_id === servicio.id)
        .sort((a, b) => (a.fecha ?? '').localeCompare(b.fecha ?? '')),
    [estado.adelantos, servicio.id],
  )
  const partes = useMemo(
    () => (estado.partes_diario ?? []).filter((p) => p.servicio_id === servicio.id),
    [estado.partes_diario, servicio.id],
  )

  const cfg = configValorizacion(servicio)
  const servicioVig = servicioConPresupuestoVigente(servicio, estado.modificaciones)
  const resumen = resumenValorizaciones({ servicio, valorizaciones, adelantos })
  const saldos = saldoAdelantos({ servicio, valorizaciones, adelantos })
  const ver = verId ? valorizaciones.find((v) => v.id === verId) : null

  const termino = normalizar(busqueda).trim()
  const valorizacionesFiltradas = useMemo(
    () =>
      termino
        ? valorizaciones.filter(
            (v) =>
              textoCoincide(`N° ${v.numero}`, termino) ||
              textoCoincide(v.fecha, termino) ||
              textoCoincide(v.estado, termino),
          )
        : valorizaciones,
    [valorizaciones, termino],
  )

  const emitir = (calculo) => {
    const guardada = agregarItem('valorizaciones', calculo)
    setAviso({
      tipo: 'exito',
      mensaje: `Valorización N° ${guardada.numero} emitida: neto ${formatearMoneda(guardada.neto)}.`,
    })
  }

  const registrarAdelanto = (datos) => {
    agregarItem('adelantos', { ...datos, servicio_id: servicio.id })
    setAviso({ tipo: 'exito', mensaje: 'Adelanto registrado.' })
  }

  const borrar = (v) => {
    eliminarItem('valorizaciones', v.id)
    setAviso({ tipo: 'info', mensaje: `Valorización N° ${v.numero} eliminada.` })
  }

  // Exportación a Excel y PDF de las valorizaciones del servicio.
  const exportarExcel = () => {
    const ok = descargarLibro(libroValorizaciones({ servicio, valorizaciones, generado: hoyISO() }))
    setAviso(
      ok
        ? { tipo: 'exito', mensaje: 'Valorizaciones exportadas a Excel.' }
        : { tipo: 'error', mensaje: 'No se pudo exportar las valorizaciones.' },
    )
  }

  const imprimirValorizacion = (v) => {
    if (!imprimirHTML(htmlValorizacion({ servicio, valorizacion: v }))) {
      setAviso({ tipo: 'error', mensaje: 'La impresión no está disponible en este entorno.' })
    }
  }

  return (
    <div className="space-y-6">
      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />

      <Card
        titulo="Valorizaciones"
        descripcion="Cobro del avance por partida, con amortización de adelantos, fondo de garantía, IGV y detracción."
        acciones={
          <>
            <Button
              variante="secundario"
              onClick={exportarExcel}
              disabled={valorizaciones.length === 0}
            >
              Exportar Excel
            </Button>
            <Button onClick={() => setModal('nueva')} disabled={tareas.length === 0}>
              Nueva valorización
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Dato etiqueta="Valorizaciones" valor={resumen.cantidad} />
          <Dato etiqueta="Bruto acumulado" valor={formatearMoneda(resumen.bruta)} />
          <Dato etiqueta="Total facturado" valor={formatearMoneda(resumen.total)} />
          <Dato
            etiqueta="Neto acumulado"
            valor={formatearMoneda(resumen.neto)}
            tono="text-emerald-700"
          />
        </div>

        {valorizaciones.length === 0 ? (
          <p className="mt-5 rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
            Sin valorizaciones. Avanza el cronograma y emite la primera para facturar lo ejecutado.
          </p>
        ) : (
          <div className="mt-5">
            <BarraFiltros
              contador={
                termino ? (
                  <>
                    <span className="font-semibold text-slate-700">
                      {valorizacionesFiltradas.length}
                    </span>{' '}
                    de {valorizaciones.length}
                  </>
                ) : null
              }
            >
              <Buscador
                valor={busqueda}
                onChange={setBusqueda}
                placeholder="Buscar valorización…"
                ariaLabel="Buscar valorizaciones"
              />
            </BarraFiltros>
            <Table>
              <TableHead>
                <TableRow>
                  <Th>N°</Th>
                  <Th>Fecha</Th>
                  <Th alinear="right">Bruto</Th>
                  <Th alinear="right">Amort. directo</Th>
                  <Th alinear="right">Amort. mat.</Th>
                  <Th alinear="right">Retención</Th>
                  <Th alinear="right">IGV</Th>
                  <Th alinear="right">Total</Th>
                  <Th alinear="right">Detracción</Th>
                  <Th alinear="right">Neto</Th>
                  <Th alinear="right" className="w-40">
                    Acciones
                  </Th>
                </TableRow>
              </TableHead>
              <TableBody>
                {valorizacionesFiltradas.length === 0 ? (
                  <TableEmpty colSpan={11} mensaje="Ninguna valorización coincide con el filtro." />
                ) : (
                  valorizacionesFiltradas.map((v) => (
                    <TableRow key={v.id}>
                      <Td className="font-semibold text-slate-900">N° {v.numero}</Td>
                      <Td className="tabular-nums">{formatearFecha(v.fecha)}</Td>
                      <Td alinear="right" className="tabular-nums">
                        {formatearMoneda(v.bruta)}
                      </Td>
                      <Td alinear="right" className="tabular-nums text-slate-500">
                        {formatearMoneda(v.amort_directo)}
                      </Td>
                      <Td alinear="right" className="tabular-nums text-slate-500">
                        {formatearMoneda(v.amort_materiales)}
                      </Td>
                      <Td alinear="right" className="tabular-nums text-slate-500">
                        {formatearMoneda(v.retencion)}
                      </Td>
                      <Td alinear="right" className="tabular-nums text-slate-500">
                        {formatearMoneda(v.igv)}
                      </Td>
                      <Td alinear="right" className="tabular-nums">
                        {formatearMoneda(v.total)}
                      </Td>
                      <Td alinear="right" className="tabular-nums text-slate-500">
                        {formatearMoneda(v.detraccion)}
                      </Td>
                      <Td alinear="right" className="tabular-nums font-semibold text-emerald-700">
                        {formatearMoneda(v.neto)}
                      </Td>
                      <Td alinear="right">
                        <div className="flex justify-end gap-2">
                          <Button variante="secundario" tamano="sm" onClick={() => setVerId(v.id)}>
                            Ver
                          </Button>
                          <Button variante="peligro" tamano="sm" onClick={() => borrar(v)}>
                            Eliminar
                          </Button>
                        </div>
                      </Td>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card
          titulo="Adelantos y amortización"
          descripcion="Los adelantos se amortizan en la misma proporción en que avanza la valorización."
          acciones={
            <Button variante="secundario" tamano="sm" onClick={() => setModal('adelanto')}>
              Registrar adelanto
            </Button>
          }
        >
          <div className="space-y-3">
            {[
              ['Adelanto directo', saldos.directo],
              ['Adelanto de materiales', saldos.materiales],
            ].map(([etiqueta, s]) => (
              <div key={etiqueta} className="rounded-xl border border-slate-300 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">{etiqueta}</p>
                  <Badge variante={s.saldo > 0 ? 'warning' : s.total > 0 ? 'success' : 'neutral'}>
                    {s.total > 0 ? `Saldo ${formatearMoneda(s.saldo)}` : 'Sin adelanto'}
                  </Badge>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p className="text-slate-500">Recibido</p>
                    <p className="mt-0.5 font-semibold text-slate-800 tabular-nums">
                      {formatearMoneda(s.total)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Amortizado</p>
                    <p className="mt-0.5 font-semibold text-slate-800 tabular-nums">
                      {formatearMoneda(s.amortizado)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Saldo</p>
                    <p className="mt-0.5 font-semibold text-slate-800 tabular-nums">
                      {formatearMoneda(s.saldo)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {adelantos.length > 0 && (
              <ul className="space-y-1 text-xs text-slate-500">
                {adelantos.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3">
                    <span>
                      {a.tipo === 'materiales' ? 'Materiales' : 'Directo'} ·{' '}
                      {formatearFecha(a.fecha)}
                    </span>
                    <span className="tabular-nums">{formatearMoneda(a.monto)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card
          titulo="Condiciones del contrato"
          descripcion="Porcentajes aplicados al calcular cada valorización."
          acciones={
            <Button variante="secundario" tamano="sm" onClick={abrirEditar}>
              Editar
            </Button>
          }
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Dato etiqueta="IGV" valor={`${cfg.igv_pct}%`} />
            <Dato etiqueta="Detracción" valor={`${cfg.detraccion_pct}%`} />
            <Dato etiqueta="Fondo de garantía" valor={`${cfg.fondo_garantia_pct}%`} />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Dato
              etiqueta="Tolerancia de metrado"
              valor={`${toleranciaMetrado(servicio)}%`}
              nota="Tope del acumulado valorizado por partida."
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Dato
              etiqueta="Presupuesto vigente"
              valor={formatearMoneda(servicioVig.presupuesto_asignado)}
              nota={
                servicioVig.presupuesto_asignado !== servicio.presupuesto_asignado
                  ? `Original ${formatearMoneda(servicio.presupuesto_asignado)}`
                  : null
              }
            />
            <Dato
              etiqueta="Fondo retenido acumulado"
              valor={formatearMoneda(resumen.retencion)}
              tono="text-amber-700"
            />
          </div>
        </Card>
      </div>

      {modal === 'nueva' && (
        <ModalNuevaValorizacion
          servicio={servicioVig}
          tareas={tareas}
          valorizaciones={valorizaciones}
          adelantos={adelantos}
          partes={partes}
          onCerrar={() => setModal(null)}
          onGuardar={emitir}
        />
      )}
      {modal === 'adelanto' && (
        <ModalAdelanto onCerrar={() => setModal(null)} onGuardar={registrarAdelanto} />
      )}
      {ver && (
        <ModalVerValorizacion
          valorizacion={ver}
          onCerrar={() => setVerId(null)}
          onImprimir={imprimirValorizacion}
        />
      )}
    </div>
  )
}
