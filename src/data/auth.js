// Usuarios y sesión (todo en localStorage, sin backend).
//
// Segundo punto de acceso al almacenamiento, junto a `store.js`: aquí solo
// viven las credenciales y la sesión, NUNCA en el respaldo de datos de negocio.
// Las claves no se guardan en texto: se guarda una sal aleatoria y el resumen
// SHA-256 iterado (implementación propia y síncrona para que funcione también
// en páginas servidas por http en la red local, donde `crypto.subtle` no
// existe). Es una barrera de uso, no seguridad fuerte: ver `permisos.js`.

import { ROLES } from '../utils/permisos'

const CLAVE_USUARIOS = 'promcoser_usuarios_v1'
const CLAVE_SESION = 'promcoser_sesion'
const CLAVE_BLOQUEO = 'promcoser_login_bloqueo'

export const HORAS_SESION = 8
export const MAX_INTENTOS = 5
export const SEGUNDOS_BLOQUEO = 60
export const LARGO_MINIMO_CLAVE = 8
const RONDAS = 20000

// ---------- almacenamiento ----------
const memoria = {}
function backend() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return {
        get: (k) => window.localStorage.getItem(k),
        set: (k, v) => window.localStorage.setItem(k, v),
        del: (k) => window.localStorage.removeItem(k),
      }
    }
  } catch {
    // Almacenamiento bloqueado: se usa memoria.
  }
  return {
    get: (k) => (k in memoria ? memoria[k] : null),
    set: (k, v) => {
      memoria[k] = v
    },
    del: (k) => {
      delete memoria[k]
    },
  }
}

// ---------- SHA-256 (síncrono, sin dependencias) ----------
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
])

function sha256Bytes(bytes) {
  const largo = bytes.length
  const total = ((largo + 9 + 63) >> 6) << 6
  const m = new Uint8Array(total)
  m.set(bytes)
  m[largo] = 0x80
  const vista = new DataView(m.buffer)
  vista.setUint32(total - 8, Math.floor((largo * 8) / 0x100000000))
  vista.setUint32(total - 4, (largo * 8) >>> 0)
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ])
  const w = new Uint32Array(64)
  const rotr = (x, n) => (x >>> n) | (x << (32 - n))
  for (let o = 0; o < total; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = vista.getUint32(o + i * 4)
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3)
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10)
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0
    }
    let [a, b, c, d, e, f, g, hh] = h
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const t2 = (S0 + maj) >>> 0
      hh = g
      g = f
      f = e
      e = (d + t1) >>> 0
      d = c
      c = b
      b = a
      a = (t1 + t2) >>> 0
    }
    h[0] += a
    h[1] += b
    h[2] += c
    h[3] += d
    h[4] += e
    h[5] += f
    h[6] += g
    h[7] += hh
  }
  const salida = new Uint8Array(32)
  const vs = new DataView(salida.buffer)
  for (let i = 0; i < 8; i++) vs.setUint32(i * 4, h[i])
  return salida
}

const aHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')

export function sha256Hex(texto) {
  return aHex(sha256Bytes(new TextEncoder().encode(texto)))
}

export function hashClave(clave, salt) {
  let h = sha256Hex(`${salt}:${clave}`)
  for (let i = 0; i < RONDAS; i++) h = sha256Hex(`${h}:${salt}`)
  return h
}

export function nuevaSalt() {
  const bytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes)
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)
  return aHex(bytes)
}

// ---------- usuarios ----------
export const normalizarCorreo = (correo) => String(correo ?? '').trim().toLowerCase()

export function crearRegistroUsuario({ id, nombre, correo, rol, clave, cargo = '', activo = true }) {
  const salt = nuevaSalt()
  return {
    id,
    nombre: String(nombre ?? '').trim(),
    cargo: String(cargo ?? '').trim(),
    correo: normalizarCorreo(correo),
    rol: ROLES.includes(rol) ? rol : 'gerencia',
    activo,
    salt,
    hash: hashClave(clave, salt),
    creado: new Date().toISOString().slice(0, 10),
  }
}

// Administrador inicial. Se guarda solo el resumen de la clave (no el texto).
export const ADMIN_INICIAL = {
  id: 1,
  nombre: 'Gabriel Palomino',
  cargo: '',
  correo: 'gpalomino.promcoser@gmail.com',
  rol: 'administrador',
  activo: true,
  salt: '9c3f1d7a5b2e48c6a0d1f7e3b84c2a65',
  hash: '24d9c640ffc555156e98d2488eb62f97868cfeda6b0f577bcb043e096ddce71f',
  creado: '2026-10-17',
}

export function cargarUsuarios() {
  try {
    const raw = backend().get(CLAVE_USUARIOS)
    if (raw) {
      const lista = JSON.parse(raw)
      if (Array.isArray(lista) && lista.length > 0) return lista
    }
  } catch {
    // JSON dañado: se reinicia con el administrador inicial.
  }
  const inicial = [ADMIN_INICIAL]
  guardarUsuarios(inicial)
  return inicial
}

export function guardarUsuarios(lista) {
  try {
    backend().set(CLAVE_USUARIOS, JSON.stringify(lista))
    return true
  } catch {
    return false
  }
}

export function verificarClave(usuario, clave) {
  return Boolean(usuario) && usuario.hash === hashClave(String(clave ?? ''), usuario.salt)
}

export function validarClaveNueva(clave) {
  const texto = String(clave ?? '')
  if (texto.length < LARGO_MINIMO_CLAVE) {
    return `La clave debe tener al menos ${LARGO_MINIMO_CLAVE} caracteres.`
  }
  return null
}

export function adminsActivos(lista) {
  return lista.filter((u) => u.rol === 'administrador' && u.activo !== false)
}

// Lo que se muestra bajo el nombre: el cargo si existe, si no el rol.
export function cargoVisible(usuario, etiquetaRol) {
  const cargo = String(usuario?.cargo ?? '').trim()
  return cargo || etiquetaRol || ''
}

// ---------- sesión ----------
export function guardarSesion(usuarioId, ahora = Date.now()) {
  try {
    backend().set(
      CLAVE_SESION,
      JSON.stringify({ id: usuarioId, expira: ahora + HORAS_SESION * 3600 * 1000 }),
    )
  } catch {
    // Sin almacenamiento la sesión dura lo que dure la pestaña (estado del contexto).
  }
}

export function leerSesion(lista, ahora = Date.now()) {
  try {
    const raw = backend().get(CLAVE_SESION)
    if (!raw) return null
    const { id, expira } = JSON.parse(raw)
    if (!Number.isFinite(expira) || expira <= ahora) return null
    const usuario = lista.find((u) => u.id === id)
    return usuario && usuario.activo !== false ? usuario : null
  } catch {
    return null
  }
}

export function cerrarSesionGuardada() {
  try {
    backend().del(CLAVE_SESION)
  } catch {
    // Nada que limpiar.
  }
}

// ---------- bloqueo por intentos fallidos ----------
function leerBloqueo() {
  try {
    const raw = backend().get(CLAVE_BLOQUEO)
    return raw ? JSON.parse(raw) : { n: 0, hasta: 0 }
  } catch {
    return { n: 0, hasta: 0 }
  }
}

export function segundosDeBloqueo(ahora = Date.now()) {
  const { hasta } = leerBloqueo()
  return hasta > ahora ? Math.ceil((hasta - ahora) / 1000) : 0
}

export function registrarFallo(ahora = Date.now()) {
  const actual = leerBloqueo()
  const n = actual.hasta > 0 && actual.hasta <= ahora ? 1 : actual.n + 1
  const hasta = n >= MAX_INTENTOS ? ahora + SEGUNDOS_BLOQUEO * 1000 : 0
  try {
    backend().set(CLAVE_BLOQUEO, JSON.stringify({ n: hasta ? 0 : n, hasta }))
  } catch {
    // Sin almacenamiento no hay bloqueo persistente.
  }
}

export function limpiarFallos() {
  try {
    backend().del(CLAVE_BLOQUEO)
  } catch {
    // Nada que limpiar.
  }
}
