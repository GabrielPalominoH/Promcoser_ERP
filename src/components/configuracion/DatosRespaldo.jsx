import { useRef, useState } from 'react'
import { useData } from '../../context/useData'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Aviso } from '../ui/Aviso'
import { COLECCIONES } from '../../data/mockData'
import {
  diasDesdeRespaldo,
  normalizarRespaldo,
  tamanoEstado,
  validarRespaldo,
} from '../../data/store'
import { descargarRespaldo } from '../../utils/descargas'

// Cuota típica de localStorage por sitio (aprox.).
const CUOTA_BYTES = 5 * 1024 * 1024

function textoUltimoRespaldo(dias) {
  if (dias === null) return 'Nunca se ha descargado un respaldo en este navegador.'
  if (dias === 0) return 'Último respaldo: hoy.'
  if (dias === 1) return 'Último respaldo: ayer.'
  return `Último respaldo: hace ${dias} días.`
}

// Datos y respaldo (solo administrador): exportar, importar, restablecer el
// ejemplo y vaciar todo. Las acciones destructivas piden un segundo clic.
export function DatosRespaldo() {
  const { estado, restablecer, reemplazarColeccion } = useData()
  const [aviso, setAviso] = useState(null)
  const [armado, setArmado] = useState(null) // 'vaciar' | 'restablecer' | null
  const [dias, setDias] = useState(() => diasDesdeRespaldo())
  const inputArchivo = useRef(null)

  const bytes = tamanoEstado(estado)
  const pct = Math.min(100, Math.round((bytes / CUOTA_BYTES) * 100))

  const exportar = () => {
    descargarRespaldo(estado)
    setDias(diasDesdeRespaldo())
    setAviso({ tipo: 'exito', mensaje: 'Respaldo descargado. Guárdalo fuera de esta computadora.' })
  }

  const importar = (evento) => {
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
        for (const coleccion of COLECCIONES) reemplazarColeccion(coleccion, normalizado[coleccion])
        setAviso({ tipo: 'exito', mensaje: 'Respaldo importado. Revisa que los totales coincidan.' })
      } catch {
        setAviso({ tipo: 'error', mensaje: 'No se pudo leer el archivo JSON.' })
      }
    }
    lector.readAsText(archivo)
  }

  const confirmar = (accion, ejecutar) => {
    if (armado !== accion) {
      setArmado(accion)
      return
    }
    ejecutar()
    setArmado(null)
  }

  const vaciar = () =>
    confirmar('vaciar', () => {
      for (const coleccion of COLECCIONES) {
        if (coleccion === 'config') continue
        reemplazarColeccion(coleccion, [])
      }
      setAviso({ tipo: 'exito', mensaje: 'Datos vaciados. Listo para cargar información real.' })
    })

  const restablecerEjemplo = () =>
    confirmar('restablecer', () => {
      restablecer()
      setAviso({ tipo: 'exito', mensaje: 'Datos de ejemplo restablecidos.' })
    })

  return (
    <div className="space-y-6">
      <Card
        titulo="Datos y respaldo"
        descripcion="Toda la información vive en este navegador. Descarga un respaldo cada semana y guárdalo fuera de la computadora."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Respaldo</p>
            <p className="mt-1 text-sm text-slate-800">{textoUltimoRespaldo(dias)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Espacio usado</p>
            <p className="mt-1 text-sm text-slate-800">
              {(bytes / 1024).toLocaleString('es-PE', { maximumFractionDigits: 0 })} KB de ~5 MB ({pct} %)
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full ${pct >= 80 ? 'bg-red-600' : pct >= 60 ? 'bg-amber-500' : 'bg-primary-600'}`}
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={exportar}>Exportar respaldo</Button>
          <Button variante="secundario" onClick={() => inputArchivo.current?.click()}>
            Importar respaldo
          </Button>
          <input
            ref={inputArchivo}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Importar respaldo JSON"
            onChange={importar}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Importar reemplaza todos los datos actuales por los del archivo. Los usuarios no viajan en el respaldo.
        </p>
      </Card>

      <Card titulo="Zona de riesgo" descripcion="Acciones que reemplazan o borran la información. Exporta un respaldo antes.">
        <div className="flex flex-wrap gap-2">
          <Button variante={armado === 'restablecer' ? 'peligro' : 'secundario'} onClick={restablecerEjemplo}>
            {armado === 'restablecer' ? 'Pulsa de nuevo para restablecer' : 'Restablecer datos de ejemplo'}
          </Button>
          <Button variante={armado === 'vaciar' ? 'peligro' : 'secundario'} onClick={vaciar}>
            {armado === 'vaciar' ? 'Pulsa de nuevo para vaciar todo' : 'Vaciar todo'}
          </Button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          «Vaciar todo» borra obras, personal, equipos y movimientos, y conserva la configuración de la empresa.
        </p>
      </Card>

      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />
    </div>
  )
}
