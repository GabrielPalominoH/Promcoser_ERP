// Agregación de cartera para el panel de control de proyectos (P6).
//
// Combina la Curva S / valor ganado de cada servicio en una lectura de
// portafolio (SPI/CPI/EAC/VAC y una curva S sumada) y resume el estado del
// cronograma de toda la obra con el motor CPM: actividades críticas y el
// "look-ahead" (lo que arranca en las próximas semanas).
//
// No reimplementa fórmulas: reutiliza `curvaServicio` y `programar`.

import { curvaServicio } from './curvaS'
import { lineaBaseVigente } from './lineaBase'
import { programar } from './cpm'
import { hoyISO } from './calculadora'
import { sumarDiasISO } from './calendario'

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100

// Valor ganado de la cartera: suma PV/AC/EV y serie mensual consolidada.
export function evmCartera({
  servicios = [],
  tareas = [],
  registros = [],
  lineasBase = [],
  lecturas = [],
  granularidad = 'mensual',
  hoy = hoyISO(),
} = {}) {
  const curvas = (servicios ?? [])
    .map((s) => ({
      servicio: s,
      curva: curvaServicio({
        servicio: s,
        tareas,
        registros,
        hoy,
        granularidad,
        lineaBase: lineaBaseVigente(s.id, lineasBase),
        lecturas,
      }),
    }))
    .filter((c) => c.curva.hayDatos)

  if (curvas.length === 0) {
    return {
      hayDatos: false,
      servicios: 0,
      presupuesto: 0,
      pv: null,
      ac: 0,
      ev: 0,
      spi: null,
      cpi: null,
      eac: null,
      vac: null,
      avance: 0,
      serie: [],
    }
  }

  const suma = (campo) =>
    r2(curvas.reduce((s, c) => s + (Number(c.curva[campo]) || 0), 0))

  const conPv = curvas.filter((c) => c.curva.pv != null)
  const pv = conPv.length ? r2(conPv.reduce((s, c) => s + c.curva.pv, 0)) : null
  const ac = suma('ac')
  const ev = suma('ev')
  const presupuesto = suma('presupuesto')

  const conEac = curvas.filter((c) => c.curva.eac != null)
  const eac = conEac.length ? r2(conEac.reduce((s, c) => s + c.curva.eac, 0)) : null
  const vac = eac == null ? null : r2(presupuesto - eac)

  const avance = presupuesto > 0 ? r2((ev / presupuesto) * 100) : 0

  // Serie consolidada por periodo (misma clave) sumando PV/AC/EV.
  const porClave = new Map()
  for (const { curva } of curvas) {
    for (const p of curva.periodos) {
      const acc = porClave.get(p.clave) ?? {
        clave: p.clave,
        etiqueta: p.etiqueta,
        corta: p.corta,
        anio: p.anio,
        inicio: p.inicio,
        fin: p.fin,
        pv: 0,
        ac: 0,
        ev: 0,
        hayAc: false,
      }
      if (p.pv != null) acc.pv += p.pv
      if (p.ac != null) {
        acc.ac += p.ac
        acc.hayAc = true
      }
      if (p.ev != null) acc.ev += p.ev
      porClave.set(p.clave, acc)
    }
  }
  const serie = [...porClave.values()]
    .sort((a, b) => a.clave.localeCompare(b.clave))
    .map((p) => ({
      clave: p.clave,
      etiqueta: p.etiqueta,
      corta: p.corta,
      anio: p.anio,
      inicio: p.inicio,
      fin: p.fin,
      pv: r2(p.pv),
      ac: p.hayAc ? r2(p.ac) : null,
      ev: r2(p.ev),
    }))

  // Índice del periodo que contiene el corte de hoy (para la marca vertical).
  let indiceHoy = -1
  for (let i = 0; i < serie.length; i += 1) {
    if (serie[i].inicio && serie[i].inicio <= hoy) indiceHoy = i
  }

  return {
    hayDatos: true,
    servicios: curvas.length,
    presupuesto,
    pv,
    ac,
    ev,
    spi: pv != null && pv > 0 ? r2(ev / pv) : null,
    cpi: ac > 0 ? r2(ev / ac) : null,
    eac,
    vac,
    avance,
    indiceHoy,
    serie,
  }
}

// Control de cronograma de la cartera: actividades críticas y look-ahead.
export function controlCPMCartera({
  servicios = [],
  tareas = [],
  hoy = hoyISO(),
  horizonteDias = 21,
} = {}) {
  const limite = sumarDiasISO(hoy, horizonteDias)
  const criticas = []
  const proximas = []
  let conPlan = 0
  let sinHolgura = 0

  for (const servicio of servicios ?? []) {
    const res = programar({ tareas, servicio })
    // Solo hojas del servicio con fechas.
    const propias = (tareas ?? []).filter(
      (t) => t.servicio_id === servicio.id && t.fecha_inicio && t.fecha_fin,
    )
    const esHoja = (t) => !propias.some((h) => h.padre_id === t.id)

    const filas = propias.filter(esHoja)
    if (filas.length) conPlan += 1

    for (const t of filas) {
      const v = res.porTarea[t.id]
      if (!v) continue
      if (v.critica) sinHolgura += 1
      if (v.critica) {
        criticas.push({
          servicio_id: servicio.id,
          servicio: servicio.nombre_servicio,
          tarea_id: t.id,
          tarea: t.nombre,
          inicio: v.es,
          fin: v.ef,
          holgura: v.holgura,
          avance: Number(t.avance) || 0,
        })
      }
      if (v.es >= hoy && v.es <= limite) {
        proximas.push({
          servicio_id: servicio.id,
          servicio: servicio.nombre_servicio,
          tarea_id: t.id,
          tarea: t.nombre,
          inicio: v.es,
          fin: v.ef,
          holgura: v.holgura,
          critica: v.critica,
          avance: Number(t.avance) || 0,
        })
      }
    }
  }

  criticas.sort((a, b) => (a.fin || '').localeCompare(b.fin || ''))
  proximas.sort((a, b) => (a.inicio || '').localeCompare(b.inicio || ''))

  return {
    criticas,
    proximas,
    totalCriticas: criticas.length,
    totalProximas: proximas.length,
    serviciosConPlan: conPlan,
    sinHolgura,
    horizonteDias,
    limite,
  }
}
