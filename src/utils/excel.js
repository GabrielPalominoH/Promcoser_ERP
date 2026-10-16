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

// ==========================================================================
//  Lectura (.xlsx) — Fase 4
//
//  Un .xlsx es un ZIP con XML. Aquí se descomprime el contenedor (métodos
//  "store" y "deflate", este último con DecompressionStream del navegador o
//  de Node ≥ 18) y se leen las hojas a una matriz de valores. Se usa regex en
//  vez de un parser XML completo: basta para el OOXML mínimo que escribimos y
//  para los archivos que exporta Excel/LibreOffice. Todo asíncrono.
// ==========================================================================

// Descomprime un bloque "deflate-raw" (método 8) usando la API de streams.
async function inflar(datos) {
  const flujo = new Blob([datos]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(flujo).arrayBuffer())
}

// Descomprime un contenedor ZIP: devuelve [{ nombre, bytes }].
export async function descomprimirZip(bytes) {
  const datos = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  const dv = new DataView(datos.buffer, datos.byteOffset, datos.byteLength)

  // Localiza el End Of Central Directory (EOCD) desde el final.
  let eocd = -1
  for (let i = datos.length - 22; i >= 0; i -= 1) {
    if (dv.getUint32(i, true) === FIRMA_EOCD) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('El archivo no es un .xlsx válido (sin EOCD).')

  const total = dv.getUint16(eocd + 10, true)
  let cursor = dv.getUint32(eocd + 16, true)
  const decoder = new TextDecoder('utf-8')
  const salida = []

  for (let e = 0; e < total && cursor + 46 <= datos.length; e += 1) {
    if (dv.getUint32(cursor, true) !== FIRMA_CENTRAL) break
    const metodo = dv.getUint16(cursor + 10, true)
    const comprimido = dv.getUint32(cursor + 20, true)
    const nombreLen = dv.getUint16(cursor + 28, true)
    const extraLen = dv.getUint16(cursor + 30, true)
    const comentarioLen = dv.getUint16(cursor + 32, true)
    const local = dv.getUint32(cursor + 42, true)
    const nombre = decoder.decode(datos.subarray(cursor + 46, cursor + 46 + nombreLen))

    // Cabecera local: nombre y extra tienen longitudes propias.
    const lNombreLen = dv.getUint16(local + 26, true)
    const lExtraLen = dv.getUint16(local + 28, true)
    const inicioDatos = local + 30 + lNombreLen + lExtraLen
    const crudo = datos.subarray(inicioDatos, inicioDatos + comprimido)

    let contenido
    if (metodo === 0) contenido = crudo
    else if (metodo === 8) contenido = await inflar(crudo)
    else throw new Error(`Método de compresión no soportado: ${metodo}`)

    salida.push({ nombre, bytes: contenido })
    cursor += 46 + nombreLen + extraLen + comentarioLen
  }
  return salida
}

function decodificarEntidades(texto) {
  return String(texto)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

// Columna de una referencia de celda ("BC12" → 54).
function columnaDeReferencia(ref) {
  const letras = (String(ref).match(/^[A-Za-z]+/) ?? [''])[0].toUpperCase()
  let n = 0
  for (const c of letras) n = n * 26 + (c.charCodeAt(0) - 64)
  return n - 1
}

// Cadena compartida o contenido de una celda.
function valorCelda(xmlCelda, atributos, compartidas) {
  const t = /\st="([^"]+)"/.exec(atributos)?.[1]
  if (t === 'inlineStr') {
    const partes = [...xmlCelda.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) =>
      decodificarEntidades(m[1]),
    )
    return partes.join('')
  }
  const v = /<v[^>]*>([\s\S]*?)<\/v>/.exec(xmlCelda)?.[1]
  if (v == null) return ''
  if (t === 's') return compartidas[Number(v)] ?? ''
  if (t === 'str') return decodificarEntidades(v)
  if (t === 'b') return v === '1'
  const num = Number(v)
  return Number.isNaN(num) ? decodificarEntidades(v) : num
}

// Convierte el XML de una hoja en una matriz de filas (celdas por columna).
function filasDeHoja(xml, compartidas) {
  const filas = []
  for (const mFila of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const celdas = []
    for (const mCelda of mFila[1].matchAll(/<c([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const atributos = mCelda[1]
      const ref = /\sr="([^"]+)"/.exec(atributos)?.[1]
      const indice = ref != null ? columnaDeReferencia(ref) : celdas.length
      const valor = ref != null ? valorCelda(mCelda[2] ?? '', atributos, compartidas) : ''
      while (celdas.length < indice) celdas.push('')
      celdas[indice] = valor
    }
    filas.push(celdas)
  }
  return filas
}

// Lee un .xlsx y devuelve { hojas: [{ nombre, filas }] }.
export async function leerXLSX(bytes) {
  const entradas = await descomprimirZip(bytes)
  const porNombre = new Map(entradas.map((e) => [e.nombre, e]))
  const decoder = new TextDecoder('utf-8')
  const texto = (nombre) => (porNombre.has(nombre) ? decoder.decode(porNombre.get(nombre).bytes) : '')

  // Cadenas compartidas.
  const compartidas = []
  const xmlCompartidas = texto('xl/sharedStrings.xml')
  if (xmlCompartidas) {
    for (const m of xmlCompartidas.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
      const partes = [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) =>
        decodificarEntidades(x[1]),
      )
      compartidas.push(partes.join(''))
    }
  }

  // Nombre y destino de cada hoja.
  const xmlWorkbook = texto('xl/workbook.xml')
  const xmlRels = texto('xl/_rels/workbook.xml.rels')
  const destinos = new Map(
    [...xmlRels.matchAll(/<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map((m) => [
      m[1],
      m[2],
    ]),
  )
  const hojas = []
  let i = 0
  for (const m of xmlWorkbook.matchAll(/<sheet\b([^>]*)\/>/g)) {
    i += 1
    const nombre = decodificarEntidades(/\sname="([^"]*)"/.exec(m[1])?.[1] ?? `Hoja${i}`)
    const rid = /\br:id="([^"]+)"/.exec(m[1])?.[1]
    let ruta = rid != null ? destinos.get(rid) : null
    if (!ruta) ruta = `worksheets/sheet${i}.xml`
    const normal = ruta.startsWith('/') ? ruta.slice(1) : ruta.startsWith('xl/') ? ruta : `xl/${ruta}`
    const xml = texto(normal)
    hojas.push({ nombre, filas: xml ? filasDeHoja(xml, compartidas) : [] })
  }

  // Sin workbook.xml (raro): cae a buscar sheets directos.
  if (hojas.length === 0) {
    let j = 0
    for (const e of entradas) {
      const m = /^xl\/worksheets\/sheet(\d+)\.xml$/.exec(e.nombre)
      if (!m) continue
      j += 1
      hojas.push({
        nombre: `Hoja${j}`,
        filas: filasDeHoja(decoder.decode(e.bytes), compartidas),
      })
    }
  }

  return { hojas }
}
