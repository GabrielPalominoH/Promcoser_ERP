// ============================================================
//  PROMCOSER — Control Maestro de Servicios
//  Datos simulados (mock). Base local en memoria + localStorage.
//  Sin backend, sin API, sin autenticación.
// ============================================================

export const UNIDADES_MEDIDA = [
  'unidad',
  'metro',
  'm2',
  'm3',
  'kg',
  'litro',
  'galón',
  'rollo',
  'saco',
  'juego',
  'hora',
]

export const ESTADOS_OPERATIVOS = [
  'Operativo',
  'En mantenimiento',
  'De baja',
]

export const ESTATUS_SERVICIO = [
  'Pendiente',
  'En curso',
  'Finalizado',
  'Cancelado',
]

export const TIPOS_REGISTRO = ['material', 'personal', 'gasto', 'equipo']

// ------------------------------------------------------------
//  1. Catálogos maestros
// ------------------------------------------------------------

export const personal = [
  { id: 1, nombre: 'Elmer Adonis', apellido: 'Achulla Polanco', cargo: 'Oficial', dni: '77086559' },
  { id: 2, nombre: 'Alexis David', apellido: 'Alcarraz Quispe', cargo: 'Oficial', dni: '63090109' },
  { id: 3, nombre: 'Ronald Martin', apellido: 'Alvarado Agreda', cargo: 'Ayudante', dni: '60741098' },
  { id: 4, nombre: 'Mirtha Consuelo', apellido: 'Alvarez Gameros', cargo: 'Oficial', dni: '75715613' },
  { id: 5, nombre: 'Moises Juan', apellido: 'Alvarez Crespo', cargo: 'Jefe Ssoma', dni: '42415460' },
  { id: 6, nombre: 'Sally Yandira', apellido: 'Alvites Bobadilla', cargo: 'Asistente Ssoma', dni: '71124981' },
  { id: 7, nombre: 'Jesus Catriel Sabino', apellido: 'Amable Garces', cargo: 'Operador', dni: '72202600' },
  { id: 8, nombre: 'Oscar Manuel', apellido: 'Amaru Huamani', cargo: 'Mecanico Electricista', dni: '73221445' },
  { id: 9, nombre: 'Angel Vicente', apellido: 'Anampa Velasquez', cargo: 'Operario', dni: '43248461' },
  { id: 10, nombre: 'Juan Jose', apellido: 'Aquino Lachira', cargo: 'Supervisor de Calidad', dni: '76182598' },
  { id: 11, nombre: 'Esteban Jeremias', apellido: 'Arroyo Abanto', cargo: 'Operador', dni: '10363255' },
  { id: 12, nombre: 'Piero Paolo', apellido: 'Arteaga Urrunaga', cargo: 'Oficial', dni: '48199796' },
  { id: 13, nombre: 'Angel Richard', apellido: 'Avila Vasquez', cargo: 'Jefe OT', dni: '43280802' },
  { id: 14, nombre: 'Sandro Luis', apellido: 'Bardales Trujillo', cargo: 'Oficial', dni: '73095782' },
  { id: 15, nombre: 'Gissela Elvira', apellido: 'Benavente Pajuelo', cargo: 'Asistente Contable', dni: '49328488' },
  { id: 16, nombre: 'Juan de Dios', apellido: 'Cabrera Cuba', cargo: 'Operador Multiple', dni: '21533049' },
  { id: 17, nombre: 'Miguel Angel', apellido: 'Cabrera Barranca', cargo: 'Operario Civil', dni: '45519254' },
  { id: 18, nombre: 'Ciro Alexander', apellido: 'Calachihua Huaychay', cargo: 'Operario/Conductor', dni: '47665722' },
  { id: 19, nombre: 'Paul', apellido: 'Calderon Nolasco', cargo: 'Mecanico/Conductor', dni: '42121463' },
  { id: 20, nombre: 'Marco Antonio', apellido: 'Calle Bautista', cargo: 'Mecanico/Conductor', dni: '48304766' },
  { id: 21, nombre: 'Cristhian', apellido: 'Carbajal Santaria', cargo: 'Operador', dni: '47122319' },
  { id: 22, nombre: 'Erwen Heiner', apellido: 'Carrasco Ninasivincha', cargo: 'Asistente Contable Junior', dni: '71486101' },
  { id: 23, nombre: 'Rosa Victoria', apellido: 'Carrillo Quispes', cargo: 'Supervisora Ssoma', dni: '73109334' },
  { id: 24, nombre: 'Abran', apellido: 'Castro Leon', cargo: 'Operador / Mecanico', dni: '73261821' },
  { id: 25, nombre: 'Wilfredo Juan', apellido: 'Cayo Gutierrez', cargo: 'Operario Civil', dni: '70521524' },
  { id: 26, nombre: 'Damian Celso', apellido: 'Cayo Gutierrez', cargo: 'Capataz Civil', dni: '70521512' },
  { id: 27, nombre: 'Jhon Pedro', apellido: 'Ccesso Barrientos', cargo: 'Asistente Logistico', dni: '42359661' },
  { id: 28, nombre: 'Jesus Giancarlo', apellido: 'Cervantes Herrera', cargo: 'Oficial', dni: '71471029' },
  { id: 29, nombre: 'Huberth Emerson', apellido: 'Chipa Rivas', cargo: 'Operador', dni: '44925714' },
  { id: 30, nombre: 'Julio Cesar', apellido: 'Chira Borda', cargo: 'Operario Civil', dni: '46697801' },
  { id: 31, nombre: 'Jose Alfredo', apellido: 'Cotrina Altamirano', cargo: 'Ayudante', dni: '74562849' },
  { id: 32, nombre: 'Alex Xander', apellido: 'Cuellar Rosales', cargo: 'Jefe de Costos y Presupuestos', dni: '47930920' },
  { id: 33, nombre: 'Andrea', apellido: 'Cueto Franco', cargo: 'Administradora', dni: '73130000' },
  { id: 34, nombre: 'Walter Luis Antonio', apellido: 'De la Cruz Antayhua', cargo: 'Mecanico/Conductor', dni: '70326377' },
  { id: 35, nombre: 'Asunción', apellido: 'Del Águila Pérez', cargo: 'Oficial / Soldador', dni: '73099959' },
  { id: 36, nombre: 'Juan Hipolito', apellido: 'Diaz Herrera', cargo: 'Operador', dni: '22102007' },
  { id: 37, nombre: 'Joshua Manuel Humberto', apellido: 'Farias Ulfe', cargo: 'Oficial', dni: '76891111' },
  { id: 38, nombre: 'Luis Alfredo', apellido: 'Flores Puntriano', cargo: 'Lider del Taller', dni: '44188288' },
  { id: 39, nombre: 'Hector', apellido: 'Galvez Ravines', cargo: 'Operador', dni: '48380481' },
  { id: 40, nombre: 'Wilfredo Mario', apellido: 'Garcia Ramirez', cargo: 'Supervisor Operativo', dni: '22093461' },
  { id: 41, nombre: 'Richard Felix', apellido: 'Garriazo Osco', cargo: 'Operario', dni: '43141186' },
  { id: 42, nombre: 'Christopher Ivan', apellido: 'Gomez Huaman', cargo: 'Ayudante General', dni: '77300587' },
  { id: 43, nombre: 'David', apellido: 'Guevara Llatas', cargo: 'Asistente Administrativo', dni: '70263956' },
  { id: 44, nombre: 'Joe Sebastian', apellido: 'Guevara Bellido', cargo: 'Operario/Conductor', dni: '70057050' },
  { id: 45, nombre: 'Jose Eli', apellido: 'Guevara Llatas', cargo: 'Operario Mecanico', dni: '70056279' },
  { id: 46, nombre: 'Jimmy Jose', apellido: 'Hernandez Tasayco', cargo: 'Mecanico/Conductor', dni: '41190556' },
  { id: 47, nombre: 'Jhony', apellido: 'Huaccalsaico Cocchi', cargo: 'Operario', dni: '73937019' },
  { id: 48, nombre: 'Braulio', apellido: 'Huaman Diaz', cargo: 'Supervisor Operativo', dni: '21520749' },
  { id: 49, nombre: 'Zenon', apellido: 'Huaman Misaico', cargo: 'Supervisor (Ssoma)', dni: '21576464' },
  { id: 50, nombre: 'Julio Cesar', apellido: 'Huaman Ventura', cargo: 'Operador', dni: '43474922' },
  { id: 51, nombre: 'Any Roxana', apellido: 'Huanqui Quispe', cargo: 'Supervisora de Produccion', dni: '70258839' },
  { id: 52, nombre: 'Karol Edith', apellido: 'Huarote Chumbiauca', cargo: 'Supervisora Ssoma', dni: '73348890' },
  { id: 53, nombre: 'Vanessa', apellido: 'Huaylla Quispe', cargo: 'Coordinadora de Proyectos', dni: '46429040' },
  { id: 54, nombre: 'Luis Alberto', apellido: 'Huilca Condori', cargo: 'Contador', dni: '47065296' },
  { id: 55, nombre: 'Dany Daniel', apellido: 'Ibarra Garcia', cargo: 'Operario Mecanico', dni: '44648315' },
  { id: 56, nombre: 'Zoila', apellido: 'Jean Pacaya', cargo: 'Supervisora Ssoma', dni: '76068227' },
  { id: 57, nombre: 'Victor Manuel', apellido: 'Jimenez Mejia', cargo: 'Supervisor Operativo', dni: '45587650' },
  { id: 58, nombre: 'Briham', apellido: 'Lagunas Gil', cargo: 'Operario Mecanico', dni: '76408043' },
  { id: 59, nombre: 'William Samuel', apellido: 'Limascca Llacsa', cargo: 'Operador', dni: '74039350' },
  { id: 60, nombre: 'Kevin Nicolás', apellido: 'Lopez Reyes', cargo: 'Asistente Logistica', dni: '70363763' },
  { id: 61, nombre: 'Abel Enrique', apellido: 'Machado Vivanco', cargo: 'Operador', dni: '70397918' },
  { id: 62, nombre: 'Mario Joel', apellido: 'Machado Vivanco', cargo: 'Gerente Gerenal', dni: '40907435' },
  { id: 63, nombre: 'Crhistian Alexis', apellido: 'Medina Espinoza', cargo: 'Ayudante', dni: '75856201' },
  { id: 64, nombre: 'Dennis Alexander', apellido: 'Mendoza Dueñas', cargo: 'Auxiliar Contable', dni: '71531647' },
  { id: 65, nombre: 'Mario Enrique', apellido: 'Mendoza Tamani', cargo: 'Operario', dni: '70429892' },
  { id: 66, nombre: 'Giovanny Franco', apellido: 'Mestanza Ramirez', cargo: 'Ayudante', dni: '61053571' },
  { id: 67, nombre: 'Eguiluz Yury', apellido: 'Mita Naventa', cargo: 'Operador / Conductor', dni: '42656045' },
  { id: 68, nombre: 'Oscar Ivan', apellido: 'Montoya Pari', cargo: 'Operador', dni: '75863580' },
  { id: 69, nombre: 'Wilmer', apellido: 'Morales Julcamoro', cargo: 'Lider del Taller', dni: '40264568' },
  { id: 70, nombre: 'Carlos Antonio', apellido: 'Naventa Auccapuclla', cargo: 'Operador', dni: '72790213' },
  { id: 71, nombre: 'Erick', apellido: 'Novoa Barbaran', cargo: 'Oficial Mecanico', dni: '61810099' },
  { id: 72, nombre: 'Walter Elias', apellido: 'Ormeño Mendivel', cargo: 'Supervisor Operativo', dni: '71486032' },
  { id: 73, nombre: 'Gabriel Omar', apellido: 'Palomino Huaman', cargo: 'Asistente de Sistemnas', dni: '70116517' },
  { id: 74, nombre: 'Gabriel Jackson', apellido: 'Panduro Gonzales', cargo: 'Operario Civil', dni: '42916520' },
  { id: 75, nombre: 'Cesar Augusto', apellido: 'Pareja Quispe', cargo: 'Capataz', dni: '42710897' },
  { id: 76, nombre: 'Wilber Ronald', apellido: 'Parisuaña Apaza', cargo: 'Asistente Logistica', dni: '70147550' },
  { id: 77, nombre: 'Victor Raul', apellido: 'Perez Contreras', cargo: 'Supervisor', dni: '41531893' },
  { id: 78, nombre: 'Jorge Luis', apellido: 'Perez Levano', cargo: 'Mecanico/Conductor', dni: '40428123' },
  { id: 79, nombre: 'Moises', apellido: 'Pinto Sayon', cargo: 'Oficial', dni: '76065367' },
  { id: 80, nombre: 'Jesus', apellido: 'Portal Sanchez', cargo: 'Ayudante', dni: '75222665' },
  { id: 81, nombre: 'Luis Angel', apellido: 'Quijaite Uculmana', cargo: 'Jefe de Proyectos', dni: '46556923' },
  { id: 82, nombre: 'Juan Eduardo', apellido: 'Quiliche Borja', cargo: 'Operador', dni: '48755900' },
  { id: 83, nombre: 'Wilbert', apellido: 'Quispe Bolivar', cargo: 'Operador', dni: '46946019' },
  { id: 84, nombre: 'Javier Victor', apellido: 'Reyes Ramos', cargo: 'Conductor', dni: '41653715' },
  { id: 85, nombre: 'Edwin Cesar', apellido: 'Rivas Yauyo', cargo: 'Ayudante / Mecanico', dni: '71209119' },
  { id: 86, nombre: 'Emerson', apellido: 'Rodriguez Quijahuaman', cargo: 'Operador', dni: '48730880' },
  { id: 87, nombre: 'Ludmer Nicolas', apellido: 'Roman Flores', cargo: 'Supervisor de Producción', dni: '43904646' },
  { id: 88, nombre: 'Porfirio Jose', apellido: 'Romucho Huaman', cargo: 'Operador/Conductor', dni: '71831041' },
  { id: 89, nombre: 'Richard', apellido: 'Rosales Pascual', cargo: 'Operario', dni: '48767201' },
  { id: 90, nombre: 'Alfredo John', apellido: 'Saccatoma Valenzuela', cargo: 'Operador Multiple', dni: '22315122' },
  { id: 91, nombre: 'Jennifer Alexandra', apellido: 'Sandoval Allauja', cargo: 'Supervisora Ssoma', dni: '70354844' },
  { id: 92, nombre: 'Kenyiro Alberto', apellido: 'Sandoval Villanueva', cargo: 'Asistente Logistica', dni: '74855178' },
  { id: 93, nombre: 'Henry Mohamed Ali', apellido: 'Sarmiento Ortega', cargo: 'Operario Multiple', dni: '78110732' },
  { id: 94, nombre: 'Erick Henderson', apellido: 'Sifuentes Chavez', cargo: 'Operario Mecanico', dni: '44819578' },
  { id: 95, nombre: 'Mateo Dario', apellido: 'Silva Pinto', cargo: 'Oficial', dni: '61412617' },
  { id: 96, nombre: 'Aner', apellido: 'Tamayo Canayo', cargo: 'Oficial Civil', dni: '47671343' },
  { id: 97, nombre: 'Walter Alejandro', apellido: 'Tapia Tarrillo', cargo: 'Operario Civil', dni: '76827936' },
  { id: 98, nombre: 'Yasser Yrwin', apellido: 'Torres Valiente', cargo: 'Operario Civil', dni: '48660895' },
  { id: 99, nombre: 'Junior Jaime', apellido: 'Torres Suarez', cargo: 'Operario Mecanico', dni: '47100759' },
  { id: 100, nombre: 'Victor Carlos', apellido: 'Vasquez Hernandez', cargo: 'Supervisor Operativo', dni: '40384005' },
  { id: 101, nombre: 'Joselyn Rosmery', apellido: 'Vergara Ormeño', cargo: 'Supervisor (Operativo)', dni: '72019276' },
  { id: 102, nombre: 'William', apellido: 'Yauyo Panchillo', cargo: 'Oficial Mecanico / Soldador', dni: '71533376' },
  { id: 103, nombre: 'Jair Alexis', apellido: 'Zavala Farias', cargo: 'Oficial', dni: '70034594' },
  { id: 104, nombre: 'Jhonatan', apellido: 'Zulueta Lozada', cargo: 'Supervisor Operativo', dni: '71689937' },
]

export const materiales = [
  {
    id: 1,
    nombre: 'Cemento Portland Tipo I',
    unidad_medida: 'saco',
    costo_unitario: 38.5,
    activo: true,
  },
  {
    id: 2,
    nombre: 'Ladrillo Kingsize de arcilla',
    unidad_medida: 'unidad',
    costo_unitario: 3.2,
    activo: true,
  },
  {
    id: 3,
    nombre: 'Acero de refuerzo 1/2 pulg',
    unidad_medida: 'metro',
    costo_unitario: 24.9,
    activo: true,
  },
  {
    id: 4,
    nombre: 'Arena gruesa',
    unidad_medida: 'm3',
    costo_unitario: 62,
    activo: true,
  },
  {
    id: 5,
    nombre: 'Pintura acrílica blanco',
    unidad_medida: 'galón',
    costo_unitario: 96,
    activo: true,
  },
  {
    id: 6,
    nombre: 'Cables THHN calibre 12',
    unidad_medida: 'rollo',
    costo_unitario: 410,
    activo: true,
  },
  {
    id: 7,
    nombre: 'Casetón de hormigón',
    unidad_medida: 'unidad',
    costo_unitario: 18.75,
    activo: true,
  },
  {
    id: 8,
    nombre: 'Tubería PVC Corrugado 4 pulg',
    unidad_medida: 'metro',
    costo_unitario: 27.4,
    activo: false,
  },
]

export const equipos = [
  { id: 1, nombre: 'Camioneta BSI-922' },
  { id: 2, nombre: 'Cisterna de Agua BEA-747' },
  { id: 3, nombre: 'Volquete BRP-888' },
  { id: 4, nombre: 'Camioneta BJU-824' },
  { id: 5, nombre: 'Camión Baranda CCJ-900' },
  { id: 6, nombre: 'Volquete BRP-887' },
  { id: 7, nombre: 'Camión Baranda BXQ-768' },
  { id: 8, nombre: 'Miniván CPR-012' },
  { id: 9, nombre: 'Miniván CWF-344' },
  { id: 10, nombre: 'Camioneta BBD-873' },
  { id: 11, nombre: 'Volquete BMI-757' },
  { id: 12, nombre: 'Volquete BMI-856' },
  { id: 13, nombre: 'Camioneta BVR-788' },
  { id: 14, nombre: 'Camioneta BVW-820' },
  { id: 15, nombre: 'Camioneta CEB-793' },
  { id: 16, nombre: 'Camioneta CEM-838' },
  { id: 17, nombre: 'Camioneta CHP-770' },
  { id: 18, nombre: 'Camioneta CJI-818' },
  { id: 19, nombre: 'Miniván BVW-497' },
  { id: 20, nombre: 'Camioneta CHL-803' },
  { id: 21, nombre: 'Camioneta CNP-931' },
  { id: 22, nombre: 'Camioneta CNS-898' },
  { id: 23, nombre: 'Mezcladora de concreto' },
  { id: 24, nombre: 'Generador diesel 15 kVA' },
  { id: 25, nombre: 'Andamio modular' },
]

// ------------------------------------------------------------
//  2. Módulo central y relaciones
// ------------------------------------------------------------

export const servicios = [
  {
    id: 1,
    nombre_servicio: 'Remodelación de oficinas administrativas',
    cliente: 'Constructora Andina S.A.C.',
    presupuesto_asignado: 48500,
    fecha_inicio: '2026-01-15',
    fecha_fin_estimada: '2026-11-30',
    avance: 45,
    estatus: 'En curso',
  },
  {
    id: 2,
    nombre_servicio: 'Mantenimiento de red eléctrica',
    cliente: 'Molinos del Sur E.I.R.L.',
    presupuesto_asignado: 22000,
    fecha_inicio: '2026-02-02',
    fecha_fin_estimada: '2026-03-20',
    avance: 60,
    estatus: 'En curso',
  },
  {
    id: 3,
    nombre_servicio: 'Habilitación de laboratorio de calidad',
    cliente: 'Universidad Continental',
    presupuesto_asignado: 76000,
    fecha_inicio: '2026-03-10',
    fecha_fin_estimada: '2026-07-10',
    avance: 0,
    estatus: 'Pendiente',
  },
  {
    id: 4,
    nombre_servicio: 'Adecuación de Snack Bar',
    cliente: 'Hotel Costa Verde',
    presupuesto_asignado: 31500,
    fecha_inicio: '2025-11-20',
    fecha_fin_estimada: '2025-12-20',
    avance: 100,
    estatus: 'Finalizado',
  },
  {
    id: 5,
    nombre_servicio: 'Saneamiento de baños Block B',
    cliente: 'Inmobiliaria Los Andes',
    presupuesto_asignado: 18750,
    fecha_inicio: '2026-04-05',
    fecha_fin_estimada: '2026-05-20',
    avance: 0,
    estatus: 'Pendiente',
  },
]

export const registros_servicio = [
  // Servicio 1 — Remodelación de oficinas (en curso, dentro del plazo)
  {
    id: 1,
    servicio_id: 1,
    tipo_registro: 'material',
    referencia_id: null,
    nombre_material: 'Cemento Portland Tipo I',
    cantidad_o_horas: 120,
    monto_calculado: 4620,
    fecha: '2026-01-18',
  },
  {
    id: 2,
    servicio_id: 1,
    tipo_registro: 'material',
    referencia_id: null,
    nombre_material: 'Arena gruesa',
    cantidad_o_horas: 14,
    monto_calculado: 868,
    fecha: '2026-01-28',
  },
  {
    id: 3,
    servicio_id: 1,
    tipo_registro: 'gasto',
    referencia_id: null,
    concepto: 'Alquiler de andamios',
    cantidad_o_horas: 1,
    monto_calculado: 900,
    fecha: '2026-01-22',
  },
  {
    id: 4,
    servicio_id: 1,
    tipo_registro: 'equipo',
    referencia_id: 1,
    cantidad_o_horas: 16,
    monto_calculado: 0,
    fecha: '2026-02-05',
  },
  {
    id: 5,
    servicio_id: 1,
    tipo_registro: 'material',
    referencia_id: null,
    nombre_material: 'Ladrillo Kingsize de arcilla',
    cantidad_o_horas: 2000,
    monto_calculado: 6400,
    fecha: '2026-03-02',
  },
  {
    id: 6,
    servicio_id: 1,
    tipo_registro: 'gasto',
    referencia_id: null,
    concepto: 'Flete de materiales',
    cantidad_o_horas: 1,
    monto_calculado: 450,
    fecha: '2026-03-03',
  },

  // Servicio 2 — Mantenimiento de red eléctrica (plazo vencido)
  {
    id: 7,
    servicio_id: 2,
    tipo_registro: 'material',
    referencia_id: null,
    nombre_material: 'Cables THHN calibre 12',
    cantidad_o_horas: 8,
    monto_calculado: 3280,
    fecha: '2026-02-06',
  },
  {
    id: 8,
    servicio_id: 2,
    tipo_registro: 'material',
    referencia_id: null,
    nombre_material: 'Tubería PVC 4 pulg',
    cantidad_o_horas: 45,
    monto_calculado: 1120.5,
    fecha: '2026-02-11',
  },
  {
    id: 9,
    servicio_id: 2,
    tipo_registro: 'gasto',
    referencia_id: null,
    concepto: 'Movilidad del personal técnico',
    cantidad_o_horas: 1,
    monto_calculado: 1250,
    fecha: '2026-02-09',
  },
  {
    id: 10,
    servicio_id: 2,
    tipo_registro: 'equipo',
    referencia_id: 5,
    cantidad_o_horas: 40,
    monto_calculado: 0,
    fecha: '2026-02-12',
  },

  // Servicio 4 — Adecuación de Snack Bar (finalizado, dentro del presupuesto)
  {
    id: 11,
    servicio_id: 4,
    tipo_registro: 'material',
    referencia_id: null,
    nombre_material: 'Pintura acrílica blanco',
    cantidad_o_horas: 22,
    monto_calculado: 8470,
    fecha: '2025-11-24',
  },
  {
    id: 12,
    servicio_id: 4,
    tipo_registro: 'material',
    referencia_id: null,
    nombre_material: 'Casetón de hormigón',
    cantidad_o_horas: 160,
    monto_calculado: 3000,
    fecha: '2025-11-26',
  },
  {
    id: 13,
    servicio_id: 4,
    tipo_registro: 'gasto',
    referencia_id: null,
    concepto: 'Limpieza final de obra',
    cantidad_o_horas: 1,
    monto_calculado: 640,
    fecha: '2025-12-01',
  },
  {
    id: 14,
    servicio_id: 4,
    tipo_registro: 'equipo',
    referencia_id: 11,
    cantidad_o_horas: 60,
    monto_calculado: 0,
    fecha: '2025-11-28',
  },

  // Servicio 5 — Saneamiento de baños (recién iniciado)
  {
    id: 15,
    servicio_id: 5,
    tipo_registro: 'material',
    referencia_id: null,
    nombre_material: 'Tubería PVC desagüe 4 pulg',
    cantidad_o_horas: 30,
    monto_calculado: 822,
    fecha: '2026-04-08',
  },
  {
    id: 16,
    servicio_id: 5,
    tipo_registro: 'gasto',
    referencia_id: null,
    concepto: 'Flete de materiales',
    cantidad_o_horas: 1,
    monto_calculado: 350,
    fecha: '2026-04-08',
  },
  {
    id: 17,
    servicio_id: 5,
    tipo_registro: 'material',
    referencia_id: null,
    nombre_material: 'Cemento Portland Tipo I',
    cantidad_o_horas: 20,
    monto_calculado: 770,
    fecha: '2026-04-10',
  },
  {
    id: 18,
    servicio_id: 5,
    tipo_registro: 'equipo',
    referencia_id: 8,
    cantidad_o_horas: 8,
    monto_calculado: 0,
    fecha: '2026-04-11',
  },
]

// ------------------------------------------------------------
//  3. Cronograma (tareas por servicio)
// ------------------------------------------------------------

export const tareas = [
  // Servicio 1 — Remodelación de oficinas
  { id: 1, servicio_id: 1, nombre: 'Demolición y desmontaje', fecha_inicio: '2026-01-15', fecha_fin: '2026-01-31', avance: 100 },
  { id: 2, servicio_id: 1, nombre: 'Albañilería y tarrajeo', fecha_inicio: '2026-02-01', fecha_fin: '2026-03-15', avance: 60 },
  { id: 3, servicio_id: 1, nombre: 'Instalaciones eléctricas', fecha_inicio: '2026-03-01', fecha_fin: '2026-04-10', avance: 20 },
  { id: 4, servicio_id: 1, nombre: 'Pintura y acabados', fecha_inicio: '2026-04-11', fecha_fin: '2026-05-20', avance: 0 },
  { id: 5, servicio_id: 1, nombre: 'Limpieza y entrega', fecha_inicio: '2026-05-21', fecha_fin: '2026-05-30', avance: 0 },
  // Servicio 2 — Mantenimiento de red eléctrica
  { id: 6, servicio_id: 2, nombre: 'Inspección de red', fecha_inicio: '2026-02-02', fecha_fin: '2026-02-08', avance: 100 },
  { id: 7, servicio_id: 2, nombre: 'Cambio de cableado', fecha_inicio: '2026-02-09', fecha_fin: '2026-03-10', avance: 70 },
  { id: 8, servicio_id: 2, nombre: 'Pruebas y puesta en servicio', fecha_inicio: '2026-03-11', fecha_fin: '2026-03-20', avance: 0 },
  // Servicio 4 — Adecuación de Snack Bar
  { id: 9, servicio_id: 4, nombre: 'Acondicionamiento del local', fecha_inicio: '2025-11-20', fecha_fin: '2025-12-05', avance: 100 },
  { id: 10, servicio_id: 4, nombre: 'Acabados y equipamiento', fecha_inicio: '2025-12-06', fecha_fin: '2025-12-18', avance: 100 },
  // Subtareas de Albañilería y tarrajeo (servicio 1)
  { id: 11, servicio_id: 1, padre_id: 2, nombre: 'Muros de ladrillo', fecha_inicio: '2026-02-01', fecha_fin: '2026-02-20', avance: 80 },
  { id: 12, servicio_id: 1, padre_id: 2, nombre: 'Tarrajeo interior', fecha_inicio: '2026-02-21', fecha_fin: '2026-03-15', avance: 40 },
]

// ------------------------------------------------------------
//  Estado inicial consolidado
// ------------------------------------------------------------

export const ESTADO_INICIAL = {
  personal,
  materiales,
  equipos,
  servicios,
  registros_servicio,
  tareas,
}

export const COLECCIONES = Object.keys(ESTADO_INICIAL)

export const STORAGE_KEY = 'promcoser_mvp_v2'
const STORAGE_KEY_ANTERIOR = 'promcoser_mvp_v1'

// Migra datos guardados con el esquema anterior (v1) al actual:
// rellena avance/fecha_fin en servicios y costo_por_hora en equipos.
export function migrarEstadoV1(guardado) {
  if (!guardado || typeof guardado !== 'object') return null

  return {
    ...guardado,
    servicios: Array.isArray(guardado.servicios)
      ? guardado.servicios.map((s) => ({
          avance: 0,
          fecha_fin_estimada: '',
          ...s,
        }))
      : guardado.servicios,
    equipos: Array.isArray(guardado.equipos)
      ? guardado.equipos.map((e) => ({
          costo_por_hora: 0,
          ...e,
        }))
      : guardado.equipos,
  }
}

export { STORAGE_KEY_ANTERIOR }
