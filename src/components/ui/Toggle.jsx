export function Toggle({ etiqueta, descripcion, ...props }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-300 bg-slate-50 px-3 py-3 transition-colors hover:bg-slate-100">
      <input
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 rounded border-slate-300 text-primary-600"
        {...props}
      />
      <span>
        <span className="block text-sm font-medium text-slate-700">{etiqueta}</span>
        {descripcion && (
          <span className="mt-0.5 block text-xs text-slate-500">{descripcion}</span>
        )}
      </span>
    </label>
  )
}