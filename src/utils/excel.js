// Escritor mínimo de libros .xlsx (OOXML) sin librerías externas.
//
// Un .xlsx es, por dentro, un ZIP con archivos XML. Para no añadir una
// dependencia (el proyecto ya evita librerías de gráficos/PDF) aquí se arma el
// ZIP con el método "store" (sin compresión) y se escribe el XML mínimo que
// Excel y LibreOffice aceptan: [Content_Types].xml, _rels/.rels,
// xl/workbook.xml, xl/_rels/workbook.xml.rels, xl/styles.xml y las hojas.
//
// Todo es puro y devuelve Uint8Array (se prueba sin navegador). La descarga la
// hace `descargas.js`.
//
// Formato de una hoja: una matriz de filas; cada celda puede ser un valor
// suelto (texto o número) o un objeto { v, negrita, tipo } donde `tipo` es
// 'moneda' o 'porcentaje' (el valor viaja como número y Excel lo formatea).

const FIRMA_LOCAL = 0x04034b50
const FIRMA_CENTRAL = 0x02014b50
const FIRMA_EOCD = 0x06054b50

function bytesDe(datos) {
  if (datos instanceof Uint8Array) return datos
  return new TextEncoder().encode(String(datos ?? ''))
}

// --- CRC-32 (IEEE 802.3), requisito del contenedor ZIP --------------------
const TABLA_CRC = (() => {
  const tabla = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    tabla[n] = c >>> 0
  }
  return tabla
})()

export function crc32(datos) {
  const bytes = bytesDe(datos)
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i += 1) {
    c = TABLA_CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

function escribirU16(vista, offset, valor) {
  vista.setUint16(offset, valor & 0xffff, true)
}

function escribirU32(vista, offset, valor) {
  vista.setUint32(offset, valor >>> 0, true)
}

// Arma un ZIP (método store) a partir de [{ nombre, contenido }], donde
// `contenido` es texto o Uint8Array. Devuelve Uint8Array.
export function zipStore(archivos = []) {
  const partes = []
  const central = []
  let offset = 0

  for (const archivo of archivos) {
    const nombre = bytesDe(archivo.nombre)
    const datos = bytesDe(archivo.contenido)
    const crc = crc32(datos)
    const tamano = datos.length

    const local = new Uint8Array(30 + nombre.length)
    const dl = new DataView(local.buffer)
    escribirU32(dl, 0, FIRMA_LOCAL)
    escribirU16(dl, 4, 20) // versión necesaria
    escribirU16(dl, 6, 0) // sin flags
    escribirU16(dl, 8, 0) // método store
    escribirU16(dl, 10, 0) // hora
    escribirU16(dl, 12, 0x21) // fecha 1980-01-01
    escribirU32(dl, 14, crc)
    escribirU32(dl, 18, tamano)
    escribirU32(dl, 22, tamano)
    escribirU16(dl, 26, nombre.length)
    escribirU16(dl, 28, 0)
    local.set(nombre, 30)
    partes.push(local, datos)

    const cabecera = new Uint8Array(46 + nombre.length)
    const dc = new DataView(cabecera.buffer)
    escribirU32(dc, 0, FIRMA_CENTRAL)
    escribirU16(dc, 4, 20) // versión que lo creó
    escribirU16(dc, 6, 20) // versión necesaria
    escribirU16(dc, 8, 0)
    escribirU16(dc, 10, 0)
    escribirU16(dc, 12, 0)
    escribirU16(dc, 14, 0x21)
    escribirU32(dc, 16, crc)
    escribirU32(dc, 20, tamano)
    escribirU32(dc, 24, tamano)
    escribirU16(dc, 28, nombre.length)
    escribirU16(dc, 30, 0)
    escribirU16(dc, 32, 0)
    escribirU16(dc, 34, 0)
    escribirU16(dc, 36, 0)
    escribirU32(dc, 38, 0)
    escribirU32(dc, 42, offset)
    cabecera.set(nombre, 46)
    central.push(cabecera)

    offset += local.length + datos.length
  }

  const tamanoCentral = central.reduce((s, c) => s + c.length, 0)
  const eocd = new Uint8Array(22)
  const de = new DataView(eocd.buffer)
  escribirU32(de, 0, FIRMA_EOCD)
  escribirU16(de, 4, 0)
  escribirU16(de, 6, 0)
  escribirU16(de, 8, archivos.length)
  escribirU16(de, 10, archivos.length)
  escribirU32(de, 12, tamanoCentral)
  escribirU32(de, 16, offset)
  escribirU16(de, 20, 0)

  const salida = new Uint8Array(offset + tamanoCentral + eocd.length)
  let pos = 0
  for (const parte of partes) {
    salida.set(parte, pos)
    pos += parte.length
  }
  for (const cabecera of central) {
    salida.set(cabecera, pos)
    pos += cabecera.length
  }
  salida.set(eocd, pos)
  return salida
}

// --- XML de las hojas ------------------------------------------------------

function escaparXML(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// Número de columna (1 = A, 27 = AA…) a su letra.
export function columnaLetra(n) {
  let letra = ''
  let numero = Math.floor(Number(n) || 0)
  while (numero > 0) {
    const resto = (numero - 1) % 26
    letra = String.fromCharCode(65 + resto) + letra
    numero = Math.floor((numero - 1) / 26)
  }
  return letra
}

// Índice de estilo dentro de cellXfs (ver estilosXLSX).
function estiloDe(celda) {
  if (typeof celda !== 'object' || celda == null) return ''
  const negrita = celda.negrita === true
  if (celda.tipo === 'moneda') return negrita ? ' s="3"' : ' s="2"'
  if (celda.tipo === 'porcentaje') return negrita ? ' s="5"' : ' s="4"'
  return negrita ? ' s="1"' : ''
}

function celdaXML(referencia, celda) {
  if (celda == null) return ''
  let valor = celda
  if (typeof celda === 'object') valor = celda.v ?? celda.valor
  if (valor == null || valor === '') return ''
  const estilo = estiloDe(celda)
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    return `<c r="${referencia}"${estilo}><v>${valor}</v></c>`
  }
  const texto = escaparXML(valor)
  return `<c r="${referencia}" t="inlineStr"${estilo}><is><t xml:space="preserve">${texto}</t></is></c>`
}

// XML de una hoja a partir de su matriz de filas.
export function hojaXML(filas = []) {
  const cuerpo = (filas ?? [])
    .map((fila, i) => {
      const celdas = (fila ?? [])
        .map((celda, j) => celdaXML(`${columnaLetra(j + 1)}${i + 1}`, celda))
        .join('')
      return celdas ? `<row r="${i + 1}">${celdas}</row>` : ''
    })
    .join('')
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<sheetData>${cuerpo}</sheetData></worksheet>`
  )
}

// Estilos: 0 normal, 1 negrita, 2 moneda, 3 moneda negrita, 4 %, 5 % negrita.
const ESTILOS_XLSX =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<numFmts count="2">' +
  '<numFmt numFmtId="164" formatCode="#,##0.00"/>' +
  '<numFmt numFmtId="165" formatCode="0.0%"/>' +
  '</numFmts>' +
  '<fonts count="2">' +
  '<font><sz val="11"/><name val="Calibri"/></font>' +
  '<font><b/><sz val="11"/><name val="Calibri"/></font>' +
  '</fonts>' +
  '<fills count="2">' +
  '<fill><patternFill patternType="none"/></fill>' +
  '<fill><patternFill patternType="gray125"/></fill>' +
  '</fills>' +
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="6">' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
  '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>' +
  '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="165" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>' +
  '</cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  '</styleSheet>'

// Nombres de hoja válidos: sin caracteres prohibidos, máximo 31 caracteres y
// sin repetir (Excel no admite duplicados ni el nombre vacío).
function nombreHojaSeguro(nombre, usados) {
  let base = String(nombre ?? 'Hoja')
    .replace(/[\\/?*[\]:]/g, ' ')
    .trim()
  if (!base) base = 'Hoja'
  if (base.length > 31) base = base.slice(0, 31)
  let final = base
  let i = 2
  while (usados.has(final.toLowerCase())) {
    const sufijo = ` ${i}`
    final = `${base.slice(0, 31 - sufijo.length)}${sufijo}`
    i += 1
  }
  usados.add(final.toLowerCase())
  return final
}

// Libro completo: { hojas: [{ nombre, filas }] } -> Uint8Array (.xlsx).
export function libroXLSX({ hojas = [] } = {}) {
  const usados = new Set()
  const lista = (hojas ?? [])
    .filter(Boolean)
    .map((h) => ({ nombre: nombreHojaSeguro(h.nombre, usados), filas: h.filas ?? [] }))

  const tipos =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    lista
      .map(
        (_, i) =>
          `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
      )
      .join('') +
    '</Types>'

  const rels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>'

  const workbook =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheets>' +
    lista
      .map((h, i) => `<sheet name="${escaparXML(h.nombre)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
      .join('') +
    '</sheets></workbook>'

  const relsWorkbook =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    lista
      .map(
        (_, i) =>
          `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
      )
      .join('') +
    `<Relationship Id="rId${lista.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    '</Relationships>'

  const archivos = [
    { nombre: '[Content_Types].xml', contenido: tipos },
    { nombre: '_rels/.rels', contenido: rels },
    { nombre: 'xl/workbook.xml', contenido: workbook },
    { nombre: 'xl/_rels/workbook.xml.rels', contenido: relsWorkbook },
    { nombre: 'xl/styles.xml', contenido: ESTILOS_XLSX },
  ]
  lista.forEach((h, i) => {
    archivos.push({ nombre: `xl/worksheets/sheet${i + 1}.xml`, contenido: hojaXML(h.filas) })
  })

  return zipStore(archivos)
}
