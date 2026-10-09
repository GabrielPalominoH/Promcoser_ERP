import { useEffect, useId, useRef, useState } from 'react'
import { Controller } from 'react-hook-form'

// Quita mayúsculas y tildes para comparar ("Cimentación" = "cimentacion").
export function normalizar(texto) {
  return (texto ?? '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

// Filtra [{ valor, etiqueta }] por lo que escribe el usuario. Pura (testeable).
export function filtrarOpciones(opciones, termino) {
  const texto = normalizar(termino).trim()
  if (!texto) return opciones
  return opciones.filter((opcion) => normalizar(opcion.etiqueta).includes(texto))
}

const clasesCaja =
  'w-full rounded-lg border bg-white text-sm text-slate-800 transition-colors placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500'
const cajaOk = 'border-slate-300 hover:border-slate-400 focus-within:border-primary-600'
const cajaError = 'border-red-400 hover:border-red-500 focus-within:border-red-600'

// Selector con búsqueda: parece un campo de texto, pero solo acepta
// opciones de la lista (no texto libre).
export function ComboBox({
  id,
  opciones,
  value,
  onChange,
  placeholder = 'Escribe para buscar…',
  error,
  disabled = false,
}) {
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [resaltado, setResaltado] = useState(0)
  const cajaRef = useRef(null)
  const listaId = useId()

  const seleccionada = opciones.find((o) => String(o.valor) === String(value ?? ''))
  const filtradas = filtrarOpciones(opciones, texto)

  // Sincroniza el texto cuando el valor cambia desde fuera (reset, edición).
  // Mientras el usuario escribe, el valor no cambia, así que no se pisa.
  useEffect(() => {
    setTexto(seleccionada ? seleccionada.etiqueta : '')
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clic fuera: cierra y revierte a la opción elegida (o vacío).
  useEffect(() => {
    if (!abierto) return
    const cerrar = (evento) => {
      if (cajaRef.current && !cajaRef.current.contains(evento.target)) {
        setAbierto(false)
        setTexto(seleccionada ? seleccionada.etiqueta : '')
      }
    }
    document.addEventListener('pointerdown', cerrar)
    return () => document.removeEventListener('pointerdown', cerrar)
  }, [abierto, seleccionada])

  const elegir = (opcion) => {
    if (!opcion) return
    onChange?.(opcion.valor)
    setTexto(opcion.etiqueta)
    setAbierto(false)
    setResaltado(0)
  }

  const limpiar = () => {
    onChange?.('')
    setTexto('')
    setAbierto(false)
    setResaltado(0)
  }

  const manejarTecla = (evento) => {
    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault()
      if (!abierto) {
        setAbierto(true)
        setResaltado(0)
        return
      }
      if (filtradas.length === 0) return
      const paso = evento.key === 'ArrowDown' ? 1 : -1
      setResaltado((i) => (i + paso + filtradas.length) % filtradas.length)
    } else if (evento.key === 'Enter') {
      if (abierto && filtradas[resaltado]) {
        evento.preventDefault()
        elegir(filtradas[resaltado])
      }
    } else if (evento.key === 'Escape') {
      setAbierto(false)
      setTexto(seleccionada ? seleccionada.etiqueta : '')
    }
  }

  return (
    <div ref={cajaRef} className="relative">
      <div className={`${clasesCaja} flex items-center gap-1 py-2 pr-2 pl-3 ${error ? cajaError : cajaOk}`}>
        <input
          id={id}
          role="combobox"
          aria-expanded={abierto}
          aria-controls={listaId}
          aria-autocomplete="list"
          aria-invalid={error ? 'true' : undefined}
          autoComplete="off"
          disabled={disabled}
          className="w-full min-w-0 bg-transparent outline-none disabled:text-slate-500"
          placeholder={placeholder}
          value={texto}
          onChange={(evento) => {
            setTexto(evento.target.value)
            setAbierto(true)
            setResaltado(0)
          }}
          onFocus={() => setAbierto(true)}
          onKeyDown={manejarTecla}
        />
        {String(value ?? '') !== '' && !disabled && (
          <button
            type="button"
            onClick={limpiar}
            title="Limpiar"
            aria-label="Limpiar selección"
            className="shrink-0 rounded-full px-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            ×
          </button>
        )}
      </div>

      {abierto && !disabled && (
        <ul
          id={listaId}
          role="listbox"
          className="absolute right-0 left-0 z-30 mt-1 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {filtradas.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">Sin resultados</li>
          ) : (
            filtradas.map((opcion, i) => {
              const activa = String(opcion.valor) === String(value ?? '')
              return (
                <li
                  key={String(opcion.valor)}
                  role="option"
                  aria-selected={activa}
                  onMouseDown={(evento) => {
                    // Antes del blur: el clic fuera revertiría el texto.
                    evento.preventDefault()
                    elegir(opcion)
                  }}
                  onMouseEnter={() => setResaltado(i)}
                  className={`cursor-pointer px-3 py-2 text-sm ${
                    i === resaltado ? 'bg-primary-50 text-primary-800' : 'text-slate-700'
                  } ${activa ? 'font-semibold' : ''}`}
                >
                  {opcion.etiqueta}
                </li>
              )
            })
          )}
        </ul>
      )}
    </div>
  )
}

// Adaptador para react-hook-form: reemplaza `{...register('campo')}` por
// `<CampoComboBox control={control} name="campo" rules={...} opciones={...} />`.
export function CampoComboBox({ control, name, rules, ...props }) {
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field, fieldState }) => (
        <ComboBox
          {...props}
          value={field.value ?? ''}
          onChange={field.onChange}
          error={props.error ?? fieldState.error?.message}
        />
      )}
    />
  )
}
