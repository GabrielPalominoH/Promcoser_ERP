// Importación y plantilla de cronograma desde/hacia Excel — Fase 4.
//
// Módulo PURO: convierte una matriz de celdas (lo que devuelve `leerXLSX`) en
// tareas listas para el reducer, y arma la plantilla .xlsx de ida y vuelta.
// No toca el DOM ni el estado: el componente lee el archivo y despacha.
//
// Formato de la plantilla (también tolera el Excel que exporta el ERP):
//   N° | Tarea | Inicio | Fin | Hito | Monto | Predecesoras
// - Inicio/Fin: aaaa-mm-dd (también se aceptan dd/mm/aaaa y fechas de Excel).
// - Hito: SI/NO (si falta, se deduce de Días = 0 e inicio = fin).
// - N° jerárquico: 1, 1.1, 1.2, 1.2.1… de ahí sale el padre.
// - Predecesoras: "1.2 FS, 3 SS+2" (referencia por N° o por nombre).

import { diasCalendarioRango } from './calculadora'

const EMPRESA = 'PROMCOSER'

// Normaliza un texto de encabezado: sin tildes, minúsculas, sin espacios extra.
function norm(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

const dosDigitos = (n) => String(n).padStart(2, '0')

// Convierte el valor de una celda de fecha a ISO (aaaa-mm-dd) o null.
export function fechaISO(valor) {
  if (valor == null || valor === '') return null

  // Número de serie de Excel (época 1899-12-30).
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    const d = new Date(Math.round((valor - 25569) * 86400000))
    if (Number.isNaN(d.getTime())) return null
    return `${d.getUTCFullYear()}-${dosDigitos(d.getUTCMonth() + 1)}-${dosDigitos(d.getUTCDate())}`
  }

  const s = String(valor).trim()
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s)
  if (m) return `${m[1]}-${dosDigitos(m[2])}-${dosDigitos(m[3])}`
  m = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(s)
  if (m) return `${m[3]}-${dosDigitos(m[2])}-${dosDigitos(m[1])}`
  return null
}

// Interpreta la columna "Predecesoras" como lista de { ref, tipo, lag }.
export function parsearPredecesoras(texto) {
  const s = String(texto ?? '').trim()
  if (!s || s === '-' || s === '—') return []
  return s
    .split(',')
    .map((bruto) => {
      let token = bruto.trim()
      if (!token) return null
      let espec = null
      const conParentesis = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(token)
      if (conParentesis) {
        token = conParentesis[1].trim()
        espec = conParentesis[2].trim()
      } else {
        const cola = /^(.*?)\s+(FS|SS|FF|SF)\s*([+-]?\d+)?$/i.exec(token)
        if (cola) {
          token = cola[1].trim()
          espec = `${cola[2]}${cola[3] ?? ''}`
        }
      }
      let tipo = 'FS'
      let lag = 0
      if (espec) {
        const mt = /^(FS|SS|FF|SF)\s*([+-]?\d+)?$/i.exec(espec)
        if (mt) {
          tipo = mt[1].toUpperCase()
          lag = Number(mt[2]) || 0
        }
      }
      return token ? { ref: token, tipo, lag } : null
    })
    .filter(Boolean)
}

// ¿La celda marca un hito?
function esSi(valor) {
  return /^(si|sí|x|true|1|yes)$/i.test(String(valor ?? '').trim())
}

// Busca la fila de encabezados y devuelve el índice de cada columna.
function mapearColumnas(filas) {
  for (let i = 0; i < filas.length; i += 1) {
    const encabezados = filas[i].map(norm)
    const buscar = (claves) =>
      encabezados.findIndex((h) => h && claves.some((k) => h === k || h.startsWith(k)))
    const nombre = buscar(['tarea', 'partida', 'actividad', 'descripcion'])
    const inicio = buscar(['inicio'])
    const fin = buscar(['fin', 'termino'])
    if (nombre >= 0 && inicio >= 0 && fin >= 0) {
      return {
        fila: i,
        numero: buscar(['n°', 'nº', 'nro', 'item', '#']) >= 0 ? buscar(['n°', 'nº', 'nro', 'item', '#']) : buscar(['n']),
        nombre,
        inicio,
        fin,
        hito: buscar(['hito']),
        monto: buscar(['monto', 'importe', 'presupuesto']),
        dias: buscar(['dias', 'duracion']),
        preds: buscar(['predecesora', 'antecesora']),
      }
    }
  }
  return null
}

const texto = (v) => String(v ?? '').trim()

// Convierte la matriz de celdas de una hoja en tareas "crudas" + errores.
// Cada tarea: { numero, nombre, fecha_inicio, fecha_fin, hito, monto,
//               padre_numero, preds: [{ ref, tipo, lag }] }.
export function tareasDesdeFilas(filas = []) {
  const columnas = mapearColumnas(filas)
  if (!columnas) {
    return { tareas: [], errores: [{ fila: 0, motivo: 'No se encontró la fila de encabezados (N° / Tarea / Inicio / Fin).' }], columnas: null }
  }

  const tareas = []
  const errores = []
  const enFila = (fila, idx) => (idx >= 0 ? fila[idx] : '')

  for (let i = columnas.fila + 1; i < filas.length; i += 1) {
    const fila = filas[i] ?? []
    const nombre = texto(enFila(fila, columnas.nombre))
    if (!nombre) {
      // Fila vacía: ignora. Fila "Total": corta.
      const primera = texto(fila.find((c) => texto(c) !== ''))
      if (/^total/i.test(primera)) break
      continue
    }
    if (/^total/i.test(nombre)) break

    const numero = texto(enFila(fila, columnas.numero))
    const inicio = fechaISO(enFila(fila, columnas.inicio))
    const finCrudo = fechaISO(enFila(fila, columnas.fin))
    const hito = columnas.hito >= 0 ? esSi(enFila(fila, columnas.hito)) : false
    const dias = columnas.dias >= 0 ? Number(enFila(fila, columnas.dias)) : null

    if (!inicio || !finCrudo) {
      errores.push({ fila: i + 1, motivo: `"${nombre}": falta una fecha válida de inicio o fin.` })
      continue
    }

    const esHito = hito || (columnas.hito < 0 && dias === 0 && inicio === finCrudo)
    const fecha_inicio = inicio
    const fecha_fin = esHito ? inicio : finCrudo < inicio ? inicio : finCrudo

    // Padre por numeración (1.2.1 → 1.2). Sin número, la tarea es raíz.
    let padre_numero = null
    if (numero.includes('.')) padre_numero = numero.slice(0, numero.lastIndexOf('.'))

    const monto = columnas.monto >= 0 ? Number(enFila(fila, columnas.monto)) || 0 : 0

    tareas.push({
      numero,
      nombre,
      fecha_inicio,
      fecha_fin,
      hito: esHito,
      monto,
      padre_numero,
      preds: parsearPredecesoras(enFila(fila, columnas.preds)),
    })
  }

  return { tareas, errores, columnas }
}

// Asigna ids y resuelve jerarquía y predecesoras: tareas listas para el reducer.
export function tareasImportadas({ filas = [], servicioId, baseId = 0 } = {}) {
  const { tareas, errores } = tareasDesdeFilas(filas)
  const porNumero = new Map()
  const porNombre = new Map()
  tareas.forEach((t, i) => {
    t.id = baseId + i + 1
    if (t.numero) porNumero.set(t.numero, t.id)
    const clave = norm(t.nombre)
    if (clave && !porNombre.has(clave)) porNombre.set(clave, t.id)
  })

  const resueltas = tareas.map((t) => {
    const padre = t.padre_numero ? porNumero.get(t.padre_numero) : null
    const predecesoras = t.preds
      .map((p) => {
        const clave = norm(p.ref)
        const id = porNumero.get(p.ref) ?? porNombre.get(clave)
        return id != null && id !== t.id ? { id, tipo: p.tipo, lag: p.lag } : null
      })
      .filter(Boolean)

    const salida = {
      id: t.id,
      servicio_id: servicioId,
      padre_id: padre ?? null,
      nombre: t.nombre,
      fecha_inicio: t.fecha_inicio,
      fecha_fin: t.fecha_fin,
      hito: t.hito,
      monto: t.monto,
    }
    if (predecesoras.length > 0) salida.predecesoras = predecesoras
    return salida
  })

  return { tareas: resueltas, errores, total: resueltas.length }
}

// --- plantilla -----------------------------------------------------------

// Recorre el árbol de tareas y numera (1, 1.1, 1.2.1…) para la plantilla.
function arbolNumerado(tareas, servicioId) {
  const propias = tareas.filter((t) => t.servicio_id === servicioId)
  const ids = new Set(propias.map((t) => t.id))
  const porPadre = new Map()
  for (const t of propias) {
    const clave = t.padre_id != null && ids.has(t.padre_id) ? t.padre_id : null
    if (!porPadre.has(clave)) porPadre.set(clave, [])
    porPadre.get(clave).push(t)
  }
  const lista = []
  const rec = (t, numero) => {
    lista.push({ tarea: t, numero })
    ;(porPadre.get(t.id) ?? []).forEach((h, j) => rec(h, `${numero}.${j + 1}`))
  }
  ;(porPadre.get(null) ?? []).forEach((t, i) => rec(t, `${i + 1}`))
  return lista
}

function textoPredecesorasPlantilla(tarea, numeroPorId) {
  return (tarea.predecesoras ?? [])
    .map((p) => {
      const ref = numeroPorId.get(p.id) ?? p.id
      const tipo = p.tipo && p.tipo !== 'FS' ? ` ${p.tipo}${p.lag ? `+${p.lag}` : ''}` : ''
      return `${ref}${tipo}`
    })
    .join(', ')
}

// Libro .xlsx plantilla: mismas columnas que importa `tareasDesdeFilas`.
export function plantillaCronograma({ servicio = {}, tareas = [] } = {}) {
  const numeradas = arbolNumerado(tareas, servicio.id)
  const numeroPorId = new Map(numeradas.map(({ tarea, numero }) => [tarea.id, numero]))

  const filas = [
    [{ v: EMPRESA, negrita: true }],
    [{ v: 'Plantilla de importación de cronograma', negrita: true }],
    [{ v: 'Obra', negrita: true }, servicio.nombre_servicio ?? ''],
    [{ v: 'Cliente', negrita: true }, servicio.cliente ?? ''],
    [],
    [
      { v: 'N°', negrita: true },
      { v: 'Tarea', negrita: true },
      { v: 'Inicio', negrita: true },
      { v: 'Fin', negrita: true },
      { v: 'Hito', negrita: true },
      { v: 'Monto', negrita: true },
      { v: 'Predecesoras', negrita: true },
    ],
  ]

  if (numeradas.length > 0) {
    for (const { tarea, numero } of numeradas) {
      filas.push([
        numero,
        tarea.nombre,
        tarea.fecha_inicio ?? '',
        tarea.fecha_fin ?? '',
        tarea.hito ? 'SI' : 'NO',
        Number(tarea.monto) || 0,
        textoPredecesorasPlantilla(tarea, numeroPorId),
      ])
    }
  } else {
    // Ejemplo mínimo para que el formato quede claro.
    filas.push(['1', 'Obras preliminares', '2026-06-01', '2026-06-15', 'NO', 15000, ''])
    filas.push(['2', 'Redes de agua potable', '2026-06-16', '2026-08-15', 'NO', 0, '1 FS'])
    filas.push(['2.1', 'Excavación y tendido', '2026-06-16', '2026-07-15', 'NO', 42000, '1 FS'])
    filas.push(['3', 'Entrega de obra', '2026-08-16', '2026-08-16', 'SI', 0, '2'])
  }

  const instrucciones = [
    [{ v: 'Cómo importar', negrita: true }],
    [],
    ['Cada fila es una tarea. La columna N° arma la jerarquía: 1, 1.1, 1.2, 1.2.1…'],
    ['Inicio y Fin van en formato aaaa-mm-dd (o dd/mm/aaaa).'],
    ['Hito: SI o NO. Un hito usa la misma fecha en Inicio y Fin.'],
    ['Monto: número en soles, sin símbolo (puede quedar en 0).'],
    ['Predecesoras: referencias por N° o por nombre, separadas por coma, con tipo'],
    ['FS, SS, FF o SF y desfase opcional, por ejemplo: "1.2 FS, 3 SS+2".'],
    [],
    ['Al importar, las tareas se AGREGAN a las que ya existen en el servicio.'],
  ]

  return {
    nombre: 'plantilla-cronograma',
    hojas: [
      { nombre: 'Cronograma', filas },
      { nombre: 'Instrucciones', filas: instrucciones },
    ],
  }
}

// Utilidad para la vista previa: días de calendario de una tarea importada.
export function diasTareaImportada(t) {
  return t.hito ? 0 : diasCalendarioRango(t.fecha_inicio, t.fecha_fin)
}
