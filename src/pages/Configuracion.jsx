import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { useTema } from '../context/useTema'
import { useData } from '../context/useData'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Campo, Input } from '../components/ui/Field'
import { InputMonto } from '../components/ui/Monto'
import { Aviso } from '../components/ui/Aviso'
import { GestionUsuarios } from '../components/configuracion/GestionUsuarios'
import { DatosRespaldo } from '../components/configuracion/DatosRespaldo'
import { leerConfig } from '../data/store'
import { cargoVisible, LARGO_MINIMO_CLAVE } from '../data/auth'
import { ETIQUETAS_ROL, seccionConfiguracionPermitida } from '../utils/permisos'

const SECCIONES = [
  { id: 'cuenta', titulo: 'Mi cuenta', detalle: 'Datos y clave' },
  { id: 'apariencia', titulo: 'Apariencia', detalle: 'Tema claro u oscuro' },
  { id: 'usuarios', titulo: 'Usuarios y roles', detalle: 'Altas, roles y claves' },
  { id: 'empresa', titulo: 'Empresa', detalle: 'Nombre y meta de ingreso' },
  { id: 'datos', titulo: 'Datos y respaldo', detalle: 'Exportar, importar, vaciar' },
]

function Mensaje({ m }) {
  if (!m) return null
  return (
    <p role="status" className={`text-sm font-medium ${m.ok ? 'text-emerald-700' : 'text-red-600'}`}>
      {m.texto}
    </p>
  )
}

// ---------------------------------------------------------------- Mi cuenta
function MiCuenta() {
  const { usuario, actualizarMiPerfil, cambiarMiClave } = useAuth()
  const [perfil, setPerfil] = useState({ nombre: usuario?.nombre ?? '', cargo: usuario?.cargo ?? '' })
  const [claves, setClaves] = useState({ actual: '', nueva: '', repetir: '' })
  const [msgPerfil, setMsgPerfil] = useState(null)
  const [msgClave, setMsgClave] = useState(null)

  const guardarPerfil = (e) => {
    e.preventDefault()
    const r = actualizarMiPerfil(perfil)
    setMsgPerfil(r.ok ? { ok: true, texto: 'Datos actualizados.' } : { ok: false, texto: r.error })
  }

  const guardarClave = (e) => {
    e.preventDefault()
    if (claves.nueva !== claves.repetir) {
      setMsgClave({ ok: false, texto: 'La clave nueva y su repetición no coinciden.' })
      return
    }
    const r = cambiarMiClave(claves.actual, claves.nueva)
    setMsgClave(r.ok ? { ok: true, texto: 'Clave actualizada.' } : { ok: false, texto: r.error })
    if (r.ok) setClaves({ actual: '', nueva: '', repetir: '' })
  }

  return (
    <div className="space-y-6">
      <Card titulo="Mis datos" descripcion="El correo y el rol solo los cambia un administrador.">
        <form onSubmit={guardarPerfil} noValidate className="grid gap-4 sm:grid-cols-2">
          <Campo label="Nombre" htmlFor="cfg-nombre">
            <Input
              id="cfg-nombre"
              value={perfil.nombre}
              onChange={(e) => {
                setPerfil((p) => ({ ...p, nombre: e.target.value }))
                setMsgPerfil(null)
              }}
            />
          </Campo>
          <Campo label="Cargo" htmlFor="cfg-cargo" hint="Se muestra bajo tu nombre en el menú.">
            <Input
              id="cfg-cargo"
              value={perfil.cargo}
              placeholder={ETIQUETAS_ROL[usuario?.rol] ?? ''}
              onChange={(e) => {
                setPerfil((p) => ({ ...p, cargo: e.target.value }))
                setMsgPerfil(null)
              }}
            />
          </Campo>
          <Campo label="Correo" htmlFor="cfg-correo">
            <Input id="cfg-correo" value={usuario?.correo ?? ''} disabled />
          </Campo>
          <Campo label="Rol" htmlFor="cfg-rol">
            <Input id="cfg-rol" value={ETIQUETAS_ROL[usuario?.rol] ?? usuario?.rol ?? ''} disabled />
          </Campo>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Button type="submit">Guardar datos</Button>
            <Mensaje m={msgPerfil} />
          </div>
        </form>
      </Card>

      <Card titulo="Cambiar mi clave" descripcion={`Mínimo ${LARGO_MINIMO_CLAVE} caracteres.`}>
        <form onSubmit={guardarClave} noValidate className="grid gap-4 sm:grid-cols-3">
          {[
            ['actual', 'Clave actual', 'current-password'],
            ['nueva', 'Clave nueva', 'new-password'],
            ['repetir', 'Repetir clave nueva', 'new-password'],
          ].map(([campo, label, auto]) => (
            <Campo key={campo} label={label} htmlFor={`cfg-clave-${campo}`}>
              <Input
                id={`cfg-clave-${campo}`}
                type="password"
                autoComplete={auto}
                value={claves[campo]}
                onChange={(e) => {
                  setClaves((c) => ({ ...c, [campo]: e.target.value }))
                  setMsgClave(null)
                }}
              />
            </Campo>
          ))}
          <div className="flex items-center gap-3 sm:col-span-3">
            <Button type="submit">Cambiar clave</Button>
            <Mensaje m={msgClave} />
          </div>
        </form>
      </Card>
    </div>
  )
}

// --------------------------------------------------------------- Apariencia
// Vista previa fija e INDEPENDIENTE del tema activo: usa hexadecimales
// explícitos, porque el tema oscuro redefine las utilidades claras y la vista
// previa del tema claro se vería oscura estando en oscuro.
function VistaPrevia({ tema }) {
  const claro = tema === 'claro'
  const fondo = claro ? 'bg-[#e2e8f0]' : 'bg-[#0c0f14]'
  const superficie = claro ? 'bg-[#ffffff]' : 'bg-[#151a21]'
  const borde = claro ? 'border-[#cbd5e1]' : 'border-[#262d38]'
  const activo = claro ? 'bg-[#1e40af]' : 'bg-[#8fb3e6]'
  const linea = claro ? 'bg-[#cbd5e1]' : 'bg-[#343d4b]'
  const lineaSuave = claro ? 'bg-[#f1f5f9]' : 'bg-[#1b2129]'
  return (
    <div className={`flex h-20 overflow-hidden rounded-lg border ${borde} ${fondo}`}>
      <div className={`flex w-10 shrink-0 flex-col items-center gap-1.5 border-r py-2 ${superficie} ${borde}`}>
        <span className={`size-3 rounded ${activo}`} />
        <span className={`h-1.5 w-5 rounded-full ${linea}`} />
        <span className={`h-1.5 w-5 rounded-full ${linea}`} />
        <span className={`h-1.5 w-5 rounded-full ${linea}`} />
      </div>
      <div className="flex-1 space-y-1.5 p-2">
        <div className={`h-2 w-12 rounded ${linea}`} />
        <div className={`h-8 rounded ${superficie}`} />
        <div className={`h-2 w-16 rounded ${lineaSuave}`} />
      </div>
    </div>
  )
}

const TEMAS = [
  { id: 'claro', nombre: 'Claro', descripcion: 'Fondos claros, ideal para oficina con buena luz.' },
  { id: 'oscuro', nombre: 'Oscuro', descripcion: 'Grafito sobrio, cómodo para sesiones largas.' },
]

function Apariencia() {
  const { tema, cambiarTema } = useTema()
  return (
    <Card titulo="Tema" descripcion="Se aplica al instante y se guarda solo en este navegador.">
      <div className="grid gap-3 sm:grid-cols-2">
        {TEMAS.map((opcion) => {
          const activo = tema === opcion.id
          return (
            <button
              key={opcion.id}
              type="button"
              onClick={() => cambiarTema(opcion.id)}
              aria-pressed={activo}
              className={`rounded-xl border p-3 text-left transition-colors ${
                activo ? 'border-primary-600 ring-2 ring-primary-600/30' : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              <VistaPrevia tema={opcion.id} />
              <p className="mt-2 text-sm font-semibold text-slate-900">{opcion.nombre}</p>
              <p className="text-xs text-slate-500">{opcion.descripcion}</p>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

// ------------------------------------------------------------------ Empresa
function Empresa() {
  const { estado, actualizarItem } = useData()
  const config = leerConfig(estado)
  const [nombre, setNombre] = useState(config.empresa ?? '')
  const [meta, setMeta] = useState(config.meta_ingreso ? String(config.meta_ingreso) : '')
  const [aviso, setAviso] = useState(null)

  const guardar = (e) => {
    e.preventDefault()
    const limpio = nombre.trim()
    if (!limpio) {
      setAviso({ tipo: 'error', mensaje: 'Escribe el nombre de la empresa.' })
      return
    }
    const valor = Number(meta)
    const metaLimpia = Number.isFinite(valor) && valor > 0 ? Math.round(valor * 100) / 100 : 0
    actualizarItem('config', { id: 1, empresa: limpio, meta_ingreso: metaLimpia })
    setAviso({ tipo: 'exito', mensaje: 'Datos de la empresa guardados.' })
  }

  return (
    <Card titulo="Empresa" descripcion="Datos generales que usan los reportes y el Dashboard. Viajan en el respaldo.">
      <form onSubmit={guardar} noValidate className="grid gap-4 sm:grid-cols-2">
        <Campo label="Nombre de la empresa" htmlFor="cfg-empresa" hint="Aparece en la cabecera de reportes y exportaciones.">
          <Input id="cfg-empresa" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Campo>
        <Campo label="Moneda" htmlFor="cfg-moneda" hint="El sistema trabaja en soles.">
          <Input id="cfg-moneda" value="PEN (S/)" disabled />
        </Campo>
        <Campo label="Meta de ingreso (S/)" htmlFor="cfg-meta" hint="Total a cobrar por la empresa; 0 = sin meta. También se edita en el Dashboard.">
          <InputMonto id="cfg-meta" placeholder="0.00" value={meta} onChange={setMeta} />
        </Campo>
        <div className="flex items-end">
          <Button type="submit">Guardar empresa</Button>
        </div>
      </form>
      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />
    </Card>
  )
}

// ------------------------------------------------------------- Configuración
export function Configuracion() {
  const { usuario, rol } = useAuth()
  const [params, setParams] = useSearchParams()
  const visibles = SECCIONES.filter((s) => seccionConfiguracionPermitida(rol, s.id))
  const pedida = params.get('seccion')
  const activa = visibles.some((s) => s.id === pedida) ? pedida : visibles[0]?.id
  const etiquetaRol = ETIQUETAS_ROL[rol] ?? rol

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Configuración</h1>
        <p className="mt-1 text-sm text-slate-500">
          {usuario?.nombre} · {cargoVisible(usuario, etiquetaRol)}
          {usuario?.cargo ? ` · ${etiquetaRol}` : ''}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <nav aria-label="Secciones de configuración" className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {visibles.map((s) => {
            const sel = s.id === activa
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setParams({ seccion: s.id }, { replace: true })}
                aria-current={sel ? 'page' : undefined}
                className={`shrink-0 rounded-lg border px-3 py-2 text-left transition-colors lg:w-full ${
                  sel
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="block text-sm font-semibold">{s.titulo}</span>
                <span className="hidden text-xs text-slate-500 lg:block">{s.detalle}</span>
              </button>
            )
          })}
        </nav>

        <div className="min-w-0">
          {activa === 'cuenta' && <MiCuenta />}
          {activa === 'apariencia' && <Apariencia />}
          {activa === 'usuarios' && <GestionUsuarios />}
          {activa === 'empresa' && <Empresa />}
          {activa === 'datos' && <DatosRespaldo />}
        </div>
      </div>
    </div>
  )
}
