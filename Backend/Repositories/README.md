# Repositories

Capa de acceso a datos: envuelve las consultas de EF Core (`Where`/`Include`/`OrderBy`/
`Add`/`Remove`) detrás de una interfaz (`Repositories/Interfaces/`), sin ninguna regla de
negocio — eso vive en `Services/`, que es quien las consume. Todos reciben `AppDbContext`
inyectado en el constructor y no lo exponen hacia afuera.

## Patrón compartido

- Los repositorios que participan en operaciones que tocan **más de una tabla a la vez**
  (siempre `Inventario` + `MovimientoInventario`, además de su entidad principal) exponen
  `BeginTransactionAsync()` — delega a `_context.Database.BeginTransactionAsync()` — para
  que el Service correspondiente orqueste la transacción explícitamente. Son
  `TransferenciaRepository`, `OrdenCompraRepository` y `VentaRepository`.
- Varios repos con varias consultas de lectura parecidas factorizan un método privado
  `ConsultaBase()` con los `Include` comunes, para no repetir la cadena de `Include` en
  cada método público (el ejemplo más claro es `TransferenciaRepository`).
- `Remove(...)` en los repos de catálogo es siempre un **delete físico** — no hay
  soft-delete en este esquema; la protección contra borrar algo referenciado la da la FK de
  MySQL (capturada como `DbUpdateException` en el Service correspondiente).

## Por repositorio

- **`DashboardRepository`** (`IDashboardRepository`) — sin entidad propia, agrega datos de
  varias tablas para alimentar `DashboardService`: `GetVentasDesdeAsync` (Ventas con
  Sucursal), `GetLineasVentaDesdeAsync` (VentasLineas con Venta+Producto, filtro opcional
  por sucursal), `GetInventarioCompletoAsync` (todo Inventario con Producto+Sucursal),
  `GetTransferenciasActivasAsync` (Transferencias en `EnPreparacion`/`EnTransito`),
  `GetSucursalesActivasAsync`.

- **`InventarioRepository`** (`IInventarioRepository`) — gestiona `Inventario` y
  `MovimientoInventario`. `GetPorSucursalAsync`/`GetByIdAsync`/`GetTodosAsync` incluyen
  `Producto → UnidadMedida`; `GetPorProductoYSucursalAsync` busca la fila exacta del par
  único `(ProductoId, SucursalId)`. `GetMovimientosAsync(productoId?, sucursalId?)` admite
  ambos filtros combinables, incluye Producto+Usuario, orden `Fecha` descendente.

- **`OrdenCompraRepository`** (`IOrdenCompraRepository`) — gestiona `OrdenCompra`/
  `OrdenCompraLinea` **y además** `Inventario`/`MovimientoInventario` (recibir una orden
  actualiza stock atómicamente, así que el repo expone lo necesario para ambas tablas).
  `GetAllAsync`/`GetByIdAsync` incluyen Proveedor+Sucursal+Usuario+Lineas→Producto.
  `GetLineasPorProveedorAsync`/`GetLineasPorProductoAsync` alimentan el histórico de
  precios, ordenados por fecha de la orden descendente.

- **`ProductoRepository`** (`IProductoRepository`) — gestiona `Producto` y
  `ProductoUnidadMedida` (unidades alternativas). Incluye
  `UnidadMedida`+`Proveedor`+`UnidadesAlternativas→UnidadMedida` en las consultas de
  lectura. `GetInventarioBajoMinimoAsync(sucursalId?)` filtra `Cantidad <= StockMinimo`
  sobre `Inventario`, ordenado por sucursal y luego nombre de producto — alimenta el
  reporte de alertas de stock.

- **`ProveedorRepository`** (`IProveedorRepository`) — CRUD puro sobre `Proveedor`, sin
  `Include` (no tiene relaciones que traer para su propio uso). `GetByIdAsync` usa
  `FindAsync` (consulta primero el change tracker antes de ir a la base de datos).

- **`SucursalRepository`** (`ISucursalRepository`) — igual de simple que
  `ProveedorRepository`: CRUD puro sobre `Sucursal`, `FindAsync` para lookup por id.

- **`TransferenciaRepository`** (`ITransferenciaRepository`) — el más complejo. Gestiona
  `Transferencia` y toca `Inventario`/`MovimientoInventario`/`RutaLogistica`. Su
  `ConsultaBase()` privado (reutilizado por `GetAllAsync`, `GetByIdAsync`,
  `GetEnviadasAsync`, `GetEnCursoAsync`, `GetCerradasAsync`) incluye `SucursalOrigen`,
  `SucursalDestino`, `UsuarioSolicitante`, `UsuarioPreparador`, `UsuarioEnvio`,
  `UsuarioRecepcion` y `Lineas → Producto`. Los tres métodos que alimentan Logística tienen
  cada uno su filtro y orden específico:
  - `GetEnviadasAsync` — `FechaEnvio != null`, orden `FechaEnvio` descendente (alimenta
    "Tiempos estimados vs. reales" y "Clasificación de rutas").
  - `GetEnCursoAsync` — estado `EnPreparacion`/`EnTransito` (alimenta "Transferencias en
    curso"; desaparece solo cuando cambia el estado, no hay filtro de fecha).
  - `GetCerradasAsync` — estado `RecibidaCompleta`/`RecibidaParcial`, orden
    `FechaRecepcion` descendente (alimenta "Cumplimiento por sucursal/ruta").

  `GetRutaLogisticaAsync`/`GetRutasLogisticasAsync` consultan la configuración de
  `RutaLogistica` por par origen-destino, con `Include` de ambas sucursales.

- **`UnidadMedidaRepository`** (`IUnidadMedidaRepository`) — trivial: solo `GetAllAsync()`
  sin filtros ni `Include` (catálogo fijo, sin create/update/delete en este repo).

- **`UsuarioRepository`** (`IUsuarioRepository`) — CRUD sobre `Usuario` con
  `Include(Sucursal)` en toda lectura. `GetByEmailAsync` es la consulta clave que usa
  `AuthService` para el login.

- **`VentaRepository`** (`IVentaRepository`) — gestiona `Venta`/`VentaLinea` **y** toca
  `Inventario`/`MovimientoInventario` (vender descuenta stock atómicamente).
  `GetAllAsync(sucursalId?)`/`GetByIdAsync` incluyen `Sucursal`, `Usuario`,
  `Lineas → Producto`, `Lineas → UnidadMedida`, orden `Fecha` descendente.
  `ExisteNumeroComprobanteAsync` es el chequeo de unicidad que usa `VentaService` antes de
  insertar un comprobante nuevo.

- **`VisitaRepository`** (`IVisitaRepository`) — gestiona `Visita`. Es el único repositorio
  que depende de `Services/ZonaHorariaColombia`: `GetPorSucursalYFechaAsync`/
  `GetPorSucursalYRangoAsync` reciben un rango en `DateOnly` (día calendario **en hora de
  Colombia**) y lo convierten a UTC con `ZonaHorariaColombia.AUtc(...)` antes de filtrar
  `FechaHora` en la base de datos — las visitas se reportan por día local del usuario, no
  por día UTC del servidor.
