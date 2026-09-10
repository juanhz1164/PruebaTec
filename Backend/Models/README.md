# Models

Entidades de dominio (POCOs) mapeadas por EF Core hacia las tablas de MySQL definidas en
`Database/init/01_schema.sql`. Ninguna clase de esta carpeta contiene lógica de negocio —
eso vive en `Services/`; aquí solo se modela la forma de los datos y sus relaciones
(propiedades de navegación).

El mapeo detallado hacia nombres de tabla/columna en `snake_case`, conversiones de enum
↔ string y el conversor de zona horaria UTC vive en `Data/AppDbContext.cs`
(`OnModelCreating`), no en estas clases.

## Catálogos base

- **`Sucursal.cs`** — una sede física de la cadena. Tiene `Usuarios` como colección de
  navegación (los empleados asignados a ella).
- **`Usuario.cs`** — una cuenta de acceso. `SucursalId` es **nullable**: el
  `AdministradorGeneral` no está atado a ninguna sucursal (gestiona toda la red), mientras
  que `GerenteSucursal` y `OperadorInventario` siempre tienen una. `Rol` es
  `RolUsuario` (ver más abajo).
- **`UnidadMedida.cs`** — catálogo de unidades (unidad, kg, litro, caja...).
- **`Proveedor.cs`** — un proveedor de productos, con su colección de `OrdenesCompra`.

## Inventario y productos

- **`Producto.cs`** — el catálogo de productos. `UnidadMedidaId` es su unidad base (la que
  se usa para llevar el stock); `ProveedorId` es opcional y es su proveedor *principal*
  (Compras solo ofrece, para un proveedor dado, los productos que él distribuye).
  `PrecioVenta` (precio fijo al público) y `PrecioProveedor` (precio de costo del
  proveedor principal) son valores por defecto que autocompletan Ventas y Compras
  respectivamente, no precios obligatorios.
- **`ProductoUnidadMedida.cs`** — unidades de medida *alternativas* para un producto además
  de su unidad base (ej. base = "un", alternativa = "caja" con `FactorConversion = 12`).
  `PrecioVenta` es opcional: si es `null`, el precio de esa unidad alternativa se calcula
  como `CostoPromedio × FactorConversion` en vez de tener un precio fijo propio.
- **`Inventario.cs`** — el stock de un producto en una sucursal concreta (única fila por
  par `(ProductoId, SucursalId)`, forzado por índice único en la base de datos).
  `CostoPromedio` es el costo promedio ponderado, recalculado por `OrdenCompraService` al
  recibir compras.
- **`MovimientoInventario.cs`** — el histórico inmutable de cada entrada/salida de stock
  (`Tipo` = `Ingreso`/`Retiro`). `ReferenciaTipo`/`ReferenciaId` enlazan el movimiento con
  su origen (ej. `"transferencia"` + el id de la transferencia, `"venta"`, `"orden_compra"`)
  sin una FK física — es una referencia polimórfica de solo lectura para trazabilidad.

## Compras

- **`OrdenCompra.cs`** — una orden a un proveedor, con `Estado` (`EstadoOrdenCompra`) y su
  colección de `Lineas`.
- **`OrdenCompraLinea.cs`** — un producto dentro de una orden de compra, con cantidad y
  precio unitario pactado (puede diferir del `PrecioProveedor` por defecto del producto).

## Ventas

- **`Venta.cs`** — una venta con número de comprobante único, totales ya calculados
  (`Subtotal`, `DescuentoTotal`, `Total`) y datos de cliente opcionales.
- **`VentaLinea.cs`** — un producto vendido. Mantiene **dos** cantidades a propósito:
  `Cantidad` es siempre en la unidad base del producto (lo que realmente se descuenta del
  stock), mientras que `CantidadVendida` + `UnidadMedidaId` reflejan cómo se vendió tal
  cual (ej. "2 Caja") para mostrarlo en el comprobante — si se vendió en la unidad base,
  ambos valores coinciden.

## Transferencias y logística entre sucursales

- **`Transferencia.cs`** — el núcleo del módulo de logística interna. Modela
  explícitamente que **quien solicita no es necesariamente quien tiene el producto**:
  `SucursalOrigenId` (quien prepara y envía) y `SucursalDestinoId` (quien recibe) son
  independientes de `UsuarioSolicitanteId` (quien pidió la transferencia, de cualquiera de
  las dos sucursales). Además de eso, registra por separado quién ejecutó cada paso físico
  — `UsuarioPreparadorId`, `UsuarioEnvioId`, `UsuarioRecepcionId` — todos nullable hasta que
  ese paso ocurre. `Estado` (`EstadoTransferencia`) gobierna una máquina de estados
  unidireccional (ver abajo); `FechaEnvio`/`FechaRecepcion` son eventos reales con hora,
  mientras que `FechaEstimadaLlegada` es deliberadamente un campo "solo fecha" (se guarda a
  medianoche en hora de Colombia, sin hora significativa).
- **`TransferenciaLinea.cs`** — un producto dentro de la transferencia, con tres
  cantidades independientes: `CantidadSolicitada` (al pedir), `CantidadEnviada` (puede
  diferir de lo solicitado, se fija al enviar) y `CantidadRecibida` (se fija al confirmar
  recepción; si es menor a lo enviado, la transferencia queda `RecibidaParcial`).
- **`RutaLogistica.cs`** — configuración de referencia por par `(SucursalOrigenId,
  SucursalDestinoId)`: transportista por defecto (`"Coordinadora"`), costo y tiempo
  estimado en días. Es la fuente que autocompleta el modal de envío para que el Gerente no
  invente esos datos cada vez. **No es un histórico** — el costo/fecha estimada *reales*
  usados en cada envío se guardan en la propia `Transferencia`, no aquí.

## Visitas

- **`Visita.cs`** — control de flujo de personas por sucursal. Representa **un grupo que
  entra junto**, no una persona individual: `CantidadPersonas` (siempre ≥ 1, con `CHECK` en
  BD) puede ser mayor a 1 para un único registro de visita. `FechaHora` la fija siempre el
  backend (`DateTime.UtcNow`), nunca se acepta del cliente.

## Enums

Todos vivan como `enum` de C#, se guardan en MySQL como `ENUM` de texto (conversión
`string ↔ enum` explícita en `AppDbContext`) y se serializan a la API como **número**
(orden declarado = valor entero; no hay `JsonStringEnumConverter` global en este proyecto
— ver nota histórica de esta decisión en `AppDbContext.cs`).

| Enum | Valores (en orden) | Dónde se usa |
|---|---|---|
| `RolUsuario` | `AdministradorGeneral`, `GerenteSucursal`, `OperadorInventario` | `Usuario.Rol`, claim de rol del JWT |
| `EstadoOrdenCompra` | `Pendiente`, `Confirmada`, `Recibida`, `Cancelada` | `OrdenCompra.Estado` |
| `EstadoTransferencia` | `Solicitada`, `EnPreparacion`, `EnTransito`, `RecibidaCompleta`, `RecibidaParcial`, `Cancelada` | `Transferencia.Estado` — máquina de estados **unidireccional**: `Solicitada → EnPreparacion → EnTransito → RecibidaCompleta\|RecibidaParcial` (o `Cancelada` desde los dos primeros). Un estado `Recibida*` es **final**: nunca hay código que lo revierta a preparación/envío. |
| `PrioridadTransferencia` | `Baja`, `Media`, `Alta` | `Transferencia.Prioridad` — pertenece a la transferencia completa, se define al solicitar, nunca por línea de producto |
| `TipoMovimiento` | `Ingreso`, `Retiro` | `MovimientoInventario.Tipo` |

## Convención de propiedades de navegación

Toda FK tiene su propiedad de navegación como **nullable** (`Sucursal?`, `Producto?`, etc.)
porque EF Core solo la puebla si el `Include(...)` correspondiente estuvo en la consulta —
tratarla como no-nula rompería en cualquier consulta que no la haya pedido. Las
colecciones (`ICollection<T>`) sí se inicializan con `= new List<T>()` para evitar `null`
al serializar una entidad recién construida en memoria (antes de guardarla).
