# DTOs

Objetos de transferencia entre la API y el cliente: lo que un controller recibe en el
cuerpo de una petición (`CrearXxxDto`, `ActualizarXxxDto`) y lo que devuelve
(`XxxDto`). Ninguna entidad de `Models/` se serializa directamente hacia afuera — siempre
pasa por un DTO, aunque sea 1:1 — para no acoplar el contrato público de la API al esquema
interno de la base de datos (ej. nunca se filtra `PasswordHash`, aunque `Usuario` lo tenga).

## `AuthDto.cs`
`LoginDto` (Email, Password) → `LoginResponseDto` (Token, ExpiraEn, Usuario anidado).

## `DashboardDto.cs`
Cinco clases, cada una alimenta una sección del dashboard: `VentasPorMesDto` (mes actual
vs. 3 anteriores), `RotacionProductoDto` (índice de rotación, con `Clasificacion` textual:
"Alta demanda" / "Baja demanda" / "Sin stock" / "Sin ventas"), `TransferenciaActivaDto`,
`ProductoProximoAgotarseDto`, `ComparativaSucursalDto` (exclusivo de
`AdministradorGeneral`).

## `InventarioDto.cs`
`InventarioDto` (response; incluye `Agotado` — `true` si no existe fila de inventario o la
cantidad es 0, en cuyo caso `Id = 0`), `CrearInventarioDto` (alta inicial de stock),
`ActualizarInventarioDto` (solo `Cantidad`/`StockMinimo`/`CostoPromedio` — el id va en la
ruta, no en el cuerpo).

## `LogisticaDto.cs`
- **`ResultadoTiempoEnvio`** (enum: `Pendiente` / `ATiempo` / `Retraso` / `SinDatos`) — la
  única fuente de verdad del estado visual de "Tiempos estimados vs. reales", calculada
  íntegramente en `LogisticaService`. Reemplaza a `CumplioTiempoEstimado` (bool nullable,
  ambiguo entre "aún sin llegar" y "faltan datos"), que se conserva en el DTO marcado como
  obsoleto solo por compatibilidad.
- `TiempoEnvioDto` — response de esa pestaña; incluye ambos campos (`Resultado` y el
  deprecado `CumplioTiempoEstimado`).
- `ClasificacionRutaDto` — agregado por ruta: cantidad de transferencias, prioridad más
  frecuente, costo/tiempo promedio.
- `TransferenciaEnCursoDto` — response de "Transferencias en curso".
- `CumplimientoDto` — agregado por sucursal/ruta, con propiedades **calculadas**
  `PorcentajeCompletas`/`PorcentajeATiempo` sobre los conteos crudos (nunca se persiste un
  porcentaje).

## `MovimientoInventarioDto.cs`
`MovimientoInventarioDto` (response, con nombres de producto/usuario desnormalizados para
no obligar al cliente a otro `join`), `CrearMovimientoInventarioDto` (request de
ingreso/retiro manual).

## `OrdenCompraDto.cs`
`OrdenCompraDto` (response; `Total` es una propiedad **calculada** = suma de subtotales de
línea, nunca se persiste un total aparte), `OrdenCompraLineaDto` (`Subtotal` calculado =
`Cantidad × PrecioUnitario × (1 − Descuento/100)`), `CrearOrdenCompraDto`/
`CrearOrdenCompraLineaDto` (alta), `CambiarEstadoOrdenCompraDto` (transición de estado, un
único campo `Estado`).

## `ProductoDto.cs`
`ProductoDto` (response completo, con unidad/proveedor desnormalizados y la lista de
`UnidadesAlternativas`), `UnidadAlternativaDto` (unidad alternativa anidada),
`CrearProductoDto`/`ActualizarProductoDto` (`Actualizar` incluye además `Activo`),
`CrearUnidadAlternativaDto` (alta/edición de una unidad alternativa),
`AlertaStockDto` (fila del reporte de stock bajo mínimo, con `Faltante` ya calculado).

## `ProveedorDto.cs`
`ProveedorDto`, `CrearProveedorDto`, `ActualizarProveedorDto` (con `Activo`) — catálogo
simple, sin cálculos.

## `SucursalDto.cs`
Mismo patrón que `ProveedorDto.cs`: `SucursalDto`, `CrearSucursalDto`,
`ActualizarSucursalDto` (con `Activa`).

## `TransferenciaDto.cs` — el más grande (9 clases)
- `TransferenciaDto` (response completo): incluye el nombre de los **4** usuarios que
  pueden estar involucrados — `UsuarioSolicitanteNombre` (siempre presente) y
  `UsuarioPreparadorNombre`/`UsuarioEnvioNombre`/`UsuarioRecepcionNombre` (nullable, según
  en qué paso vaya la transferencia).
- `TransferenciaLineaDto` — `Faltante` calculado = `CantidadEnviada − CantidadRecibida`.
- `CrearTransferenciaDto`/`CrearTransferenciaLineaDto` — solicitud inicial; `Prioridad` es
  opcional, con `Media` como default documentado si no se envía.
- `RegistrarEnvioDto`/`LineaEnvioDto` — datos del despacho (transportista, ruta, costo,
  fecha estimada) + cantidad *realmente* enviada por línea. La prioridad **no** se pide
  aquí — ya quedó fija al solicitar.
- `ConfirmarRecepcionDto`/`LineaRecepcionDto` — cantidad recibida por línea (recepción
  completa o parcial).
- `RutaLogisticaDto` — configuración de *referencia* por ruta (transportista/costo/tiempo
  estimado por defecto), distinta del valor *real* que queda guardado en cada
  `TransferenciaDto` una vez enviada.

## `UnidadMedidaDto.cs`
Solo `UnidadMedidaDto` (`Id`, `Nombre`, `Abreviatura`) — catálogo fijo, sin DTOs de
creación (no hay endpoint de alta para unidades de medida base).

## `UsuarioDto.cs`
`UsuarioDto` (response — nunca incluye `PasswordHash`), `CrearUsuarioDto`,
`ActualizarUsuarioDto` (sin password; incluye `Activo`).

## `VentaDto.cs`
`VentaDto`/`VentaLineaDto` (response), `CrearVentaDto` (datos de cliente opcionales a nivel
de contrato), `CrearVentaLineaDto` — el más anotado del archivo: `PrecioUnitario` es
opcional (si se omite, cae al precio de venta del producto); `UnidadMedidaId` es opcional
(permite vender en una unidad alternativa con conversión automática); el **descuento nunca
se recibe del cliente** — siempre se calcula server-side por tramos de cantidad (ver
`Services/README.md` → `VentaService`).

## `VisitaDto.cs` (7 clases)
`VisitaDto` (response), `CrearVisitaDto` (solo `CantidadPersonas` — sucursal, usuario y
fecha/hora los fija siempre el backend, nunca se confía en lo que mande el cliente),
`ResumenVisitasDto`/`VisitasPorHoraDto` (KPIs de un día), `VisitasPorSucursalDto`
(desglose por sucursal, exclusivo de Gerente), `FlujoPersonasResumenDto` (usado tanto en
comparativa de sucursales como en el dashboard; el promedio siempre se calcula como
`total_personas / total_visitas`, nunca como promedio de promedios parciales),
`FlujoPersonasPorSucursalDto`/`FlujoPersonasPorDiaDto` (desgloses anidados de ese resumen).
