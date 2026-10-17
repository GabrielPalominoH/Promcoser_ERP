# Manual del Sistema PROMCOSER

*Explicado en palabras simples, para quien nunca ha usado el sistema.*

---

## 1. ¿Qué es este sistema y para qué sirve?

Es un programa para llevar las cuentas de las obras de la empresa constructora.
Responde tres preguntas todos los días:

1. **¿Cuánto se ha cobrado?** (ingresos: adelantos, valorizaciones)
2. **¿Cuánto se ha gastado?** (materiales, personal, equipos, gastos)
3. **¿La obra deja ganancia?** (cobrado menos gastado: la utilidad real)

Antes esto se llevaba en cuadernos o archivos sueltos. El sistema lo junta todo
en un solo lugar: cada obra muestra sus montos, su personal, sus materiales y su
avance, y el panel principal muestra cómo va toda la empresa.

**Lo que el sistema NO es:** no es un programa de contabilidad oficial (no
emite facturas ni declara impuestos) y no está conectado a internet: funciona
en una sola computadora.

---

## 2. Lo primero que debe saber (importante)

- **Sus datos se guardan en el navegador de la computadora** (Chrome, Edge,
  etc.), no en internet. Si usa otra computadora, no verá sus datos.
- **Acceso:** el sistema pide correo y clave al abrirlo. La sesión dura 8 horas y tras 5
  intentos fallidos espera 1 minuto. Para salir use **Cerrar sesión** (abajo del menú); para
  cambiar su clave, **Configuración → Mi cuenta**. Si olvida su clave, el administrador la
  restablece en **Usuarios y roles**.
- **Roles:** *Administrador* (todo), *Gerencia* (solo lectura), *Residente de obra* (opera la
  obra, sin Ingresos, Dashboard ni Oficina) y *Administración* (finanzas). Si intenta algo que su
  rol no permite, aparece un aviso y no se guarda nada.
- **Los usuarios no van en el respaldo**: si cambia de computadora, hay que volver a crearlos.
- **Al abrir el sistema por primera vez** aparece una bienvenida: elija
  **Empezar con datos vacíos** para cargar sus obras reales, o **Explorar con
  datos de ejemplo** para conocerlo sin riesgo.
- **El sistema le recuerda el respaldo:** si pasan 7 días sin descargar uno (o el
  almacenamiento del navegador casi se llena), aparece un aviso amarillo arriba
  con el botón **Descargar respaldo**.
- **Haga un respaldo cada semana.** En el panel principal (Dashboard) hay un
  botón **"Datos y respaldo"** con la opción **"Exportar respaldo"**, que
  descarga un archivo con toda la información. Guárdelo en un USB o en su
  correo. Si algo le pasa a la computadora, con la opción **"Importar
  respaldo"** se recupera todo: después de importar, revise que los totales
  (cobrado, gastado, utilidad) coincidan con lo que exportó.
- **Para empezar de cero** (primera vez en producción), el mismo botón trae
  **"Vaciar todo"**: borra todo dos clics mediante y conserva la
  configuración. Exporte primero por si acaso.
- Si limpia los datos del navegador sin haber exportado el respaldo, **la
  información se pierde**. El respaldo es su seguro.

---

## 3. Las partes del sistema (menú principal)

Al lado izquierdo siempre verá el menú, agrupado en **Gestión** (Dashboard, Servicios), **Recursos** (Personal, Equipos), **Administración** (Oficina) y **Catálogos** (Cargos, Unidades). Dentro de una obra el menú se ordena como el trabajo real: **Obra** (Resumen), **Planificación** (Cronograma, Partidas, Línea base, Curva S), **Ejecución** (Parte diario, Personal, Equipos, Materiales, Gastos), **Contrato y cobro** (Valorizaciones, Ingresos, Modificaciones) y **Ajustes**. En **Configuración** puede elegir el tema claro u oscuro (grafito sobrio).

Opciones del menú principal:

| Opción | Para qué sirve |
|---|---|
| **Dashboard** | El panel gerencial de la empresa. Arriba el **semáforo ejecutivo** (🟢 en orden / 🟡 atención / 🔴 en rojo) con su motivo, la meta de ingreso y los 4 KPIs con tendencia vs. mes anterior y fórmula visible (resultado con drilldown a Oficina, gastado, cobrado, servicios con drilldown al listado). Luego el **gráfico combinado de columnas y líneas con doble eje Y**: las columnas son el volumen de obras activas por mes (eje derecho) y las dos líneas son el desfase de tiempo y el desfase de costo de la cartera (eje izquierdo 0–100 %); al pasar el mouse por cada mes aparece el detalle. Después, el detalle: obras en riesgo, evolución de la caja real por mes, proyección de personal por mes, utilidad por cliente, gasto y ranking por servicio y cronograma global. El detalle operativo (movimientos recientes) queda oculto tras un botón. Con filtros por cliente, tipo y estado; el botón **"Datos y respaldo"** exporta/importa el respaldo, restablece los datos de ejemplo o vacía todo para empezar de cero. |
| **Servicios** | La lista de obras (cada obra se llama "servicio"). Desde aquí se crea una obra nueva o se entra a ver una. |
| **Personal** | La lista de todos los trabajadores con su cargo y su pago por hora. Es como la planilla. Desde aquí se les asigna a las obras. |
| **Cargos** | El catálogo de cargos (Ayudante, Operario, Capataz…). Cada ficha de Personal elige su cargo de esta lista; si renombra un cargo, se actualiza en todo el personal. |
| **Equipos** | La lista de máquinas y herramientas con su costo por hora. |
| **Oficina** | El costo mensual del personal de oficina (gasto general, separado de las obras). Alimenta el resultado empresa. |
| **Unidades** | Lista de unidades de medida (m³, m², ml, und, Glb…) que se usan para el metrado de las partidas. Es solo de consulta. |
| **Campana de alertas** (arriba) | Avisa lo que requiere atención: partidas vencidas o sin partes, presupuesto excedido, plazo próximo o vencido, facturas vencidas, valorizaciones sin cobrar. Cada alerta se puede **posponer** o **descartar** con una nota; reaparece solo si empeora de verdad (por ejemplo, 7 días más de atraso). |
| **Configuración** (abajo) | Preferencias de apariencia del sistema. |
| **Tipos de servicio** | Al crear o editar una obra eliges su tipo: Obra, Misceláneo o Contrato. Sirve para filtrar en el Dashboard. |

### Buscar y filtrar (en todas las listas)

Cada lista que tenga datos trae una **caja de búsqueda** (el ícono de la lupa).
Escriba parte del texto y la lista se reduce al instante; no hacen falta tildes
ni mayúsculas ("valorizacion" encuentra "Valorización"). Donde la lista tiene
grupos, al lado hay un **selector** (por ejemplo: con / sin tarea, vigentes / de
baja, ingresos / facturas, pagado / proyectado).

- El pie de la tabla ("Total") **suma lo que está viendo**: si filtra, el total
  baja con la lista; al limpiar la búsqueda vuelve el total completo.
- Al filtrar aparece un contador "**X de Y**" a un costado.
- En el **Cronograma** y en **Partidas**, escribir un nombre **abre** los grupos
  para mostrar las coincidencias y deja sus tareas madre a la vista.
- Si la búsqueda no encuentra nada, la lista avisa "Ningún… coincide con el
  filtro" (no significa que la lista esté vacía).

---

## 4. Trabajar con una obra (servicio)

Entre a **Servicios** y pulse una obra. Adentro verá su propio menú:

### Resumen
La foto de la obra: presupuesto inicial, gastado con su % de ejecución,
saldo disponible (o excedente en rojo), cobrado y utilidad real,
fechas y alertas (por ejemplo, "plazo vencido" o "superó su presupuesto"). Más abajo:
movimientos por tipo (materiales, personal, gastos, equipos), avance del
cronograma (global, completadas, atrasadas) y cascada de utilidad
(cobrado menos cada tipo = utilidad). Más abajo, el panel de tendencias en
cuadrícula 2×2 (curva de gasto acumulado, gasto mensual con media móvil,
horas hombre por mes, valorizado contra costo por trabajo). Luego
productividad de horas (estimadas vs. reales), proyección financiera
(utilidad y costo final estimados con semáforo) y ritmo de avance contra el plazo (SPI). También se puede
imprimir el reporte.

### Materiales (compras)
Aquí se registran las **compras de materiales** para la obra. Cada compra
**suma al gastado de la obra** (porque el egreso ya se realizó). No hay almacén ni
control de stock: el sistema lleva los costos de los materiales por servicio.

Pasos: escriba el nombre del material, ponga cantidad, costo total, fecha y,
si quiere, a qué **tarea** corresponde (escriba para buscarla). Los costos
generales que no son de ninguna tarea (ej. flete) se dejan sin tarea y suman
igual al gastado. Pulse **"Agregar material"**.

### Personal
Aquí se **asigna** quién trabaja en la obra. Pulse **"Asignar personal"**
(arriba a la derecha de la tarjeta *Asignaciones*): se abre una ventana donde
elige la persona, la tarea (opcional), las horas por día, la tarifa y desde
cuándo. No se toma asistencia día por día. El sistema calcula la **proyección
total de inicio a fin** (lo que costará la mano de obra si nadie se mueve) y la
muestra en 3 números: gastado (devengado), proyectado restante y total.

**Cómo se calcula el costo:** no se toma asistencia ni se asienta el mes. El
costo de cada persona se **devenga solo** desde su asignación: cada mes, hasta hoy,
el sistema crea un único registro de gasto real por persona vigente; lo que falta
hasta el fin de la obra es proyección. El mes de la baja sale prorrateado por los
días trabajados.

**Si alguien renuncia:** se le da **Dar de baja** indicando su último día. Ya no
genera gasto en los meses siguientes (el total inicio-fin baja), pero lo ya
devengado se conserva: lo gastado no se quita. Si fue un error, se puede reactivar.

### Equipos
Aquí se anota qué máquina se usó y cuántas horas. El costo sale del costo por
hora del equipo. También se puede asignar a una **tarea**.

### Gastos
Gastos extra que no son ni material ni gente ni equipo: fletes, alquileres,
movilidad, etc. Al entrar verá la lista de gastos. Para registrar pulse
**Agregar gasto** (se abre una ventana): concepto, monto, fecha, tarea
opcional y **N° de factura / comprobante** opcional del proveedor, solo referencial.

### Ingresos (lo que entra)
Aquí se registran los ingresos que el cliente paga por la obra: adelantos, cobros
de valorización e ingresos anuales (también sirve para misceláneas cortas y
contratos anuales: todo se cobra por servicio). Al entrar verá el total
Cobrado y la lista de ingresos y facturas. Para registrar,
pulse **Agregar ingreso**: cada ingreso lleva fecha,
monto, **concepto** (texto libre: "Adelanto 01", "Valorización N°3"…),
documento opcional y número de factura opcional.

- **Cobrado:** lo que realmente entró.
- **Utilidad real:** cobrado menos gastado. Es el resultado económico efectivo.

**Facturas (opcional, en la misma pestaña):** documentos internos de control
(no son comprobantes SUNAT oficiales): número, emisión, vencimiento, base,
impuestos y total. Cada factura muestra su saldo y su estado (emitida,
parcial, cobrada, vencida o anulada). Al registrar un ingreso basta escribir
el **número de factura**: si existe se vincula (sin exceder su saldo), si es
nuevo se crea la factura sola con ese número; vacío es un adelanto. Anular
conserva el historial y la saca de los saldos; no hay borrado físico.

### Cronograma
El calendario de la obra dividido en tareas, como una lista de pendientes con
fechas. El sistema muestra una barra de tiempo (diagrama de Gantt) con el
progreso de cada tarea y el total. La duración de cada tarea
(fin − inicio + 1) es su estimación de días. Aquí nacen todas las
tareas: principales y subtareas. Al editar una tarea verá **sus costos
asignados y su total**: los costos se asignan desde Materiales, Personal,
Equipos o Gastos eligiendo la tarea. Al borrar una tarea, sus costos no se
borran: quedan como "sin tarea".

Además del Gantt, el Cronograma permite arrastrar barras, definir
dependencias entre tareas, **reprogramar con la ruta crítica (CPM)**, ajustar el
calendario laboral (días de trabajo y feriados), ver las próximas semanas
(look-ahead) y **importar o exportar el cronograma en Excel** con una
plantilla (incluye metrado, unidad y precio unitario).

**Cómo se mide el avance:** cada partida hoja declara su modo — por *metrado*
(lo ejecutado ÷ lo contratado, desde el Parte diario), por *hitos*, por *tiempo*,
por *costo* o *manual* (excepción que exige una nota). El avance ya no se teclea
en el Cronograma: se calcula solo.

### Partidas (montos y valorizado por tarea)
Una **partida es un trabajo del cronograma con su monto**. En vez de manejar
la obra como un solo monto grande, el valor se reparte entre los
trabajos reales: por ejemplo, "Redes de agua potable" S/ 75,000, "Redes de
alcantarillado" S/ 105,000. ¿Para qué sirve? Para saber **qué trabajo deja
margen y cuál genera sobrecosto**: sin esto solo sabría si la obra en general
va bien o mal; aquí ve, por ejemplo, que el tendido de tubería deja margen
mientras que un trabajo puntual se pasa del monto previsto. Eso le dice dónde
mirar.

La pantalla muestra la **misma lista de tareas del Cronograma**, con padres
e hijas, y estas columnas:

- **Monto:** el importe asignado a ese trabajo. A la derecha del nombre hay un
  botón **Editar** que abre la ventana del monto (se guarda con Enter o el
  botón Guardar). Las tareas principales **suman solas** lo de sus hijas y no
  llevan botón: así es imposible que se descuadren.
- **Valorizado:** monto × avance. Es lo ya ejecutado de ese trabajo.
- **Avance:** el % calculado según el modo de medición de la partida (aquí solo
  se ve; se alimenta desde el Parte diario).
- **Costo:** lo gastado en ese trabajo: sus costos directos más los de sus
  hijas.
- **Margen:** valorizado menos costo. Si sale en rojo, ese trabajo genera
  sobrecosto: ya gastó más de lo que vale lo hecho.
- **Días est.:** días estimados del trabajo según sus fechas (las principales
  suman solas).
- **Días reales:** días con registros de personal en ese trabajo y sus hijas.
- **Desv. d:** días reales menos estimados, con su %. En rojo si tomó más
  días; "—" si aún no hay estimado.

Arriba verá los totales: montos (suma de las principales), valorizado y
margen de toda la obra. Debajo del total aparece lo registrado
**sin tarea asignada**, para que nada se pierda.

Tenga en cuenta:

- Las tareas se crean y se borran **en el Cronograma**; aquí solo se les pone
  monto. Las tareas nuevas empiezan en S/ 0.
- Si borra una tarea, sus costos no se borran: quedan como "sin tarea". Los
  montos registrados se conservan.

**El flujo de cada mes, en 3 pasos:** 1) durante el mes registre los costos
eligiendo su tarea; 2) registre el Parte diario y actualice los montos aquí si
cambiaron; 3) revise el tablero: todo margen en rojo necesita atención.

### Curva S y Línea base
La **Línea base** congela el cronograma en una fecha (fechas, montos, metrados)
para tener un plan contra el cual controlar la obra aunque después cambie el
cronograma. Allí también se registran **lecturas de avance** firmadas ("a tal
fecha la obra iba al X %"). La **Curva S** dibuja el costo planificado (PV), el
costo real (AC) y el valor ganado (EV), y muestra los índices SPI (ritmo de
plazo), CPI (ritmo de costo) y el costo final estimado. Se puede ver por mes,
semana o día.

### Valorizaciones
La valorización es el cobro del avance de un periodo. El sistema toma, por cada
partida, el metrado ejecutado acumulado hasta la fecha de corte, le resta lo ya
valorizado y lo multiplica por el precio unitario. Luego descuenta la
amortización de adelantos y el fondo de garantía, suma IGV, resta la detracción
y muestra el **neto a cobrar**. Antes de cerrarla puede **ajustar el metrado**
de cada partida. Lo cobrado antes del sistema se anota como *valorizado previo*
para no cobrarlo dos veces. Al registrar el cobro en Ingresos, elija la
valorización que cancela. Se puede **imprimir / guardar como PDF** y exportar a
Excel. Los **adelantos** se registran en la misma pantalla.

### Parte diario
El cuaderno de obra del día: clima, responsable, personal y equipos presentes,
**metrado ejecutado de cada partida**, incidencias, observaciones y fotos.
Pulse **Nuevo parte**. Es el único lugar donde se anota el progreso: el avance
de cada partida sale de la suma de sus partes. Si lo ejecutado supera el
metrado contratado más la tolerancia (5 %), el sistema pide una nota. Cada
parte se puede **imprimir / guardar como PDF**.

### Modificaciones
Adicionales y deductivos de obra (con sus partidas: metrado × precio unitario) y
ampliaciones de plazo, cada uno con estado (borrador, presentado, aprobado,
rechazado) y su historial. Solo lo **aprobado** cambia el contrato: el
presupuesto vigente es el original más los adicionales menos los deductivos, y
una ampliación aprobada mueve la fecha de fin. Un adicional aprobado crea sus
partidas en el cronograma.

### Opciones
Datos de la obra (nombre, cliente, tipo, fechas, estatus) y la
opción de eliminarla. El **tipo** (Obra, Misceláneo, Contrato) se elige al
crear o editar el servicio y sirve para filtrar en el Dashboard. Eliminar una obra borra todo lo suyo (registros, tareas,
asignaciones, facturas, cobros, valorizaciones, partes diarios y modificaciones), así que pide
escribir "Eliminar servicio" para confirmar que es en serio.

---

## 5. Cómo se llevan los materiales (sin almacén)

El sistema **no tiene almacén ni controla stock**. Los materiales se llevan
como **costo de cada servicio**: cada compra que registra suma al gastado de
esa obra y, si indica la tarea, también al costo de ese trabajo.

Consejo práctico: registre la compra el mismo día, con el nombre del material
tal como figura en la factura, para poder ubicarla después.

---

## 6. Palabras que usa el sistema (glosario)

- **Servicio:** cada obra o trabajo. Todo cuelga de un servicio.
- **Presupuesto inicial:** el monto con el que se registra la obra al crearla.
  Contra él se miden el gastado (saldo y % de ejecución) y el cobrado.
- **Gastado:** todo lo que ya se gastó en la obra.
- **Saldo / disponible:** presupuesto inicial menos gastado. Lo que queda.
- **Ejecución:** gastado ÷ presupuesto inicial × 100.
- **Partida:** un trabajo del cronograma con su monto (ej. redes de agua potable S/ 75,000). Sirve para saber
  qué trabajo deja margen y cuál genera sobrecosto.
- **Valorizado:** monto × avance. Lo ya ejecutado de ese trabajo.
- **Margen:** valorizado menos costo. Positivo = el trabajo va dejando
  margen; negativo = sobrecosto.
- **Cobrado:** ingresos efectivamente recibidos (ingresos registrados).
- **Utilidad real:** cobrado menos gastado; el resultado económico efectivo.
- **Variación mensual:** mes actual contra el anterior (▲ sube, ▼ baja); sin
  2 meses no hay variación.
- **Semáforo ejecutivo:** verde (resultado positivo y sin riesgo), amarillo
  (hay obras en riesgo o la caja del mes fue negativa), rojo (resultado
  negativo).
- **Cascada de utilidad:** diagrama que parte de lo cobrado y resta cada
  tipo de costo hasta la utilidad.
- **Días estimados:** duración planificada por tarea (fin − inicio + 1 día;
  se suman solas en las principales).
- **Días reales:** días con registros de personal en la tarea y sus hijas.
- **Desviación de días:** reales menos estimados (+ = más días de los planeados).
- **Media móvil:** promedio de los últimos 3 meses; suaviza picos para ver
  la tendencia del gasto.
- **Valor ganado:** lo que "vale" lo avanzado, a precios del presupuesto
  (presupuesto × avance). Solo se usa dentro de la proyección.
- **Ritmo de gasto:** valor ganado ÷ gastado. Más de 1 = eficiente
  (avanzas más de lo que gastas); menos de 1 = gastas de más.
- **Costo final estimado:** gastado ÷ avance. Lo que costaría la obra al
  ritmo actual.
- **Utilidad proyectada:** presupuesto − costo final estimado. Lo que
  quedaría al terminar si sigues igual.
- **Semáforo financiero:** verde (margen protegido), amarillo (riesgo de
  plazo o margen estrecho), rojo (pérdida proyectada o sobrecosto).
- **Línea base:** copia congelada del cronograma contra la que se controla la obra.
- **SPI / CPI:** índices de plazo y de costo (mayor a 1 = mejor de lo planeado).
- **Valorización:** cobro del avance de un periodo, con deducciones y neto.
- **Metrado:** cantidad de obra de una partida (m³, m², ml…).
- **Adicional / deductivo:** modificación del contrato que sube o baja el presupuesto vigente.
- **Asignación:** persona asignada a una obra con pago y vigencia; de aquí
  sale la proyección.
- **Devengado:** costo de personal ya generado hasta hoy desde las asignaciones.
- **Baja:** fin de una asignación (renuncia); quita meses futuros sin borrar
  lo gastado.
- **Factura (interna):** documento de control con total, ingresos aplicados,
  saldo y estado; no es comprobante oficial.
- **Respaldo:** el archivo con toda la información, para guardarla y
  recuperarla.

---

## 7. Rutinas recomendadas

**Cada vez que compra material:** regístrelo el mismo día en la pestaña
Materiales de la obra, con su factura a la mano.

**Cada vez que cobra:** regístrelo el mismo día en la pestaña Ingresos, con su
recibo a la mano.

**Cada día:** registre el Parte diario con el metrado ejecutado.

**Cada fin de mes:** prepare la valorización, registre facturas e ingresos,
revise los montos en Partidas y mire el margen por tarea. Revise también la
campana de alertas. Lo que esté en rojo necesita atención.

**Filtros del Dashboard:** cliente, tipo y estado alcanzan a todo lo que es por
servicio (Oficina y resultado empresa son de la empresa y no se filtran). El
CSV de rentabilidad por servicio descarga lo que se ve.

**Meta de ingreso:** en el Dashboard, tarjeta **"Meta de ingreso"**, escriba el
monto que quiere cobrar y pulse **"Guardar meta"**. La barra muestra cuánto se
ha cobrado de la meta y cuánto **falta**; al superarla, avisa **"¡Meta
cumplida!"**. Es una meta de la empresa (todo lo cobrado) y no le afectan los
filtros. Para quitarla, borre el monto y guarde.

**Al escribir montos:** los campos de dinero (gastos, ingresos, materiales,
tarifa por hora, costo de oficina, meta, montos por partida y las
fichas de Personal/Equipos/Servicios) agrupan los miles solos: escriba `10000`
y verá `10,000`. Se usa coma para los miles y punto para los decimales (hasta
2): `1234.5` queda como `1,234.5`.

**Cada semana:** pulse **"Datos y respaldo" → "Exportar respaldo"** en el
Dashboard y guarde el archivo fuera de la computadora.

---

## 8. Preguntas frecuentes

**¿En qué computadora trabajo?**
Siempre en la misma. Los datos viven en su navegador. Si cambia de equipo,
lleve su archivo de respaldo e impórtelo.

**¿Pueden usarlo dos personas a la vez?**
No por ahora: es de un solo usuario. Si dos personas cargan datos en
computadoras distintas, tendrán información diferente.

**¿Borrar una obra borra todo?**
Sí: sus registros, tareas, asignaciones, facturas, cobros,
valorizaciones, partes diarios y modificaciones. Por eso pide confirmación escrita. Exporte un respaldo antes
si tiene dudas.

**¿Se cayó internet, pierdo algo?**
No: el sistema no usa internet para funcionar. Solo necesita internet si lo
publica en un servidor (ver punto 9).

---

## 9. Para publicar el sistema (solo personal técnico)

El sistema ya viene compilado en la carpeta `dist/`. Basta servir esa carpeta
en cualquier hosting estático. No requiere servidor ni base de datos.
