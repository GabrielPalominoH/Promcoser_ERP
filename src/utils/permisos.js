// Roles y permisos (módulo puro). El sistema funciona en un solo navegador, así
// que esto es una barrera de uso —cada persona ve y edita lo que le toca— y no
// una seguridad fuerte: quien abra las herramientas del navegador puede
// saltársela. Una seguridad real exige backend.

export const ROLES = ['administrador', 'gerencia', 'residente', 'administracion']

export const ETIQUETAS_ROL = {
  administrador: 'Administrador',
  gerencia: 'Gerencia',
  residente: 'Residente de obra',
  administracion: 'Administración',
}

export const DESCRIPCION_ROL = {
  administrador: 'Acceso total: obras, finanzas, usuarios, respaldos y configuración.',
  gerencia: 'Solo lectura de todo el sistema (Dashboard, finanzas y obras). No modifica nada.',
  residente:
    'Opera la obra: cronograma, partidas, parte diario, personal asignado, equipos, materiales y gastos. No ve Ingresos, Dashboard ni Oficina.',
  administracion:
    'Finanzas y administración: ingresos, facturas, valorizaciones, gastos, oficina y fichas de personal y equipos. Lee el resto.',
}

const ESCRITURA = {
  administrador: '*',
  gerencia: [],
  residente: [
    'registros_servicio',
    'tareas',
    'asignaciones',
    'partes_diario',
    'lecturas_avance',
    'lineas_base',
  ],
  administracion: [
    'registros_servicio',
    'cobros',
    'facturas',
    'valorizaciones',
    'adelantos',
    'costos_oficina',
    'modificaciones',
    'ampliaciones_plazo',
    'personal',
    'equipos',
    'cargos',
  ],
}

// Acciones: 'agregar' | 'actualizar' | 'eliminar' | 'reemplazar' | 'restablecer'.
export function puedeEscribir(rol, coleccion, accion = 'actualizar') {
  if (accion === 'reemplazar' || accion === 'restablecer') return rol === 'administrador'
  const permitido = ESCRITURA[rol]
  if (!permitido) return false
  if (permitido === '*') return true
  if (permitido.includes(coleccion)) return true
  // El residente puede ajustar datos de la obra (p. ej. su calendario laboral),
  // pero no crear ni borrar obras.
  return rol === 'residente' && coleccion === 'servicios' && accion === 'actualizar'
}

// Rutas globales vedadas por rol.
const RUTAS_VEDADAS = {
  administrador: [],
  gerencia: ['/usuarios'],
  administracion: ['/usuarios'],
  residente: ['/', '/oficina', '/usuarios'],
}

export function rutaGlobalPermitida(rol, ruta) {
  const vedadas = RUTAS_VEDADAS[rol]
  if (!vedadas) return false
  return !vedadas.includes(ruta)
}

// Secciones del panel de una obra (ids de ruta) vedadas por rol.
const SECCIONES_VEDADAS = {
  administrador: [],
  gerencia: ['opciones'],
  administracion: ['opciones'],
  residente: ['ingresos', 'opciones'],
}

export function seccionServicioPermitida(rol, id) {
  const vedadas = SECCIONES_VEDADAS[rol]
  if (!vedadas) return false
  return !vedadas.includes(id)
}

// Pantalla de inicio de cada rol.
export function inicioDeRol(rol) {
  return rutaGlobalPermitida(rol, '/') ? '/' : '/servicios'
}

export function esAdministrador(rol) {
  return rol === 'administrador'
}
