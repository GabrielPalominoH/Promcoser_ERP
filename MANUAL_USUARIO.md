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

Al lado izquierdo siempre verá el menú con estas opciones:

| Opción | Para qué sirve |
|---|---|
| **Dashboard** | El panel gerencial de la empresa: resultado (utilidad menos oficina), gastado, cobrado, servicios en curso y en riesgo, y la **meta de ingreso** (cuánto se ha cobrado y cuánto falta). Luego, en orden: obras en riesgo, evolución de la caja real por mes, proyección de personal por mes, utilidad por cliente, gasto y ranking por servicio y cronograma global. El detalle operativo (movimientos recientes) queda oculto tras un botón. Con filtros por cliente, tipo y estado; el botón **"Datos y respaldo"** exporta/importa el respaldo o restablece los datos de ejemplo. |
| **Servicios** | La lista de obras (cada obra se llama "servicio"). Desde aquí se crea una obra nueva o se entra a ver una. |
| **Personal** | La lista de todos los trabajadores con su cargo y su pago por hora. Es como la planilla. Desde aquí se les asigna a las obras. |
| **Equipos** | La lista de máquinas y herramientas con su costo por hora. |
| **Oficina** | El costo mensual del personal de oficina (gasto general, separado de las obras). Alimenta el resultado empresa. |
| **Tipos de servicio** | Al crear o editar una obra eliges su tipo: Obra, Misceláneo o Contrato. Sirve para filtrar en el Dashboard. |

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
Aquí se **asigna** quién trabaja en la obra: persona, tarea (opcional),
horas por día, tarifa y desde cuándo. No se toma asistencia día por día. El
sistema calcula la **proyección total de inicio a fin** (lo que costará la
mano de obra si nadie se mueve) y la muestra en 3 números: gastado
(asentado), proyectado restante y total.

**Asentar mes:** cada mes se pulsa **Asentar** y se crea el gasto real de ese
mes por cada persona vigente (un solo registro por persona). Solo lo asentado
suma al gastado; lo demás es proyección. Si se asentó por error, se
puede **desasentar**.

**Si alguien renuncia:** se le da **Dar de baja** indicando su último día.
Ya no genera gasto en los meses siguientes (el total inicio-fin baja), pero
lo ya asentado se conserva: lo gastado no se quita. El mes de la baja sale
prorrateado por los días trabajados. Si fue un error, se puede reactivar.

**Tareo diario (opcional pero recomendado):** horas normales y extras por
persona, día y tarea, con la tarifa de ese momento (si la tarifa cambia
después, lo ya registrado no cambia). Cada tareo queda **pendiente** hasta
que alguien lo **aprueba**. Al asentar el mes, el gasto sale del tareo
aprobado; si no hay tareo, de la proyección. Tareo pendiente bloquea el
asentamiento de esa persona hasta aprobarlo. Más de 12 horas en un día
muestra advertencia; más de 24 no se permite; si ya existe el mismo día se
avisa de posible duplicado.

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
monto, concepto, documento opcional y número de factura opcional.

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
fechas. Se marca el avance y las **horas estimadas** de cada tarea (las
principales las suman solas) y el sistema muestra una barra de
tiempo (diagrama de Gantt) con el progreso total. Aquí nacen todas las
tareas: principales y subtareas. Al editar una tarea verá **sus costos
asignados y su total**: los costos se asignan desde Materiales, Personal,
Equipos o Gastos eligiendo la tarea. Al borrar una tarea, sus costos no se
borran: quedan como "sin tarea".

### Partidas (montos y valorizado por tarea)
Una **partida es un trabajo del cronograma con su monto**. En vez de manejar
la obra como un solo monto grande, el valor se reparte entre los
trabajos reales: por ejemplo, "Cimentación" S/ 21,600, "Estructuras"
S/ 39,900. ¿Para qué sirve? Para saber **qué trabajo deja margen y cuál
genera sobrecosto**: sin esto solo sabría si la obra en general va bien o
mal; aquí ve, por ejemplo, que la cimentación dejó margen pero los acabados
generaron sobrecosto. Eso le dice dónde mirar.

La pantalla muestra la **misma lista de tareas del Cronograma**, con padres
e hijas, y estas columnas:

- **Monto:** el importe asignado a ese trabajo. A la derecha del nombre hay un
  botón **Editar** que abre la ventana del monto (se guarda con Enter o el
  botón Guardar). Las tareas principales **suman solas** lo de sus hijas y no
  llevan botón: así es imposible que se descuadren.
- **Valorizado:** monto × avance. Es lo ya ejecutado de ese trabajo.
- **Avance:** el % que se marca en el Cronograma (aquí solo se ve, se cambia
  allá).
- **Costo:** lo gastado en ese trabajo: sus costos directos más los de sus
  hijas.
- **Margen:** valorizado menos costo. Si sale en rojo, ese trabajo genera
  sobrecosto: ya gastó más de lo que vale lo hecho.
- **Horas est.:** horas estimadas del trabajo (se ponen en el Cronograma;
  las principales suman solas).
- **Horas reales:** horas de personal registradas en ese trabajo y sus hijas.
- **Desv. h:** reales menos estimadas, con su %. En rojo si se pasó de horas;
  "—" si aún no hay estimado.

Arriba verá los totales: montos (suma de las principales), valorizado y
margen de toda la obra. Debajo del total aparece lo registrado
**sin tarea asignada**, para que nada se pierda.

Tenga en cuenta:

- Las tareas se crean y se borran **en el Cronograma**; aquí solo se les pone
  monto. Las tareas nuevas empiezan en S/ 0.
- Si borra una tarea, sus costos no se borran: quedan como "sin tarea". Los
  montos registrados se conservan.

**El flujo de cada mes, en 3 pasos:** 1) durante el mes registre los costos
eligiendo su tarea; 2) actualice los % en el Cronograma y los montos aquí si
cambiaron; 3) revise el tablero: todo margen en rojo necesita atención.

### Opciones
Datos de la obra (nombre, cliente, tipo, fechas, estatus) y la
opción de eliminarla. El **tipo** (Obra, Misceláneo, Contrato) se elige al
crear o editar el servicio y sirve para filtrar en el Dashboard. Eliminar una obra borra todo lo suyo (registros, tareas,
asignaciones, tareo, facturas y cobros), así que pide
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
- **Partida:** un trabajo del cronograma con su monto (ej. cimentación S/ 21,600). Sirve para saber
  qué trabajo deja margen y cuál genera sobrecosto.
- **Valorizado:** monto × avance. Lo ya ejecutado de ese trabajo.
- **Margen:** valorizado menos costo. Positivo = el trabajo va dejando
  margen; negativo = sobrecosto.
- **Cobrado:** ingresos efectivamente recibidos (ingresos registrados).
- **Utilidad real:** cobrado menos gastado; el resultado económico efectivo.
- **Cascada de utilidad:** diagrama que parte de lo cobrado y resta cada
  tipo de costo hasta la utilidad.
- **Horas estimadas:** horas de trabajo previstas por tarea (se suman solas
  en las principales).
- **Horas reales:** horas de personal registradas en la tarea y sus hijas.
- **Desviación de horas:** reales menos estimadas (+ = sobreuso de horas).
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
- **Indirectos:** gasto de oficina atribuido por regla (horas, costos o
  ingresos) o mostrado por separado sin regla.
- **Tareo:** horas trabajadas por día (normales + extras) con su tarifa; solo
  lo aprobado alimenta el gasto.
- **Asignación:** persona asignada a una obra con pago y vigencia; de aquí
  sale la proyección.
- **Asentar:** convertir un mes de proyección en gasto real (un registro por
  persona vigente).
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

**Cada fin de mes:** apruebe el tareo, asiente el mes en Personal (botón
Asentar), registre facturas e ingresos, actualice los % de avance en el
Cronograma, revise los montos en Partidas y mire el margen por tarea. Lo que
esté en rojo necesita atención.

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
Sí: sus registros, tareas, asignaciones, tareo, facturas y
cobros. Por eso pide confirmación escrita. Exporte un respaldo antes
si tiene dudas.

**¿Se cayó internet, pierdo algo?**
No: el sistema no usa internet para funcionar. Solo necesita internet si lo
publica en un servidor (ver punto 9).

---

## 9. Para publicar el sistema (solo personal técnico)

El sistema ya viene compilado en la carpeta `dist/`. Basta servir esa carpeta
en cualquier hosting estático. No requiere servidor ni base de datos.
