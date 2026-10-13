export function Card({ titulo, descripcion, acciones, children, className = '' }) {
  return (
    <section
      className={`rounded-xl border border-slate-300 bg-white shadow-sm ${className}`}
    >
      {(titulo || acciones) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            {titulo && (
              <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
            )}
            {descripcion && (
              <p className="mt-0.5 text-sm text-slate-500">{descripcion}</p>
            )}
          </div>
          {acciones && <div className="flex items-center gap-2">{acciones}</div>}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  )
}