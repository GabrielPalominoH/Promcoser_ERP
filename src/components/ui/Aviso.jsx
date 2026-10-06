import { useEffect } from 'react'

const ESTILOS = {
  exito: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-primary-200 bg-primary-50 text-primary-800',
}

const ICONOS = {
  exito: 'M5 13l4 4L19 7',
  error: 'M6 6l12 12M18 6 6 18',
  info: 'M12 8h.01M11 12h1v5h1',
}

export function Aviso({ aviso, onCerrar, duracion = 3500 }) {
  useEffect(() => {
    if (!aviso) return undefined

    const temporizador = setTimeout(onCerrar, duracion)
    return () => clearTimeout(temporizador)
  }, [aviso, onCerrar, duracion])

  if (!aviso) return null

  const estilo = ESTILOS[aviso.tipo] ?? ESTILOS.info

  return (
    <div
      role="status"
      className={`fixed right-4 bottom-4 z-60 flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${estilo}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-0.5 size-5 shrink-0"
        aria-hidden="true"
      >
        <path d={ICONOS[aviso.tipo] ?? ICONOS.info} />
      </svg>
      <p className="text-sm font-medium">{aviso.mensaje}</p>
    </div>
  )
}