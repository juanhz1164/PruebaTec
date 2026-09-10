# Backend — visión general

El backend es la API que recibe las peticiones del frontend, aplica las reglas del negocio
(qué se puede hacer, quién puede hacerlo, qué cálculos hay que hacer) y guarda/lee los
datos en la base de datos. Está organizado en capas: cada una tiene un trabajo concreto y
solo le habla a la capa de al lado, nunca se salta pasos.

## Las capas, en orden

Cuando el frontend pide algo (por ejemplo, "crear una venta"), la petición atraviesa estas
capas en orden, como una fila de personas que se van pasando el trabajo:

```
Frontend
   │  (petición HTTP: "quiero crear esta venta")
   ▼
Controllers   →  recibe la petición, revisa quién la está pidiendo y si tiene permiso
   ▼
Services      →  aplica las reglas del negocio (¿hay stock suficiente? ¿qué descuento aplica?)
   ▼
Repositories  →  guarda o consulta los datos en la base de datos
   ▼
MySQL
```

Y la respuesta hace el camino contrario: la base de datos devuelve el dato, el
Repository lo entrega al Service, el Service lo empaqueta en la forma que espera el
frontend (un DTO) y el Controller lo devuelve como respuesta HTTP.

## Qué hace cada carpeta, en una frase

| Carpeta | Qué hace | Ejemplo |
|---|---|---|
| **`Controllers/`** | La "puerta de entrada". Recibe cada petición del frontend y decide si el usuario tiene permiso para hacer eso. | "¿Este usuario es Gerente de esta sucursal? Si no, rechazado." |
| **`Services/`** | El "cerebro" del negocio. Aquí viven las reglas: qué es válido, qué cálculos hacer, en qué orden deben pasar las cosas. | "No se puede confirmar la recepción de una transferencia que no esté en camino." |
| **`Repositories/`** | El "archivo". Solo sabe guardar y buscar datos en la base de datos, sin opinar sobre si eso está bien o mal. | "Tráeme todas las ventas de la Sucursal Centro." |
| **`Models/`** | La "forma" de cada dato: qué campos tiene un producto, una venta, una transferencia. | Un producto tiene nombre, precio, stock, etc. |
| **`DTOs/`** | Los "formularios" que viajan entre el frontend y el backend — qué información se pide y qué información se devuelve. | Para crear una venta, el frontend manda un DTO con los productos y cantidades; el backend responde con el comprobante generado. |
| **`Data/`** | La conexión con la base de datos: cómo se traduce cada dato del modelo hacia una tabla de MySQL. | Que el campo `Nombre` del modelo `Producto` corresponda a la columna `nombre` de la tabla `productos`. |
| **`Auth/`** | Los nombres de los roles que existen en el sistema (Administrador, Gerente, Operador), usados para decidir permisos. | — |

## Por qué está dividido así

Cada capa solo necesita entender la capa inmediatamente anterior y la siguiente — el
Controller no sabe cómo se guarda un dato en MySQL, y el Repository no sabe si un usuario
tiene permiso para pedir ese dato. Esto tiene dos ventajas prácticas:

- **Se puede cambiar una capa sin romper las demás.** Si mañana se cambia de MySQL a otra
  base de datos, solo hay que tocar `Repositories/` y `Data/` — las reglas de negocio en
  `Services/` no se enteran.
- **Es más fácil encontrar dónde está un problema.** Si un cálculo está mal, el problema
  está en `Services/`. Si un dato no se guarda bien, está en `Repositories/`/`Data/`. Si
  alguien sin permiso logró hacer algo, está en `Controllers/`.

## Los módulos del negocio

Dentro de `Controllers/`, `Services/` y `Repositories/`, el código se agrupa por tema (no
por capa) para que sea fácil encontrar todo lo relacionado a una misma función del
sistema:

- **Inventario** — stock por sucursal, movimientos de entrada/salida.
- **Compras** — órdenes a proveedores, recepción de mercancía.
- **Ventas** — registrar ventas, validar stock, calcular descuentos.
- **Transferencias y Logística** — mover productos entre sucursales, seguimiento de
  envíos y tiempos de entrega.
- **Visitas** — control de cuántas personas entran a cada sucursal.
- **Dashboard** — resúmenes y comparativas para la gerencia.
- **Autenticación** — inicio de sesión y control de acceso por rol.

## Más detalle

Cada carpeta tiene su propio `README.md` con el detalle técnico completo (qué hace cada
archivo, cada endpoint, cada regla de negocio exacta) para quien necesite modificar el
código. Este documento es solo el mapa general.
