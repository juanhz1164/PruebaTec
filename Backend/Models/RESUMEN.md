# Models — en general

Esta carpeta define **la forma de cada dato** que maneja el sistema: qué información tiene
un producto, una venta, una transferencia, un usuario, etc.

Por ejemplo, el modelo de "Producto" dice que un producto tiene nombre, precio, categoría y
a qué proveedor pertenece. El modelo de "Transferencia" dice que una transferencia tiene
una sucursal de origen, una de destino, un estado, fechas de envío y recepción, etc.

Estos modelos son el "molde" que después se llena con datos reales guardados en la base de
datos. No contienen lógica ni reglas — solo describen qué campos existen y cómo se
relacionan unos con otros (por ejemplo, que una venta tiene varios productos dentro).
