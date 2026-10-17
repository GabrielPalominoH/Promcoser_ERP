import { useState } from 'react'
import { useData } from '../../context/useData'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { COLECCIONES } from '../../data/mockData'
import {
  DIAS_AVISO_RESPALDO,
  diasDesdeRespaldo,
  esPrimerUso,
  hayDatosParaRespaldar,
  marcarInicializado,
  tamanoEstado,
} from '../../data/store'
import { descargarRespaldo } from '../../utils/descargas'

// Aviso al acercarse a la cuota típica de localStorage (~5 MB).
const BYTES_AVISO = 4 * 1024 * 1024

// Bienvenida del primer uso: el sistema arranca con datos de ejemplo, y para
// operar de verdad hay que decidir si se empieza de cero o se explora primero.
// Cerrar la ventana equivale a "explorar con ejemplo" (no borra nada).
function Bienvenida({ onElegir }) {
  return (
    <Modal
      abierto
      titulo="Bienvenido a PROMCOSER"
      descripcion="Elige cómo quieres empezar. Siempre puedes cambiar después desde Configuración → Datos y respaldo."
      onCerrar={() => onElegir(false)}
      ancho="sm"
    >
      <div className="space-y-3 text-sm text-slate-600">
        <p>
          <span className="font-semibold text-slate-900">Empezar con datos vacíos</span>: para
          cargar tus obras reales. Se conserva solo la configuración de la empresa.
        </p>
        <p>
          <span className="font-semibold text-slate-900">Explorar con datos de ejemplo</span>: tres
          obras ficticias para conocer el sistema sin riesgo.
        </p>
        <p className="rounded-lg bg-slate-50 p-3 text-xs">
          Tus datos viven en este navegador: descarga un respaldo cada semana. El sistema te lo
          recordará.
        </p>
        <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button variante="secundario" onClick={() => onElegir(false)}>
            Explorar con datos de ejemplo
          </Button>
          <Button onClick={() => onElegir(true)}>Empezar con datos vacíos</Button>
        </div>
      </div>
    </Modal>
  )
}

export function AvisosSistema() {
  const { estado, reemplazarColeccion } = useData()
  const [primerUso, setPrimerUso] = useState(esPrimerUso)
  const [descartado, setDescartado] = useState(false)

  const elegir = (vacio) => {
    if (vacio) {
      for (const coleccion of COLECCIONES) {
        if (coleccion === 'config') continue
        reemplazarColeccion(coleccion, [])
      }
    }
    marcarInicializado()
    setPrimerUso(false)
  }

  if (typeof window === 'undefined') return null
  if (primerUso) return <Bienvenida onElegir={elegir} />
  if (descartado || !hayDatosParaRespaldar(estado)) return null

  const dias = diasDesdeRespaldo()
  const lleno = tamanoEstado(estado) > BYTES_AVISO
  const respaldoVencido = dias === null || dias >= DIAS_AVISO_RESPALDO
  if (!lleno && !respaldoVencido) return null

  const mensaje = lleno
    ? 'El almacenamiento de este navegador está casi lleno. Descarga un respaldo ahora.'
    : dias === null
      ? 'Aún no has descargado ningún respaldo. Tus datos solo existen en este navegador.'
      : `Tu último respaldo fue hace ${dias} días. Descarga uno nuevo.`

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800"
    >
      <span>{mensaje}</span>
      <Button
        tamano="sm"
        onClick={() => {
          descargarRespaldo(estado)
          setDescartado(true)
        }}
      >
        Descargar respaldo
      </Button>
      <button
        type="button"
        onClick={() => setDescartado(true)}
        className="text-xs font-medium underline underline-offset-2"
      >
        Recordar luego
      </button>
    </div>
  )
}
