const variantes = {
  primario: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800',
  secundario:
    'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 active:bg-slate-100',
  peligro:
    'bg-white text-red-600 border border-red-300 hover:bg-red-50 active:bg-red-100',
  fantasma: 'text-slate-600 hover:bg-slate-100 active:bg-slate-200',
}

const tamanos = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3.5 py-2 text-sm',
}

export function Button({
  variante = 'primario',
  tamano = 'md',
  type = 'button',
  className = '',
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variantes[variante]} ${tamanos[tamano]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}