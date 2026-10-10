import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Campo, Input } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { Aviso } from '../components/ui/Aviso'
import { useData } from '../context/useData'
import { formatearFecha, formatearMes, formatearMoneda } from '../utils/formatters'
import { enMes, estadoFactura, generarCierre, mesCerrado } from '../utils/finanzas'

// Cierre mensual gerencial (no contable oficial): congela una foto de los
// totales del mes. Mes cerrado: Asentar/Desasentar y movimientos fechados en
// él se bloquean hasta reabrir con motivo. Reabrir queda registrado.

export function Cierre() {
  const { estado, agregarItem, actualizarItem } = useData()
  const [aviso, setAviso] = useState(null)
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7))
  const [vista, setVista] = useState(null)
  const [reabrir, setReabrir] = useState(null)
  const [motivo, setMotivo] = useState('')
  const [responsable, setResponsable] = useState('')

  const cierres = useMemo(
    () => [...(estado.cierres ?? [])].sort((a, b) => b.mes.localeCompare(a.mes)),
    [estado.cierres],
  )
  const cerrado = mesCerrado(mes, estado.cierres)

  // Checklist de revisión: lo pendiente antes de cerrar.
  const checklist = useMemo(() => {
    const items = []
    const tareoPendiente = (estado.tareos ?? []).filter(
      (t) => t.fecha?.slice(0, 7) === mes && t.estado !== 'aprobado',
    ).length
    if (tareoPendiente > 0) items.push(`${tareoPendiente} tareo(s) sin aprobar`)
    const sinTarea = (estado.registros_servicio ?? []).filter(
      (r) => enMes(r.fecha, mes) && r.tarea_id == null,
    ).length
    if (sinTarea > 0) items.push(`${sinTarea} costo(s) sin tarea asignada`)
    const vencidas = (estado.facturas ?? []).filter(
      (f) => f.estado !== 'anulada' && estadoFactura(f, estado.cobros, `${mes}-28`) === 'vencida',
    ).length
    if (vencidas > 0) items.push(`${vencidas} factura(s) vencida(s)`)
    const sinAsentar = (estado.asignaciones ?? []).filter((a) => {
      const inicio = (a.fecha_inicio || '').slice(0, 7)
      const fin = (a.fecha_fin || '9999-12').slice(0, 7)
      if (mes < inicio || mes > fin) return false
      return !(estado.registros_servicio ?? []).some(
        (r) => r.asignacion_id === a.id && r.fecha?.slice(0, 7) === mes,
      )
    }).length
    if (sinAsentar > 0) items.push(`${sinAsentar} asignación(es) sin asentar`)
    return items
  }, [estado, mes])

  const resultado = useMemo(() => generarCierre(mes, estado), [mes, estado])

  const confirmarCierre = () => {
    if (!responsable.trim()) {
      setAviso({ tipo: 'error', mensaje: 'Indica el responsable del cierre.' })
      return
    }
    agregarItem('cierres', {
      mes,
      estado: 'cerrado',
      responsable: responsable.trim(),
      fecha_cierre: new Date().toISOString(),
      snapshot: resultado,
    })
    setAviso({ tipo: 'exito', mensaje: `Mes ${formatearMes(mes)} cerrado. Foto congelada.` })
  }

  const confirmarReapertura = () => {
    if (!motivo.trim()) {
      setAviso({ tipo: 'error', mensaje: 'Indica el motivo de la reapertura.' })
      return
    }
    actualizarItem('cierres', {
      id: reabrir.id,
      estado: 'reabierto',
      motivo_reapertura: motivo.trim(),
      fecha_reapertura: new Date().toISOString(),
    })
    setReabrir(null)
    setMotivo('')
    setAviso({ tipo: 'info', mensaje: 'Periodo reabierto con motivo registrado.' })
  }

  const ver = vista ?? resultado
  const anterior = (() => {
    const [a, m] = mes.split('-').map(Number)
    const d = new Date(a, m - 2, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })()
  const previo = generarCierre(anterior, estado)

  return (
    <div className="space-y-6">
      <Card
        titulo="Cierre mensual"
        descripcion="Revisa, genera el resultado y congélalo. Cierre gerencial interno."
        acciones={
          <span className="flex items-end gap-2">
            <Campo label="Mes" htmlFor="cierre-mes">
              <Input id="cierre-mes" type="month" value={mes} onChange={(e) => { setMes(e.target.value); setVista(null) }} />
            </Campo>
            <Button variante="secundario" onClick={() => window.print()}>Imprimir</Button>
          </span>
        }
      >
        {cerrado ? (
          <p className="rounded-lg bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700">
            Mes cerrado. Las correcciones requieren reapertura con motivo. Lo que sigue es la foto congelada.
          </p>
        ) : (
          <>
            <p className="mb-2 text-sm font-medium text-slate-700">Revisión previa ({checklist.length} punto(s))</p>
            {checklist.length === 0 ? (
              <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                Sin pendientes detectados. Puedes generar y cerrar.
              </p>
            ) : (
              <ul className="list-disc space-y-1 pl-5 text-sm text-amber-800">
                {checklist.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <Campo label="Responsable del cierre" htmlFor="cierre-resp">
                <Input
                  id="cierre-resp"
                  placeholder="Nombre de quien cierra"
                  value={responsable}
                  onChange={(e) => setResponsable(e.target.value)}
                />
              </Campo>
              <Button onClick={confirmarCierre}>Confirmar cierre</Button>
            </div>
          </>
        )}
      </Card>

      <Card titulo={`Reporte ${formatearMes(mes)}`} descripcion={vista ? `Foto del ${formatearFecha(vista.fecha_generacion.slice(0, 10))}` : 'Vista previa en vivo'}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ['Facturado', ver.facturado],
            ['Cobrado', ver.cobrado],
            ['Gastado', ver.gastado],
            ['Pagado', ver.pagado],
            ['Flujo neto', ver.flujo],
            ['Resultado (fact. − gasto)', ver.resultado],
            ['Horas hombre', `${ver.horas.total} h`],
            ['Costo laboral', ver.horas.costo],
          ].map(([etiqueta, valor]) => (
            <div key={etiqueta} className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs text-slate-500">{etiqueta}</p>
              <p className="font-bold tabular-nums">{typeof valor === 'number' ? formatearMoneda(valor) : valor}</p>
            </div>
          ))}
        </div>

        <p className="mt-5 mb-2 text-sm font-medium text-slate-700">Resultado por servicio</p>
        {ver.porServicio.length === 0 ? (
          <p className="text-sm text-slate-400">Sin servicios con movimiento.</p>
        ) : (
          <ul className="space-y-1.5">
            {ver.porServicio.map((s) => (
              <li key={s.servicio_id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <Link to={`/servicios/${s.servicio_id}`} className="font-medium text-primary-700 hover:underline">
                  {s.nombre}
                </Link>
                <span className="tabular-nums">
                  fact. {formatearMoneda(s.facturado)} · cob. {formatearMoneda(s.cobrado)} · gasto {formatearMoneda(s.gastado)} ·{' '}
                  <span className={`font-semibold ${s.resultado < 0 ? 'text-red-600' : ''}`}>
                    {formatearMoneda(s.resultado)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-5 mb-2 text-sm font-medium text-slate-700">
          Mes anterior ({formatearMes(anterior)}): facturado {formatearMoneda(previo.facturado)} · gastado{' '}
          {formatearMoneda(previo.gastado)} · resultado {formatearMoneda(previo.resultado)}
        </p>
      </Card>

      <Card titulo="Historial de cierres" descripcion="Fotos congeladas por mes.">
        {cierres.length === 0 ? (
          <p className="text-sm text-slate-400">Aún no hay meses cerrados.</p>
        ) : (
          <ul className="space-y-1.5">
            {cierres.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="text-slate-700">
                  <span className="font-medium capitalize">{formatearMes(c.mes)}</span> · {c.estado} · {c.responsable}
                  {c.estado === 'reabierto' && c.motivo_reapertura && (
                    <span className="block text-xs text-slate-500">Motivo: {c.motivo_reapertura}</span>
                  )}
                </span>
                <span className="inline-flex gap-1.5">
                  <Button variante="secundario" tamano="sm" onClick={() => { setVista(c.snapshot); setMes(c.mes) }}>
                    Ver foto
                  </Button>
                  {c.estado === 'cerrado' && (
                    <Button variante="secundario" tamano="sm" onClick={() => setReabrir(c)}>
                      Reabrir
                    </Button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {reabrir && (
        <Modal
          abierto
          ancho="sm"
          titulo={`Reabrir ${formatearMes(reabrir.mes)}`}
          descripcion="Exige motivo y queda registrado."
          onCerrar={() => setReabrir(null)}
          pie={
            <>
              <Button variante="secundario" onClick={() => setReabrir(null)}>Cancelar</Button>
              <Button variante="peligro" onClick={confirmarReapertura}>Reabrir con motivo</Button>
            </>
          }
        >
          <Campo label="Motivo" htmlFor="reabrir-motivo">
            <Input
              id="reabrir-motivo"
              placeholder="Ej. Factura llegada tarde"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </Campo>
        </Modal>
      )}

      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />
    </div>
  )
}
