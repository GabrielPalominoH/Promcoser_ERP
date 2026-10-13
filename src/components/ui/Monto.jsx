import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Controller } from 'react-hook-form'
import {
  formatearEntradaMonto,
  normalizarEntradaMonto,
  parsearEntradaMonto,
} from '../../utils/formatters'

// En SSR useLayoutEffect avisa; cae a useEffect en el servidor.
const usarLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

// Reglas para un monto con Controller (sin `valueAsNumber`): el campo vacío
// llega como '' y un valor válido como número.
export function reglasMontoMayorACero(mensajeRequerido) {
  return {
    required: mensajeRequerido,
    validate: (valor) => (Number(valor) > 0 ? true : 'Debe ser un número mayor que cero'),
  }
}

// Campo de monto con separador de miles mientras se escribe (igual que
// formatearMoneda). Recibe un número (o '' si está vacío) y emite otro número
// (o ''); usalo directo con estado local, o `CampoMonto` con react-hook-form.
export function InputMonto({
  id,
  value,
  onChange,
  error,
  placeholder,
  disabled = false,
  autoFocus = false,
  onKeyDown,
  onBlur,
  inputRef: refExterno,
  className = '',
}) {
  const [texto, setTexto] = useState(() => formatearEntradaMonto(value))
  const inputRef = useRef(null)
  const caretRef = useRef(null)
  const enfocadoRef = useRef(false)

  // Combina el ref interno (caret) con el de react-hook-form (foco al error).
  const asignarRef = useCallback(
    (nodo) => {
      inputRef.current = nodo
      if (typeof refExterno === 'function') refExterno(nodo)
      else if (refExterno) refExterno.current = nodo
    },
    [refExterno],
  )

  // Sincroniza cuando el valor cambia desde fuera (reset, edición, sugerencia),
  // salvo mientras el usuario escribe: ahí manda su propio texto.
  useEffect(() => {
    if (enfocadoRef.current) return
    setTexto(formatearEntradaMonto(value))
  }, [value])

  // Reposiciona el cursor tras reformatear (no salta al final al editar en medio).
  usarLayoutEffect(() => {
    if (caretRef.current == null || !inputRef.current) return
    inputRef.current.setSelectionRange(caretRef.current, caretRef.current)
    caretRef.current = null
  }, [texto])

  const manejarCambio = (evento) => {
    const crudo = evento.target.value
    const seleccion = evento.target.selectionStart ?? crudo.length
    const digitosAntes = crudo.slice(0, seleccion).replace(/\D/g, '').length
    const canonico = normalizarEntradaMonto(crudo)
    const mostrado = formatearEntradaMonto(canonico)

    let posicion = 0
    let vistos = 0
    while (posicion < mostrado.length && vistos < digitosAntes) {
      if (/\d/.test(mostrado[posicion])) vistos += 1
      posicion += 1
    }
    caretRef.current = posicion

    setTexto(mostrado)
    onChange?.(parsearEntradaMonto(canonico))
  }

  const base =
    'w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-800 tabular-nums transition-colors placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500'
  const borde = error
    ? 'border-red-400 hover:border-red-500 focus:border-red-600'
    : 'border-slate-300 hover:border-slate-400 focus:border-primary-600'

  return (
    <input
      ref={asignarRef}
      id={id}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      className={`${base} ${borde} ${className}`}
      placeholder={placeholder}
      disabled={disabled}
      autoFocus={autoFocus}
      value={texto}
      onKeyDown={onKeyDown}
      onFocus={() => {
        enfocadoRef.current = true
      }}
      onBlur={(evento) => {
        enfocadoRef.current = false
        onBlur?.(evento)
      }}
      onChange={manejarCambio}
      aria-invalid={error ? 'true' : undefined}
    />
  )
}

// Adaptador para react-hook-form: reemplaza `{...register('monto', ...)}` por
// `<CampoMonto control={control} name="monto" rules={...} />`.
export function CampoMonto({ control, name, rules, ...props }) {
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field, fieldState }) => (
        <InputMonto
          {...props}
          value={field.value ?? ''}
          onChange={field.onChange}
          onBlur={field.onBlur}
          inputRef={field.ref}
          error={props.error ?? fieldState.error?.message}
        />
      )}
    />
  )
}
