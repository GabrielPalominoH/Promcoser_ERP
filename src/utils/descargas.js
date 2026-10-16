// Descargas del navegador (Excel y otros archivos) — Fase 3.
//
// Único punto que crea enlaces de descarga. En SSR/pruebas (sin document) no
// hace nada y devuelve false, igual que `imprimirHTML`.

import { libroXLSX } from './excel'

const TIPO_XLSX =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export function descargarBlob(blob, nombre) {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return false
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return true
}

export function descargarXLSX(bytes, nombre) {
  const archivo = String(nombre).endsWith('.xlsx') ? nombre : `${nombre}.xlsx`
  return descargarBlob(new Blob([bytes], { type: TIPO_XLSX }), archivo)
}

// Descarga un libro ya armado ({ nombre, hojas }) como .xlsx.
export function descargarLibro({ nombre, hojas }) {
  return descargarXLSX(libroXLSX({ hojas }), nombre)
}
