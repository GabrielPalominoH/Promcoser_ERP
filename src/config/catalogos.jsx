import { ESTATUS_SERVICIO, TIPOS_SERVICIO } from '../data/mockData'
import { BadgeEstatus } from '../components/ui/Badge'
import { formatearFecha, formatearMoneda } from '../utils/formatters'
import { cobradoServicio, estadoPresupuesto, registrosDeServicio, sumarMontos, utilidadReal } from '../utils/calculadora'
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
        <span className="font-medium text-slate-900">
          {item.nombre}
          <span className="block text-xs font-normal text-slate-500">
            {(item.propiedad ?? 'Propio') === 'Alquilado' ? 'Alquilado' : 'Propio'}
          </span>
        </span>
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
    {
      name: 'propiedad',
      etiqueta: 'Propiedad',
      tipo: 'select',
      requerido: true,
      opciones: opciones(['Propio', 'Alquilado']),
      hint: 'Define si su uso va a equipos propios o alquilados.',
    },
  ],

  valoresIniciales: {
    nombre: '',
    costo_por_hora: '',
    propiedad: 'Propio',
  },

  normalizar: (valores) => ({
    nombre: valores.nombre.trim(),
    costo_por_hora: Number(valores.costo_por_hora),
    propiedad: valores.propiedad || 'Propio',
  }),
}

// ------------------------------------------------------------
//  Servicios (módulo central)
// ------------------------------------------------------------

export const CATALOGO_SERVICIOS = {
  coleccion: 'servicios',
  titulo: 'Servicios',
  descripcion:
    'Servicios registrados con fechas y estatus. Abre cada servicio para editarlo o eliminarlo.',
  nombreSingular: 'servicio',
  etiquetaContador: 'servicios',
  // La edición y eliminación viven solo en la página del servicio,
  // no en la tabla del listado.
  soloDetalle: true,
  claveBusqueda: (item) => `${item.nombre_servicio} ${item.cliente} ${item.tipo ?? ''} ${item.estatus}`,
  placeholderBusqueda: 'Buscar por servicio, cliente, tipo o estatus…',
  mensajeVacio: 'No hay servicios que coincidan con la búsqueda.',
  mensajeSinRegistros: 'Aún no hay servicios registrados.',
  tieneActivo: false,

  columnas: [
    {
      etiqueta: 'Servicio',
      render: (item) => (
        <div>
          <p className="font-medium text-slate-900">{item.nombre_servicio}</p>
          <p className="text-xs text-slate-500">
            {item.cliente} · {item.tipo ?? 'Obra'}
          </p>
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
        <span className="whitespace-nowrap tabular-nums">{formatearMoneda(item.presupuesto_asignado)}</span>
      ),
    },
    {
      etiqueta: 'Cobrado',
      alinear: 'right',
      render: (item, ctx) => (
        <span className="whitespace-nowrap tabular-nums">{formatearMoneda(cobradoServicio(ctx.estado.cobros, item.id))}</span>
      ),
    },
    {
      etiqueta: 'Gastado',
      alinear: 'right',
      render: (item, ctx) => {
        const gastado = sumarMontos(registrosDeServicio(ctx.estado.registros_servicio, item.id))

        return (
          <span className="whitespace-nowrap tabular-nums">
            {formatearMoneda(gastado)}
          </span>
        )
      },
    },
    {
      etiqueta: 'Saldo',
      alinear: 'right',
      render: (item, ctx) => {
        const estado = estadoPresupuesto(item, ctx.estado.registros_servicio, ctx.estado.cobros)

        return (
          <span
            className={`whitespace-nowrap font-medium tabular-nums ${estado.disponible < 0 ? 'text-red-600' : 'text-slate-900'}`}
            title={estado.disponible < 0 ? 'Excedente' : 'Saldo disponible'}
          >
            {formatearMoneda(estado.disponible)}
          </span>
        )
      },
    },
    {
      etiqueta: 'Consumo',
      render: (item, ctx) => {
        const estado = estadoPresupuesto(item, ctx.estado.registros_servicio, ctx.estado.cobros)

        return (
          <div className="w-28">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${
                  estado.excedido ? 'bg-red-500' : 'bg-primary-600'
                }`}
                style={{ width: `${Math.min(100, estado.porcentaje)}%` }}
              />
            </div>
            <p
              className={`mt-1 text-xs tabular-nums ${
                estado.excedido ? 'text-red-600' : 'text-slate-500'
              }`}
            >
              {estado.porcentaje.toFixed(1)}%
            </p>
          </div>
        )
      },
    },
    {
      etiqueta: 'Utilidad',
      alinear: 'right',
      render: (item, ctx) => {
        const cobrado = cobradoServicio(ctx.estado.cobros, item.id)
        const gastado = sumarMontos(registrosDeServicio(ctx.estado.registros_servicio, item.id))
        const utilidad = utilidadReal(cobrado, gastado)

        return (
          <span
            className={`whitespace-nowrap font-medium tabular-nums ${utilidad < 0 ? 'text-red-600' : 'text-slate-900'}`}
            title={`Utilidad real ${formatearMoneda(utilidad)} (cobrado menos gastado)`}
          >
            {formatearMoneda(utilidad)}
          </span>
        )
      },
    },
    {
      etiqueta: 'Tipo',
      render: (item) => <span className="text-slate-600">{item.tipo ?? 'Obra'}</span>,
    },
    {
      etiqueta: 'Estatus',
      render: (item) => (
        <span className="whitespace-nowrap">
          <BadgeEstatus estatus={item.estatus} />
        </span>
      ),
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
      etiqueta: 'Presupuesto inicial (S/)',
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
      name: 'tipo',
      etiqueta: 'Tipo',
      tipo: 'select',
      requerido: true,
      opciones: opciones(TIPOS_SERVICIO),
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
    tipo: 'Obra',
    presupuesto_asignado: '',
    fecha_inicio: new Date().toISOString().slice(0, 10),
    fecha_fin_estimada: '',
    estatus: '',
  }),

  normalizar: (valores) => ({
    nombre_servicio: valores.nombre_servicio.trim(),
    cliente: valores.cliente.trim(),
    tipo: valores.tipo || 'Obra',
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
