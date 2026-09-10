# Data — en general

Esta carpeta es el **puente hacia la base de datos**: aquí se define cómo se conecta el
sistema con MySQL y cómo se traduce cada modelo de datos hacia una tabla real.

Por ejemplo, aquí se indica que el modelo "Producto" corresponde a la tabla `productos` en
la base de datos, y que cada uno de sus campos corresponde a una columna específica.

También resuelve un detalle importante: todas las fechas y horas se guardan de forma
estandarizada para que, sin importar en qué parte del mundo esté el servidor, las horas que
ve el usuario final correspondan correctamente a la hora de Colombia.

En resumen: esta carpeta es la configuración de "cómo hablar" con la base de datos, no
contiene reglas de negocio.
