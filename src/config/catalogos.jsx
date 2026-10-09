import { ESTATUS_SERVICIO } from '../data/mockData'
import { BadgeEstatus } from '../components/ui/Badge'
import { formatearFecha, formatearMoneda } from '../utils/formatters'
import { consumoPresupuesto, rentabilidadServicio } from '../utils/calculadora'
import { Link } from 'react-router-dom'

// Cada catálogo se describe con datos, no con componentes a medida.
// CatalogoCRUD usa esta configuración para pintar tabla, formulario y validaciones.

const opciones = (lista) => lista.map((texto) => ({ valor: texto, texto }))

// ------------------------------------------------------------
//  Personal
// ------------------------------------------------------------

export const CATALOGO_PERSONAL = {
  coleccion: 'personal',
  titulo: 'Personal',
  descripcion: 'Registro del personal con su nombre, cargo y tarifa por hora.',
  nombreSingular: 'personal',
  etiquetaContador: 'personas',
  claveBusqueda: (item) => `${item.nombre} ${item.apellido} ${item.cargo} ${item.dni} ${item.ambito ?? 'Obra'}`,
  placeholderBusqueda: 'Buscar por nombre, apellido, cargo, DNI o ámbito…',
  ordenar: (a, b) =>
    `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`, 'es'),
  mensajeVacio: 'No hay personal que coincida con la búsqueda.',
  mensajeSinRegistros: 'Aún no hay personal registrado.',
  tieneActivo: false,
  // Layout fijo: las columnas no cambian de ancho al filtrar/buscar.
  claseTabla: '[&>table]:table-fixed',

  columnas: [
    {
      etiqueta: 'Nombre',
      render: (item) => (
        <span className="font-medium break-words text-slate-900">
          {`${item.nombre} ${item.apellido ?? ''}`.trim()}
        </span>
      ),
    },
    {
      etiqueta: 'Cargo',
      render: (item) => item.cargo,
      clase: 'text-slate-500',
    },
    {
      etiqueta: 'DNI',
      render: (item) => (
        <span className="whitespace-nowrap tabular-nums">{item.dni}</span>
      ),
      clase: 'text-slate-500',
    },
    {
      etiqueta: 'Tarifa/h',
      alinear: 'right',
      render: (item) => (
        <span className="tabular-nums">{formatearMoneda(item.tarifa_por_hora)}</span>
      ),
    },
    {
      etiqueta: 'Ámbito',
      render: (item) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
            (item.ambito ?? 'Obra') === 'Oficina'
              ? 'bg-amber-50 text-amber-700 ring-amber-200'
              : 'bg-primary-50 text-primary-700 ring-primary-200'
          }`}
        >
          {item.ambito ?? 'Obra'}
        </span>
      ),
    },
  ],

  campos: [
    {
      name: 'nombre',
      etiqueta: 'Nombre',
      tipo: 'texto',
      requerido: true,
      placeholder: 'Ej. Carlos',
    },
    {
      name: 'apellido',
      etiqueta: 'Apellido',
      tipo: 'texto',
      requerido: true,
      placeholder: 'Ej. Mendoza Ríos',
    },
    {
      name: 'cargo',
      etiqueta: 'Cargo',
      tipo: 'texto',
      requerido: true,
      ancho: 'completo',
      placeholder: 'Ej. Jefe de obra',
    },
    {
      name: 'dni',
      etiqueta: 'DNI',
      tipo: 'texto',
      requerido: true,
      placeholder: 'Ej. 12345678',
    },
    {
      name: 'tarifa_por_hora',
      etiqueta: 'Tarifa por hora (S/)',
      tipo: 'numero',
      requerido: true,
      min: 0,
      paso: '0.01',
      hint: 'Se sugiere al asignar personal a un servicio.',
    },
    {
      name: 'ambito',
      etiqueta: 'Ámbito',
      tipo: 'select',
      requerido: true,
      opciones: opciones(['Obra', 'Oficina']),
      hint: 'Oficina: costo general, no se asigna a servicios.',
    },
  ],

  valoresIniciales: {
    nombre: '',
    apellido: '',
    cargo: '',
    dni: '',
    tarifa_por_hora: '',
    ambito: 'Obra',
  },

  normalizar: (valores) => ({
    nombre: valores.nombre.trim(),
    apellido: valores.apellido.trim(),
    cargo: valores.cargo.trim(),
    dni: valores.dni.trim(),
    tarifa_por_hora: Number(valores.tarifa_por_hora),
    ambito: valores.ambito || 'Obra',
  }),
}

// ------------------------------------------------------------
//  Equipos
// ------------------------------------------------------------

export const CATALOGO_EQUIPOS = {
  coleccion: 'equipos',
  titulo: 'Equipos',
  descripcion: 'Equipos y unidades que se usan en los servicios: vehículos, maquinaria, herramientas y más.',
  nombreSingular: 'equipo',
  etiquetaContador: 'equipos',
  claveBusqueda: (item) => item.nombre,
  placeholderBusqueda: 'Buscar por nombre…',
  mensajeVacio: 'No hay equipos que coincidan con la búsqueda.',
  mensajeSinRegistros: 'Aún no hay equipos registrados.',
  tieneActivo: false,
  ordenar: (a, b) => a.nombre.localeCompare(b.nombre, 'es'),

  columnas: [
    {
      etiqueta: 'Equipo',
      render: (item) => (
        <span className="font-medium text-slate-900">{item.nombre}</span>
      ),
    },
    {
      etiqueta: 'Costo/h',
      alinear: 'right',
      render: (item) => (
        <span className="tabular-nums">{formatearMoneda(item.costo_por_hora)}</span>
      ),
    },
  ],

  campos: [
    {
      name: 'nombre',
      etiqueta: 'Nombre del equipo',
      tipo: 'texto',
      requerido: true,
      ancho: 'completo',
      placeholder: 'Ej. Camioneta BSI-922, Mezcladora de concreto',
    },
    {
      name: 'costo_por_hora',
      etiqueta: 'Costo por hora (S/)',
      tipo: 'numero',
      requerido: true,
      min: 0,
      paso: '0.01',
      hint: 'Se sugiere al cargar uso en un servicio.',
    },
  ],

  valoresIniciales: {
    nombre: '',
    costo_por_hora: '',
  },

  normalizar: (valores) => ({
    nombre: valores.nombre.trim(),
    costo_por_hora: Number(valores.costo_por_hora),
  }),
}

// ------------------------------------------------------------
//  Servicios (módulo central)
// ------------------------------------------------------------

export const CATALOGO_SERVICIOS = {
  coleccion: 'servicios',
  titulo: 'Servicios',
  descripcion:
    'Servicios contratados con su presupuesto, fecha de inicio y estatus. Abre cada servicio para editarlo o eliminarlo.',
  nombreSingular: 'servicio',
  etiquetaContador: 'servicios',
  // La edición y eliminación viven solo en la página del servicio,
  // no en la tabla del listado.
  soloDetalle: true,
  claveBusqueda: (item) => `${item.nombre_servicio} ${item.cliente} ${item.estatus}`,
  placeholderBusqueda: 'Buscar por servicio, cliente o estatus…',
  mensajeVacio: 'No hay servicios que coincidan con la búsqueda.',
  mensajeSinRegistros: 'Aún no hay servicios registrados.',
  tieneActivo: false,

  columnas: [
    {
      etiqueta: 'Servicio',
      render: (item) => (
        <div>
          <p className="font-medium text-slate-900">{item.nombre_servicio}</p>
          <p className="text-xs text-slate-500">{item.cliente}</p>
        </div>
      ),
    },
    {
      etiqueta: 'Inicio',
      render: (item) => (
        <span className="whitespace-nowrap text-slate-500">
          {formatearFecha(item.fecha_inicio)}
        </span>
      ),
    },
    {
      etiqueta: 'Presupuesto',
      alinear: 'right',
      render: (item) => (
        <span className="tabular-nums">{formatearMoneda(item.presupuesto_asignado)}</span>
      ),
    },
    {
      etiqueta: 'Saldo',
      alinear: 'right',
      render: (item, ctx) => {
        const consumo = consumoPresupuesto(item, ctx.estado.registros_servicio)

        return (
          <span
            className={`font-medium tabular-nums ${consumo.disponible < 0 ? 'text-red-600' : 'text-slate-900'}`}
            title={consumo.disponible < 0 ? 'Excedente' : 'Saldo disponible'}
          >
            {formatearMoneda(consumo.disponible)}
          </span>
        )
      },
    },
    {
      etiqueta: 'Consumo',
      render: (item, ctx) => {
        const consumo = consumoPresupuesto(item, ctx.estado.registros_servicio)

        return (
          <div className="w-28">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${
                  consumo.excedido ? 'bg-red-500' : 'bg-primary-600'
                }`}
                style={{ width: `${Math.min(100, consumo.porcentaje)}%` }}
              />
            </div>
            <p
              className={`mt-1 text-xs tabular-nums ${
                consumo.excedido ? 'text-red-600' : 'text-slate-500'
              }`}
            >
              {consumo.porcentaje.toFixed(1)}%
            </p>
          </div>
        )
      },
    },
    {
      etiqueta: 'Margen proy.',
      alinear: 'right',
      render: (item, ctx) => {
        const tareas = (ctx.estado.tareas ?? []).filter((t) => t.servicio_id === item.id)
        const rent = rentabilidadServicio(item, ctx.estado.registros_servicio, tareas)

        if (rent.margenProyectado == null) {
          return <span className="text-slate-400">—</span>
        }

        const pct = item.presupuesto_asignado
          ? (rent.margenProyectado / item.presupuesto_asignado) * 100
          : 0

        return (
          <span
            className={`font-medium tabular-nums ${rent.margenProyectado < 0 ? 'text-red-600' : 'text-slate-900'}`}
            title={`Margen proyectado ${formatearMoneda(rent.margenProyectado)} (${pct.toFixed(1)}%)`}
          >
            {pct.toFixed(1)}%
          </span>
        )
      },
    },
    {
      etiqueta: 'Estatus',
      render: (item) => <BadgeEstatus estatus={item.estatus} />,
    },
  ],

  campos: [
    {
      name: 'nombre_servicio',
      etiqueta: 'Nombre del servicio',
      tipo: 'texto',
      requerido: true,
      ancho: 'completo',
      placeholder: 'Ej. Remodelación de oficinas administrativas',
    },
    {
      name: 'cliente',
      etiqueta: 'Cliente',
      tipo: 'texto',
      requerido: true,
      placeholder: 'Ej. Constructora Andina S.A.C.',
    },
    {
      name: 'presupuesto_asignado',
      etiqueta: 'Presupuesto asignado (S/)',
      tipo: 'numero',
      requerido: true,
      min: 0,
      paso: '0.01',
    },
    {
      name: 'fecha_inicio',
      etiqueta: 'Fecha de inicio',
      tipo: 'fecha',
      requerido: true,
    },
    {
      name: 'fecha_fin_estimada',
      etiqueta: 'Fecha fin estimada',
      tipo: 'fecha',
      requerido: false,
    },
    {
      name: 'estatus',
      etiqueta: 'Estatus',
      tipo: 'select',
      requerido: true,
      opciones: opciones(ESTATUS_SERVICIO),
    },
  ],

  valoresIniciales: () => ({
    nombre_servicio: '',
    cliente: '',
    presupuesto_asignado: '',
    fecha_inicio: new Date().toISOString().slice(0, 10),
    fecha_fin_estimada: '',
    estatus: '',
  }),

  normalizar: (valores) => ({
    nombre_servicio: valores.nombre_servicio.trim(),
    cliente: valores.cliente.trim(),
    presupuesto_asignado: Number(valores.presupuesto_asignado),
    fecha_inicio: valores.fecha_inicio,
    fecha_fin_estimada: valores.fecha_fin_estimada || '',
    avance: 0,
    estatus: valores.estatus,
  }),

  accionesExtra: (item) => (
    <Link
      to={`/servicios/${item.id}`}
      className="inline-flex items-center rounded-lg border border-primary-300 bg-white px-2.5 py-1.5 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-50"
    >
      Ver
    </Link>
  ),
}