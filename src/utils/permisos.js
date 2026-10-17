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
    'Opera la obra: cronograma, partidas, parte diario, personal asignado, equipos, materiales y gastos. No edita los datos de la obra ni ve Ingresos, Dashboard ni Oficina.',
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
  return permitido.includes(coleccion)
}

// Rol que no modifica nada: la interfaz lo avisa con una franja de solo lectura.
export function esSoloLectura(rol) {
  return rol === 'gerencia'
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

// Secciones del módulo Configuración. Mi cuenta y Apariencia son de todos; el
// resto (usuarios, empresa, datos y respaldo) solo del administrador.
export const SECCIONES_CONFIGURACION = ['cuenta', 'apariencia', 'usuarios', 'empresa', 'datos']

export function seccionConfiguracionPermitida(rol, id) {
  if (!ROLES.includes(rol) || !SECCIONES_CONFIGURACION.includes(id)) return false
  return rol === 'administrador' || id === 'cuenta' || id === 'apariencia'
}

export function esAdministrador(rol) {
  return rol === 'administrador'
}
