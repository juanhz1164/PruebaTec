# Repositories — en general

Esta carpeta es el **archivo** del sistema: su único trabajo es guardar y buscar datos en
la base de datos.

Cuando `Services/` necesita un dato (por ejemplo, "tráeme el inventario de la Sucursal
Centro"), se lo pide a esta carpeta. Cuando necesita guardar algo (por ejemplo, "registra
esta nueva venta"), también se lo pide aquí.

Lo importante es que esta carpeta **no opina** sobre si lo que se está pidiendo tiene
sentido o está permitido — eso ya se decidió antes, en `Controllers/` y `Services/`. Aquí
solo se ejecuta la consulta o el guardado, tal cual se pidió.

Cada archivo se encarga de un tipo de dato: hay uno para productos, uno para ventas, uno
para transferencias, etc.
