export function Table({ children, className = '' }) {
  return (
    <div className={`overflow-x-auto rounded-lg border border-slate-300 ${className}`}>
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  )
}

export function TableHead({ children }) {
  return (
    <thead className="bg-slate-50">
      {children}
    </thead>
  )
}

export function TableBody({ children }) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>
}

export function TableRow({ children, className = '' }) {
  return (
    <tr className={`transition-colors hover:bg-slate-50 ${className}`}>{children}</tr>
  )
}

export function Th({ children, className = '', alinear = 'left', colSpan }) {
  const alineacion =
    alinear === 'right' ? 'text-right' : alinear === 'center' ? 'text-center' : 'text-left'
  return (
    <th
      scope="col"
      colSpan={colSpan}
      className={`px-4 py-3 text-xs font-semibold tracking-wide text-slate-500 uppercase ${alineacion} ${className}`}
    >
      {children}
    </th>
  )
}

export function Td({ children, className = '', alinear = 'left', colSpan }) {
  const alineacion =
    alinear === 'right' ? 'text-right' : alinear === 'center' ? 'text-center' : 'text-left'
  return (
    <td
      colSpan={colSpan}
      className={`px-4 py-3 align-middle text-slate-700 ${alineacion} ${className}`}
    >
      {children}
    </td>
  )
}

export function TableEmpty({ colSpan = 1, mensaje = 'Sin registros todavía.' }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-4 py-10 text-center text-sm text-slate-400"
      >
        {mensaje}
      </td>
    </tr>
  )
}