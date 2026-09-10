# Data

Contiene el único `DbContext` de la aplicación: `AppDbContext.cs`. Es la capa de EF Core
que conecta las entidades de `Models/` con las tablas de MySQL — todo el mapeo fino
(nombres de columna, conversiones de tipo, relaciones e índices únicos) vive aquí, no en
las clases de `Models/`.

## `AppDbContext.cs`

### `DbSet<T>` expuestos

Uno por cada entidad de `Models/`: `Sucursales`, `Usuarios`, `UnidadesMedida`, `Productos`,
`ProductoUnidadesMedida`, `Inventarios`, `MovimientosInventario`, `Proveedores`,
`OrdenesCompra`, `OrdenesCompraLineas`, `Ventas`, `VentasLineas`, `Transferencias`,
`TransferenciasLineas`, `RutasLogisticas`, `Visitas`.

### `OnModelCreating` — qué configura cada bloque

- **Mapeo tabla/columna**: cada entidad se mapea explícitamente a su tabla en
  `snake_case` (`ToTable("transferencias")`) y cada propiedad a su columna
  (`HasColumnName("sucursal_origen_id")`) — el modelo C# usa PascalCase, la base de datos
  usa snake_case, y esta capa es la única que traduce entre ambos.
- **Relaciones (`HasOne`/`WithMany`)**: declara las FKs explícitamente, incluyendo
  `OnDelete(DeleteBehavior.Restrict)` en las relaciones de `Transferencia` hacia
  `Sucursal`/`Usuario` — evita que EF Core intente un delete en cascada que MySQL además
  rechazaría (una sucursal u usuario referenciada por transferencias no se puede borrar).
- **Índices únicos**: `(ProductoId, SucursalId)` en Inventario, `(ProductoId,
  UnidadMedidaId)` en ProductoUnidadMedida, `(SucursalOrigenId, SucursalDestinoId)` en
  RutaLogistica, `Email` en Usuario, `Sku` en Producto, `NumeroComprobante` en Venta,
  `Abreviatura` en UnidadMedida — reflejan las restricciones `UNIQUE` del schema SQL.
- **Conversión de enums a string**: `Usuario.Rol`, `MovimientoInventario.Tipo`,
  `Transferencia.Estado`, `Transferencia.Prioridad`, `OrdenCompra.Estado` se guardan como
  `ENUM` de texto en MySQL (`'gerente_sucursal'`, `'en_transito'`, etc.), no como enteros —
  cada conversión tiene su par de métodos privados `XToDb`/`XFromDb` con un `switch` que
  lanza `ArgumentOutOfRangeException` ante un valor no reconocido (fail-fast si el enum de
  C# y el `ENUM` de MySQL alguna vez se desincronizan).
- **Conversor UTC de fechas — el bloque más importante para evitar bugs de zona horaria**:
  MySQL/Pomelo no conserva `DateTimeKind` al leer (siempre devuelve
  `DateTimeKind.Unspecified`, aunque el valor guardado sea UTC real). Sin corregirlo,
  `System.Text.Json` serializa esas fechas **sin el sufijo `"Z"`**, y el navegador las
  interpreta como si ya fueran hora local — desfasando la hora mostrada varias horas
  (bug real que ocurrió con `Transferencia.FechaEnvio`/`FechaEstimadaLlegada`/
  `FechaRecepcion`). Por eso el conversor se aplica **de forma genérica** recorriendo
  `modelBuilder.Model.GetEntityTypes()` en vez de configurarse propiedad por propiedad:
  hay **dos** `ValueConverter` — uno para `DateTime` y otro para `DateTime?` (son
  `ClrType` distintos; aplicar solo el primero dejaba sin corregir cualquier fecha
  *nullable*, que es la mayoría de los eventos reales de negocio) — que fuerzan
  `DateTimeKind.Utc` en cualquier propiedad `DateTime`/`DateTime?` de cualquier entidad,
  sin necesidad de acordarse de aplicarlo a cada campo nuevo que se agregue después.

### Relación con `Services/ZonaHorariaColombia.cs`

Este `DbContext` garantiza que las fechas viajen correctamente marcadas como UTC hacia el
frontend. La conversión UTC ↔ hora de Colombia para *comparar por día calendario* (ej.
"¿la transferencia llegó el mismo día que se estimaba, en hora Colombia?") es
responsabilidad de `ZonaHorariaColombia`, en `Services/`, no de esta capa — `AppDbContext`
solo asegura que el dato que sale de la base de datos esté correctamente marcado como UTC.
