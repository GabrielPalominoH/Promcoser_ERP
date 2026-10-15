// Personal (/personal): utilidades puras.
//
// `activo` es el estado que se alterna desde la columna Estado del módulo
// Personal (ojo / ojo tachado). Se trata como ACTIVO salvo que sea
// explícitamente `false`, de modo que las fichas guardadas antes de este
// cambio (sin el campo) sigan contando como activas sin migración.
//
// Un personal desactivado no desaparece de las listas ni de los cálculos
// (sus asignaciones y costos ya registrados son reales): solo deja de
// ofrecerse para NUEVAS asignaciones (ver `src/pages/servicio/PersonalServicio.jsx`
// y el costo de oficina en `src/pages/Oficina.jsx`). Por la misma lógica,
// `puedeEliminarPersonal` impide borrar una ficha que ya está ligada: la
// alternativa es desactivarla.

// ¿La ficha está activa? (sin el campo = activa; solo `false` desactiva)
export function esPersonalActivo(persona) {
  return (persona?.activo ?? true) !== false
}

// Personal que puede ofrecerse en selectores de NUEVAS asignaciones.
// Se puede acotar por ámbito ('Obra' | 'Oficina'); sin ámbito, devuelve todo.
export function personalAsignable(personal, ambito) {
  return (personal ?? []).filter(
    (persona) =>
      esPersonalActivo(persona) &&
      (ambito === undefined || (persona.ambito ?? 'Obra') === ambito),
  )
}

// "Nombre Apellido" en una línea (para etiquetas y mensajes).
export function nombreCompleto(persona) {
  return `${persona?.nombre ?? ''} ${persona?.apellido ?? ''}`.trim()
}

function contar(n, singular, pluralTexto) {
  return `${n} ${n === 1 ? singular : pluralTexto}`
}

// ¿Se puede eliminar la ficha de personal? Solo si NO está ligada a nada:
//   • asignaciones en obra (vigentes o de baja),
//   • registros de costo de personal (el libro de costos de un servicio),
//   • costos de oficina.
// Borrarla dejaría huérfanos esos costos, y el reducer no encadena nada para
// `personal` (a diferencia de servicios, tareas y asignaciones). Si la ficha ya
// se usó, la vía correcta es dar de baja o desactivar, no eliminar.
// Devuelve { ok, motivo } con el motivo listo para mostrar (y `total` de ligas).
export function puedeEliminarPersonal(estado, persona) {
  const id = persona?.id

  const asignaciones = (estado?.asignaciones ?? []).filter(
    (asignacion) => asignacion.personal_id === id,
  )
  const registros = (estado?.registros_servicio ?? []).filter(
    (registro) => registro.tipo_registro === 'personal' && registro.referencia_id === id,
  )
  const oficina = (estado?.costos_oficina ?? []).filter(
    (costo) => costo.personal_id === id,
  )

  const partes = []
  if (asignaciones.length > 0)
    partes.push(contar(asignaciones.length, 'asignación en obra', 'asignaciones en obras'))
  if (registros.length > 0)
    partes.push(contar(registros.length, 'registro de costo', 'registros de costo'))
  if (oficina.length > 0)
    partes.push(contar(oficina.length, 'costo de oficina', 'costos de oficina'))

  const total = asignaciones.length + registros.length + oficina.length

  if (partes.length === 0) {
    return { ok: true, motivo: null, total: 0 }
  }

  return {
    ok: false,
    total,
    motivo:
      `No se puede eliminar «${nombreCompleto(persona)}»: su ficha está ligada a ` +
      `${partes.join(', ')}. Para dejar de usarla, dale de baja o desactívala ` +
      '(ícono de ojo): lo ya registrado se conserva.',
  }
}
