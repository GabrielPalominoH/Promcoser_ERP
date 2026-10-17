import { useEffect, useState } from 'react'
import { Outlet, useMatch, useParams } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { SidebarServicio } from './SidebarServicio'
import { ConfiguracionModal } from './ConfiguracionModal'
import { BarraSuperior } from './BarraSuperior'
import { AvisosSistema } from './AvisosSistema'
import { PanelProveedor } from '../../pages/servicio/panel'
import { useData } from '../../context/useData'
import { useAuth } from '../../context/useAuth'

const CLAVE_SIDEBAR = 'promcoser_sidebar_colapsado'
// Preferencia VISUAL del usuario (no es un dato de negocio): se guarda en
// este navegador y solo decide si la interfaz se ve en claro u oscuro.
const CLAVE_TEMA = 'promcoser_tema'

// Breakpoint `md` de Tailwind (768px). Sin barra superior, el sidebar es la
// única guía de módulo: en móvil vive como riel de 64px (w-16) y su propio
// botón (BotonMenu) abre el cajón con las etiquetas.
const MQ_MOVIL = '(max-width: 767px)'

function leerColapsado() {
  try {
    return window.localStorage.getItem(CLAVE_SIDEBAR) === '1'
  } catch {
    return false
  }
}

function leerTema() {
  try {
    return window.localStorage.getItem(CLAVE_TEMA) === 'oscuro' ? 'oscuro' : 'claro'
  } catch {
    return 'claro'
  }
}

export function Layout() {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [colapsado, setColapsado] = useState(leerColapsado)
  const [tema, setTema] = useState(leerTema)
  const [configAbierta, setConfigAbierta] = useState(false)
  const coincideServicio = useMatch('/servicios/:servicioId/*')
  const { servicioId } = useParams()
  const { rol } = useAuth()
  const {
    estado: { servicios },
    falloGuardado,
  } = useData()

  const servicioEnPanel = coincideServicio
    ? (servicios.find((s) => String(s.id) === String(servicioId)) ?? null)
    : null

  const cerrarMenu = () => setMenuAbierto(false)

  // El tema se refleja en el elemento raíz: `src/index.css` redefine las
  // utilidades bajo `:root[data-tema='oscuro']`. En el servidor no existe
  // `document`, así que el HTML inicial sigue siendo claro.
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.setAttribute('data-tema', tema)
  }, [tema])

  // El cajón con etiquetas es cosa de móvil: si la ventana se ensancha
  // (≥ md) se cierra solo, para que el sidebar nunca quede en un estado
  // mixto (cajón abierto + ancho de escritorio).
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const mq = window.matchMedia(MQ_MOVIL)
    const alCambiar = () => {
      if (!mq.matches) setMenuAbierto(false)
    }
    mq.addEventListener('change', alCambiar)
    return () => mq.removeEventListener('change', alCambiar)
  }, [])

  const alternarColapsado = () => {
    setColapsado((valor) => {
      try {
        window.localStorage.setItem(CLAVE_SIDEBAR, valor ? '0' : '1')
      } catch {
        // Sin almacenamiento: solo cambia en memoria.
      }
      return !valor
    })
  }

  const cambiarTema = (nuevo) => {
    const temaValido = nuevo === 'oscuro' ? 'oscuro' : 'claro'
    setTema(temaValido)
    try {
      window.localStorage.setItem(CLAVE_TEMA, temaValido)
    } catch {
      // Sin almacenamiento: el tema solo dura en esta sesión.
    }
  }

  // Un solo control, y vive dentro del sidebar: en móvil alterna el cajón
  // con las etiquetas; en escritorio colapsa/expandir el ancho.
  const alternarMenu = () => {
    const enMovil = typeof window !== 'undefined' && window.matchMedia(MQ_MOVIL).matches
    if (enMovil) setMenuAbierto((valor) => !valor)
    else alternarColapsado()
  }

  // Sin header: el contenido se corre a la derecha del riel (64px) en móvil
  // y del sidebar expandido/colapsado en escritorio.
  const desplazamiento = `pl-16 ${colapsado ? 'md:pl-20' : 'md:pl-64'}`

  return (
    <div className="min-h-screen bg-slate-200">
      {rol === 'administrador' && <AvisosSistema />}
      {falloGuardado && (
        <p role="alert" className="bg-red-600 px-4 py-2 text-center text-sm font-medium text-white">
          No se pudo guardar en este navegador (almacenamiento lleno o bloqueado). Exporta un
          respaldo desde el Dashboard para no perder tu información.
        </p>
      )}
      {servicioEnPanel ? (
        <PanelProveedor servicio={servicioEnPanel}>
          <SidebarServicio
            abierto={menuAbierto}
            onCerrar={cerrarMenu}
            onAlternar={alternarMenu}
            colapsado={colapsado}
            onAbrirConfiguracion={() => setConfigAbierta(true)}
          />

          <div className={desplazamiento}>
            <BarraSuperior onAbrirConfiguracion={() => setConfigAbierta(true)} />
            <main className="mx-auto max-w-none p-4 sm:p-6">
              <Outlet />
            </main>
          </div>
        </PanelProveedor>
      ) : (
        <>
          <Sidebar
            abierto={menuAbierto}
            onCerrar={cerrarMenu}
            onAlternar={alternarMenu}
            colapsado={colapsado}
            onAbrirConfiguracion={() => setConfigAbierta(true)}
          />

          <div className={desplazamiento}>
            <BarraSuperior onAbrirConfiguracion={() => setConfigAbierta(true)} />
            <main className="mx-auto max-w-none p-4 sm:p-6">
              <Outlet />
            </main>
          </div>
        </>
      )}

      <ConfiguracionModal
        abierto={configAbierta}
        onCerrar={() => setConfigAbierta(false)}
        tema={tema}
        onCambiarTema={cambiarTema}
      />
    </div>
  )
}
