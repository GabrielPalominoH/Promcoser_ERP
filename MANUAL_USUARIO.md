# Manual del Sistema PROMCOSER

*Explicado en palabras simples, para quien nunca ha usado el sistema.*

---

## 1. ¿Qué es este sistema y para qué sirve?

Es un programa para llevar las cuentas de las obras de la empresa constructora.
Responde tres preguntas todos los días:

1. **¿Cuánta plata contrataron por cada obra?** (el presupuesto, o monto contratado)
2. **¿Cuánta plata ya gasté?** (materiales, gente, equipos, gastos)
3. **¿La obra deja ganancia?** (comparar lo cobrado con lo gastado: la
   utilidad real. Y comparar lo presupuestado con lo gastado: lo que ahorres
   frente al presupuesto también es ganancia)

Antes esto se llevaba en cuadernos o archivos sueltos. El sistema lo junta todo
en un solo lugar: cada obra muestra su plata, su gente, sus materiales y su
avance, y el panel principal muestra cómo va toda la empresa.

**Lo que el sistema NO es:** no es un programa de contabilidad oficial (no
emite facturas ni declara impuestos) y no está conectado a internet: funciona
en una sola computadora.

---

## 2. Lo primero que debe saber (importante)

- **Sus datos se guardan en el navegador de la computadora** (Chrome, Edge,
  etc.), no en internet. Si usa otra computadora, no verá sus datos.
- **Haga un respaldo cada semana.** En el panel principal (Dashboard) hay un
  botón **"Exportar respaldo"** que descarga un archivo con toda la
  información. Guárdelo en un USB o en su correo. Si algo le pasa a la
  computadora, con el botón **"Importar respaldo"** se recupera todo.
- Si limpia los datos del navegador sin haber exportado el respaldo, **la
  información se pierde**. El respaldo es su seguro.

---

## 3. Las partes del sistema (menú principal)

Al lado izquierdo siempre verá el menú con estas opciones:

| Opción | Para qué sirve |
|---|---|
| **Dashboard** | La vista de toda la empresa: cuánto se contrató en total, cuánto se gastó, cuánto queda y qué obras están en riesgo. También están aquí los botones de respaldo. |
| **Servicios** | La lista de obras (cada obra se llama "servicio"). Desde aquí se crea una obra nueva o se entra a ver una. |
| **Personal** | La lista de todos los trabajadores con su cargo y su pago por hora. Es como la planilla. |
| **Equipos** | La lista de máquinas y herramientas con su costo por hora. |
| **Oficina** | Los gastos de la oficina (sueldos administrativos, alquiler, etc.), separados de las obras. |

---

## 4. Trabajar con una obra (servicio)

Entre a **Servicios** y pulse una obra. Adentro verá su propio menú:

### Resumen
La foto de la obra: presupuesto, gastado, saldo, fechas, alertas (por ejemplo,
"presupuesto casi agotado") y si va dejando ganancia (ahorro) o generando
sobrecosto.

### Materiales (compras)
Aquí se registran las **compras de materiales** para la obra. Cada compra
**suma al gastado de la obra** (porque la plata ya salió). No hay almacén ni
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
resta del presupuesto; lo demás es proyección. Si se asentó por error, se
puede **desasentar**.

**Si alguien renuncia:** se le da **Dar de baja** indicando su último día.
Ya no genera gasto en los meses siguientes (el total inicio-fin baja), pero
lo ya asentado se conserva: lo gastado no se quita. El mes de la baja sale
prorrateado por los días trabajados. Si fue un error, se puede reactivar.

### Equipos
Aquí se anota qué máquina se usó y cuántas horas. El costo sale del costo por
hora del equipo. También se puede asignar a una **tarea**.

### Gastos
Gastos extra que no son ni material ni gente ni equipo: fletes, alquileres,
movilidad, etc. También aceptan tarea; si no se indica, quedan sin asignar.

### Cobros (lo que entra)
Aquí se registra la plata que el cliente paga por la obra: adelantos, pagos
de valorización y pagos anuales (también sirve para misceláneas cortas y
contratos anuales: todo se cobra por servicio). Cada cobro lleva fecha,
monto, concepto y documento opcional. Arriba verá 3 números:

- **Cobrado:** lo que realmente entró.
- **Por cobrar:** monto contratado menos cobrado, o sea lo que te deben. Si
  sale negativo, el cliente pagó de más.
- **Utilidad real:** cobrado menos gastado. Es la plata de verdad, distinta
  del margen (que mide eficiencia contra el presupuesto).

### Cronograma
El calendario de la obra dividido en tareas, como una lista de pendientes con
fechas. Se marca el avance de cada tarea y el sistema muestra una barra de
tiempo (diagrama de Gantt) con el progreso total. Aquí nacen todas las
tareas: principales y subtareas. Al editar una tarea verá **sus costos
asignados y su total**: los costos se asignan desde Materiales, Personal,
Equipos o Gastos eligiendo la tarea. Al borrar una tarea, sus costos no se
borran: quedan como "sin tarea".

### Partidas (el presupuesto por tareas)
Una **partida es un pedazo del presupuesto de la obra**, y en este sistema
cada partida **es una tarea del cronograma con su monto**. En vez de manejar
la obra como un solo monto grande, el presupuesto se reparte entre los
trabajos reales: por ejemplo, "Cimentación" S/ 21,600, "Estructuras"
S/ 39,900. ¿Para qué sirve? Para saber **qué trabajo deja ahorro y cuál
genera sobrecosto**: sin esto solo sabría si la obra en general va bien o
mal; aquí ve, por ejemplo, que la cimentación dejó ahorro pero los acabados
generaron sobrecosto. Eso le dice dónde mirar. Recuerde: el cliente paga un
monto fijo, así que "ganar" aquí significa gastar menos de lo presupuestado,
no recibir más dinero.

La pantalla muestra la **misma lista de tareas del Cronograma**, con padres
e hijas, y estas columnas:

- **Monto:** la plata asignada a ese trabajo. Se escribe directo en la lista
  (se guarda al salir del campo). Las tareas principales **suman solas** lo
  de sus hijas y no se pueden escribir: así es imposible que se descuadren.
- **Valorizado:** monto × avance. Es lo ya ejecutado, a precios del
  presupuesto: lo que ya se ganó del monto fijo.
- **Avance:** el % que se marca en el Cronograma (aquí solo se ve, se cambia
  allá).
- **Costo:** lo gastado en ese trabajo: sus costos directos más los de sus
  hijas.
- **Margen:** valorizado menos costo. Si sale en rojo, ese trabajo genera
  sobrecosto: ya gastó más de lo que vale lo hecho, y nadie le va a dar más
  dinero por esa diferencia.

Arriba verá los totales: presupuesto (suma de las principales), valorizado,
avance y margen de toda la obra. Debajo del total aparece lo registrado
**sin tarea asignada**, para que nada se pierda.

Tenga en cuenta:

- Las tareas se crean y se borran **en el Cronograma**; aquí solo se les pone
  monto. Las tareas nuevas empiezan en S/ 0.
- Si borra una tarea, sus costos no se borran: quedan como "sin tarea". La
  plata nunca desaparece.

**El flujo de cada mes, en 3 pasos:** 1) durante el mes registre los costos
eligiendo su tarea; 2) actualice los % en el Cronograma y los montos aquí si
cambiaron; 3) revise el tablero: todo margen en rojo necesita atención.

### Opciones
Datos de la obra (nombre, cliente, fechas) y la opción de eliminarla. Eliminar
una obra borra todo lo suyo (registros y tareas), así que pide escribir
"Eliminar servicio" para confirmar que es en serio.

---

## 5. Cómo se llevan los materiales (sin almacén)

El sistema **no tiene almacén ni controla stock**. Los materiales se llevan
como **costo de cada servicio**: cada compra que registra suma al gastado de
esa obra y, si indica la tarea, también al costo de ese trabajo.

Consejo práctico: registre la compra el mismo día, con el nombre del material
tal como figura en la factura, para poder ubicarla después.

---

## 6. Palabras que usa el sistema (glosario)

- **Servicio:** cada obra o trabajo contratado. Todo cuelga de un servicio.
- **Presupuesto:** la plata total contratada por la obra (lo que el cliente
  va a pagar).
- **Gastado:** todo lo que ya se gastó en la obra.
- **Saldo / disponible:** presupuesto menos gastado. Lo que queda.
- **Partida:** un pedazo del presupuesto, que en este sistema es una tarea
  del cronograma con su monto (ej. cimentación S/ 21,600). Sirve para saber
  qué trabajo deja ahorro y cuál genera sobrecosto.
- **Valorizado:** monto × avance. Lo ya ejecutado, a precios del presupuesto:
  lo que ya se ganó del monto fijo.
- **Margen:** valorizado menos costo. Positivo = ahorro (va gastando menos de
  lo presupuestado, y eso es su ganancia); negativo = sobrecosto.
- **Cobrado:** plata que realmente entró por cobros registrados.
- **Por cobrar:** monto contratado menos cobrado; lo que el cliente aún debe.
- **Utilidad real:** cobrado menos gastado; la plata de verdad.
- **Respaldo:** el archivo con toda la información, para guardarla y
  recuperarla.

---

## 7. Rutinas recomendadas

**Cada vez que compra material:** regístrelo el mismo día en la pestaña
Materiales de la obra, con su factura a la mano.

**Cada fin de mes:** actualice los % de avance en el Cronograma, revise los
montos en Partidas y mire el margen por tarea. Lo que esté en rojo necesita
atención.

**Cada semana:** pulse **"Exportar respaldo"** en el Dashboard y guarde el
archivo fuera de la computadora.

---

## 8. Preguntas frecuentes

**¿En qué computadora trabajo?**
Siempre en la misma. Los datos viven en su navegador. Si cambia de equipo,
lleve su archivo de respaldo e impórtelo.

**¿Pueden usarlo dos personas a la vez?**
No por ahora: es de un solo usuario. Si dos personas cargan datos en
computadoras distintas, tendrán información diferente.

**¿Borrar una obra borra todo?**
Sí: sus registros y tareas (con sus montos). Por eso pide confirmación
escrita. Exporte un respaldo antes si tiene dudas.

**¿Se cayó internet, pierdo algo?**
No: el sistema no usa internet para funcionar. Solo necesita internet si lo
publica en un servidor (ver punto 9).

---

## 9. Para publicar el sistema (solo personal técnico)

El sistema ya viene compilado en la carpeta `dist/`. Basta servir esa carpeta
en cualquier hosting estático. No requiere servidor ni base de datos.
