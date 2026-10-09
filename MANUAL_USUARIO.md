# Manual del Sistema PROMCOSER

*Explicado en palabras simples, para quien nunca ha usado el sistema.*

---

## 1. ¿Qué es este sistema y para qué sirve?

Es un programa para llevar las cuentas de las obras de la empresa constructora.
Responde tres preguntas todos los días:

1. **¿Cuánta plata contrataron por cada obra?** (el presupuesto, o monto contratado)
2. **¿Cuánta plata ya gasté?** (materiales, gente, equipos, gastos)
3. **¿Estoy ganando o perdiendo?** (la diferencia entre lo cobrado y lo gastado)

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
"presupuesto casi agotado") y si está ganando o perdiendo.

### Materiales (compras)
Aquí se registran las **compras de materiales** para la obra. Cada compra
**suma al gastado de la obra** (porque la plata ya salió). No hay almacén ni
control de stock: el sistema lleva los costos de los materiales por servicio.

Pasos: escriba el nombre del material, ponga cantidad, costo total, fecha y,
si quiere, a qué partida pertenece (escriba para buscarla). Pulse
**"Agregar material"**.

### Personal
Aquí se anota quién trabaja en la obra y cuántas horas o días. El sistema
calcula el costo con el pago por hora de cada trabajador. Los domingos no
cuentan (salvo personal de régimen mensual).

### Equipos
Aquí se anota qué máquina se usó y cuántas horas. El costo sale del costo por
hora del equipo.

### Gastos
Gastos extra que no son ni material ni gente ni equipo: fletes, alquileres,
movilidad, etc.

### Cronograma
El calendario de la obra dividido en tareas, como una lista de pendientes con
fechas. Se marca el avance de cada tarea y el sistema muestra una barra de
tiempo (diagrama de Gantt) con el progreso total.

### Partidas
Las obras grandes se dividen en **partidas** (pedazos del presupuesto: por
ejemplo, "Cimentación", "Cobertura", "Acabados"). Cada partida tiene su
cantidad y su precio. Aquí se ve, por cada partida:

- **Presupuesto:** cuánto vale esa parte.
- **Valorizado:** cuánto ya se ejecutó y se puede cobrar (se registra mes a
  mes con el botón **"Agregar valorización"**).
- **Avance:** qué porcentaje ya está hecho (medido de verdad, no a ojo).
- **Costo:** cuánto se gastó en esa partida.
- **Margen:** valorizado menos costo. Si sale en rojo, esa partida está
  perdiendo plata.

### Opciones
Datos de la obra (nombre, cliente, fechas) y la opción de eliminarla. Eliminar
una obra borra todo lo suyo (registros, tareas, partidas y movimientos), así
que pide escribir "Eliminar servicio" para confirmar que es en serio.

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
  qué parte gana y qué parte pierde.
- **Valorización:** decir cuánto de cada partida ya se ejecutó en el mes,
  para cobrarlo. Es el avance "medido".
- **Margen:** valorizado menos costo. Positivo = ganancia, negativo = pérdida.
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
