# Controllers

Capa HTTP: traduce peticiones REST a llamadas a `Services/`, sin lógica de negocio propia
más allá de la autorización (rol + pertenencia a sucursal) y el mapeo de `DTOs/`. Todos
heredan de `ControllerBase`, llevan `[ApiController]` y `[Route("api/[controller]")]`, y
—salvo `AuthController`— `[Authorize]` a nivel de clase con overrides puntuales por
endpoint vía `[Authorize(Roles = Roles.X)]` (constantes en `Auth/Roles.cs`).

## Patrón compartido en (casi) todos los controllers

- **Usuario actual**: una propiedad privada `SucursalIdUsuarioActual` lee el claim custom
  `"sucursalId"` del JWT (`User.FindFirst("sucursalId")`); `TransferenciasController` y
  `VisitasController` además exponen `UsuarioIdActual` vía `ClaimTypes.NameIdentifier`.
  Comprobaciones de rol puntuales usan `User.IsInRole(Roles.X)`.
- **Autorización en dos capas**: el atributo `[Authorize(Roles = ...)]` es solo el primer
  filtro. La mayoría de los controllers añaden una comprobación **dentro** del método que
  el atributo no puede expresar: que el usuario, además del rol correcto, pertenezca a la
  sucursal correcta para esa operación concreta. Ejemplo: `preparar`/`enviar` en
  Transferencias exigen rol Gerente *y* que ese Gerente sea de la sucursal **origen** de
  esa transferencia específica; si no coincide, `Forbid()`.
- **Scoping por sucursal para Gerente/Operador**: en Inventario, Ventas, Dashboard y
  Visitas, un Gerente/Operador queda **fijado** a su propia sucursal (el backend ignora
  cualquier `sucursalId` que intenten pasar por query o body) — el `AdministradorGeneral`
  es el único que puede ver/operar cualquier sucursal, o la red completa sin filtro.

## Controllers y sus endpoints

### `AuthController` — `api/Auth` (público)
- `POST /login` — verifica credenciales y devuelve el JWT.

### `DashboardController` — `api/Dashboard`
- `GET /ventas-por-mes?sucursalId&anio&mes` — mes actual vs. 3 anteriores.
- `GET /rotacion-inventario?sucursalId` — índice de rotación por producto.
- `GET /transferencias-activas` — sin scoping, vista global.
- `GET /productos-proximos-agotarse?sucursalId` — reutiliza la alerta de stock mínimo.
- `GET /comparativa-sucursales` — **solo `Admin`**.

### `InventarioController` — `api/Inventario`
- `GET /?sucursalId` — lectura abierta a cualquier rol/sucursal (intencional).
- `GET /{id}`.
- `POST /` — alta de stock inicial; Gerente/Operador solo en su sucursal.
- `PUT /{id}` — actualizar cantidad/mínimo/costo.
- `GET /movimientos?productoId&sucursalId` — Admin libre, Gerente/Operador forzados a su sucursal.
- `POST /movimientos` — ingreso/retiro manual; Gerente/Operador solo su sucursal.

### `LogisticaController` — `api/Logistica` (**100% solo lectura**, sin excepciones de rol)
- `GET /tiempos-envio` — "Tiempos estimados vs. reales".
- `GET /rutas` — "Clasificación de rutas".
- `GET /en-curso` — "Transferencias en curso".
- `GET /cumplimiento/sucursal`, `GET /cumplimiento/ruta` — "Cumplimiento por sucursal".

Ningún endpoint de escritura vive aquí a propósito: las acciones sobre una transferencia
(preparar/enviar/recibir/cancelar) son responsabilidad exclusiva de
`TransferenciasController`.

### `OrdenesCompraController` — `api/OrdenesCompra`
- `GET /`, `GET /{id}`.
- `POST /` — crea orden + líneas.
- `PUT /{id}/estado` — `[Authorize(Roles = AdminYGerente)]`; pasar a `Recibida` solo lo
  puede hacer el Gerente de la sucursal **destino** de la orden, cualquier otra transición
  (Confirmar, Cancelar) queda reservada a Admin.
- `GET /historico/proveedor/{id}`, `GET /historico/producto/{id}`.

### `ProductosController` — `api/Productos`
- `GET /`, `GET /{id}`.
- `POST /`, `PUT /{id}`, `DELETE /{id}` — **solo Admin**.
- `POST /{id}/unidades-alternativas`, `DELETE /{id}/unidades-alternativas/{id}` —
  cualquier rol autenticado.
- `GET /alertas-stock?sucursalId` — reporte de productos bajo su stock mínimo.

### `ProveedoresController` — `api/Proveedores`
- CRUD completo (`GET /`, `GET /{id}`, `POST /`, `PUT /{id}`, `DELETE /{id}`) sin
  restricción de rol adicional a `[Authorize]`.

### `SucursalesController` — `api/Sucursales`
- `GET /`, `GET /{id}`.
- `POST /`, `PUT /{id}`, `DELETE /{id}` — **solo Admin**.

### `TransferenciasController` — `api/Transferencias`
- `GET /`, `GET /{id}`.
- `POST /` — solicita una transferencia; el solicitante puede ser cualquier rol y no
  necesita pertenecer a la sucursal origen (ver `Services/README.md`).
- `PUT /{id}/preparar` — `[Authorize(Roles = Gerente)]` + Gerente de la sucursal **origen**.
- `PUT /{id}/enviar` — `[Authorize(Roles = Gerente)]` + Gerente de la sucursal **origen**.
- `PUT /{id}/recibir` — `[Authorize(Roles = GerenteYOperador)]` + usuario de la sucursal
  **destino**.
- `PUT /{id}/cancelar` — sin restricción de rol adicional en el controller (la valida el
  service según el estado).
- `GET /rutas-logisticas`, `GET /rutas-logisticas/origen/{o}/destino/{d}` — catálogo de
  configuración de logística por ruta.

### `UnidadesMedidaController` — `api/UnidadesMedida`
- `GET /` — único endpoint; catálogo de solo lectura desde aquí.

### `UsuariosController` — `api/Usuarios`
- `GET /`, `GET /{id}` — cualquier rol (se necesita la lista para otros formularios, ej.
  elegir usuario responsable).
- `POST /`, `PUT /{id}`, `DELETE /{id}` — **solo Admin**.

### `VentasController` — `api/Ventas`
- `GET /` — Admin ve todas, Gerente/Operador solo las de su sucursal.
- `GET /{id}`.
- `POST /` — Gerente/Operador solo pueden registrar ventas de su propia sucursal.

### `VisitasController` — `api/Visitas`
- `GET /?fecha` — `[Authorize(Roles = GerenteYOperador)]`, forzado a la sucursal propia.
- `GET /resumen?fecha` — mismo scoping.
- `GET /resumen-por-sucursal?fecha` — **solo Gerente**, agregado de toda la red.
- `POST /` — `[Authorize(Roles = GerenteYOperador)]`; sucursal, usuario y fecha/hora los
  fija siempre el backend — el cliente solo manda la cantidad de personas.
- `DELETE /{id}` — `[Authorize(Roles = GerenteYOperador)]`, scoped a sucursal propia.
- `GET /flujo/dia?fecha`, `GET /flujo/mes?anio&mes` — `[Authorize(Roles = AdminYGerente)]`;
  Gerente ve su sucursal, Admin ve/compara toda la red (Operador no tiene acceso a esta
  parte del módulo).

Todos los endpoints que aceptan `fecha` como parámetro opcional usan
`ZonaHorariaColombia.ALocal(DateTime.UtcNow)` como valor por defecto de "hoy" cuando no se
pasa explícitamente — nunca `DateTime.UtcNow.Date` crudo, que daría el día equivocado
durante buena parte del día en hora de Colombia.
