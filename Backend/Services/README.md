# Services

Capa de lógica de negocio: reglas, cálculos y orquestación de transacciones. Cada Service
implementa una interfaz de `Services/Interfaces/`, recibe repositorios inyectados por
interfaz (nunca `AppDbContext` directo) y devuelve `DTOs/`, nunca entidades de `Models/`.
Los controllers no contienen reglas de negocio — solo autorización HTTP y mapeo — así que
esta es la capa donde vive el "cómo" del sistema.

Patrón de retorno compartido por las operaciones que pueden fallar por regla de negocio
(no por excepción): un tipo `ResultadoXxx` con `Exitoso`/`Error`/`Dto`, construido con los
factory estáticos `Falla(mensaje)` / `Ok(dto)` — así el controller solo necesita traducir
`Exitoso` a `200`/`400`, sin `try/catch`.

## Autenticación

- **`AuthService.cs`** — verifica credenciales con `BCrypt.Verify` contra el hash
  almacenado, valida que el usuario esté `Activo`, y delega la emisión del token a
  `JwtService`. El mensaje de error es **idéntico** si el email no existe o si el password
  es incorrecto (no revela si un email está registrado).
- **`JwtService.cs`** — emite el JWT (HMAC-SHA256) con los claims `sub`/
  `ClaimTypes.NameIdentifier` (id), `Name`, `Email`, `ClaimTypes.Role` (nombre del enum
  `RolUsuario`) y `"sucursalId"` (**solo si el usuario tiene sucursal** — ausente para
  `AdministradorGeneral`, que por eso no puede quedar "scoped" a ninguna). Expiración
  configurable vía `Jwt:ExpiracionHoras` (default 8h).

## Transferencias y logística — el módulo más complejo del sistema

- **`TransferenciaService.cs`** — implementa la máquina de estados de una transferencia
  entre sucursales:

  ```
  Solicitada → EnPreparacion → EnTransito → RecibidaCompleta | RecibidaParcial
       ↓              ↓
   Cancelada      Cancelada
  ```

  Es **unidireccional**: ningún método revierte `RecibidaCompleta`/`RecibidaParcial` a un
  estado anterior — son estados finales por diseño (`ConfirmarRecepcionAsync` exige
  `Estado == EnTransito` y no hay ningún camino de código que retroceda un estado ya
  recibido).

  Decisión de modelado clave: **quien solicita la transferencia no es necesariamente quien
  la origina**. `CrearAsync` acepta `SucursalOrigenId`/`SucursalDestinoId` independientes de
  `UsuarioSolicitanteId` — una sucursal que *necesita* un producto puede solicitarlo siendo
  ella el `SucursalDestinoId`, mientras que la sucursal que lo *tiene* (`SucursalOrigenId`)
  es quien la prepara y envía. `IniciarPreparacionAsync`/`RegistrarEnvioAsync` registran
  además, por separado del solicitante, quién ejecutó *ese paso específico*
  (`UsuarioPreparadorId`/`UsuarioEnvioId`), y `ConfirmarRecepcionAsync` registra
  `UsuarioRecepcionId` — trazabilidad completa de quién hizo qué, no solo quién pidió.

  - `RegistrarEnvioAsync`: valida stock del origen para *todas* las líneas antes de tocar
    nada (evita dejar la transferencia a medio enviar si una línea falla); si el DTO no
    trae transportista/costo/fecha estimada, los completa desde `RutaLogistica` (config por
    par origen-destino); descuenta el stock del origen y registra un `MovimientoInventario`
    de tipo `Retiro` por línea, todo dentro de una transacción explícita.
    `FechaEstimadaLlegada` es deliberadamente un campo **solo fecha** (nunca lleva hora
    significativa) — se valida y calcula comparando por *día calendario en hora de
    Colombia* (`ZonaHorariaColombia`), no en UTC crudo, para no rechazar "hoy" cerca de
    medianoche por el desfase de huso horario.
  - `ConfirmarRecepcionAsync`: exige confirmar *todas* las líneas de la transferencia en la
    misma llamada; si `CantidadRecibida < CantidadEnviada` en cualquier línea, el estado
    final es `RecibidaParcial` en vez de `RecibidaCompleta` (el faltante se expone para
    investigar, sin ajuste automático). Suma el stock recibido al destino y registra
    `MovimientoInventario` de tipo `Ingreso`, en transacción explícita.
    `FechaRecepcion` la fija siempre `DateTime.UtcNow` del servidor — nunca se acepta del
    cliente.
  - `CancelarAsync`: solo permitido desde `Solicitada`/`EnPreparacion` (una vez `EnTransito`
    ya hubo movimiento físico de stock, cancelar dejaría el inventario inconsistente).

- **`LogisticaService.cs`** — 4 reportes de **solo lectura** sobre transferencias, sin
  ninguna mutación:
  - `GetTiemposEnvioAsync` ("Tiempos estimados vs. reales"): calcula `Resultado`
    (`Pendiente`/`ATiempo`/`Retraso`/`SinDatos`) — la única fuente de verdad para el color
    que pinta el frontend, nunca inferido ahí a partir del signo de un número. Una
    transferencia `EnTransito` (sin `FechaRecepcion` todavía) es siempre `Pendiente`, jamás
    "A tiempo" ni "Retraso" aunque ya haya pasado la fecha estimada. La comparación
    A-tiempo/Retraso se hace por **día calendario en hora de Colombia**
    (`ZonaHorariaColombia.ALocal(...).Date`), no por instante UTC — comparar instantes
    crudos marcaba como "Retraso" una recepción que en Colombia ocurrió el mismo día
    estimado, solo porque en UTC ya había cruzado la medianoche. Una fecha estimada
    corrupta (anterior al día del envío — dato histórico previo a la validación actual) se
    trata como ausente (`SinDatos`) en vez de producir una desviación negativa sin sentido.
  - `GetClasificacionRutasAsync` ("Clasificación de rutas"): agrupa transferencias
    enviadas por el texto de `Ruta`, con prioridad más frecuente, costo promedio (de
    `CostoEnvio` *real* guardado en cada transferencia, nunca de `RutaLogistica`) y tiempo
    promedio de entrega.
  - `GetTransferenciasEnCursoAsync` ("Transferencias en curso"): solo `EnPreparacion`/
    `EnTransito` — desaparece automáticamente al confirmar recepción o cancelar.
  - `GetCumplimientoPorSucursalAsync`/`GetCumplimientoPorRutaAsync` ("Cumplimiento"):
    agregan transferencias *cerradas* (`RecibidaCompleta`/`RecibidaParcial`) por sucursal
    origen o por ruta, con % de entregas completas y % a tiempo — misma regla de día
    calendario en Colombia que `GetTiemposEnvioAsync`.

## Inventario y catálogos

- **`InventarioService.cs`** — `GetPorSucursalAsync` devuelve una fila por cada producto
  *activo* aunque no tenga fila de inventario en esa sucursal (se marca `Agotado`), para
  que la UI siempre pueda mostrar el catálogo completo por sucursal. `CrearMovimientoAsync`
  (ingreso/retiro manual) corre en transacción explícita y valida stock suficiente antes de
  un retiro.
- **`ProductoService.cs`** — CRUD de productos + gestión de unidades de medida
  alternativas (con su `FactorConversion`) + `GetAlertasStockAsync` (productos bajo su
  stock mínimo). Un intento de borrar un producto referenciado por otra tabla atrapa la
  `DbUpdateException` de FK y sugiere desactivarlo en vez de eliminarlo.
- **`ProveedorService.cs`**, **`SucursalService.cs`**, **`UsuarioService.cs`**,
  **`UnidadMedidaService.cs`** — CRUD de catálogo con el mismo patrón de eliminación
  protegida por FK (ver `ResultadoEliminacion.cs`). `UsuarioService` además hashea el
  password con BCrypt al crear/actualizar.

## Compras — costo promedio ponderado

- **`OrdenCompraService.cs`** — máquina de estados `Pendiente → Confirmada → Recibida`
  (o `→ Cancelada` desde los dos primeros; `EsTransicionValida` rechaza cualquier otra
  transición, incluyendo la identidad). Al pasar a `Recibida`, `AplicarRecepcionAlInventarioAsync`
  recalcula el **costo promedio ponderado** del inventario, por cada línea, dentro de una
  transacción explícita:

  ```
  costo_promedio_nuevo = (stock_actual × costo_actual + cantidad_recibida × precio_unitario)
                          / (stock_actual + cantidad_recibida)
  ```

  y registra un `MovimientoInventario` de tipo `Ingreso` referenciando la orden de compra
  para trazabilidad.

## Ventas — validación de stock y descuentos por volumen

- **`VentaService.cs`** — el service con más reglas de negocio del sistema:
  - Cada línea puede venderse en la **unidad base** del producto o en una **unidad
    alternativa** (ej. "Caja" con `FactorConversion = 12`); la cantidad se convierte a
    unidad base antes de comparar/descontar contra el stock, que siempre se lleva en
    unidad base. El precio unitario, si no viene explícito en el DTO, cae en cascada:
    precio fijo de la unidad alternativa (si existe) → `PrecioVenta` del producto ×
    factor de conversión.
  - **Descuento por volumen automático, no configurable por el cliente**, con dos escalas
    independientes:
    - General (`CalcularDescuentoPorCantidad`), sobre la **suma de unidades base de todos
      los productos "normales" de la venta**: 20+ unidades → 5%, 30+ → 10%, 40+ → 15%.
    - Especial para el SKU `PROD-009` ("Caja de lapiceros") (`CalcularDescuentoPorCajas`),
      calculado en **cantidad de cajas**, no de lapiceros sueltos, y sin mezclarse con el
      total general de la venta: 2+ cajas → 5%, 5+ → 10%, 8+ → 15%.
  - Valida stock de *todas* las líneas antes de tocar nada; retira el stock vendido y
    registra `MovimientoInventario` tipo `Retiro` por línea, en transacción explícita.
  - `GenerarNumeroComprobanteAsync` genera `VTA-<timestamp>-<random 4 dígitos>` y reintenta
    si ya existe (colisión improbable pero no imposible con timestamps de segundo).

## Visitas

- **`VisitaService.cs`** — `FechaHora` la fija siempre el backend (`DateTime.UtcNow`),
  nunca se acepta del cliente. Los reportes por día/mes agrupan en hora de Colombia
  (`ZonaHorariaColombia`), y cualquier promedio (ej. personas por visita) se calcula
  siempre sobre el conjunto agregado (`total_personas / total_visitas`), nunca como
  promedio de promedios parciales.

## Dashboard

- **`DashboardService.cs`** — 5 métricas de solo lectura sin transacciones: ventas del mes
  vs. los 3 anteriores (rellena meses sin ventas con 0, nunca proyecta un mes futuro en
  hora de Colombia), rotación de inventario por producto (clasifica "Alta demanda"/"Baja
  demanda"/"Sin stock"/"Sin ventas"), transferencias activas, productos próximos a
  agotarse, y comparativa entre sucursales (exclusiva de `AdministradorGeneral`).

## Utilidades (no son servicios de negocio)

- **`ResultadoEliminacion.cs`** — tipo de retorno compartido por las operaciones de borrado
  (`NoEncontrado` / `Falla` por FK referenciada / `Ok`), para que el controller pueda
  distinguir un `404` de un `409`/`400` sin `try/catch` sobre `DbUpdateException`.
- **`ZonaHorariaColombia.cs`** — conversión UTC ↔ hora de Colombia vía
  `TimeZoneInfo.FindSystemTimeZoneById("America/Bogota")` (identificador IANA, no un
  offset hardcodeado sumado/restado a mano). La usan `TransferenciaService`,
  `LogisticaService`, `VisitaService`, `DashboardService` y `VisitasController` cada vez
  que hay que decidir "qué día es hoy" o "a qué día pertenece este evento" desde la
  perspectiva del usuario colombiano, no del servidor en UTC.
