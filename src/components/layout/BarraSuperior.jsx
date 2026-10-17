import { useAuth } from '../../context/useAuth'
import { esSoloLectura } from '../../utils/permisos'
import { AlertasCentro } from './AlertasCentro'

// Barra superior del área de contenido: campana de alertas y, para gerencia,
// la franja de solo lectura. El usuario y su cargo viven al pie del sidebar.
export function BarraSuperior() {
  const { rol } = useAuth()
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-end gap-3 border-b border-slate-300 bg-white/95 px-4 backdrop-blur sm:px-6 print:hidden">
      <p className="mr-auto hidden text-sm text-slate-500 capitalize sm:block">
        {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
      {esSoloLectura(rol) && (
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
          Modo solo lectura
        </span>
      )}
      <AlertasCentro />
    </header>
  )
}
