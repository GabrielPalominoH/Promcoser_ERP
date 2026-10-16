// Importación y plantilla de cronograma desde/hacia Excel — Fase 4.
//
// Módulo PURO: convierte una matriz de celdas (lo que devuelve `leerXLSX`) en
// tareas listas para el reducer, y arma la plantilla .xlsx de ida y vuelta.
// No toca el DOM ni el estado: el componente lee el archivo y despacha.
//
// Formato de la plantilla (también tolera el Excel que exporta el ERP):
//   N° | Tarea | Inicio | Fin | Hito | Metrado | Unidad | P. Unit. (S/) | Valorizado previo | Monto | Predecesoras | Avance (%)
// - Inicio/Fin: aaaa-mm-dd (también se aceptan dd/mm/aaaa y fechas de Excel).
// - Hito: SI/NO (si falta, se deduce de Días = 0 e inicio = fin).
// - N° jerárquico: 1, 1.1, 1.2, 1.2.1… de ahí sale el padre.
// - Predecesoras: "1.2 FS, 3 SS+2" (referencia por N° o por nombre).
// - Metrado/Unidad/P. Unit.: opcionales. Con metrado > 0, la hoja nace en modo
//   `metrado` y, si no se indicó monto, el monto = metrado × P. Unit.
// - Avance (%): opcional. Se convierte en EJECUTADO PREVIO de la tarea hoja
//   (misma siembra que la migración de la Fase C); los padres no llevan modo.

import { costoPorTarea, diasCalendarioRango } from './calculadora'
import {
  NOTA_MIGRACION_MANUAL,
  acotarAvance,
  modoMedicionInicial,
  pasosQueReproducenAvance,
} from './avance'

const EMPRESA = 'PROMCOSER'

const dosDecimales = (x) => Math.round((Number(x) || 0) * 100) / 100

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
        avance: buscar(['avance', 'porcentaje', '%']),
        // Columnas opcionales de metrado/precio (toleran las variantes con las
        // que las exporta el ERP: "Metrado", "UM"/"Unidad", "P. Unit. (S/)",
        // "Valorizado previo").
        metrado: buscar(['metrado', 'cantidad']),
        unidad: buscar(['unidad', 'um', 'und', 'u.m']),
        pu: buscar(['precio unitario', 'precio unit', 'precio', 'p. unit', 'p.u', 'pu', 'valor unitario']),
        valorizado: buscar(['valorizado previo', 'cobrado previo']),
      }
    }
  }
  return null
}

const texto = (v) => String(v ?? '').trim()

// Número de una celda opcional: null si está vacía o no es un número finito.
function numeroCelda(valor) {
  if (valor == null || texto(valor) === '') return null
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : null
}

// Convierte la matriz de celdas de una hoja en tareas "crudas" + errores y
// avisos (no bloqueantes). Cada tarea: { numero, nombre, fecha_inicio,
// fecha_fin, hito, metrado, unidad, precio_unitario, monto, avance,
// valorizado_previo, padre_numero, preds: [{ ref, tipo, lag }] }.
export function tareasDesdeFilas(filas = []) {
  const columnas = mapearColumnas(filas)
  if (!columnas) {
    return { tareas: [], errores: [{ fila: 0, motivo: 'No se encontró la fila de encabezados (N° / Tarea / Inicio / Fin).' }], avisos: [], columnas: null }
  }

  const tareas = []
  const errores = []
  const avisos = []
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

    // Metrado / unidad / precio unitario (opcionales) y monto.
    const metrado = columnas.metrado >= 0 ? numeroCelda(enFila(fila, columnas.metrado)) : null
    const unidad = texto(enFila(fila, columnas.unidad))
    const precioUnitario = columnas.pu >= 0 ? numeroCelda(enFila(fila, columnas.pu)) : null
    const montoDeclarado = columnas.monto >= 0 ? numeroCelda(enFila(fila, columnas.monto)) : null
    const tieneMetrado = metrado != null && metrado > 0
    const montoCalculado =
      tieneMetrado && precioUnitario != null && precioUnitario > 0
        ? dosDecimales(metrado * precioUnitario)
        : null
    // El monto declarado manda; si no se indicó (vacío o 0) y hay metrado × P.U.,
    // el monto de la partida sale del producto.
    const monto = montoDeclarado != null && montoDeclarado > 0 ? montoDeclarado : montoCalculado ?? 0

    const avanceCrudo = columnas.avance >= 0 ? numeroCelda(enFila(fila, columnas.avance)) : null
    // Lo ya cobrado antes del sistema (opcional; si no viene, la hoja lo
    // iguala al ejecutado previo sembrado).
    const valorizadoPrevio =
      columnas.valorizado >= 0 ? numeroCelda(enFila(fila, columnas.valorizado)) : null

    // Avisos (no bloquean la importación) que la vista previa muestra al usuario.
    if (metrado != null && metrado < 0) {
      avisos.push({ fila: i + 1, motivo: `"${nombre}": el metrado no puede ser negativo (${metrado}).` })
    }
    if (tieneMetrado && !unidad) {
      avisos.push({ fila: i + 1, motivo: `"${nombre}": indicó metrado pero falta la unidad.` })
    }
    if (precioUnitario != null && precioUnitario > 0 && !tieneMetrado) {
      avisos.push({ fila: i + 1, motivo: `"${nombre}": indicó precio unitario sin metrado; el monto no se puede calcular.` })
    }
    if (avanceCrudo != null && avanceCrudo > 100) {
      avisos.push({ fila: i + 1, motivo: `"${nombre}": el avance (${avanceCrudo} %) supera 100 %; se recorta a 100 %.` })
    }
    if (
      montoDeclarado != null &&
      montoDeclarado > 0 &&
      montoCalculado != null &&
      Math.abs(dosDecimales(montoDeclarado - montoCalculado)) > 0.01
    ) {
      avisos.push({
        fila: i + 1,
        motivo: `"${nombre}": el monto indicado (${montoDeclarado}) no cuadra con metrado × P. Unit. (${montoCalculado}).`,
      })
    }

    tareas.push({
      numero,
      nombre,
      fecha_inicio,
      fecha_fin,
      hito: esHito,
      metrado,
      unidad: unidad || null,
      precio_unitario: precioUnitario,
      monto,
      avance: avanceCrudo,
      valorizado_previo: valorizadoPrevio,
      padre_numero,
      preds: parsearPredecesoras(enFila(fila, columnas.preds)),
    })
  }

  return { tareas, errores, avisos, columnas }
}

// Cada tarea HOJA importada nace con su `modo_medicion` (asignado por la misma
// regla que la migración: metrado → metrado; hito sin duración → hitos; costos
// vinculados → costo; el resto → manual con su nota) y, si el Excel trae un
// avance (%), ese avance se guarda como EJECUTADO PREVIO para que conectar la
// medición no mueva ninguna cifra:
//   metrado → `metrado_previo = % × metrado ÷ 100` y `valorizado_previo`
//            (lo ya cobrado: explícito en el Excel o igual al ejecutado previo)
//   costo   → `costo_previo = % × presupuesto ÷ 100 − ya registrado`
//   hitos   → pasos que reproducen exactamente el %
//   manual  → el % queda como avance a mano, con su nota de migración
// Los PADRES no llevan modo: su avance se deriva de sus hijas.
export function prepararHojaImportada(tarea, { avance = null, registros = [] } = {}) {
  const porcentaje = acotarAvance(avance)
  const modo = modoMedicionInicial(tarea, { registros })
  const { valorizado_previo: valorizadoImportado, ...base } = tarea ?? {}
  const salida = { ...base, modo_medicion: modo, avance: porcentaje }
  if (modo === 'metrado') {
    const metrado = Number(tarea?.metrado) || 0
    if (metrado > 0) salida.metrado_previo = dosDecimales((porcentaje * metrado) / 100)
    salida.valorizado_previo =
      valorizadoImportado != null
        ? Math.max(0, dosDecimales(valorizadoImportado))
        : (salida.metrado_previo ?? 0)
  } else if (modo === 'costo') {
    const base = Number(tarea?.monto) || 0
    if (base > 0) {
      const ejecutado = costoPorTarea(registros, tarea.servicio_id, tarea.id)
      salida.costo_previo = Math.max(0, dosDecimales((porcentaje * base) / 100 - ejecutado))
    }
  } else if (modo === 'hitos') {
    salida.pasos = pasosQueReproducenAvance(porcentaje)
  } else {
    salida.nota_justificacion = NOTA_MIGRACION_MANUAL
  }
  return salida
}

// Asigna ids y resuelve jerarquía y predecesoras: tareas listas para el reducer.
// Las hojas reciben su modo de medición y su ejecutado previo; `recalcularAvances`
// (el reducer central) ya deja el avance consistente en la misma sesión.
export function tareasImportadas({ filas = [], servicioId, baseId = 0 } = {}) {
  const { tareas, errores, avisos } = tareasDesdeFilas(filas)
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
    // Metrado/unidad/precio solo cuando la fila los trae (no se ensucia el modelo).
    if (t.metrado != null) salida.metrado = t.metrado
    if (t.unidad) salida.unidad = t.unidad
    if (t.precio_unitario != null) salida.precio_unitario = t.precio_unitario
    if (predecesoras.length > 0) salida.predecesoras = predecesoras
    // El avance (%) y el valorizado previo de la fila se guardan aparte solo
    // para sembrar la hoja: no forman parte del modelo de tareas y se
    // descartan antes de despachar.
    salida.avance_importado = t.avance
    salida.valorizado_importado = t.valorizado_previo
    return salida
  })

  // Un id es padre si alguna otra tarea lo referencia en `padre_id`.
  const idsPadre = new Set(resueltas.filter((t) => t.padre_id != null).map((t) => t.padre_id))
  const finales = resueltas.map((t) => {
    const { avance_importado: avance, valorizado_importado, ...resto } = t
    if (idsPadre.has(t.id)) return resto
    return prepararHojaImportada({ ...resto, valorizado_previo: valorizado_importado }, { avance })
  })

  return { tareas: finales, errores, avisos, total: finales.length }
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
      { v: 'Metrado', negrita: true },
      { v: 'Unidad', negrita: true },
      { v: 'P. Unit. (S/)', negrita: true },
      { v: 'Valorizado previo', negrita: true },
      { v: 'Monto', negrita: true },
      { v: 'Predecesoras', negrita: true },
      { v: 'Avance (%)', negrita: true },
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
        tarea.metrado ?? '',
        tarea.unidad ?? '',
        tarea.precio_unitario ?? '',
        tarea.valorizado_previo ?? '',
        Number(tarea.monto) || 0,
        textoPredecesorasPlantilla(tarea, numeroPorId),
        Number(tarea.avance) || 0,
      ])
    }
  } else {
    // Ejemplo mínimo para que el formato quede claro.
    filas.push(['1', 'Obras preliminares', '2026-06-01', '2026-06-15', 'NO', '', '', '', '', 15000, '', 0])
    filas.push(['2', 'Redes de agua potable', '2026-06-16', '2026-08-15', 'NO', '', '', '', '', 0, '1 FS', 0])
    filas.push(['2.1', 'Excavación y tendido', '2026-06-16', '2026-07-15', 'NO', 350, 'm3', 120, '', 42000, '1 FS', 25])
    filas.push(['3', 'Entrega de obra', '2026-08-16', '2026-08-16', 'SI', '', '', '', '', 0, '2', 0])
  }

  const instrucciones = [
    [{ v: 'Cómo importar', negrita: true }],
    [],
    ['Cada fila es una tarea. La columna N° arma la jerarquía: 1, 1.1, 1.2, 1.2.1…'],
    ['Inicio y Fin van en formato aaaa-mm-dd (o dd/mm/aaaa).'],
    ['Hito: SI o NO. Un hito usa la misma fecha en Inicio y Fin.'],
    ['Metrado / Unidad / P. Unit.: opcionales. Con metrado la partida se mide por'],
    ['metrado; si deja el Monto en 0, el monto sale de metrado × P. Unit.'],
    ['Valorizado previo: opcional (solo con metrado). Lo ya cobrado antes del'],
    ['sistema, en la unidad de la partida; si se deja vacío, iguala al ejecutado previo.'],
    ['Monto: número en soles, sin símbolo (puede quedar en 0).'],
    ['Predecesoras: referencias por N° o por nombre, separadas por coma, con tipo'],
    ['FS, SS, FF o SF y desfase opcional, por ejemplo: "1.2 FS, 3 SS+2".'],
    ['Avance (%): opcional. Solo en tareas hoja: se guarda como ejecutado'],
    ['previo (metrado/costo), pasos (hitos) o avance a mano; los padres no lo llevan.'],
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
