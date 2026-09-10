# Controllers — en general

Esta carpeta es la **puerta de entrada** del backend: aquí llegan todas las peticiones que
manda el frontend (por ejemplo, "quiero ver el inventario" o "quiero registrar una venta").

Cada archivo se encarga de un tema del sistema — hay uno para Ventas, uno para Compras, uno
para Transferencias, uno para Usuarios, etc.

Su trabajo es simple pero importante:

1. Revisar quién está pidiendo algo (qué usuario, con qué rol).
2. Decidir si esa persona tiene permiso para hacer lo que pide.
3. Si tiene permiso, pasarle el trabajo a `Services/` (que es quien realmente hace el
   trabajo).
4. Devolver la respuesta al frontend.

Aquí **no se decide** cómo calcular un descuento ni qué reglas de negocio aplicar — eso es
trabajo de `Services/`. Esta carpeta solo controla el acceso y dirige el tráfico.

Un par de ejemplos de las reglas de permisos que se aplican aquí:

- Solo un Administrador puede crear, editar o borrar sucursales, usuarios y productos.
- Un Gerente o un Operador solo pueden ver y trabajar con los datos de **su propia**
  sucursal — no pueden ver ni tocar los de otra sucursal (salvo el Administrador, que ve
  todas).
- La sección de Logística es de **solo lectura** para todos: nadie puede modificar una
  transferencia desde ahí, solo consultar.
