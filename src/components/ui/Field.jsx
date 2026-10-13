const base = 'w-full rounded-lg border bg-white text-sm text-slate-800 transition-colors placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500'
const clasesOk = 'border-slate-300 hover:border-slate-400 focus:border-primary-600'
const clasesError = 'border-red-400 hover:border-red-500 focus:border-red-600'

function clasesCampo(error) {
  return `${base} ${error ? clasesError : clasesOk}`
}

export function Campo({ label, error, hint, htmlFor, children, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  )
}

export function Input({ error, className = '', type, onWheel, ...props }) {
  const manejarRueda = (evento) => {
    // Evita que la rueda del mouse aumente/disminuya los campos numéricos.
    // Al quitar el foco, la rueda vuelve a hacer scroll de la página.
    if ((type ?? props.type) === 'number') {
      evento.currentTarget.blur()
    }
    onWheel?.(evento)
  }

  return (
    <input
      type={type}
      className={`${clasesCampo(error)} px-3 py-2 ${className}`}
      aria-invalid={error ? 'true' : undefined}
      onWheel={manejarRueda}
      {...props}
    />
  )
}

export function Select({ error, className = '', children, ...props }) {
  return (
    <select
      className={`${clasesCampo(error)} cursor-pointer appearance-none px-3 py-2 pr-9 ${className}`}
      style={{
        backgroundImage:
          'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2394a3b8\' stroke-width=\'2.2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 0.6rem center',
        backgroundSize: '1rem',
      }}
      aria-invalid={error ? 'true' : undefined}
      {...props}
    >
      {children}
    </select>
  )
}

export function Textarea({ error, className = '', ...props }) {
  return (
    <textarea
      className={`${clasesCampo(error)} px-3 py-2 ${className}`}
      aria-invalid={error ? 'true' : undefined}
      {...props}
    />
  )
}