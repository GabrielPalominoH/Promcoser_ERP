// Catálogo fijo de unidades de medida, ordenado pensando en el METRADO de
// obra: primero las unidades con que se cuantifican las partidas del expediente
// técnico (m³, m², ml, und, pto, Glb, kg, t…), después las de insumos, tiempo y
// servicios. No es CRUD: es una constante del sistema.
export const UNIDADES = [
  {
    sigla: 'm³',
    nombre: 'Metro cúbico',
    categoria: 'Volumen',
    ejemplo: 'Concreto, excavación, relleno, movimiento de tierras',
  },
  {
    sigla: 'm²',
    nombre: 'Metro cuadrado',
    categoria: 'Superficie',
    ejemplo: 'Pisos, muros, pintura, revestimientos',
  },
  {
    sigla: 'ml',
    nombre: 'Metro lineal',
    categoria: 'Longitud',
    ejemplo: 'Tuberías, zanjas, cercos, cables',
  },
  {
    sigla: 'und',
    nombre: 'Unidad',
    categoria: 'Unidad',
    ejemplo: 'Pozos, marcos, rejas, elementos contables',
  },
  {
    sigla: 'pto',
    nombre: 'Punto',
    categoria: 'Unidad',
    ejemplo: 'Puntos de agua, desagüe, luz, comunicaciones',
  },
  {
    sigla: 'Glb',
    nombre: 'Global',
    categoria: 'Global',
    ejemplo: 'Partidas globales: limpieza, servicio integral',
  },
  {
    sigla: 'm',
    nombre: 'Metro',
    categoria: 'Longitud',
    ejemplo: 'Estructuras lineales',
  },
  {
    sigla: 'kg',
    nombre: 'Kilogramo',
    categoria: 'Peso',
    ejemplo: 'Acero, alambre, varillas',
  },
  {
    sigla: 't',
    nombre: 'Tonelada',
    categoria: 'Peso',
    ejemplo: 'Acero pesado, materiales a granel',
  },
  {
    sigla: 'gl',
    nombre: 'Galón',
    categoria: 'Líquido',
    ejemplo: 'Combustible, pintura, aditivos',
  },
  {
    sigla: 'lt',
    nombre: 'Litro',
    categoria: 'Líquido',
    ejemplo: 'Impermeabilizantes, aditivos',
  },
  {
    sigla: 'p',
    nombre: 'Pieza',
    categoria: 'Pieza',
    ejemplo: 'Ladrillos, bloques, accesorios',
  },
  {
    sigla: 'pza',
    nombre: 'Pieza',
    categoria: 'Pieza',
    ejemplo: 'Artículos individuales',
  },
  {
    sigla: 'cj',
    nombre: 'Caja',
    categoria: 'Pieza',
    ejemplo: 'Cerámicas, baldosas',
  },
  {
    sigla: 'jgo',
    nombre: 'Juego',
    categoria: 'Pieza',
    ejemplo: 'Herrajes, manijas',
  },
  {
    sigla: 'bls',
    nombre: 'Bolsa',
    categoria: 'Pieza',
    ejemplo: 'Cemento, yeso, cal',
  },
  {
    sigla: 'hh',
    nombre: 'Hora-hombre',
    categoria: 'Tiempo',
    ejemplo: 'Mano de obra (ya usado en Cargos)',
  },
  {
    sigla: 'hm',
    nombre: 'Hora-máquina',
    categoria: 'Tiempo',
    ejemplo: 'Uso de equipos y maquinaria',
  },
  {
    sigla: 'jgl',
    nombre: 'Jornal',
    categoria: 'Tiempo',
    ejemplo: 'Jornada diaria de mano de obra',
  },
  {
    sigla: 'ds',
    nombre: 'Día',
    categoria: 'Tiempo',
    ejemplo: 'Alquiler de equipos/maquinaria',
  },
  {
    sigla: 'vb',
    nombre: 'Viaje',
    categoria: 'Transporte',
    ejemplo: 'Volquetes, camiones',
  },
  {
    sigla: '%',
    nombre: 'Porcentaje',
    categoria: 'Avance',
    ejemplo: 'Avances, prorrateos',
  },
  {
    sigla: 'sm',
    nombre: 'Servicio/mes',
    categoria: 'Servicio',
    ejemplo: 'Servicios recurrentes',
  },
]
