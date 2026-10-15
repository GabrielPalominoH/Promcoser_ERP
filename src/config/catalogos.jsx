import { ESTATUS_SERVICIO, TIPOS_SERVICIO } from '../data/mockData'
import { Badge, BadgeEstatus } from '../components/ui/Badge'
import { formatearFecha, formatearMoneda } from '../utils/formatters'
import { cobradoServicio, estadoPresupuesto, registrosDeServicio, sumarMontos, utilidadReal } from '../utils/calculadora'
import { mismoCargo, opcionesCargo, personasConCargo, puedeEliminarCargo } from '../utils/cargos'
import { puedeEliminarPersonal } from '../utils/personal'
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
  claveBusqueda: (item) =>
    `${item.nombre} ${item.apellido} ${item.cargo} ${item.dni} ${item.ambito ?? 'Obra'} ${
      item.activo !== false ? 'Activo' : 'Inactivo'
    }`,
  placeholderBusqueda: 'Buscar por nombre, apellido, cargo, DNI, ámbito o estado…',
  ordenar: (a, b) =>
    `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`, 'es'),
  mensajeVacio: 'No hay personal que coincida con la búsqueda.',
  mensajeSinRegistros: 'Aún no hay personal registrado.',
  etiquetaItem: (item) => `${item.nombre} ${item.apellido ?? ''}`.trim(),
  // Estado Activo/Inactivo con íconos, igual que Cargos. Un personal
  // desactivado deja de ofrecerse para nuevas asignaciones (sus registros y
  // costos ya guardados siguen contando).
  tieneActivo: true,
  editarIcono: true,
  activoIcono: true,
  // El Eliminar vive dentro del modal de edición (misma regla que Cargos) y
  // solo sale si la ficha no está ligada a nada (ver `bloquearEliminar`).
  eliminarEnEdicion: true,
  bloquearEliminar: (item, estado) => {
    const { ok, motivo } = puedeEliminarPersonal(estado, item)
    return ok ? null : motivo
  },
  // Layout fijo: las columnas no cambian de ancho al filtrar/buscar.
  claseTabla: '[&>table]:table-fixed',
  // Con layout fijo el ancho de columna lo manda la cabecera: se reserva el
  // espacio de [ojo][lápiz] para que las acciones no se desborden.
  claseAcciones: 'w-28',

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
    {
      etiqueta: 'Estado',
      // Ancho fijo: al alternar Activo/Inactivo el texto cambia de largo y, sin
      // esto, la columna se redistribuiría.
      render: (item) => (
        <Badge
          variante={item.activo !== false ? 'success' : 'neutral'}
          className="w-20 justify-center"
        >
          {item.activo !== false ? 'Activo' : 'Inactivo'}
        </Badge>
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
      // Selector con búsqueda alimentado por el módulo Cargos: solo cargos
      // activos. El vínculo es por nombre (ver src/utils/cargos.js).
      tipo: 'combo',
      requerido: true,
      ancho: 'completo',
      placeholder: 'Escribe para buscar en Cargos…',
      hint: 'Se elige del módulo Cargos (solo cargos activos).',
      opciones: (estado, item) => opcionesCargo(estado.cargos, item?.cargo),
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
//  Cargos
// ------------------------------------------------------------

export const CATALOGO_CARGOS = {
  coleccion: 'cargos',
  titulo: 'Cargos',
  descripcion:
    'Catálogo de cargos: nombre, unidad de medida (HH = horas hombre por defecto) y categoría opcional. Cada ficha de personal se vincula por el nombre del cargo.',
  nombreSingular: 'cargo',
  etiquetaContador: 'cargos',
  claveBusqueda: (item) => `${item.nombre} ${item.unidad ?? ''} ${item.categoria ?? ''}`,
  placeholderBusqueda: 'Buscar por cargo, unidad o categoría…',
  mensajeVacio: 'No hay cargos que coincidan con la búsqueda.',
  mensajeSinRegistros: 'Aún no hay cargos registrados.',
  tieneActivo: true,
  editarIcono: true,
  activoIcono: true,
  eliminarEnEdicion: true,
  etiquetaItem: (item) => item.nombre,
  ordenar: (a, b) => a.nombre.localeCompare(b.nombre, 'es'),

  columnas: [
    {
      etiqueta: 'Cargo',
      render: (item) => (
        <span className="font-medium break-words text-slate-900">{item.nombre}</span>
      ),
    },
    {
      etiqueta: 'Unidad',
      render: (item) => <span className="whitespace-nowrap text-slate-500">{item.unidad}</span>,
    },
    {
      etiqueta: 'Categoría',
      render: (item) =>
        item.categoria ? (
          <span className="text-slate-600">{item.categoria}</span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      etiqueta: 'Personas',
      alinear: 'right',
      render: (item, ctx) => {
        const total = personasConCargo(ctx.estado.personal, item.nombre).length

        return (
          <span
            className={`tabular-nums ${total > 0 ? 'font-medium text-slate-900' : 'text-slate-400'}`}
            title={`${total} ficha(s) de personal con este cargo`}
          >
            {total}
          </span>
        )
      },
    },
    {
      etiqueta: 'Estado',
      // El badge tiene ancho fijo: al alternar Activo/Inactivo el texto cambia
      // de largo y, sin esto, la columna (y con ella toda la fila) se
      // redistribuiría. `activo` ausente cuenta como activo.
      render: (item) => (
        <Badge
          variante={item.activo !== false ? 'success' : 'neutral'}
          className="w-20 justify-center"
        >
          {item.activo !== false ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
  ],

  campos: [
    {
      name: 'nombre',
      etiqueta: 'Nombre del cargo',
      tipo: 'texto',
      requerido: true,
      ancho: 'completo',
      placeholder: 'Ej. Jefe de obra',
    },
    {
      name: 'unidad',
      etiqueta: 'Unidad',
      tipo: 'texto',
      requerido: true,
      placeholder: 'HH',
      hint: 'HH = horas hombre (por defecto). Cambia la sigla si el cargo se mide en otra unidad.',
    },
    {
      name: 'categoria',
      etiqueta: 'Categoría (opcional)',
      tipo: 'texto',
      requerido: false,
      ancho: 'completo',
      placeholder: 'Ej. Supervisión',
      hint: 'Agrupación libre para reportes: Operativo, Supervisión, Administrativo…',
    },
  ],

  valoresIniciales: {
    nombre: '',
    unidad: 'HH',
    categoria: '',
  },

  normalizar: (valores) => ({
    nombre: valores.nombre.trim(),
    unidad: valores.unidad.trim() || 'HH',
    categoria: valores.categoria.trim(),
  }),

  // Renombrar un cargo arrastra el nuevo nombre a las fichas de personal
  // vinculadas (el vínculo es por nombre; ver src/utils/cargos.js).
  alActualizar: (anterior, nuevo, { estado, actualizarItem }) => {
    if (mismoCargo(anterior.nombre, nuevo.nombre)) return

    for (const persona of personasConCargo(estado.personal, anterior.nombre)) {
      actualizarItem('personal', { ...persona, cargo: nuevo.nombre })
    }
  },

  // Solo se puede borrar si no hay personal ligado.
  bloquearEliminar: (item, estado) => {
    const { ok, motivo } = puedeEliminarCargo(estado.personal, item.nombre)
    return ok ? null : motivo
  },
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
  etiquetaItem: (item) => item.nombre,
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

// Resumen económico de un servicio. Es la única fuente para cobrado,
// gastado, saldo y utilidad: lo comparten las columnas de la tabla y la
// vista en tarjetas, para que ambos formatos muestren siempre lo mismo.
const resumenServicio = (item, ctx) => {
  const cobrado = cobradoServicio(ctx.estado.cobros, item.id)
  const gastado = sumarMontos(registrosDeServicio(ctx.estado.registros_servicio, item.id))

  return {
    cobrado,
    gastado,
    estado: estadoPresupuesto(item, ctx.estado.registros_servicio, ctx.estado.cobros),
    utilidad: utilidadReal(cobrado, gastado),
  }
}

// Dato rotulado dentro de una tarjeta de servicio. El valor nunca se corta:
// si no cabe, salta de línea de forma natural.
const DatoServicio = ({ etiqueta, valor, destacado = false }) => (
  <div className="min-w-0">
    <dt className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">{etiqueta}</dt>
    <dd
      className={`mt-0.5 text-sm font-medium break-words tabular-nums ${
        destacado ? 'text-red-600' : 'text-slate-900'
      }`}
    >
      {valor}
    </dd>
  </div>
)

export const CATALOGO_SERVICIOS = {
  coleccion: 'servicios',
  titulo: 'Servicios',
  descripcion:
    'Servicios registrados con fechas y estatus. Abre cada servicio para editarlo o eliminarlo.',
  nombreSingular: 'servicio',
  etiquetaContador: 'servicios',
  // La edición y eliminación viven solo en la página del servicio,
  // no en el listado.
  soloDetalle: true,
  // El listado se muestra como cuadrícula de tarjetas (cada tarjeta abre
  // el servicio) en lugar de como tabla.
  vista: 'tarjetas',
  claveBusqueda: (item) => `${item.nombre_servicio} ${item.cliente} ${item.tipo ?? ''} ${item.estatus}`,
  placeholderBusqueda: 'Buscar por servicio, cliente, tipo o estatus…',
  mensajeVacio: 'No hay servicios que coincidan con la búsqueda.',
  mensajeSinRegistros: 'Aún no hay servicios registrados.',
  etiquetaItem: (item) => item.nombre_servicio,
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
        <span className="whitespace-nowrap tabular-nums">{formatearMoneda(resumenServicio(item, ctx).cobrado)}</span>
      ),
    },
    {
      etiqueta: 'Gastado',
      alinear: 'right',
      render: (item, ctx) => (
        <span className="whitespace-nowrap tabular-nums">
          {formatearMoneda(resumenServicio(item, ctx).gastado)}
        </span>
      ),
    },
    {
      etiqueta: 'Saldo',
      alinear: 'right',
      render: (item, ctx) => {
        const estado = resumenServicio(item, ctx).estado

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
        const estado = resumenServicio(item, ctx).estado

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
        const utilidad = resumenServicio(item, ctx).utilidad

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

  // Cada tarjeta es, en sí, el enlace al servicio: reúne cliente, estatus,
  // fechas y el resumen económico del mismo `resumenServicio` que usa la
  // tabla. El listado no tiene botones (soloDetalle), así que no hay
  // controles anidados dentro del enlace.
  renderTarjeta: (item, ctx) => {
    const { estado, cobrado, gastado, utilidad } = resumenServicio(item, ctx)

    return (
      <Link
        to={`/servicios/${item.id}`}
        className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-primary-300 hover:bg-slate-50"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {/* Sin truncado: el nombre completo, con salto de línea natural. */}
            <h3 className="text-lg font-semibold break-words text-slate-900 transition-colors group-hover:text-primary-700">
              {item.nombre_servicio}
            </h3>
            <p className="mt-0.5 text-xs break-words text-slate-500">
              {item.cliente} · {item.tipo ?? 'Obra'}
            </p>
          </div>
          <span className="shrink-0">
            <BadgeEstatus estatus={item.estatus} />
          </span>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          <DatoServicio etiqueta="Presupuesto" valor={formatearMoneda(item.presupuesto_asignado)} />
          <DatoServicio etiqueta="Cobrado" valor={formatearMoneda(cobrado)} />
          <DatoServicio etiqueta="Gastado" valor={formatearMoneda(gastado)} />
          <DatoServicio
            etiqueta="Saldo"
            valor={formatearMoneda(estado.disponible)}
            destacado={estado.disponible < 0}
          />
          <DatoServicio
            etiqueta="Utilidad"
            valor={formatearMoneda(utilidad)}
            destacado={utilidad < 0}
          />
          <DatoServicio etiqueta="Inicio" valor={formatearFecha(item.fecha_inicio)} />
        </dl>

        <div className="mt-auto pt-4">
          <div className="flex items-center justify-between text-[11px] font-medium tracking-wide text-slate-500 uppercase">
            <span>Consumo</span>
            <span
              className={`tabular-nums ${estado.excedido ? 'font-semibold text-red-600' : 'text-slate-700'}`}
            >
              {estado.porcentaje.toFixed(1)}%
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${estado.excedido ? 'bg-red-500' : 'bg-primary-600'}`}
              style={{ width: `${Math.min(100, estado.porcentaje)}%` }}
            />
          </div>
          <span className="mt-2 flex items-center gap-1 text-xs font-medium text-primary-700">
            Abrir servicio
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-3.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </span>
        </div>
      </Link>
    )
  },
}
