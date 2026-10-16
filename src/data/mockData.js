// ============================================================
//  PROMCOSER — Control Maestro de Servicios
//  Datos simulados (mock). Base local en memoria + localStorage.
//  Sin backend, sin API, sin autenticación.
// ============================================================

export const ESTATUS_SERVICIO = [
  'Pendiente',
  'En curso',
  'Finalizado',
  'Cancelado',
]

export const TIPOS_SERVICIO = ['Obra', 'Misceláneo', 'Contrato']

// Categorías de gasto (clasificación del egreso reconocido).
export const CATEGORIAS_GASTO = [
  'Mano de obra',
  'Equipos',
  'Materiales',
  'Transporte',
  'Alimentación',
  'Alojamiento',
  'Combustible',
  'Herramientas',
  'Subcontratos',
  'Administración',
  'Alquileres',
  'Servicios generales',
  'Otros',
]

// Tipo de servicio con valor por defecto para datos antiguos.
export function tipoServicio(servicio) {
  return servicio?.tipo ?? 'Obra'
}

// ------------------------------------------------------------
//  1. Catálogos maestros
// ------------------------------------------------------------

// Cargos: catálogo maestro que se administra en /cargos. La semilla trae una
// ficha por cada cargo distinto que ya usaba el personal (48), con la unidad
// por defecto HH (horas hombre) y una categoría inicial orientativa
// (Operativo / Supervisión / Administrativo), editable.
// El vínculo con `personal` es por NOMBRE de cargo (comparado sin tildes ni
// mayúsculas): por eso 'Administradora' ← persona 33, etc. Ver
// `src/utils/cargos.js` y `CATALOGO_CARGOS`.
export const cargos = [
  { id: 1, nombre: 'Administradora', unidad: 'HH', categoria: 'Administrativo', activo: true },
  { id: 2, nombre: 'Asistente Administrativo', unidad: 'HH', categoria: 'Administrativo', activo: true },
  { id: 3, nombre: 'Asistente Contable', unidad: 'HH', categoria: 'Administrativo', activo: true },
  { id: 4, nombre: 'Asistente Contable Junior', unidad: 'HH', categoria: 'Administrativo', activo: true },
  { id: 5, nombre: 'Asistente de Sistemnas', unidad: 'HH', categoria: 'Administrativo', activo: true },
  { id: 6, nombre: 'Asistente Logistica', unidad: 'HH', categoria: 'Administrativo', activo: true },
  { id: 7, nombre: 'Asistente Logistico', unidad: 'HH', categoria: 'Administrativo', activo: true },
  { id: 8, nombre: 'Asistente Ssoma', unidad: 'HH', categoria: 'Administrativo', activo: true },
  { id: 9, nombre: 'Auxiliar Contable', unidad: 'HH', categoria: 'Administrativo', activo: true },
  { id: 10, nombre: 'Ayudante', unidad: 'HH', categoria: 'Operativo', activo: true },
  { id: 11, nombre: 'Ayudante / Mecanico', unidad: 'HH', categoria: 'Operativo', activo: true },
  { id: 12, nombre: 'Ayudante General', unidad: 'HH', categoria: 'Operativo', activo: true },
  { id: 13, nombre: 'Capataz', unidad: 'HH', categoria: 'Supervisión', activo: true },
  { id: 14, nombre: 'Capataz Civil', unidad: 'HH', categoria: 'Supervisión', activo: true },
  { id: 15, nombre: 'Conductor', unidad: 'HH', categoria: 'Operativo', activo: true },
  { id: 16, nombre: 'Contador', unidad: 'HH', categoria: 'Administrativo', activo: true },
  { id: 17, nombre: 'Coordinadora de Proyectos', unidad: 'HH', categoria: 'Supervisión', activo: true },
  { id: 18, nombre: 'Gerente Gerenal', unidad: 'HH', categoria: 'Supervisión', activo: true },
  { id: 19, nombre: 'Jefe de Costos y Presupuestos', unidad: 'HH', categoria: 'Supervisión', activo: true },
  { id: 20, nombre: 'Jefe de Proyectos', unidad: 'HH', categoria: 'Supervisión', activo: true },
  { id: 21, nombre: 'Jefe OT', unidad: 'HH', categoria: 'Supervisión', activo: true },
  { id: 22, nombre: 'Jefe Ssoma', unidad: 'HH', categoria: 'Supervisión', activo: true },
  { id: 23, nombre: 'Lider del Taller', unidad: 'HH', categoria: 'Supervisión', activo: true },
  { id: 24, nombre: 'Mecanico Electricista', unidad: 'HH', categoria: 'Operativo', activo: true },
  { id: 25, nombre: 'Mecanico/Conductor', unidad: 'HH', categoria: 'Operativo', activo: true },
  { id: 26, nombre: 'Oficial', unidad: 'HH', categoria: 'Operativo', activo: true },
  { id: 27, nombre: 'Oficial / Soldador', unidad: 'HH', categoria: 'Operativo', activo: true },
  { id: 28, nombre: 'Oficial Civil', unidad: 'HH', categoria: 'Operativo', activo: true },
  { id: 29, nombre: 'Oficial Mecanico', unidad: 'HH', categoria: 'Operativo', activo: true },
  { id: 30, nombre: 'Oficial Mecanico / Soldador', unidad: 'HH', categoria: 'Operativo', activo: true },
  { id: 31, nombre: 'Operador', unidad: 'HH', categoria: 'Operativo', activo: true },
  { id: 32, nombre: 'Operador / Conductor', unidad: 'HH', categoria: 'Operativo', activo: true },
  { id: 33, nombre: 'Operador / Mecanico', unidad: 'HH', categoria: 'Operativo', activo: true },
  { id: 34, nombre: 'Operador Multiple', unidad: 'HH', categoria: 'Operativo', activo: true },
  { id: 35, nombre: 'Operador/Conductor', unidad: 'HH', categoria: 'Operativo', activo: true },
  { id: 36, nombre: 'Operario', unidad: 'HH', categoria: 'Operativo', activo: true },
  { id: 37, nombre: 'Operario Civil', unidad: 'HH', categoria: 'Operativo', activo: true },
  { id: 38, nombre: 'Operario Mecanico', unidad: 'HH', categoria: 'Operativo', activo: true },
  { id: 39, nombre: 'Operario Multiple', unidad: 'HH', categoria: 'Operativo', activo: true },
  { id: 40, nombre: 'Operario/Conductor', unidad: 'HH', categoria: 'Operativo', activo: true },
  { id: 41, nombre: 'Supervisor', unidad: 'HH', categoria: 'Supervisión', activo: true },
  { id: 42, nombre: 'Supervisor (Operativo)', unidad: 'HH', categoria: 'Supervisión', activo: true },
  { id: 43, nombre: 'Supervisor (Ssoma)', unidad: 'HH', categoria: 'Supervisión', activo: true },
  { id: 44, nombre: 'Supervisor de Calidad', unidad: 'HH', categoria: 'Supervisión', activo: true },
  { id: 45, nombre: 'Supervisor de Producción', unidad: 'HH', categoria: 'Supervisión', activo: true },
  { id: 46, nombre: 'Supervisor Operativo', unidad: 'HH', categoria: 'Supervisión', activo: true },
  { id: 47, nombre: 'Supervisora de Produccion', unidad: 'HH', categoria: 'Supervisión', activo: true },
  { id: 48, nombre: 'Supervisora Ssoma', unidad: 'HH', categoria: 'Supervisión', activo: true },
]

// Personal (104 fichas). `cargo` guarda el NOMBRE del cargo del catálogo
// `cargos` (sin `cargo_id`): se elige desde el módulo Cargos y al renombrar un
// cargo se arrastra a estas fichas. `ambito` Obra/Oficina decide las listas de
// asignación; `activo` (siempre explícito en la semilla) es el estado que se
// alterna desde el módulo Personal (desactivado = no aparece al asignar).
export const personal = [
  { id: 1, nombre: 'Elmer Adonis', apellido: 'Achulla Polanco', cargo: 'Oficial', dni: '77086559', tarifa_por_hora: 25, ambito: 'Obra', activo: true },
  { id: 2, nombre: 'Alexis David', apellido: 'Alcarraz Quispe', cargo: 'Oficial', dni: '63090109', tarifa_por_hora: 25, ambito: 'Obra', activo: true },
  { id: 3, nombre: 'Ronald Martin', apellido: 'Alvarado Agreda', cargo: 'Ayudante', dni: '60741098', tarifa_por_hora: 18, ambito: 'Obra', activo: true },
  { id: 4, nombre: 'Mirtha Consuelo', apellido: 'Alvarez Gameros', cargo: 'Oficial', dni: '75715613', tarifa_por_hora: 25, ambito: 'Obra', activo: true },
  { id: 5, nombre: 'Moises Juan', apellido: 'Alvarez Crespo', cargo: 'Jefe Ssoma', dni: '42415460', tarifa_por_hora: 70, ambito: 'Obra', activo: true },
  { id: 6, nombre: 'Sally Yandira', apellido: 'Alvites Bobadilla', cargo: 'Asistente Ssoma', dni: '71124981', tarifa_por_hora: 24, ambito: 'Obra', activo: true },
  { id: 7, nombre: 'Jesus Catriel Sabino', apellido: 'Amable Garces', cargo: 'Operador', dni: '72202600', tarifa_por_hora: 32, ambito: 'Obra', activo: true },
  { id: 8, nombre: 'Oscar Manuel', apellido: 'Amaru Huamani', cargo: 'Mecanico Electricista', dni: '73221445', tarifa_por_hora: 30, ambito: 'Obra', activo: true },
  { id: 9, nombre: 'Angel Vicente', apellido: 'Anampa Velasquez', cargo: 'Operario', dni: '43248461', tarifa_por_hora: 25, ambito: 'Obra', activo: true },
  { id: 10, nombre: 'Juan Jose', apellido: 'Aquino Lachira', cargo: 'Supervisor de Calidad', dni: '76182598', tarifa_por_hora: 48, ambito: 'Obra', activo: true },
  { id: 11, nombre: 'Esteban Jeremias', apellido: 'Arroyo Abanto', cargo: 'Operador', dni: '10363255', tarifa_por_hora: 32, ambito: 'Obra', activo: true },
  { id: 12, nombre: 'Piero Paolo', apellido: 'Arteaga Urrunaga', cargo: 'Oficial', dni: '48199796', tarifa_por_hora: 25, ambito: 'Obra', activo: true },
  { id: 13, nombre: 'Angel Richard', apellido: 'Avila Vasquez', cargo: 'Jefe OT', dni: '43280802', tarifa_por_hora: 70, ambito: 'Obra', activo: true },
  { id: 14, nombre: 'Sandro Luis', apellido: 'Bardales Trujillo', cargo: 'Oficial', dni: '73095782', tarifa_por_hora: 25, ambito: 'Obra', activo: true },
  { id: 15, nombre: 'Gissela Elvira', apellido: 'Benavente Pajuelo', cargo: 'Asistente Contable', dni: '49328488', tarifa_por_hora: 24, ambito: 'Oficina', activo: true },
  { id: 16, nombre: 'Juan de Dios', apellido: 'Cabrera Cuba', cargo: 'Operador Multiple', dni: '21533049', tarifa_por_hora: 32, ambito: 'Obra', activo: true },
  { id: 17, nombre: 'Miguel Angel', apellido: 'Cabrera Barranca', cargo: 'Operario Civil', dni: '45519254', tarifa_por_hora: 25, ambito: 'Obra', activo: true },
  { id: 18, nombre: 'Ciro Alexander', apellido: 'Calachihua Huaychay', cargo: 'Operario/Conductor', dni: '47665722', tarifa_por_hora: 32, ambito: 'Obra', activo: true },
  { id: 19, nombre: 'Paul', apellido: 'Calderon Nolasco', cargo: 'Mecanico/Conductor', dni: '42121463', tarifa_por_hora: 30, ambito: 'Obra', activo: true },
  { id: 20, nombre: 'Marco Antonio', apellido: 'Calle Bautista', cargo: 'Mecanico/Conductor', dni: '48304766', tarifa_por_hora: 30, ambito: 'Obra', activo: true },
  { id: 21, nombre: 'Cristhian', apellido: 'Carbajal Santaria', cargo: 'Operador', dni: '47122319', tarifa_por_hora: 32, ambito: 'Obra', activo: true },
  { id: 22, nombre: 'Erwen Heiner', apellido: 'Carrasco Ninasivincha', cargo: 'Asistente Contable Junior', dni: '71486101', tarifa_por_hora: 24, ambito: 'Oficina', activo: true },
  { id: 23, nombre: 'Rosa Victoria', apellido: 'Carrillo Quispes', cargo: 'Supervisora Ssoma', dni: '73109334', tarifa_por_hora: 48, ambito: 'Obra', activo: true },
  { id: 24, nombre: 'Abran', apellido: 'Castro Leon', cargo: 'Operador / Mecanico', dni: '73261821', tarifa_por_hora: 30, ambito: 'Obra', activo: true },
  { id: 25, nombre: 'Wilfredo Juan', apellido: 'Cayo Gutierrez', cargo: 'Operario Civil', dni: '70521524', tarifa_por_hora: 25, ambito: 'Obra', activo: true },
  { id: 26, nombre: 'Damian Celso', apellido: 'Cayo Gutierrez', cargo: 'Capataz Civil', dni: '70521512', tarifa_por_hora: 40, ambito: 'Obra', activo: true },
  { id: 27, nombre: 'Jhon Pedro', apellido: 'Ccesso Barrientos', cargo: 'Asistente Logistico', dni: '42359661', tarifa_por_hora: 24, ambito: 'Oficina', activo: true },
  { id: 28, nombre: 'Jesus Giancarlo', apellido: 'Cervantes Herrera', cargo: 'Oficial', dni: '71471029', tarifa_por_hora: 25, ambito: 'Obra', activo: true },
  { id: 29, nombre: 'Huberth Emerson', apellido: 'Chipa Rivas', cargo: 'Operador', dni: '44925714', tarifa_por_hora: 32, ambito: 'Obra', activo: true },
  { id: 30, nombre: 'Julio Cesar', apellido: 'Chira Borda', cargo: 'Operario Civil', dni: '46697801', tarifa_por_hora: 25, ambito: 'Obra', activo: true },
  { id: 31, nombre: 'Jose Alfredo', apellido: 'Cotrina Altamirano', cargo: 'Ayudante', dni: '74562849', tarifa_por_hora: 18, ambito: 'Obra', activo: true },
  { id: 32, nombre: 'Alex Xander', apellido: 'Cuellar Rosales', cargo: 'Jefe de Costos y Presupuestos', dni: '47930920', tarifa_por_hora: 70, ambito: 'Oficina', activo: true },
  { id: 33, nombre: 'Andrea', apellido: 'Cueto Franco', cargo: 'Administradora', dni: '73130000', tarifa_por_hora: 30, ambito: 'Oficina', activo: true },
  { id: 34, nombre: 'Walter Luis Antonio', apellido: 'De la Cruz Antayhua', cargo: 'Mecanico/Conductor', dni: '70326377', tarifa_por_hora: 30, ambito: 'Obra', activo: true },
  { id: 35, nombre: 'Asunción', apellido: 'Del Águila Pérez', cargo: 'Oficial / Soldador', dni: '73099959', tarifa_por_hora: 30, ambito: 'Obra', activo: true },
  { id: 36, nombre: 'Juan Hipolito', apellido: 'Diaz Herrera', cargo: 'Operador', dni: '22102007', tarifa_por_hora: 32, ambito: 'Obra', activo: true },
  { id: 37, nombre: 'Joshua Manuel Humberto', apellido: 'Farias Ulfe', cargo: 'Oficial', dni: '76891111', tarifa_por_hora: 25, ambito: 'Obra', activo: true },
  { id: 38, nombre: 'Luis Alfredo', apellido: 'Flores Puntriano', cargo: 'Lider del Taller', dni: '44188288', tarifa_por_hora: 50, ambito: 'Obra', activo: true },
  { id: 39, nombre: 'Hector', apellido: 'Galvez Ravines', cargo: 'Operador', dni: '48380481', tarifa_por_hora: 32, ambito: 'Obra', activo: true },
  { id: 40, nombre: 'Wilfredo Mario', apellido: 'Garcia Ramirez', cargo: 'Supervisor Operativo', dni: '22093461', tarifa_por_hora: 48, ambito: 'Obra', activo: true },
  { id: 41, nombre: 'Richard Felix', apellido: 'Garriazo Osco', cargo: 'Operario', dni: '43141186', tarifa_por_hora: 25, ambito: 'Obra', activo: true },
  { id: 42, nombre: 'Christopher Ivan', apellido: 'Gomez Huaman', cargo: 'Ayudante General', dni: '77300587', tarifa_por_hora: 18, ambito: 'Obra', activo: true },
  { id: 43, nombre: 'David', apellido: 'Guevara Llatas', cargo: 'Asistente Administrativo', dni: '70263956', tarifa_por_hora: 24, ambito: 'Oficina', activo: true },
  { id: 44, nombre: 'Joe Sebastian', apellido: 'Guevara Bellido', cargo: 'Operario/Conductor', dni: '70057050', tarifa_por_hora: 32, ambito: 'Obra', activo: true },
  { id: 45, nombre: 'Jose Eli', apellido: 'Guevara Llatas', cargo: 'Operario Mecanico', dni: '70056279', tarifa_por_hora: 30, ambito: 'Obra', activo: true },
  { id: 46, nombre: 'Jimmy Jose', apellido: 'Hernandez Tasayco', cargo: 'Mecanico/Conductor', dni: '41190556', tarifa_por_hora: 30, ambito: 'Obra', activo: true },
  { id: 47, nombre: 'Jhony', apellido: 'Huaccalsaico Cocchi', cargo: 'Operario', dni: '73937019', tarifa_por_hora: 25, ambito: 'Obra', activo: true },
  { id: 48, nombre: 'Braulio', apellido: 'Huaman Diaz', cargo: 'Supervisor Operativo', dni: '21520749', tarifa_por_hora: 48, ambito: 'Obra', activo: true },
  { id: 49, nombre: 'Zenon', apellido: 'Huaman Misaico', cargo: 'Supervisor (Ssoma)', dni: '21576464', tarifa_por_hora: 48, ambito: 'Obra', activo: true },
  { id: 50, nombre: 'Julio Cesar', apellido: 'Huaman Ventura', cargo: 'Operador', dni: '43474922', tarifa_por_hora: 32, ambito: 'Obra', activo: true },
  { id: 51, nombre: 'Any Roxana', apellido: 'Huanqui Quispe', cargo: 'Supervisora de Produccion', dni: '70258839', tarifa_por_hora: 48, ambito: 'Obra', activo: true },
  { id: 52, nombre: 'Karol Edith', apellido: 'Huarote Chumbiauca', cargo: 'Supervisora Ssoma', dni: '73348890', tarifa_por_hora: 48, ambito: 'Obra', activo: true },
  { id: 53, nombre: 'Vanessa', apellido: 'Huaylla Quispe', cargo: 'Coordinadora de Proyectos', dni: '46429040', tarifa_por_hora: 55, ambito: 'Oficina', activo: true },
  { id: 54, nombre: 'Luis Alberto', apellido: 'Huilca Condori', cargo: 'Contador', dni: '47065296', tarifa_por_hora: 55, ambito: 'Oficina', activo: true },
  { id: 55, nombre: 'Dany Daniel', apellido: 'Ibarra Garcia', cargo: 'Operario Mecanico', dni: '44648315', tarifa_por_hora: 30, ambito: 'Obra', activo: true },
  { id: 56, nombre: 'Zoila', apellido: 'Jean Pacaya', cargo: 'Supervisora Ssoma', dni: '76068227', tarifa_por_hora: 48, ambito: 'Obra', activo: true },
  { id: 57, nombre: 'Victor Manuel', apellido: 'Jimenez Mejia', cargo: 'Supervisor Operativo', dni: '45587650', tarifa_por_hora: 48, ambito: 'Obra', activo: true },
  { id: 58, nombre: 'Briham', apellido: 'Lagunas Gil', cargo: 'Operario Mecanico', dni: '76408043', tarifa_por_hora: 30, ambito: 'Obra', activo: true },
  { id: 59, nombre: 'William Samuel', apellido: 'Limascca Llacsa', cargo: 'Operador', dni: '74039350', tarifa_por_hora: 32, ambito: 'Obra', activo: true },
  { id: 60, nombre: 'Kevin Nicolás', apellido: 'Lopez Reyes', cargo: 'Asistente Logistica', dni: '70363763', tarifa_por_hora: 24, ambito: 'Oficina', activo: true },
  { id: 61, nombre: 'Abel Enrique', apellido: 'Machado Vivanco', cargo: 'Operador', dni: '70397918', tarifa_por_hora: 32, ambito: 'Obra', activo: true },
  { id: 62, nombre: 'Mario Joel', apellido: 'Machado Vivanco', cargo: 'Gerente Gerenal', dni: '40907435', tarifa_por_hora: 120, ambito: 'Oficina', activo: true },
  { id: 63, nombre: 'Crhistian Alexis', apellido: 'Medina Espinoza', cargo: 'Ayudante', dni: '75856201', tarifa_por_hora: 18, ambito: 'Obra', activo: true },
  { id: 64, nombre: 'Dennis Alexander', apellido: 'Mendoza Dueñas', cargo: 'Auxiliar Contable', dni: '71531647', tarifa_por_hora: 18, ambito: 'Oficina', activo: true },
  { id: 65, nombre: 'Mario Enrique', apellido: 'Mendoza Tamani', cargo: 'Operario', dni: '70429892', tarifa_por_hora: 25, ambito: 'Obra', activo: true },
  { id: 66, nombre: 'Giovanny Franco', apellido: 'Mestanza Ramirez', cargo: 'Ayudante', dni: '61053571', tarifa_por_hora: 18, ambito: 'Obra', activo: true },
  { id: 67, nombre: 'Eguiluz Yury', apellido: 'Mita Naventa', cargo: 'Operador / Conductor', dni: '42656045', tarifa_por_hora: 32, ambito: 'Obra', activo: true },
  { id: 68, nombre: 'Oscar Ivan', apellido: 'Montoya Pari', cargo: 'Operador', dni: '75863580', tarifa_por_hora: 32, ambito: 'Obra', activo: true },
  { id: 69, nombre: 'Wilmer', apellido: 'Morales Julcamoro', cargo: 'Lider del Taller', dni: '40264568', tarifa_por_hora: 50, ambito: 'Obra', activo: true },
  { id: 70, nombre: 'Carlos Antonio', apellido: 'Naventa Auccapuclla', cargo: 'Operador', dni: '72790213', tarifa_por_hora: 32, ambito: 'Obra', activo: true },
  { id: 71, nombre: 'Erick', apellido: 'Novoa Barbaran', cargo: 'Oficial Mecanico', dni: '61810099', tarifa_por_hora: 30, ambito: 'Obra', activo: true },
  { id: 72, nombre: 'Walter Elias', apellido: 'Ormeño Mendivel', cargo: 'Supervisor Operativo', dni: '71486032', tarifa_por_hora: 48, ambito: 'Obra', activo: true },
  { id: 73, nombre: 'Gabriel Omar', apellido: 'Palomino Huaman', cargo: 'Asistente de Sistemnas', dni: '70116517', tarifa_por_hora: 24, ambito: 'Oficina', activo: true },
  { id: 74, nombre: 'Gabriel Jackson', apellido: 'Panduro Gonzales', cargo: 'Operario Civil', dni: '42916520', tarifa_por_hora: 25, ambito: 'Obra', activo: true },
  { id: 75, nombre: 'Cesar Augusto', apellido: 'Pareja Quispe', cargo: 'Capataz', dni: '42710897', tarifa_por_hora: 40, ambito: 'Obra', activo: true },
  { id: 76, nombre: 'Wilber Ronald', apellido: 'Parisuaña Apaza', cargo: 'Asistente Logistica', dni: '70147550', tarifa_por_hora: 24, ambito: 'Oficina', activo: true },
  { id: 77, nombre: 'Victor Raul', apellido: 'Perez Contreras', cargo: 'Supervisor', dni: '41531893', tarifa_por_hora: 48, ambito: 'Obra', activo: true },
  { id: 78, nombre: 'Jorge Luis', apellido: 'Perez Levano', cargo: 'Mecanico/Conductor', dni: '40428123', tarifa_por_hora: 30, ambito: 'Obra', activo: true },
  { id: 79, nombre: 'Moises', apellido: 'Pinto Sayon', cargo: 'Oficial', dni: '76065367', tarifa_por_hora: 25, ambito: 'Obra', activo: true },
  { id: 80, nombre: 'Jesus', apellido: 'Portal Sanchez', cargo: 'Ayudante', dni: '75222665', tarifa_por_hora: 18, ambito: 'Obra', activo: true },
  { id: 81, nombre: 'Luis Angel', apellido: 'Quijaite Uculmana', cargo: 'Jefe de Proyectos', dni: '46556923', tarifa_por_hora: 70, ambito: 'Oficina', activo: true },
  { id: 82, nombre: 'Juan Eduardo', apellido: 'Quiliche Borja', cargo: 'Operador', dni: '48755900', tarifa_por_hora: 32, ambito: 'Obra', activo: true },
  { id: 83, nombre: 'Wilbert', apellido: 'Quispe Bolivar', cargo: 'Operador', dni: '46946019', tarifa_por_hora: 32, ambito: 'Obra', activo: true },
  { id: 84, nombre: 'Javier Victor', apellido: 'Reyes Ramos', cargo: 'Conductor', dni: '41653715', tarifa_por_hora: 32, ambito: 'Obra', activo: true },
  { id: 85, nombre: 'Edwin Cesar', apellido: 'Rivas Yauyo', cargo: 'Ayudante / Mecanico', dni: '71209119', tarifa_por_hora: 30, ambito: 'Obra', activo: true },
  { id: 86, nombre: 'Emerson', apellido: 'Rodriguez Quijahuaman', cargo: 'Operador', dni: '48730880', tarifa_por_hora: 32, ambito: 'Obra', activo: true },
  { id: 87, nombre: 'Ludmer Nicolas', apellido: 'Roman Flores', cargo: 'Supervisor de Producción', dni: '43904646', tarifa_por_hora: 48, ambito: 'Obra', activo: true },
  { id: 88, nombre: 'Porfirio Jose', apellido: 'Romucho Huaman', cargo: 'Operador/Conductor', dni: '71831041', tarifa_por_hora: 32, ambito: 'Obra', activo: true },
  { id: 89, nombre: 'Richard', apellido: 'Rosales Pascual', cargo: 'Operario', dni: '48767201', tarifa_por_hora: 25, ambito: 'Obra', activo: true },
  { id: 90, nombre: 'Alfredo John', apellido: 'Saccatoma Valenzuela', cargo: 'Operador Multiple', dni: '22315122', tarifa_por_hora: 32, ambito: 'Obra', activo: true },
  { id: 91, nombre: 'Jennifer Alexandra', apellido: 'Sandoval Allauja', cargo: 'Supervisora Ssoma', dni: '70354844', tarifa_por_hora: 48, ambito: 'Obra', activo: true },
  { id: 92, nombre: 'Kenyiro Alberto', apellido: 'Sandoval Villanueva', cargo: 'Asistente Logistica', dni: '74855178', tarifa_por_hora: 24, ambito: 'Oficina', activo: true },
  { id: 93, nombre: 'Henry Mohamed Ali', apellido: 'Sarmiento Ortega', cargo: 'Operario Multiple', dni: '78110732', tarifa_por_hora: 25, ambito: 'Obra', activo: true },
  { id: 94, nombre: 'Erick Henderson', apellido: 'Sifuentes Chavez', cargo: 'Operario Mecanico', dni: '44819578', tarifa_por_hora: 30, ambito: 'Obra', activo: true },
  { id: 95, nombre: 'Mateo Dario', apellido: 'Silva Pinto', cargo: 'Oficial', dni: '61412617', tarifa_por_hora: 25, ambito: 'Obra', activo: true },
  { id: 96, nombre: 'Aner', apellido: 'Tamayo Canayo', cargo: 'Oficial Civil', dni: '47671343', tarifa_por_hora: 25, ambito: 'Obra', activo: true },
  { id: 97, nombre: 'Walter Alejandro', apellido: 'Tapia Tarrillo', cargo: 'Operario Civil', dni: '76827936', tarifa_por_hora: 25, ambito: 'Obra', activo: true },
  { id: 98, nombre: 'Yasser Yrwin', apellido: 'Torres Valiente', cargo: 'Operario Civil', dni: '48660895', tarifa_por_hora: 25, ambito: 'Obra', activo: true },
  { id: 99, nombre: 'Junior Jaime', apellido: 'Torres Suarez', cargo: 'Operario Mecanico', dni: '47100759', tarifa_por_hora: 30, ambito: 'Obra', activo: true },
  { id: 100, nombre: 'Victor Carlos', apellido: 'Vasquez Hernandez', cargo: 'Supervisor Operativo', dni: '40384005', tarifa_por_hora: 48, ambito: 'Obra', activo: true },
  { id: 101, nombre: 'Joselyn Rosmery', apellido: 'Vergara Ormeño', cargo: 'Supervisor (Operativo)', dni: '72019276', tarifa_por_hora: 48, ambito: 'Obra', activo: true },
  { id: 102, nombre: 'William', apellido: 'Yauyo Panchillo', cargo: 'Oficial Mecanico / Soldador', dni: '71533376', tarifa_por_hora: 30, ambito: 'Obra', activo: true },
  { id: 103, nombre: 'Jair Alexis', apellido: 'Zavala Farias', cargo: 'Oficial', dni: '70034594', tarifa_por_hora: 25, ambito: 'Obra', activo: true },
  { id: 104, nombre: 'Jhonatan', apellido: 'Zulueta Lozada', cargo: 'Supervisor Operativo', dni: '71689937', tarifa_por_hora: 48, ambito: 'Obra', activo: true },
]

export const equipos = [
  { id: 1, nombre: 'Camioneta BSI-922', costo_por_hora: 60, propiedad: 'Propio' },
  { id: 2, nombre: 'Cisterna de Agua BEA-747', costo_por_hora: 150, propiedad: 'Propio' },
  { id: 3, nombre: 'Volquete BRP-888', costo_por_hora: 150, propiedad: 'Propio' },
  { id: 4, nombre: 'Camioneta BJU-824', costo_por_hora: 60, propiedad: 'Propio' },
  { id: 5, nombre: 'Camión Baranda CCJ-900', costo_por_hora: 150, propiedad: 'Propio' },
  { id: 6, nombre: 'Volquete BRP-887', costo_por_hora: 150, propiedad: 'Propio' },
  { id: 7, nombre: 'Camión Baranda BXQ-768', costo_por_hora: 150, propiedad: 'Propio' },
  { id: 8, nombre: 'Miniván CPR-012', costo_por_hora: 60, propiedad: 'Propio' },
  { id: 9, nombre: 'Miniván CWF-344', costo_por_hora: 60, propiedad: 'Propio' },
  { id: 10, nombre: 'Camioneta BBD-873', costo_por_hora: 60, propiedad: 'Propio' },
  { id: 11, nombre: 'Volquete BMI-757', costo_por_hora: 150, propiedad: 'Propio' },
  { id: 12, nombre: 'Volquete BMI-856', costo_por_hora: 150, propiedad: 'Propio' },
  { id: 13, nombre: 'Camioneta BVR-788', costo_por_hora: 60, propiedad: 'Propio' },
  { id: 14, nombre: 'Camioneta BVW-820', costo_por_hora: 60, propiedad: 'Propio' },
  { id: 15, nombre: 'Camioneta CEB-793', costo_por_hora: 60, propiedad: 'Propio' },
  { id: 16, nombre: 'Camioneta CEM-838', costo_por_hora: 60, propiedad: 'Propio' },
  { id: 17, nombre: 'Camioneta CHP-770', costo_por_hora: 60, propiedad: 'Propio' },
  { id: 18, nombre: 'Camioneta CJI-818', costo_por_hora: 60, propiedad: 'Propio' },
  { id: 19, nombre: 'Miniván BVW-497', costo_por_hora: 60, propiedad: 'Propio' },
  { id: 20, nombre: 'Camioneta CHL-803', costo_por_hora: 60, propiedad: 'Propio' },
  { id: 21, nombre: 'Camioneta CNP-931', costo_por_hora: 60, propiedad: 'Propio' },
  { id: 22, nombre: 'Camioneta CNS-898', costo_por_hora: 60, propiedad: 'Propio' },
  { id: 23, nombre: 'Mezcladora de concreto', costo_por_hora: 80, propiedad: 'Alquilado' },
  { id: 24, nombre: 'Generador diesel 15 kVA', costo_por_hora: 80, propiedad: 'Alquilado' },
  { id: 25, nombre: 'Andamio modular', costo_por_hora: 80, propiedad: 'Propio' },
]

// ------------------------------------------------------------
//  2. Módulo central y relaciones
// ------------------------------------------------------------

export const servicios = [
  {
    id: 6,
    nombre_servicio: 'Mejoramiento del servicio de agua potable y alcantarillado – AA.HH. San Isidro (II Etapa)',
    cliente: 'Municipalidad Distrital de Salas',
    tipo: 'Obra',
    presupuesto_asignado: 335000,
    fecha_inicio: '2026-06-01',
    fecha_fin_estimada: '2026-12-20',
    avance: 0,
    estatus: 'En curso',
  },
  {
    id: 7,
    nombre_servicio: 'Mejoramiento y ampliación de pistas y veredas – Jr. Amazonas',
    cliente: 'Municipalidad Provincial de Chachapoyas',
    tipo: 'Obra',
    presupuesto_asignado: 180000,
    fecha_inicio: '2026-03-02',
    fecha_fin_estimada: '2026-10-25',
    avance: 0,
    estatus: 'En curso',
  },
  {
    id: 8,
    nombre_servicio: 'Mantenimiento de redes de agua potable – Sector Muyuna',
    cliente: 'Municipalidad Distrital de la Banda de Shilcayo',
    tipo: 'Misceláneo',
    presupuesto_asignado: 95000,
    fecha_inicio: '2026-08-01',
    fecha_fin_estimada: '2027-02-28',
    avance: 0,
    estatus: 'En curso',
  },
]

export const registros_servicio = [
  // Servicio 6 — Mejoramiento de agua potable y alcantarillado (en curso).
  // Cada registro cae dentro de la vigencia de su tarea.
  // --- Materiales ---
  {
    id: 19,
    servicio_id: 6,
    tarea_id: 15,
    tipo_registro: 'material',
    referencia_id: null,
    nombre_material: 'Cemento Portland Tipo I',
    unidad: 'bls',
    cantidad_o_horas: 260,
    monto_calculado: 10010,
    fecha: '2026-06-20',
  },
  {
    id: 20,
    servicio_id: 6,
    tarea_id: 15,
    tipo_registro: 'material',
    referencia_id: null,
    nombre_material: 'Tubería PVC 160 mm x 6 m',
    unidad: 'p',
    cantidad_o_horas: 90,
    monto_calculado: 8100,
    fecha: '2026-06-28',
  },
  {
    id: 26,
    servicio_id: 6,
    tarea_id: 16,
    tipo_registro: 'material',
    referencia_id: null,
    nombre_material: 'Arena gruesa',
    unidad: 'm³',
    cantidad_o_horas: 45,
    monto_calculado: 2790,
    fecha: '2026-07-22',
  },
  {
    id: 30,
    servicio_id: 6,
    tarea_id: 18,
    tipo_registro: 'material',
    referencia_id: null,
    nombre_material: 'Tubería PVC 200 mm x 6 m',
    unidad: 'p',
    cantidad_o_horas: 120,
    monto_calculado: 13200,
    fecha: '2026-09-05',
  },
  {
    id: 35,
    servicio_id: 6,
    tarea_id: 19,
    tipo_registro: 'material',
    referencia_id: null,
    nombre_material: 'Ladrillo KK 18 huecos',
    unidad: 'p',
    cantidad_o_horas: 3500,
    monto_calculado: 4725,
    fecha: '2026-10-08',
  },
  {
    id: 37,
    servicio_id: 6,
    tarea_id: 19,
    tipo_registro: 'material',
    referencia_id: null,
    nombre_material: 'Cemento Portland Tipo I',
    unidad: 'bls',
    cantidad_o_horas: 120,
    monto_calculado: 4620,
    fecha: '2026-10-10',
  },
  // --- Equipos (horas máquina de equipos propios/alquilados) ---
  {
    id: 21,
    servicio_id: 6,
    tarea_id: 13,
    tipo_registro: 'equipo',
    referencia_id: 1,
    unidad: 'hm',
    cantidad_o_horas: 100,
    monto_calculado: 6000,
    fecha: '2026-06-03',
  },
  {
    id: 24,
    servicio_id: 6,
    tarea_id: 15,
    tipo_registro: 'equipo',
    referencia_id: 3,
    unidad: 'hm',
    cantidad_o_horas: 60,
    monto_calculado: 9000,
    fecha: '2026-06-22',
  },
  {
    id: 27,
    servicio_id: 6,
    tarea_id: 16,
    tipo_registro: 'equipo',
    referencia_id: 23,
    unidad: 'hm',
    cantidad_o_horas: 80,
    monto_calculado: 6400,
    fecha: '2026-07-25',
  },
  {
    id: 31,
    servicio_id: 6,
    tarea_id: 18,
    tipo_registro: 'equipo',
    referencia_id: 6,
    unidad: 'hm',
    cantidad_o_horas: 70,
    monto_calculado: 10500,
    fecha: '2026-09-12',
  },
  {
    id: 36,
    servicio_id: 6,
    tarea_id: 19,
    tipo_registro: 'equipo',
    referencia_id: 1,
    unidad: 'hm',
    cantidad_o_horas: 40,
    monto_calculado: 2400,
    fecha: '2026-10-06',
  },
  // --- Gastos generales de obra ---
  {
    id: 22,
    servicio_id: 6,
    tarea_id: 13,
    tipo_registro: 'gasto',
    referencia_id: null,
    concepto: 'Servicio de topografía y trazo',
    cantidad_o_horas: 1,
    monto_calculado: 3500,
    fecha: '2026-06-02',
  },
  {
    id: 23,
    servicio_id: 6,
    tarea_id: 13,
    tipo_registro: 'gasto',
    referencia_id: null,
    concepto: 'Flete de tubería y materiales',
    cantidad_o_horas: 1,
    monto_calculado: 1800,
    fecha: '2026-06-05',
  },
  {
    id: 28,
    servicio_id: 6,
    tarea_id: 15,
    tipo_registro: 'gasto',
    referencia_id: null,
    concepto: 'Eliminación de desmonte',
    cantidad_o_horas: 1,
    monto_calculado: 2200,
    fecha: '2026-07-10',
  },
  {
    id: 32,
    servicio_id: 6,
    tarea_id: 18,
    tipo_registro: 'gasto',
    referencia_id: null,
    concepto: 'Alquiler de excavadora 320',
    cantidad_o_horas: 1,
    monto_calculado: 8000,
    fecha: '2026-09-08',
  },
  {
    id: 33,
    servicio_id: 6,
    tarea_id: null,
    tipo_registro: 'gasto',
    referencia_id: null,
    concepto: 'Movilidad del personal',
    cantidad_o_horas: 1,
    monto_calculado: 900,
    fecha: '2026-09-12',
  },
  // --- Personal directo (parte diario, sin asignación mensual) ---
  {
    id: 25,
    servicio_id: 6,
    tarea_id: 15,
    tipo_registro: 'personal',
    referencia_id: 25,
    cantidad_o_horas: 40,
    monto_calculado: 1000,
    fecha: '2026-06-20',
  },
  {
    id: 29,
    servicio_id: 6,
    tarea_id: 16,
    tipo_registro: 'personal',
    referencia_id: 14,
    cantidad_o_horas: 32,
    monto_calculado: 800,
    fecha: '2026-07-22',
  },
  {
    id: 34,
    servicio_id: 6,
    tarea_id: 18,
    tipo_registro: 'personal',
    referencia_id: 9,
    cantidad_o_horas: 32,
    monto_calculado: 800,
    fecha: '2026-09-05',
  },
  {
    id: 38,
    servicio_id: 6,
    tarea_id: 19,
    tipo_registro: 'personal',
    referencia_id: 12,
    cantidad_o_horas: 24,
    monto_calculado: 600,
    fecha: '2026-10-08',
  },
  // Servicio 7 — Pistas y veredas Jr. Amazonas. Gasto por encima del valor
  // ganado (sobrecosto) repartido entre materiales, equipos, gastos y personal.
  {
    id: 39,
    servicio_id: 7,
    tarea_id: 24,
    tipo_registro: 'material',
    referencia_id: null,
    nombre_material: 'Concreto premezclado f\'c=210 kg/cm²',
    unidad: 'm³',
    cantidad_o_horas: 250,
    monto_calculado: 60000,
    fecha: '2026-09-20',
  },
  {
    id: 40,
    servicio_id: 7,
    tarea_id: 24,
    tipo_registro: 'material',
    referencia_id: null,
    nombre_material: 'Acero de refuerzo fy=4200',
    unidad: 'kg',
    cantidad_o_horas: 3600,
    monto_calculado: 36000,
    fecha: '2026-08-25',
  },
  {
    id: 41,
    servicio_id: 7,
    tarea_id: 23,
    tipo_registro: 'material',
    referencia_id: null,
    nombre_material: 'Base granular',
    unidad: 'm³',
    cantidad_o_horas: 400,
    monto_calculado: 24000,
    fecha: '2026-05-10',
  },
  {
    id: 42,
    servicio_id: 7,
    tarea_id: 22,
    tipo_registro: 'material',
    referencia_id: null,
    nombre_material: 'Agregados y cemento para trazo',
    unidad: 'm³',
    cantidad_o_horas: 120,
    monto_calculado: 7000,
    fecha: '2026-03-15',
  },
  {
    id: 43,
    servicio_id: 7,
    tarea_id: 24,
    tipo_registro: 'equipo',
    referencia_id: 23,
    unidad: 'hm',
    cantidad_o_horas: 175,
    monto_calculado: 14000,
    fecha: '2026-09-25',
  },
  {
    id: 44,
    servicio_id: 7,
    tarea_id: 24,
    tipo_registro: 'equipo',
    referencia_id: 1,
    unidad: 'hm',
    cantidad_o_horas: 200,
    monto_calculado: 12000,
    fecha: '2026-08-30',
  },
  {
    id: 45,
    servicio_id: 7,
    tarea_id: 24,
    tipo_registro: 'gasto',
    referencia_id: null,
    concepto: 'Alquiler de volquete',
    cantidad_o_horas: 1,
    monto_calculado: 9000,
    fecha: '2026-07-05',
  },
  {
    id: 46,
    servicio_id: 7,
    tarea_id: 24,
    tipo_registro: 'personal',
    referencia_id: 12,
    cantidad_o_horas: 240,
    monto_calculado: 6000,
    fecha: '2026-09-10',
  },
  {
    id: 47,
    servicio_id: 7,
    tarea_id: 23,
    tipo_registro: 'gasto',
    referencia_id: null,
    concepto: 'Eliminación de desmonte',
    cantidad_o_horas: 1,
    monto_calculado: 7000,
    fecha: '2026-06-01',
  },
  // Servicio 8 — Mantenimiento de redes Muyuna. Gasto por debajo del valor
  // ganado (dentro de presupuesto).
  {
    id: 48,
    servicio_id: 8,
    tarea_id: 26,
    tipo_registro: 'material',
    referencia_id: null,
    nombre_material: 'Cemento y mortero',
    unidad: 'bls',
    cantidad_o_horas: 180,
    monto_calculado: 9000,
    fecha: '2026-08-20',
  },
  {
    id: 49,
    servicio_id: 8,
    tarea_id: 27,
    tipo_registro: 'material',
    referencia_id: null,
    nombre_material: 'Tubería PVC y accesorios',
    unidad: 'p',
    cantidad_o_horas: 90,
    monto_calculado: 12000,
    fecha: '2026-10-05',
  },
  {
    id: 50,
    servicio_id: 8,
    tarea_id: 26,
    tipo_registro: 'equipo',
    referencia_id: 23,
    unidad: 'hm',
    cantidad_o_horas: 62.5,
    monto_calculado: 5000,
    fecha: '2026-08-28',
  },
  {
    id: 51,
    servicio_id: 8,
    tarea_id: 27,
    tipo_registro: 'personal',
    referencia_id: 9,
    cantidad_o_horas: 240,
    monto_calculado: 6000,
    fecha: '2026-09-30',
  },
]

// ------------------------------------------------------------
//  3. Cronograma (tareas por servicio)
// ------------------------------------------------------------

export const tareas = [
  // Servicio 6 — Mejoramiento de agua potable y alcantarillado. Cada tarea
  // lleva su monto; las tareas "padre" suman automáticamente el de sus hijas.
  { id: 13, servicio_id: 6, nombre: 'Obras preliminares y trazo', fecha_inicio: '2026-06-01', fecha_fin: '2026-06-15', avance: 100, monto: 15000, unidad: 'Glb' },
  { id: 14, servicio_id: 6, nombre: 'Redes de agua potable', fecha_inicio: '2026-06-16', fecha_fin: '2026-08-15', avance: 0, monto: 0 },
  // Las predecesoras usan tipos FS/SS/FF/SF y holgura (lag) en días
  // laborables; el cronograma las dibuja y el motor CPM calcula la ruta
  // crítica (asesor: solo se aplica con "Reprogramar (CPM)").
  { id: 15, servicio_id: 6, padre_id: 14, nombre: 'Excavación y tendido de tubería PVC', fecha_inicio: '2026-06-16', fecha_fin: '2026-07-15', avance: 100, monto: 42000, unidad: 'm³', metrado: 600, precio_unitario: 70, predecesoras: [{ id: 13, tipo: 'FS', lag: 0 }] },
  { id: 16, servicio_id: 6, padre_id: 14, nombre: 'Pruebas hidráulicas y empalmes', fecha_inicio: '2026-07-16', fecha_fin: '2026-08-15', avance: 100, monto: 33000, unidad: 'und', metrado: 10, precio_unitario: 3300, predecesoras: [{ id: 15, tipo: 'FS', lag: 0 }] },
  { id: 17, servicio_id: 6, nombre: 'Redes de alcantarillado', fecha_inicio: '2026-08-16', fecha_fin: '2026-10-31', avance: 0, monto: 0 },
  { id: 18, servicio_id: 6, padre_id: 17, nombre: 'Excavación e instalación de colectores', fecha_inicio: '2026-08-16', fecha_fin: '2026-09-30', avance: 85, monto: 58000, unidad: 'm³', metrado: 800, precio_unitario: 72.5, predecesoras: [{ id: 16, tipo: 'FS', lag: 0 }] },
  { id: 19, servicio_id: 6, padre_id: 17, nombre: 'Buzones y conexiones domiciliarias', fecha_inicio: '2026-10-01', fecha_fin: '2026-10-31', avance: 40, monto: 47000, unidad: 'und', metrado: 47, precio_unitario: 1000, predecesoras: [{ id: 18, tipo: 'FS', lag: 0 }] },
  { id: 20, servicio_id: 6, nombre: 'Reposición de pavimento y veredas', fecha_inicio: '2026-11-01', fecha_fin: '2026-12-05', avance: 0, monto: 62000, unidad: 'm²', metrado: 1240, precio_unitario: 50, predecesoras: [{ id: 19, tipo: 'FS', lag: 0 }] },
  { id: 21, servicio_id: 6, nombre: 'Caseta de bombeo y equipamiento hidráulico', fecha_inicio: '2026-11-15', fecha_fin: '2026-12-20', avance: 0, monto: 78000, unidad: 'und', metrado: 2, precio_unitario: 39000, predecesoras: [{ id: 19, tipo: 'FS', lag: 5 }] },
  // Servicio 7 — Pistas y veredas Jr. Amazonas (en curso, con retraso y sobrecosto).
  { id: 22, servicio_id: 7, nombre: 'Trabajos preliminares y trazo', fecha_inicio: '2026-03-02', fecha_fin: '2026-03-20', avance: 100, monto: 18000, unidad: 'Glb' },
  { id: 23, servicio_id: 7, nombre: 'Movimiento de tierras', fecha_inicio: '2026-03-21', fecha_fin: '2026-06-30', avance: 100, monto: 52000, unidad: 'm³', metrado: 650, precio_unitario: 80, predecesoras: [{ id: 22, tipo: 'FS', lag: 0 }] },
  { id: 24, servicio_id: 7, nombre: 'Pavimento rígido (losas)', fecha_inicio: '2026-07-01', fecha_fin: '2026-10-15', avance: 45, monto: 80000, unidad: 'm²', metrado: 1600, precio_unitario: 50, predecesoras: [{ id: 23, tipo: 'FS', lag: 0 }] },
  { id: 25, servicio_id: 7, nombre: 'Señalización y áreas verdes', fecha_inicio: '2026-10-16', fecha_fin: '2026-10-25', avance: 0, monto: 30000, unidad: 'Glb', metrado: 1, precio_unitario: 30000, predecesoras: [{ id: 24, tipo: 'FS', lag: 0 }] },
  // Servicio 8 — Mantenimiento de redes Muyuna (en curso, dentro de plazo y presupuesto).
  { id: 26, servicio_id: 8, nombre: 'Inspección y limpieza de reservorios', fecha_inicio: '2026-08-01', fecha_fin: '2026-09-15', avance: 100, monto: 22000, unidad: 'und', metrado: 4, precio_unitario: 5500 },
  { id: 27, servicio_id: 8, nombre: 'Reparación de tuberías y válvulas', fecha_inicio: '2026-09-16', fecha_fin: '2026-12-20', avance: 100, monto: 43000, unidad: 'und', metrado: 43, precio_unitario: 1000, predecesoras: [{ id: 26, tipo: 'FS', lag: 0 }] },
  { id: 28, servicio_id: 8, nombre: 'Rehabilitación de cámaras de bombeo', fecha_inicio: '2026-12-21', fecha_fin: '2027-02-28', avance: 0, monto: 30000, unidad: 'und', metrado: 3, precio_unitario: 10000, predecesoras: [{ id: 27, tipo: 'FS', lag: 0 }] },
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
//  Asignaciones de personal a servicios: quién trabaja dónde, con qué
//  pago y desde/hasta cuándo. La proyección y los asentamientos mensuales
//  se calculan desde aquí; fecha_fin vacía = vigente.
// ------------------------------------------------------------

export const asignaciones = [
  { id: 1, servicio_id: 6, personal_id: 26, tarea_id: 15, horas_por_dia: 8, tarifa: 40, fecha_inicio: '2026-06-16', fecha_fin: null },
  { id: 2, servicio_id: 6, personal_id: 3, tarea_id: 18, horas_por_dia: 8, tarifa: 18, fecha_inicio: '2026-08-16', fecha_fin: '2026-09-30' },
  { id: 3, servicio_id: 6, personal_id: 17, tarea_id: 19, horas_por_dia: 8, tarifa: 25, fecha_inicio: '2026-10-01', fecha_fin: '2026-10-31' },
]

// ------------------------------------------------------------
//  Cobros por servicio (= Ingresos en UI): lo efectivamente recibido
//  (adelantos, cobros de valorización, ingresos anuales).
//  Utilidad real = cobrado − gastado.
// ------------------------------------------------------------

export const cobros = [
  { id: 1, servicio_id: 6, fecha: '2026-06-05', monto: 50250, concepto: 'adelanto', documento: 'REC-001' },
  { id: 2, servicio_id: 6, fecha: '2026-08-10', monto: 60000, concepto: 'valorización N°1', documento: 'F001-000101', factura_id: 1 },
  { id: 3, servicio_id: 6, fecha: '2026-10-10', monto: 45000, concepto: 'valorización N°2', documento: 'F001-000102', factura_id: 2 },
  { id: 4, servicio_id: 7, fecha: '2026-04-20', monto: 98000, concepto: 'adelanto', documento: 'REC-002' },
  { id: 5, servicio_id: 7, fecha: '2026-08-15', monto: 60000, concepto: 'valorización N°1', documento: 'F002-000201', factura_id: 4 },
  { id: 6, servicio_id: 8, fecha: '2026-08-05', monto: 30000, concepto: 'adelanto', documento: 'REC-003' },
]

// ------------------------------------------------------------
//  Estado inicial consolidado
// ------------------------------------------------------------

// ------------------------------------------------------------
//  Etapa 2: entidades financieras y operativas (empiezan vacías; sin
//  datos ficticios). Se usan desde sus módulos y reportes.
// ------------------------------------------------------------

export const facturas = [
  {
    id: 1,
    servicio_id: 6,
    numero: 'F001-000101',
    fecha_emision: '2026-08-08',
    fecha_vencimiento: '2026-09-08',
    base: 60000,
    impuestos: 0,
    total: 60000,
    moneda: 'PEN',
    estado: 'emitida',
  },
  {
    id: 2,
    servicio_id: 6,
    numero: 'F001-000102',
    fecha_emision: '2026-10-05',
    fecha_vencimiento: '2026-11-05',
    base: 45000,
    impuestos: 0,
    total: 45000,
    moneda: 'PEN',
    estado: 'emitida',
  },
  {
    id: 3,
    servicio_id: 6,
    numero: 'F001-000103',
    fecha_emision: '2026-10-12',
    fecha_vencimiento: '2026-11-12',
    base: 52500,
    impuestos: 0,
    total: 52500,
    moneda: 'PEN',
    estado: 'emitida',
  },
  {
    id: 4,
    servicio_id: 7,
    numero: 'F002-000201',
    fecha_emision: '2026-08-12',
    fecha_vencimiento: '2026-09-12',
    base: 60000,
    impuestos: 0,
    total: 60000,
    moneda: 'PEN',
    estado: 'emitida',
  },
  {
    id: 5,
    servicio_id: 8,
    numero: 'F003-000301',
    fecha_emision: '2026-10-08',
    fecha_vencimiento: '2026-11-08',
    base: 35000,
    impuestos: 0,
    total: 35000,
    moneda: 'PEN',
    estado: 'emitida',
  },
]
export const config = [{ id: 1, empresa: 'PROMCOSER', moneda: 'PEN', meta_ingreso: 0 }]

// ------------------------------------------------------------
//  4. Control de obra: línea base, lecturas de avance, valorizaciones y
//     adelantos (F2 y F3). El resto de colecciones mantiene compatibilidad:
//     si faltan en un respaldo viejo, se rellenan con estos valores.
// ------------------------------------------------------------

// Línea base del servicio 6: el plan original congelado al iniciar la obra.
// El PV de la Curva S sale de aquí (no del cronograma vivo).
export const lineas_base = [
  {
    id: 1,
    servicio_id: 6,
    version: 1,
    fecha: '2026-06-01',
    nota: 'Línea base original congelada al inicio de obra.',
    presupuesto: 335000,
    tareas: tareas
      .filter((t) => t.servicio_id === 6)
      .map((t) => ({
        id: t.id,
        servicio_id: t.servicio_id,
        padre_id: t.padre_id ?? null,
        nombre: t.nombre,
        fecha_inicio: t.fecha_inicio,
        fecha_fin: t.fecha_fin,
        monto: t.monto ?? 0,
        metrado: t.metrado ?? null,
        precio_unitario: t.precio_unitario ?? null,
      })),
  },
]

export const lecturas_avance = []
export const valorizaciones = []
export const adelantos = []

// ------------------------------------------------------------
//  5. Modificaciones contractuales (adicionales, deductivos y ampliaciones de
//     plazo). Los adicionales/deductivos guardan sus partidas (metrado ×
//     precio unitario) y el historial de estados; las ampliaciones, los días
//     solicitados/aprobados y su motivo. Solo los APROBADOS alteran el
//     presupuesto vigente y el plazo (los ejemplos sembrados están sin aprobar
//     a propósito, para no mover las cifras de la línea base).
// ------------------------------------------------------------

export const modificaciones = [
  {
    id: 1,
    servicio_id: 6,
    tipo: 'adicional',
    numero: 1,
    fecha: '2026-09-15',
    descripcion: 'Mayor metrado de excavación por suelo rocoso no previsto.',
    estado: 'presentado',
    documento: 'CARTA-001-2026',
    partidas: [
      { nombre: 'Excavación adicional en roca', unidad: 'm³', metrado: 120, precio_unitario: 95 },
    ],
    historial: [
      { estado: 'borrador', fecha: '2026-09-10' },
      { estado: 'presentado', fecha: '2026-09-15' },
    ],
  },
  {
    id: 2,
    servicio_id: 6,
    tipo: 'deductivo',
    numero: 1,
    fecha: '2026-09-20',
    descripcion: 'Menor metrado de reposición de veredas por tramo anulado.',
    estado: 'borrador',
    documento: '',
    partidas: [
      { nombre: 'Reposición de veredas (tramo anulado)', unidad: 'm²', metrado: 40, precio_unitario: 50 },
    ],
    historial: [{ estado: 'borrador', fecha: '2026-09-20' }],
  },
]

export const ampliaciones_plazo = [
  {
    id: 1,
    servicio_id: 6,
    numero: 1,
    fecha_solicitud: '2026-10-01',
    dias_solicitados: 20,
    dias_aprobados: 0,
    motivo: 'Retraso por lluvias no previstas en la programación de obra.',
    estado: 'presentado',
    documento: 'CARTA-002-2026',
    historial: [
      { estado: 'borrador', fecha: '2026-09-28' },
      { estado: 'presentado', fecha: '2026-10-01' },
    ],
  },
]

// Parte diario de obra (Fase 2). Cada parte registra una jornada de un
// servicio: clima, responsable, personal presente (referenciado por id, no
// duplicado), equipos usados, partidas ejecutadas con su avance del día,
// incidencias, observaciones y fotos (los binarios viven en IndexedDB; aquí
// solo la metadata). Arranca vacío a propósito: el avance de las tareas lo
// gobiernan los partes cuando existen, y no queremos mover la línea base.
export const partes_diario = []

export const ESTADO_INICIAL = {
  cargos,
  personal,
  equipos,
  servicios,
  registros_servicio,
  tareas,
  costos_oficina,
  asignaciones,
  cobros,
  facturas,
  config,
  lineas_base,
  lecturas_avance,
  valorizaciones,
  adelantos,
  modificaciones,
  ampliaciones_plazo,
  partes_diario,
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

// Migra datos guardados con partidas separadas al modelo actual, donde el
// presupuesto vive en las tareas: la tarea principal de cada partida hereda
// su presupuesto como monto, y los costos directos a la partida pasan a esa
// tarea principal. Se aplica una sola vez al cargar.
export function migrarPresupuestoATareas(guardado) {
  if (!guardado || typeof guardado !== 'object') return guardado
  if (!Array.isArray(guardado.partidas) || !Array.isArray(guardado.tareas)) {
    return guardado
  }

  const presupuestoPorPartida = new Map(
    guardado.partidas.map((p) => [
      p.id,
      (Number(p.metrado) || 0) * (Number(p.precio_unitario) || 0),
    ]),
  )
  const principalPorPartida = new Map()
  const tareas = guardado.tareas.map((t) => {
    const monto =
      t.monto ??
      (t.padre_id == null && t.partida_id != null
        ? (presupuestoPorPartida.get(t.partida_id) ?? 0)
        : 0)
    if (t.padre_id == null && t.partida_id != null && !principalPorPartida.has(t.partida_id)) {
      principalPorPartida.set(t.partida_id, t.id)
    }
    const { partida_id, ...resto } = t
    return { ...resto, monto }
  })

  const registros_servicio = Array.isArray(guardado.registros_servicio)
    ? guardado.registros_servicio.map((r) => {
        if (r.tarea_id != null || r.partida_id == null) {
          const { partida_id, ...resto } = r
          return resto
        }
        const { partida_id, ...resto } = r
        const destino = principalPorPartida.get(partida_id)
        return destino != null ? { ...resto, tarea_id: destino } : resto
      })
    : guardado.registros_servicio

  const { partidas, valorizaciones, ...resto } = guardado
  return { ...resto, tareas, registros_servicio }
}

export { STORAGE_KEY_ANTERIOR }
