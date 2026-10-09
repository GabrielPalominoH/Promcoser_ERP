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
  { id: 1, nombre: 'Elmer Adonis', apellido: 'Achulla Polanco', cargo: 'Oficial', dni: '77086559', tarifa_por_hora: 25, ambito: 'Obra' },
  { id: 2, nombre: 'Alexis David', apellido: 'Alcarraz Quispe', cargo: 'Oficial', dni: '63090109', tarifa_por_hora: 25, ambito: 'Obra' },
  { id: 3, nombre: 'Ronald Martin', apellido: 'Alvarado Agreda', cargo: 'Ayudante', dni: '60741098', tarifa_por_hora: 18, ambito: 'Obra' },
  { id: 4, nombre: 'Mirtha Consuelo', apellido: 'Alvarez Gameros', cargo: 'Oficial', dni: '75715613', tarifa_por_hora: 25, ambito: 'Obra' },
  { id: 5, nombre: 'Moises Juan', apellido: 'Alvarez Crespo', cargo: 'Jefe Ssoma', dni: '42415460', tarifa_por_hora: 70, ambito: 'Obra' },
  { id: 6, nombre: 'Sally Yandira', apellido: 'Alvites Bobadilla', cargo: 'Asistente Ssoma', dni: '71124981', tarifa_por_hora: 24, ambito: 'Obra' },
  { id: 7, nombre: 'Jesus Catriel Sabino', apellido: 'Amable Garces', cargo: 'Operador', dni: '72202600', tarifa_por_hora: 32, ambito: 'Obra' },
  { id: 8, nombre: 'Oscar Manuel', apellido: 'Amaru Huamani', cargo: 'Mecanico Electricista', dni: '73221445', tarifa_por_hora: 30, ambito: 'Obra' },
  { id: 9, nombre: 'Angel Vicente', apellido: 'Anampa Velasquez', cargo: 'Operario', dni: '43248461', tarifa_por_hora: 25, ambito: 'Obra' },
  { id: 10, nombre: 'Juan Jose', apellido: 'Aquino Lachira', cargo: 'Supervisor de Calidad', dni: '76182598', tarifa_por_hora: 48, ambito: 'Obra' },
  { id: 11, nombre: 'Esteban Jeremias', apellido: 'Arroyo Abanto', cargo: 'Operador', dni: '10363255', tarifa_por_hora: 32, ambito: 'Obra' },
  { id: 12, nombre: 'Piero Paolo', apellido: 'Arteaga Urrunaga', cargo: 'Oficial', dni: '48199796', tarifa_por_hora: 25, ambito: 'Obra' },
  { id: 13, nombre: 'Angel Richard', apellido: 'Avila Vasquez', cargo: 'Jefe OT', dni: '43280802', tarifa_por_hora: 70, ambito: 'Obra' },
  { id: 14, nombre: 'Sandro Luis', apellido: 'Bardales Trujillo', cargo: 'Oficial', dni: '73095782', tarifa_por_hora: 25, ambito: 'Obra' },
  { id: 15, nombre: 'Gissela Elvira', apellido: 'Benavente Pajuelo', cargo: 'Asistente Contable', dni: '49328488', tarifa_por_hora: 24, ambito: 'Oficina' },
  { id: 16, nombre: 'Juan de Dios', apellido: 'Cabrera Cuba', cargo: 'Operador Multiple', dni: '21533049', tarifa_por_hora: 32, ambito: 'Obra' },
  { id: 17, nombre: 'Miguel Angel', apellido: 'Cabrera Barranca', cargo: 'Operario Civil', dni: '45519254', tarifa_por_hora: 25, ambito: 'Obra' },
  { id: 18, nombre: 'Ciro Alexander', apellido: 'Calachihua Huaychay', cargo: 'Operario/Conductor', dni: '47665722', tarifa_por_hora: 32, ambito: 'Obra' },
  { id: 19, nombre: 'Paul', apellido: 'Calderon Nolasco', cargo: 'Mecanico/Conductor', dni: '42121463', tarifa_por_hora: 30, ambito: 'Obra' },
  { id: 20, nombre: 'Marco Antonio', apellido: 'Calle Bautista', cargo: 'Mecanico/Conductor', dni: '48304766', tarifa_por_hora: 30, ambito: 'Obra' },
  { id: 21, nombre: 'Cristhian', apellido: 'Carbajal Santaria', cargo: 'Operador', dni: '47122319', tarifa_por_hora: 32, ambito: 'Obra' },
  { id: 22, nombre: 'Erwen Heiner', apellido: 'Carrasco Ninasivincha', cargo: 'Asistente Contable Junior', dni: '71486101', tarifa_por_hora: 24, ambito: 'Oficina' },
  { id: 23, nombre: 'Rosa Victoria', apellido: 'Carrillo Quispes', cargo: 'Supervisora Ssoma', dni: '73109334', tarifa_por_hora: 48, ambito: 'Obra' },
  { id: 24, nombre: 'Abran', apellido: 'Castro Leon', cargo: 'Operador / Mecanico', dni: '73261821', tarifa_por_hora: 30, ambito: 'Obra' },
  { id: 25, nombre: 'Wilfredo Juan', apellido: 'Cayo Gutierrez', cargo: 'Operario Civil', dni: '70521524', tarifa_por_hora: 25, ambito: 'Obra' },
  { id: 26, nombre: 'Damian Celso', apellido: 'Cayo Gutierrez', cargo: 'Capataz Civil', dni: '70521512', tarifa_por_hora: 40, ambito: 'Obra' },
  { id: 27, nombre: 'Jhon Pedro', apellido: 'Ccesso Barrientos', cargo: 'Asistente Logistico', dni: '42359661', tarifa_por_hora: 24, ambito: 'Oficina' },
  { id: 28, nombre: 'Jesus Giancarlo', apellido: 'Cervantes Herrera', cargo: 'Oficial', dni: '71471029', tarifa_por_hora: 25, ambito: 'Obra' },
  { id: 29, nombre: 'Huberth Emerson', apellido: 'Chipa Rivas', cargo: 'Operador', dni: '44925714', tarifa_por_hora: 32, ambito: 'Obra' },
  { id: 30, nombre: 'Julio Cesar', apellido: 'Chira Borda', cargo: 'Operario Civil', dni: '46697801', tarifa_por_hora: 25, ambito: 'Obra' },
  { id: 31, nombre: 'Jose Alfredo', apellido: 'Cotrina Altamirano', cargo: 'Ayudante', dni: '74562849', tarifa_por_hora: 18, ambito: 'Obra' },
  { id: 32, nombre: 'Alex Xander', apellido: 'Cuellar Rosales', cargo: 'Jefe de Costos y Presupuestos', dni: '47930920', tarifa_por_hora: 70, ambito: 'Oficina' },
  { id: 33, nombre: 'Andrea', apellido: 'Cueto Franco', cargo: 'Administradora', dni: '73130000', tarifa_por_hora: 30, ambito: 'Oficina' },
  { id: 34, nombre: 'Walter Luis Antonio', apellido: 'De la Cruz Antayhua', cargo: 'Mecanico/Conductor', dni: '70326377', tarifa_por_hora: 30, ambito: 'Obra' },
  { id: 35, nombre: 'Asunción', apellido: 'Del Águila Pérez', cargo: 'Oficial / Soldador', dni: '73099959', tarifa_por_hora: 30, ambito: 'Obra' },
  { id: 36, nombre: 'Juan Hipolito', apellido: 'Diaz Herrera', cargo: 'Operador', dni: '22102007', tarifa_por_hora: 32, ambito: 'Obra' },
  { id: 37, nombre: 'Joshua Manuel Humberto', apellido: 'Farias Ulfe', cargo: 'Oficial', dni: '76891111', tarifa_por_hora: 25, ambito: 'Obra' },
  { id: 38, nombre: 'Luis Alfredo', apellido: 'Flores Puntriano', cargo: 'Lider del Taller', dni: '44188288', tarifa_por_hora: 50, ambito: 'Obra' },
  { id: 39, nombre: 'Hector', apellido: 'Galvez Ravines', cargo: 'Operador', dni: '48380481', tarifa_por_hora: 32, ambito: 'Obra' },
  { id: 40, nombre: 'Wilfredo Mario', apellido: 'Garcia Ramirez', cargo: 'Supervisor Operativo', dni: '22093461', tarifa_por_hora: 48, ambito: 'Obra' },
  { id: 41, nombre: 'Richard Felix', apellido: 'Garriazo Osco', cargo: 'Operario', dni: '43141186', tarifa_por_hora: 25, ambito: 'Obra' },
  { id: 42, nombre: 'Christopher Ivan', apellido: 'Gomez Huaman', cargo: 'Ayudante General', dni: '77300587', tarifa_por_hora: 18, ambito: 'Obra' },
  { id: 43, nombre: 'David', apellido: 'Guevara Llatas', cargo: 'Asistente Administrativo', dni: '70263956', tarifa_por_hora: 24, ambito: 'Oficina' },
  { id: 44, nombre: 'Joe Sebastian', apellido: 'Guevara Bellido', cargo: 'Operario/Conductor', dni: '70057050', tarifa_por_hora: 32, ambito: 'Obra' },
  { id: 45, nombre: 'Jose Eli', apellido: 'Guevara Llatas', cargo: 'Operario Mecanico', dni: '70056279', tarifa_por_hora: 30, ambito: 'Obra' },
  { id: 46, nombre: 'Jimmy Jose', apellido: 'Hernandez Tasayco', cargo: 'Mecanico/Conductor', dni: '41190556', tarifa_por_hora: 30, ambito: 'Obra' },
  { id: 47, nombre: 'Jhony', apellido: 'Huaccalsaico Cocchi', cargo: 'Operario', dni: '73937019', tarifa_por_hora: 25, ambito: 'Obra' },
  { id: 48, nombre: 'Braulio', apellido: 'Huaman Diaz', cargo: 'Supervisor Operativo', dni: '21520749', tarifa_por_hora: 48, ambito: 'Obra' },
  { id: 49, nombre: 'Zenon', apellido: 'Huaman Misaico', cargo: 'Supervisor (Ssoma)', dni: '21576464', tarifa_por_hora: 48, ambito: 'Obra' },
  { id: 50, nombre: 'Julio Cesar', apellido: 'Huaman Ventura', cargo: 'Operador', dni: '43474922', tarifa_por_hora: 32, ambito: 'Obra' },
  { id: 51, nombre: 'Any Roxana', apellido: 'Huanqui Quispe', cargo: 'Supervisora de Produccion', dni: '70258839', tarifa_por_hora: 48, ambito: 'Obra' },
  { id: 52, nombre: 'Karol Edith', apellido: 'Huarote Chumbiauca', cargo: 'Supervisora Ssoma', dni: '73348890', tarifa_por_hora: 48, ambito: 'Obra' },
  { id: 53, nombre: 'Vanessa', apellido: 'Huaylla Quispe', cargo: 'Coordinadora de Proyectos', dni: '46429040', tarifa_por_hora: 55, ambito: 'Oficina' },
  { id: 54, nombre: 'Luis Alberto', apellido: 'Huilca Condori', cargo: 'Contador', dni: '47065296', tarifa_por_hora: 55, ambito: 'Oficina' },
  { id: 55, nombre: 'Dany Daniel', apellido: 'Ibarra Garcia', cargo: 'Operario Mecanico', dni: '44648315', tarifa_por_hora: 30, ambito: 'Obra' },
  { id: 56, nombre: 'Zoila', apellido: 'Jean Pacaya', cargo: 'Supervisora Ssoma', dni: '76068227', tarifa_por_hora: 48, ambito: 'Obra' },
  { id: 57, nombre: 'Victor Manuel', apellido: 'Jimenez Mejia', cargo: 'Supervisor Operativo', dni: '45587650', tarifa_por_hora: 48, ambito: 'Obra' },
  { id: 58, nombre: 'Briham', apellido: 'Lagunas Gil', cargo: 'Operario Mecanico', dni: '76408043', tarifa_por_hora: 30, ambito: 'Obra' },
  { id: 59, nombre: 'William Samuel', apellido: 'Limascca Llacsa', cargo: 'Operador', dni: '74039350', tarifa_por_hora: 32, ambito: 'Obra' },
  { id: 60, nombre: 'Kevin Nicolás', apellido: 'Lopez Reyes', cargo: 'Asistente Logistica', dni: '70363763', tarifa_por_hora: 24, ambito: 'Oficina' },
  { id: 61, nombre: 'Abel Enrique', apellido: 'Machado Vivanco', cargo: 'Operador', dni: '70397918', tarifa_por_hora: 32, ambito: 'Obra' },
  { id: 62, nombre: 'Mario Joel', apellido: 'Machado Vivanco', cargo: 'Gerente Gerenal', dni: '40907435', tarifa_por_hora: 120, ambito: 'Oficina' },
  { id: 63, nombre: 'Crhistian Alexis', apellido: 'Medina Espinoza', cargo: 'Ayudante', dni: '75856201', tarifa_por_hora: 18, ambito: 'Obra' },
  { id: 64, nombre: 'Dennis Alexander', apellido: 'Mendoza Dueñas', cargo: 'Auxiliar Contable', dni: '71531647', tarifa_por_hora: 18, ambito: 'Oficina' },
  { id: 65, nombre: 'Mario Enrique', apellido: 'Mendoza Tamani', cargo: 'Operario', dni: '70429892', tarifa_por_hora: 25, ambito: 'Obra' },
  { id: 66, nombre: 'Giovanny Franco', apellido: 'Mestanza Ramirez', cargo: 'Ayudante', dni: '61053571', tarifa_por_hora: 18, ambito: 'Obra' },
  { id: 67, nombre: 'Eguiluz Yury', apellido: 'Mita Naventa', cargo: 'Operador / Conductor', dni: '42656045', tarifa_por_hora: 32, ambito: 'Obra' },
  { id: 68, nombre: 'Oscar Ivan', apellido: 'Montoya Pari', cargo: 'Operador', dni: '75863580', tarifa_por_hora: 32, ambito: 'Obra' },
  { id: 69, nombre: 'Wilmer', apellido: 'Morales Julcamoro', cargo: 'Lider del Taller', dni: '40264568', tarifa_por_hora: 50, ambito: 'Obra' },
  { id: 70, nombre: 'Carlos Antonio', apellido: 'Naventa Auccapuclla', cargo: 'Operador', dni: '72790213', tarifa_por_hora: 32, ambito: 'Obra' },
  { id: 71, nombre: 'Erick', apellido: 'Novoa Barbaran', cargo: 'Oficial Mecanico', dni: '61810099', tarifa_por_hora: 30, ambito: 'Obra' },
  { id: 72, nombre: 'Walter Elias', apellido: 'Ormeño Mendivel', cargo: 'Supervisor Operativo', dni: '71486032', tarifa_por_hora: 48, ambito: 'Obra' },
  { id: 73, nombre: 'Gabriel Omar', apellido: 'Palomino Huaman', cargo: 'Asistente de Sistemnas', dni: '70116517', tarifa_por_hora: 24, ambito: 'Oficina' },
  { id: 74, nombre: 'Gabriel Jackson', apellido: 'Panduro Gonzales', cargo: 'Operario Civil', dni: '42916520', tarifa_por_hora: 25, ambito: 'Obra' },
  { id: 75, nombre: 'Cesar Augusto', apellido: 'Pareja Quispe', cargo: 'Capataz', dni: '42710897', tarifa_por_hora: 40, ambito: 'Obra' },
  { id: 76, nombre: 'Wilber Ronald', apellido: 'Parisuaña Apaza', cargo: 'Asistente Logistica', dni: '70147550', tarifa_por_hora: 24, ambito: 'Oficina' },
  { id: 77, nombre: 'Victor Raul', apellido: 'Perez Contreras', cargo: 'Supervisor', dni: '41531893', tarifa_por_hora: 48, ambito: 'Obra' },
  { id: 78, nombre: 'Jorge Luis', apellido: 'Perez Levano', cargo: 'Mecanico/Conductor', dni: '40428123', tarifa_por_hora: 30, ambito: 'Obra' },
  { id: 79, nombre: 'Moises', apellido: 'Pinto Sayon', cargo: 'Oficial', dni: '76065367', tarifa_por_hora: 25, ambito: 'Obra' },
  { id: 80, nombre: 'Jesus', apellido: 'Portal Sanchez', cargo: 'Ayudante', dni: '75222665', tarifa_por_hora: 18, ambito: 'Obra' },
  { id: 81, nombre: 'Luis Angel', apellido: 'Quijaite Uculmana', cargo: 'Jefe de Proyectos', dni: '46556923', tarifa_por_hora: 70, ambito: 'Oficina' },
  { id: 82, nombre: 'Juan Eduardo', apellido: 'Quiliche Borja', cargo: 'Operador', dni: '48755900', tarifa_por_hora: 32, ambito: 'Obra' },
  { id: 83, nombre: 'Wilbert', apellido: 'Quispe Bolivar', cargo: 'Operador', dni: '46946019', tarifa_por_hora: 32, ambito: 'Obra' },
  { id: 84, nombre: 'Javier Victor', apellido: 'Reyes Ramos', cargo: 'Conductor', dni: '41653715', tarifa_por_hora: 32, ambito: 'Obra' },
  { id: 85, nombre: 'Edwin Cesar', apellido: 'Rivas Yauyo', cargo: 'Ayudante / Mecanico', dni: '71209119', tarifa_por_hora: 30, ambito: 'Obra' },
  { id: 86, nombre: 'Emerson', apellido: 'Rodriguez Quijahuaman', cargo: 'Operador', dni: '48730880', tarifa_por_hora: 32, ambito: 'Obra' },
  { id: 87, nombre: 'Ludmer Nicolas', apellido: 'Roman Flores', cargo: 'Supervisor de Producción', dni: '43904646', tarifa_por_hora: 48, ambito: 'Obra' },
  { id: 88, nombre: 'Porfirio Jose', apellido: 'Romucho Huaman', cargo: 'Operador/Conductor', dni: '71831041', tarifa_por_hora: 32, ambito: 'Obra' },
  { id: 89, nombre: 'Richard', apellido: 'Rosales Pascual', cargo: 'Operario', dni: '48767201', tarifa_por_hora: 25, ambito: 'Obra' },
  { id: 90, nombre: 'Alfredo John', apellido: 'Saccatoma Valenzuela', cargo: 'Operador Multiple', dni: '22315122', tarifa_por_hora: 32, ambito: 'Obra' },
  { id: 91, nombre: 'Jennifer Alexandra', apellido: 'Sandoval Allauja', cargo: 'Supervisora Ssoma', dni: '70354844', tarifa_por_hora: 48, ambito: 'Obra' },
  { id: 92, nombre: 'Kenyiro Alberto', apellido: 'Sandoval Villanueva', cargo: 'Asistente Logistica', dni: '74855178', tarifa_por_hora: 24, ambito: 'Oficina' },
  { id: 93, nombre: 'Henry Mohamed Ali', apellido: 'Sarmiento Ortega', cargo: 'Operario Multiple', dni: '78110732', tarifa_por_hora: 25, ambito: 'Obra' },
  { id: 94, nombre: 'Erick Henderson', apellido: 'Sifuentes Chavez', cargo: 'Operario Mecanico', dni: '44819578', tarifa_por_hora: 30, ambito: 'Obra' },
  { id: 95, nombre: 'Mateo Dario', apellido: 'Silva Pinto', cargo: 'Oficial', dni: '61412617', tarifa_por_hora: 25, ambito: 'Obra' },
  { id: 96, nombre: 'Aner', apellido: 'Tamayo Canayo', cargo: 'Oficial Civil', dni: '47671343', tarifa_por_hora: 25, ambito: 'Obra' },
  { id: 97, nombre: 'Walter Alejandro', apellido: 'Tapia Tarrillo', cargo: 'Operario Civil', dni: '76827936', tarifa_por_hora: 25, ambito: 'Obra' },
  { id: 98, nombre: 'Yasser Yrwin', apellido: 'Torres Valiente', cargo: 'Operario Civil', dni: '48660895', tarifa_por_hora: 25, ambito: 'Obra' },
  { id: 99, nombre: 'Junior Jaime', apellido: 'Torres Suarez', cargo: 'Operario Mecanico', dni: '47100759', tarifa_por_hora: 30, ambito: 'Obra' },
  { id: 100, nombre: 'Victor Carlos', apellido: 'Vasquez Hernandez', cargo: 'Supervisor Operativo', dni: '40384005', tarifa_por_hora: 48, ambito: 'Obra' },
  { id: 101, nombre: 'Joselyn Rosmery', apellido: 'Vergara Ormeño', cargo: 'Supervisor (Operativo)', dni: '72019276', tarifa_por_hora: 48, ambito: 'Obra' },
  { id: 102, nombre: 'William', apellido: 'Yauyo Panchillo', cargo: 'Oficial Mecanico / Soldador', dni: '71533376', tarifa_por_hora: 30, ambito: 'Obra' },
  { id: 103, nombre: 'Jair Alexis', apellido: 'Zavala Farias', cargo: 'Oficial', dni: '70034594', tarifa_por_hora: 25, ambito: 'Obra' },
  { id: 104, nombre: 'Jhonatan', apellido: 'Zulueta Lozada', cargo: 'Supervisor Operativo', dni: '71689937', tarifa_por_hora: 48, ambito: 'Obra' },
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
  { id: 1, nombre: 'Camioneta BSI-922', costo_por_hora: 60 },
  { id: 2, nombre: 'Cisterna de Agua BEA-747', costo_por_hora: 150 },
  { id: 3, nombre: 'Volquete BRP-888', costo_por_hora: 150 },
  { id: 4, nombre: 'Camioneta BJU-824', costo_por_hora: 60 },
  { id: 5, nombre: 'Camión Baranda CCJ-900', costo_por_hora: 150 },
  { id: 6, nombre: 'Volquete BRP-887', costo_por_hora: 150 },
  { id: 7, nombre: 'Camión Baranda BXQ-768', costo_por_hora: 150 },
  { id: 8, nombre: 'Miniván CPR-012', costo_por_hora: 60 },
  { id: 9, nombre: 'Miniván CWF-344', costo_por_hora: 60 },
  { id: 10, nombre: 'Camioneta BBD-873', costo_por_hora: 60 },
  { id: 11, nombre: 'Volquete BMI-757', costo_por_hora: 150 },
  { id: 12, nombre: 'Volquete BMI-856', costo_por_hora: 150 },
  { id: 13, nombre: 'Camioneta BVR-788', costo_por_hora: 60 },
  { id: 14, nombre: 'Camioneta BVW-820', costo_por_hora: 60 },
  { id: 15, nombre: 'Camioneta CEB-793', costo_por_hora: 60 },
  { id: 16, nombre: 'Camioneta CEM-838', costo_por_hora: 60 },
  { id: 17, nombre: 'Camioneta CHP-770', costo_por_hora: 60 },
  { id: 18, nombre: 'Camioneta CJI-818', costo_por_hora: 60 },
  { id: 19, nombre: 'Miniván BVW-497', costo_por_hora: 60 },
  { id: 20, nombre: 'Camioneta CHL-803', costo_por_hora: 60 },
  { id: 21, nombre: 'Camioneta CNP-931', costo_por_hora: 60 },
  { id: 22, nombre: 'Camioneta CNS-898', costo_por_hora: 60 },
  { id: 23, nombre: 'Mezcladora de concreto', costo_por_hora: 80 },
  { id: 24, nombre: 'Generador diesel 15 kVA', costo_por_hora: 80 },
  { id: 25, nombre: 'Andamio modular', costo_por_hora: 80 },
]

// ------------------------------------------------------------
//  2. Módulo central y relaciones
// ------------------------------------------------------------

export const servicios = [
  {
    id: 6,
    nombre_servicio: 'Construcción de almacén industrial',
    cliente: 'Logística del Pacífico S.A.C.',
    presupuesto_asignado: 120000,
    fecha_inicio: '2026-07-01',
    fecha_fin_estimada: '2026-12-20',
    avance: 0,
    estatus: 'En curso',
  },
]

export const registros_servicio = [
  // Servicio 6 — Construcción de almacén (en curso, dentro del plazo)
  {
    id: 19,
    servicio_id: 6,
    tipo_registro: 'material',
    referencia_id: null,
    nombre_material: 'Cemento Portland Tipo I',
    cantidad_o_horas: 200,
    monto_calculado: 7700,
    fecha: '2026-07-08',
  },
  {
    id: 20,
    servicio_id: 6,
    tipo_registro: 'gasto',
    referencia_id: null,
    concepto: 'Flete de materiales',
    cantidad_o_horas: 1,
    monto_calculado: 1200,
    fecha: '2026-07-09',
  },
  {
    id: 21,
    servicio_id: 6,
    tipo_registro: 'material',
    referencia_id: null,
    nombre_material: 'Acero de refuerzo 1/2 pulg',
    cantidad_o_horas: 120,
    monto_calculado: 2988,
    fecha: '2026-07-15',
  },
  {
    id: 22,
    servicio_id: 6,
    tipo_registro: 'equipo',
    referencia_id: 11,
    cantidad_o_horas: 45,
    monto_calculado: 6750,
    fecha: '2026-07-20',
  },
  {
    id: 23,
    servicio_id: 6,
    tipo_registro: 'material',
    referencia_id: null,
    nombre_material: 'Arena gruesa',
    cantidad_o_horas: 30,
    monto_calculado: 1860,
    fecha: '2026-07-22',
  },
  {
    id: 24,
    servicio_id: 6,
    tipo_registro: 'gasto',
    referencia_id: null,
    concepto: 'Alquiler de andamios',
    cantidad_o_horas: 1,
    monto_calculado: 1500,
    fecha: '2026-08-01',
  },
  {
    id: 25,
    servicio_id: 6,
    tipo_registro: 'equipo',
    referencia_id: 23,
    cantidad_o_horas: 60,
    monto_calculado: 4800,
    fecha: '2026-08-05',
  },
  {
    id: 26,
    servicio_id: 6,
    tipo_registro: 'material',
    referencia_id: null,
    nombre_material: 'Ladrillo Kingsize de arcilla',
    cantidad_o_horas: 5000,
    monto_calculado: 16000,
    fecha: '2026-08-10',
  },
  {
    id: 27,
    servicio_id: 6,
    tipo_registro: 'equipo',
    referencia_id: 24,
    cantidad_o_horas: 25,
    monto_calculado: 2000,
    fecha: '2026-09-02',
  },
  {
    id: 28,
    servicio_id: 6,
    tipo_registro: 'material',
    referencia_id: null,
    nombre_material: 'Pintura acrílica blanco',
    cantidad_o_horas: 18,
    monto_calculado: 1728,
    fecha: '2026-09-05',
  },
  {
    id: 29,
    servicio_id: 6,
    tipo_registro: 'gasto',
    referencia_id: null,
    concepto: 'Movilidad del personal',
    cantidad_o_horas: 1,
    monto_calculado: 800,
    fecha: '2026-09-12',
  },
  {
    id: 30,
    servicio_id: 6,
    tipo_registro: 'personal',
    referencia_id: 1,
    cantidad_o_horas: 40,
    monto_calculado: 1000,
    fecha: '2026-08-12',
  },
  {
    id: 31,
    servicio_id: 6,
    tipo_registro: 'personal',
    referencia_id: 3,
    cantidad_o_horas: 30,
    monto_calculado: 540,
    fecha: '2026-08-13',
  },
]

// ------------------------------------------------------------
//  3. Cronograma (tareas por servicio)
// ------------------------------------------------------------

export const tareas = [
  // Servicio 6 — Construcción de almacén
  { id: 13, servicio_id: 6, nombre: 'Obras preliminares', fecha_inicio: '2026-07-01', fecha_fin: '2026-07-15', avance: 100 },
  { id: 14, servicio_id: 6, nombre: 'Cimentación', fecha_inicio: '2026-07-16', fecha_fin: '2026-08-15', avance: 100 },
  { id: 15, servicio_id: 6, padre_id: 14, nombre: 'Excavación', fecha_inicio: '2026-07-16', fecha_fin: '2026-07-31', avance: 100 },
  { id: 16, servicio_id: 6, padre_id: 14, nombre: 'Vaciado de cimientos', fecha_inicio: '2026-08-01', fecha_fin: '2026-08-15', avance: 100 },
  { id: 17, servicio_id: 6, nombre: 'Estructuras', fecha_inicio: '2026-08-16', fecha_fin: '2026-10-15', avance: 60 },
  { id: 18, servicio_id: 6, padre_id: 17, nombre: 'Columnas y vigas', fecha_inicio: '2026-08-16', fecha_fin: '2026-09-20', avance: 70 },
  { id: 19, servicio_id: 6, padre_id: 17, nombre: 'Losa aligerada', fecha_inicio: '2026-09-21', fecha_fin: '2026-10-15', avance: 30 },
  { id: 20, servicio_id: 6, nombre: 'Cobertura y cerramientos', fecha_inicio: '2026-10-16', fecha_fin: '2026-11-20', avance: 0 },
  { id: 21, servicio_id: 6, nombre: 'Acabados y entrega', fecha_inicio: '2026-11-21', fecha_fin: '2026-12-20', avance: 0 },
]

// ------------------------------------------------------------
//  4. Costo mensual del personal de Oficina (gasto general:
//  no se carga a ningún servicio)
// ------------------------------------------------------------

export const costos_oficina = [
  { id: 1, personal_id: 54, mes: '2026-09', monto_calculado: 4500 },
  { id: 2, personal_id: 15, mes: '2026-09', monto_calculado: 1800 },
  { id: 3, personal_id: 54, mes: '2026-10', monto_calculado: 4500 },
  { id: 4, personal_id: 33, mes: '2026-10', monto_calculado: 3200 },
  { id: 5, personal_id: 15, mes: '2026-10', monto_calculado: 1800 },
  { id: 6, personal_id: 62, mes: '2026-10', monto_calculado: 8000 },
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
  costos_oficina,
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
