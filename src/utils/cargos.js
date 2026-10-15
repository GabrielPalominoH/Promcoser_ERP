// Catálogo de cargos (/cargos): utilidades puras.
//
// El vínculo cargo ↔ personal es por NOMBRE: cada ficha de `personal.cargo`
// apunta al cargo del catálogo cuyo nombre coincide (comparando sin tildes,
// sin distinguir mayúsculas y sin espacios sobrantes). No hay `cargo_id`:
// así los datos guardados antes de este módulo siguen siendo válidos.
//
// Al renombrar un cargo, `CATALOGO_CARGOS.alActualizar` arrastra el nuevo
// nombre a las fichas de personal vinculadas, de modo que el vínculo nunca
// queda huérfano.

// Clave de comparación: minúsculas, sin tildes y con espacios simples.
export function normalizarNombreCargo(texto) {
  return (texto ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

// ¿Dos textos de cargo son el mismo? (vacío nunca coincide)
export function mismoCargo(a, b) {
  const clave = normalizarNombreCargo(a)
  return clave !== '' && clave === normalizarNombreCargo(b)
}

// Fichas de personal vinculadas a un cargo (por nombre).
export function personasConCargo(personal, nombreCargo) {
  return (personal ?? []).filter((persona) => mismoCargo(persona.cargo, nombreCargo))
}

// ¿Se puede borrar el cargo? Solo si no hay personal vinculado.
// Devuelve { ok, total, motivo } con el motivo listo para mostrar.
export function puedeEliminarCargo(personal, nombreCargo) {
  const total = personasConCargo(personal, nombreCargo).length
  if (total > 0) {
    return {
      ok: false,
      total,
      motivo:
        `No se puede eliminar «${nombreCargo}»: ${total} ` +
        `${total === 1 ? 'persona está ligada' : 'personas están ligadas'} a este cargo. ` +
        'Reasigna o elimina esas fichas de personal primero.',
    }
  }
  return { ok: true, total: 0, motivo: null }
}

// Opciones para el selector de cargo del módulo Personal
// ([{ valor, etiqueta }], el formato que espera CampoComboBox).
//
// Solo se ofrecen los cargos ACTIVOS: un cargo desactivado no se puede elegir
// para fichas nuevas ni al editar. Excepción: si la ficha ya tiene un cargo que
// no está entre los activos (desactivado o fuera del catálogo), se agrega al
// inicio para no perder el valor guardado al abrir la edición.
export function opcionesCargo(cargos, valorActual) {
  const activos = (cargos ?? []).filter((cargo) => cargo.activo !== false)
  const opciones = activos.map((cargo) => ({
    valor: cargo.nombre,
    etiqueta:
      cargo.unidad && cargo.unidad !== 'HH'
        ? `${cargo.nombre} · ${cargo.unidad}`
        : cargo.nombre,
  }))

  if (valorActual && !activos.some((cargo) => cargo.nombre === valorActual)) {
    opciones.unshift({
      valor: valorActual,
      etiqueta: `${valorActual} (no activo o fuera del catálogo)`,
    })
  }

  return opciones
}
