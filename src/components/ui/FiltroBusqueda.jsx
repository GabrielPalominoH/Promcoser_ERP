import { Input, Select } from './Field'
import { normalizar } from './ComboBox'

// Piezas reutilizables para filtrar listas (registros, tareas, resúmenes).
// Mismo lenguaje visual que el buscador de los catálogos
// (Servicios, Personal, Equipos) para que todas las listas se vean igual.

// ¿El texto contiene el término? Compara sin mayúsculas ni tildes
// ("valorizacion" encuentra "Valorización"). El término debe venir ya
// normalizado (ver `normalizar` en ComboBox). Texto vacío = coincide.
export function textoCoincide(texto, terminoNormalizado) {
  if (!terminoNormalizado) return true
  return normalizar(texto).includes(terminoNormalizado)
}

// Caja de búsqueda con lupa. `onChange` recibe el texto directo.
export function Buscador({
  valor,
  onChange,
  placeholder = 'Buscar…',
  ariaLabel,
  className = '',
  ...props
}) {
  return (
    <div className={`relative w-full max-w-sm ${className}`}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      >
        <path d="m21 21-4.3-4.3M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
      </svg>
      <Input
        type="search"
        value={valor}
        onChange={(evento) => onChange(evento.target.value)}
        placeholder={placeholder}
        className="pl-9"
        aria-label={ariaLabel ?? placeholder}
        {...props}
      />
    </div>
  )
}

// Fila de filtros: buscador/selectores a la izquierda, contador a la derecha.
export function BarraFiltros({ children, contador, className = '' }) {
  return (
    <div className={`mb-4 flex flex-wrap items-center justify-between gap-3 ${className}`}>
      <div className="flex flex-1 flex-wrap items-center gap-2">{children}</div>
      {contador != null && <p className="text-sm text-slate-500">{contador}</p>}
    </div>
  )
}

// Select compacto para filtros: ancho según contenido, no ocupa todo el ancho.
export function SelectFiltro({ label, value, onChange, children, className = '' }) {
  return (
    <Select
      aria-label={label}
      value={value}
      onChange={(evento) => onChange(evento.target.value)}
      className={`w-auto ${className}`}
    >
      {children}
    </Select>
  )
}
