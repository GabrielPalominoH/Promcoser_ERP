# Manual del Sistema PROMCOSER

*Explicado en palabras simples, para quien nunca ha usado el sistema.*

---

## 1. ¿Qué es este sistema y para qué sirve?

Es un programa para llevar las cuentas de las obras de la empresa constructora.
Responde tres preguntas todos los días:

1. **¿Cuánta plata contrataron por cada obra?** (el presupuesto, o monto contratado)
2. **¿Cuánta plata ya gasté?** (materiales, gente, equipos, gastos)
3. **¿La obra deja ganancia?** (comparar lo presupuestado con lo gastado: el
   cliente paga un monto fijo, así que todo lo que ahorres frente al
   presupuesto es tu ganancia)

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
si quiere, a qué **tarea** corresponde (escriba para buscarla; el costo sube
solo a la partida de esa tarea). Si es un costo general que no es de ninguna
tarea (ej. flete), use **partida directa**. Pulse **"Agregar material"**.

### Personal
Aquí se anota quién trabaja en la obra y cuántas horas o días. El sistema
calcula el costo con el pago por hora de cada trabajador. Los domingos no
cuentan (salvo personal de régimen mensual). Igual que los materiales, puede
asignar el trabajo a una **tarea** (o a una partida directa si es general).

### Equipos
Aquí se anota qué máquina se usó y cuántas horas. El costo sale del costo por
hora del equipo. También se puede asignar a una **tarea** o a una partida
directa.

### Gastos
Gastos extra que no son ni material ni gente ni equipo: fletes, alquileres,
movilidad, etc. También aceptan tarea o partida directa (los generales como
el flete suelen ir a partida directa o sin asignar).

### Cronograma
El calendario de la obra dividido en tareas, como una lista de pendientes con
fechas. Se marca el avance de cada tarea y el sistema muestra una barra de
tiempo (diagrama de Gantt) con el progreso total. Al crear o editar una tarea
puede elegir su **partida** (opcional): así ese trabajo queda vinculado con
su parte del presupuesto, y la tarea muestra el nombre de su partida. Al
editar una tarea también verá **sus costos asignados y su total**: los costos
se asignan desde Materiales, Personal, Equipos o Gastos eligiendo la tarea.
**Crear una partida:** solo en tareas principales (sin padre), marcando
*"Crear partida nueva del presupuesto"* e indicando el monto. La partida se
puede renombrar y re-presupuestar editando la tarea. **Borrar una tarea
principal** borra también su partida (el sistema lo avisa); sus costos y
subtareas quedan a salvo.

### Partidas
Una **partida es un pedazo del presupuesto de la obra**. En vez de manejar
la obra como un solo monto grande, se divide en partes que corresponden al
trabajo real: por ejemplo, "Obras preliminares", "Cimentación", "Cobertura",
"Acabados". ¿Para qué sirve? Para saber **qué parte de la obra deja ahorro
y qué parte genera sobrecosto**: sin partidas solo sabría si la obra en
general va bien o mal; con partidas ve, por ejemplo, que la cimentación dejó
ahorro pero los acabados generaron sobrecosto. Eso le dice dónde mirar.
Recuerde: el cliente paga un monto fijo, así que "ganar" aquí significa
gastar menos de lo presupuestado, no recibir más dinero.

El módulo tiene 3 bloques:

**1. Crear las partidas (en el Cronograma, una sola vez).**
Las partidas no se crean aquí: nacen en el Cronograma, al crear una tarea
principal, marcando *"Crear partida nueva del presupuesto"* e indicando su
presupuesto en soles. La partida toma el nombre de la tarea y ambas quedan
vinculadas. La suma de todas las partidas debería acercarse al monto
contratado de la obra. Esta pantalla es un tablero de solo lectura: no se
crea ni se elimina nada en ella (para corregir nombre o presupuesto, edite la
tarea principal en el Cronograma; para eliminar una partida, borre su tarea
principal).

**2. Valorización mensual (el avance medido).**
Cada fin de mes se indica cuánto de cada partida **realmente se ejecutó**:
partida + mes + metrado ejecutado (por ejemplo, Cimentación, octubre,
20 m³), con el botón **"Agregar valorización"**. El sistema lo multiplica por
el precio y obtiene el **valorizado**: lo que ya hizo y puede cobrar al
cliente. Es distinto del Cronograma: allá el avance es un porcentaje que se
marca a ojo por tarea; aquí es una **medición** (m³, m²) que respalda lo que
se factura.

**3. El tablero (tiempos y costos para decidir).**
Una fila por partida con estas columnas:

- **Presupuesto:** cuánto vale la partida (metrado × precio).
- **Valorizado:** lo ejecutado hasta hoy (suma de las valorizaciones).
- **Avance:** valorizado ÷ presupuesto, en porcentaje. Si Cimentación vale
  S/ 21,600 y se valorizó S/ 18,000, va al 83%.
- **Tiempo:** avance promedio de sus tareas del cronograma.
- **Costo:** lo gastado en esa partida: suma los costos de sus tareas más los
  costos directos a la partida (generales como fletes).
- **Margen:** valorizado menos costo. Si sale en rojo, esa partida genera
  sobrecosto: ya gastó más de lo que vale lo hecho, y nadie le va a dar más
  dinero por esa diferencia.

Debajo del nombre de cada partida verá **la lista de sus tareas**: nombre,
avance en tiempo y costo de cada una. Así ve de un vistazo qué tarea se está
comiendo la plata.

Arriba de la tabla verá el **avance medido global**: valorizado total ÷
presupuesto total. Es el avance real de la obra. Debajo hay la lista de
valorizaciones registradas por mes (cada una se puede eliminar si se
equivocó).

**Partidas y tareas vinculadas.** Debajo del nombre de cada partida verá sus
tareas del cronograma: cuántas son y su avance en tiempo. Si el avance en
tiempo y el avance en plata difieren mucho (20 puntos o más), aparece un
aviso ámbar *"difiere"*: significa que algo no cuadra (por ejemplo, el
cronograma dice 0% pero ya se valorizó 20%, o al revés) y conviene revisar
cuál de los dos está desactualizado.

Tenga en cuenta:

- Lo que registre **sin partida** no aparece en ninguna fila; debajo del
  total verá un aviso con ese monto (*"sin partida asignada"*) para que nada
  se pierda. Elija la tarea (o la partida directa) siempre que pueda.
- Si borra una tarea, sus costos no se borran: conservan la partida y quedan
  "sin tarea". Si borra una partida, sus tareas y costos quedan "sin
  partida": la plata nunca desaparece.

**El flujo de cada mes, en 3 pasos:** 1) durante el mes registre los costos
eligiendo su tarea; 2) a fin de mes registre la valorización (metrado
ejecutado) de cada partida y actualice los % del cronograma; 3) revise el
tablero: todo margen en rojo o aviso "difiere" necesita atención.

### Opciones
Datos de la obra (nombre, cliente, fechas) y la opción de eliminarla. Eliminar
una obra borra todo lo suyo (registros, tareas, partidas y valorizaciones),
así que pide escribir "Eliminar servicio" para confirmar que es en serio.

---

## 5. Cómo se llevan los materiales (sin almacén)

El sistema **no tiene almacén ni controla stock**. Los materiales se llevan
como **costo de cada servicio**: cada compra que registra suma al gastado de
esa obra y, si indica la partida, también al costo de esa partida.

Consejo práctico: registre la compra el mismo día, con el nombre del material
tal como figura en la factura, para poder ubicarla después.

---

## 6. Palabras que usa el sistema (glosario)

- **Servicio:** cada obra o trabajo contratado. Todo cuelga de un servicio.
- **Presupuesto:** la plata total contratada por la obra (lo que el cliente
  va a pagar).
- **Gastado:** todo lo que ya se gastó en la obra.
- **Saldo / disponible:** presupuesto menos gastado. Lo que queda.
- **Partida:** un pedazo del presupuesto (ej. cimentación). Sirve para saber
  qué parte deja ahorro y qué parte genera sobrecosto.
- **Unidad glb (global):** un trabajo cobrado como paquete completo, sin
  medirse en metros (ej. "Obras preliminares: 1 glb × S/ 8,000").
- **Valorización:** decir cuánto de cada partida ya se ejecutó en el mes,
  para cobrarlo. Es el avance "medido".
- **Margen:** valorizado menos costo. Positivo = ahorro (va gastando menos de
  lo presupuestado, y eso es su ganancia); negativo = sobrecosto.
- **Respaldo:** el archivo con toda la información, para guardarla y
  recuperarla.

---

## 7. Rutinas recomendadas

**Cada vez que compra material:** regístrelo el mismo día en la pestaña
Materiales de la obra, con su factura a la mano.

**Cada fin de mes:** registre la valorización de cada partida (cuánto se
ejecutó) y revise el margen por partida. Lo que esté en rojo necesita
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
Sí: sus registros, tareas, partidas y valorizaciones. Por eso pide
confirmación escrita. Exporte un respaldo antes si tiene dudas.

**¿Se cayó internet, pierdo algo?**
No: el sistema no usa internet para funcionar. Solo necesita internet si lo
publica en un servidor (ver punto 9).

---

## 9. Para publicar el sistema (solo personal técnico)

El sistema ya viene compilado en la carpeta `dist/`. Basta servir esa carpeta
en cualquier hosting estático. No requiere servidor ni base de datos.
