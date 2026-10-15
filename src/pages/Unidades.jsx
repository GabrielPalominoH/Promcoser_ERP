import { useState } from 'react'
import { Card } from '../components/ui/Card'
import {
  BarraFiltros,
  Buscador,
  SelectFiltro,
  textoCoincide,
} from '../components/ui/FiltroBusqueda'
import { normalizar } from '../components/ui/ComboBox'
import { Table, TableBody, TableEmpty, TableHead, TableRow, Td, Th } from '../components/ui/Table'
import { Campo, Input, Select } from '../components/ui/Field'
import { Button } from '../components/ui/Button'
import { formatearMoneda } from '../utils/formatters'
import { UNIDADES } from '../data/unidades'

const CATEGORIAS = [
  'Todas',
  'Superficie',
  'Volumen',
  'Longitud',
  'Peso',
  'Líquido',
  'Pieza',
  'Tiempo',
  'Transporte',
  'Avance',
  'Servicio',
]

const UNIDADES_MOCKUP = [
  { sigla: 'm³', nombre: 'Concreto f\'c=210 kg/cm²', cantidad: 45.0, total: 12825 },
  { sigla: 'kg', nombre: 'Acero fy=4200 kg/cm²', cantidad: 1250.0, total: 7250 },
  { sigla: 'm²', nombre: 'Pintura látex interior', cantidad: 320.0, total: 5920 },
  { sigla: 'gl', nombre: 'Combustible (diesel)', cantidad: 80.0, total: 1296 },
]

export function Unidades() {
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('Todas')
  const termino = normalizar(busqueda)

  const unidadesFiltradas = UNIDADES.filter((item) => {
    const coincideTexto =
      textoCoincide(item.sigla, termino) ||
      textoCoincide(item.nombre, termino) ||
      textoCoincide(item.categoria, termino) ||
      textoCoincide(item.ejemplo, termino)
    const coincideCategoria = categoria === 'Todas' || item.categoria === categoria
    return coincideTexto && coincideCategoria
  }).sort((a, b) => {
    const porCategoria = a.categoria.localeCompare(b.categoria, 'es')
    if (porCategoria !== 0) return porCategoria
    return a.sigla.localeCompare(b.sigla, 'es')
  })

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Unidades de medida
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Catálogo de referencia de unidades estándar para construcción. Demo visual, sin persistencia.
        </p>
      </header>

      <Card
        titulo="Catálogo de unidades de medida"
        descripcion="Listado de siglas y su uso típico en valorizaciones y APU."
      >
        <BarraFiltros
          contador={
            unidadesFiltradas.length === UNIDADES.length
              ? `${UNIDADES.length} unidades`
              : `${unidadesFiltradas.length} de ${UNIDADES.length}`
          }
        >
          <Buscador
            valor={busqueda}
            onChange={setBusqueda}
            placeholder="Buscar por sigla, nombre, categoría o ejemplo…"
            ariaLabel="Buscar unidades de medida"
          />
          <SelectFiltro
            label="Filtrar por categoría"
            value={categoria}
            onChange={setCategoria}
          >
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </SelectFiltro>
        </BarraFiltros>

        <Table>
          <TableHead>
            <TableRow>
              <Th>Sigla</Th>
              <Th>Unidad</Th>
              <Th>Categoría</Th>
              <Th>Ejemplo de uso</Th>
            </TableRow>
          </TableHead>
          <TableBody>
            {unidadesFiltradas.map((item) => (
              <TableRow key={`${item.sigla}-${item.nombre}`}>
                <Td className="whitespace-nowrap tabular-nums font-medium text-slate-900">
                  {item.sigla}
                </Td>
                <Td className="font-medium text-slate-800">{item.nombre}</Td>
                <Td>
                  <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
                    {item.categoria}
                  </span>
                </Td>
                <Td className="text-slate-500">{item.ejemplo}</Td>
              </TableRow>
            ))}
            {unidadesFiltradas.length === 0 && (
              <TableEmpty colSpan={4} mensaje="No hay unidades que coincidan con la búsqueda." />
            )}
          </TableBody>
        </Table>
      </Card>

      <Card
        titulo="Mockup: Materiales con UM (demo visual)"
        descripcion="Ilustración de cómo quedaría el formulario y la tabla con la columna Unidad (UM). No guarda cambios ni modifica los datos reales."
      >
        <form noValidate className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Campo
              label="Nombre del material"
              htmlFor="um-nombre"
              className="sm:col-span-3"
            >
              <Input
                id="um-nombre"
                placeholder="Ej. Cemento Portland"
                defaultValue="Cemento Portland tipo I"
                disabled
              />
            </Campo>
            <Campo label="Unidad (UM)" htmlFor="um-unidad">
              <Select id="um-unidad" defaultValue="m³" disabled>
                {UNIDADES.slice(0, 12).map((u) => (
                  <option key={u.sigla} value={u.sigla}>
                    {u.sigla} — {u.nombre}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo label="Cantidad" htmlFor="um-cantidad">
              <Input
                id="um-cantidad"
                type="number"
                step="0.01"
                placeholder="0"
                defaultValue="45.00"
                disabled
              />
            </Campo>
            <Campo
              label="Costo total (S/)"
              htmlFor="um-costo"
              hint="Monto total (demo visual)"
            >
              <Input
                id="um-costo"
                type="number"
                step="0.01"
                placeholder="0.00"
                defaultValue="12825.00"
                disabled
              />
            </Campo>
            <Campo label="Fecha" htmlFor="um-fecha">
              <Input id="um-fecha" type="date" defaultValue="2026-03-05" disabled />
            </Campo>
            <Campo label="Tarea (opcional)" htmlFor="um-tarea" className="sm:col-span-2">
              <Select id="um-tarea" defaultValue="" disabled>
                <option value="">Sin tarea</option>
                <option value="1">Fundaciones</option>
                <option value="2">Muros y columnas</option>
              </Select>
            </Campo>
            <div className="flex items-end justify-end sm:col-span-1">
              <Button type="button" disabled>
                Agregar material
              </Button>
            </div>
          </div>
        </form>

        <div className="mt-6">
          <Table>
            <TableHead>
              <TableRow>
                <Th>Fecha</Th>
                <Th>Concepto</Th>
                <Th>UM</Th>
                <Th alinear="right">Cantidad</Th>
                <Th alinear="right">Total (S/)</Th>
                <Th alinear="right">Acciones</Th>
              </TableRow>
            </TableHead>
            <TableBody>
              {UNIDADES_MOCKUP.map((m, i) => (
                <TableRow key={i}>
                  <Td className="whitespace-nowrap text-slate-500">05/03/2026</Td>
                  <Td className="font-medium text-slate-800">{m.nombre}</Td>
                  <Td>
                    <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
                      {m.sigla}
                    </span>
                  </Td>
                  <Td alinear="right" className="tabular-nums">
                    {m.cantidad.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </Td>
                  <Td alinear="right" className="font-semibold text-slate-900 tabular-nums">
                    {formatearMoneda(m.total)}
                  </Td>
                  <Td alinear="right">
                    <span className="inline-flex gap-1.5">
                      <Button variante="secundario" tamano="sm" disabled>
                        Editar
                      </Button>
                      <Button variante="peligro" tamano="sm" disabled>
                        Eliminar
                      </Button>
                    </span>
                  </Td>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
