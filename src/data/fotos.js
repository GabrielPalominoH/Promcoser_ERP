// Fotos de avance del parte diario (Fase 2).
//
// Los BINARIOS de las fotos NO van a localStorage: viven en IndexedDB, para no
// inflar el respaldo JSON ni arriesgar la cuota (~5 MB) donde se guarda TODO el
// ERP. En `localStorage` solo queda la metadata del parte (`id`, `nombre`,
// `mime`, `tamano`), y el binario se busca aquí por `id`.
//
// Este módulo es el único punto de acceso a IndexedDB, igual que `store.js` lo
// es para localStorage. Es tolerante a fallos: si IndexedDB no está disponible
// (SSR, modo privado), las funciones devuelven null/false en vez de romper.

const DB_NOMBRE = 'promcoser_fotos'
const DB_VERSION = 1
const ALMACEN = 'fotos'

// 1600 px de lado máximo y JPEG calidad 0.7: buen equilibrio peso/calidad para
// fotos de obra (una foto típica queda en 100–300 KB).
export const MAX_LADO_FOTO = 1600
export const CALIDAD_FOTO = 0.7

export function disponible() {
  return typeof indexedDB !== 'undefined' && indexedDB != null
}

let promesaDb = null

function abrirDb() {
  if (!disponible()) return Promise.resolve(null)
  if (promesaDb) return promesaDb
  promesaDb = new Promise((resolve) => {
    try {
      const solicitud = indexedDB.open(DB_NOMBRE, DB_VERSION)
      solicitud.onupgradeneeded = () => {
        const db = solicitud.result
        if (!db.objectStoreNames.contains(ALMACEN)) {
          db.createObjectStore(ALMACEN)
        }
      }
      solicitud.onsuccess = () => resolve(solicitud.result)
      solicitud.onerror = () => resolve(null)
      solicitud.onblocked = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
  return promesaDb
}

function conAlmacen(modo, fn) {
  return abrirDb().then((db) => {
    if (!db) return null
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(ALMACEN, modo)
        const almacen = tx.objectStore(ALMACEN)
        const solicitud = fn(almacen)
        tx.oncomplete = () => resolve(solicitud?.result ?? true)
        tx.onerror = () => resolve(null)
        tx.onabort = () => resolve(null)
      } catch {
        resolve(null)
      }
    })
  })
}

export function guardarFoto(id, blob) {
  if (!id || !blob) return Promise.resolve(false)
  return conAlmacen('readwrite', (a) => a.put(blob, String(id))).then((r) => r != null)
}

export function leerFoto(id) {
  if (!id) return Promise.resolve(null)
  return conAlmacen('readonly', (a) => a.get(String(id))).then((r) => r ?? null)
}

export function borrarFoto(id) {
  if (!id) return Promise.resolve(false)
  return conAlmacen('readwrite', (a) => a.delete(String(id))).then((r) => r != null)
}

export function borrarFotos(ids = []) {
  return Promise.all((ids ?? []).filter(Boolean).map((id) => borrarFoto(id))).then(() => true)
}

// Dimensiones escaladas para que el lado mayor no pase de `maxLado`,
// conservando la proporción (puro: se prueba sin navegador).
export function escalarDimensiones(ancho, alto, maxLado = MAX_LADO_FOTO) {
  const w = Number(ancho) || 0
  const h = Number(alto) || 0
  if (w <= 0 || h <= 0) return { ancho: 0, alto: 0 }
  const mayor = Math.max(w, h)
  if (mayor <= maxLado) return { ancho: Math.round(w), alto: Math.round(h) }
  const factor = maxLado / mayor
  return { ancho: Math.round(w * factor), alto: Math.round(h * factor) }
}

// Comprime un archivo de imagen a JPEG redimensionado. Devuelve
// `{ blob, ancho, alto, tamano }` o null si no se pudo (SSR, formato no
// soportado, error de decodificación).
export async function comprimirImagen(
  archivo,
  { maxLado = MAX_LADO_FOTO, calidad = CALIDAD_FOTO } = {},
) {
  if (typeof document === 'undefined' || !archivo) return null

  const bitmap = await cargarImagen(archivo)
  if (!bitmap) return null

  const origenAncho = bitmap.width || bitmap.naturalWidth || 0
  const origenAlto = bitmap.height || bitmap.naturalHeight || 0
  const { ancho, alto } = escalarDimensiones(origenAncho, origenAlto, maxLado)
  if (ancho <= 0 || alto <= 0) return null

  const canvas = document.createElement('canvas')
  canvas.width = ancho
  canvas.height = alto
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(bitmap, 0, 0, ancho, alto)
  if (typeof bitmap.close === 'function') bitmap.close()

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', calidad),
  )
  if (!blob) return null
  return { blob, ancho, alto, tamano: blob.size }
}

function cargarImagen(archivo) {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(archivo).catch(() => null)
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(archivo)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    img.src = url
  })
}
