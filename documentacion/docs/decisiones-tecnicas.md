# Decisiones Técnicas

Justificación de cada decisión de arquitectura significativa, tal como exige §8.2 del PDF.
Principio rector del cliente: *"cada decisión de diseño debe poder responder claramente a
la pregunta '¿Por qué se hizo así?'"*.

## 1. Lenguaje y framework de backend: ASP.NET Core (C#)

**Por qué:**
- Tipado estático fuerte para un dominio con muchas reglas numéricas (costo promedio
  ponderado, validación de stock, cálculos de faltantes) donde un error de tipo es más
  caro que en un lenguaje dinámico.
- Entity Framework Core da control transaccional explícito (`DbContext` + transacciones)
  necesario para operaciones que deben ser atómicas: p. ej. "retirar stock + generar
  comprobante de venta" no puede quedar a medias si falla algo.
- `[Authorize(Roles = ...)]` declarativo a nivel de endpoint hace trivial expresar la
  matriz de permisos por rol sin reinventar un middleware de autorización.
- Swagger/OpenAPI integrado de forma nativa (`Swashbuckle`) cumple el requisito de
  documentación de API (T57) sin trabajo adicional.

**Alternativas consideradas:** Node/NestJS (tipado más débil salvo con TypeScript estricto
y disciplina extra; el ecosistema de ORMs maduros para transacciones complejas es menos
uniforme) y Python/Django (buena productividad pero el tipado dinámico se sintió como un
riesgo mayor dado el volumen de cálculos financieros del dominio).

## 2. Motor de base de datos: MySQL 8.4 (relacional)

**Por qué:**
- El dominio tiene relaciones fuertes y muchas (Producto ↔ Inventario ↔ Sucursal,
  Transferencia ↔ Líneas, Orden de compra ↔ Líneas ↔ Proveedor) con integridad referencial
  crítica: un movimiento de inventario sin producto o sucursal válidos no debe poder
  existir. Un modelo relacional con FKs impone esto a nivel de motor, no solo de
  aplicación.
- Las consultas de dashboard (§3.6) son agregaciones (`SUM`, `GROUP BY`, comparaciones por
  mes) que SQL resuelve de forma directa y eficiente; modelarlas sobre un documento NoSQL
  requeriría denormalización manual o un pipeline de agregación más complejo sin beneficio
  real para este volumen de datos.
- MySQL específicamente (sobre PostgreSQL) se eligió por familiaridad del equipo con su
  tooling y por ser la opción con imagen oficial más liviana para el contenedor de
  desarrollo; ambas cumplen igual de bien los requisitos relacionales del dominio, por lo
  que la elección entre ambas no es una decisión de trade-off técnico fuerte en este caso.

**Alternativa considerada:** MongoDB (NoSQL) — descartado porque el negocio exige
consistencia transaccional fuerte entre inventario, movimientos y comprobantes, que un
modelo documental orientado a lectura desnormalizada complica sin necesidad, dado que no
hay un requisito real de escritura masiva o esquema variable que justifique NoSQL aquí.

## 3. Estrategia de autenticación y autorización: JWT + roles declarativos

**Por qué:**
- **Autenticación**: `POST /api/Auth/login` valida credenciales y emite un JWT firmado
  (`HMAC-SHA256` vía `SymmetricSecurityKey`) con expiración, `issuer` y `audience`
  validados en cada request (`Program.cs`, `AddJwtBearer`). Es *stateless*: el backend no
  necesita mantener sesiones en memoria ni en base de datos, lo que simplifica escalar el
  contenedor `backend` horizontalmente si hiciera falta.
- El frontend guarda el token en `localStorage` (`AuthContext.tsx`) y lo adjunta como
  header `Authorization: Bearer` en cada llamada (`api/client.ts`) — nunca se reenvía la
  contraseña ni se guarda en el cliente.
- **Autorización**: 3 roles fijos (`AdministradorGeneral`, `GerenteSucursal`,
  `OperadorInventario`, `Backend/Models/RolUsuario.cs`) se codifican en el JWT como
  `ClaimTypes.Role` y se verifican de forma declarativa con `[Authorize(Roles = ...)]` por
  endpoint (`Backend/Auth/Roles.cs` centraliza las combinaciones usadas, p. ej.
  `Roles.AdminYGerente` para aprobar transferencias). El frontend replica la misma matriz
  de roles en `ProtectedRoute.tsx` para ocultar rutas/navegación, pero **la autorización
  real vive en el backend** — ocultar un botón en el cliente es solo UX, no seguridad.

**Alternativa considerada:** sesiones con cookie + almacenamiento server-side — descartada
porque añade estado que el backend tendría que compartir entre réplicas y no aporta nada
frente a JWT para el alcance de esta prueba.

## 4. Mecanismo de sincronización de inventario entre sucursales

**Decisión:** una única base de datos relacional (MySQL) compartida por todas las
sucursales, sin mensajería, colas ni replicación asíncrona.

**Por qué:**
- El PDF (§2.1) pide visibilidad "en tiempo real o near-real-time" entre sucursales. La
  forma más simple de garantizar *tiempo real real* (no "near") es que todas las
  sucursales lean y escriban contra el mismo almacenamiento: en cuanto un movimiento se
  confirma (`POST /api/Inventario/movimientos`, `PUT /api/Transferencias/{id}/recibir`,
  etc.), cualquier otra sucursal que consulte `GET /api/Inventario?sucursalId=X` ve el dato
  actualizado de inmediato — no hay ventana de inconsistencia que gestionar.
- Cada sucursal mantiene su **autonomía operativa** (§2.1) a través del modelo de datos, no
  de la infraestructura: `inventario` está particionado lógicamente por
  `(producto_id, sucursal_id)` con `UNIQUE`, así que las transacciones de una sucursal
  nunca compiten por el mismo registro de stock que otra sucursal, salvo durante una
  transferencia explícita entre ambas — que es precisamente el caso donde *sí* deben
  coordinarse.
- Se descartó un mecanismo de eventos/mensajería (p. ej. colas + proyecciones por
  sucursal) porque introduce complejidad operativa (otro servicio, consistencia eventual
  a gestionar, reconciliación ante fallos) que no está justificada por el volumen ni la
  concurrencia esperados en esta prueba técnica. Si el sistema creciera a decenas de
  sucursales con alta concurrencia de escritura, ese sería el primer punto a revisitar.

## 5. Patrones de diseño aplicados

| Patrón | Dónde | Por qué |
|---|---|---|
| **Repository** | `Backend/Repositories/*` + interfaces en `Repositories/Interfaces/` | Aísla el acceso a datos (EF Core) de la lógica de negocio. Cada `Service` depende de una interfaz (`IInventarioRepository`, `IVentaRepository`, etc.), no de la implementación concreta — permite testear servicios con un repositorio en memoria/mock sin levantar MySQL. |
| **Service Layer** | `Backend/Services/*` | Centraliza las reglas de negocio (costo promedio ponderado en `OrdenCompraService`, validación de stock en `VentaService`, transiciones de estado en `TransferenciaService`) separadas de los `Controllers`, que solo traducen HTTP ↔ DTOs. |
| **DTO (Data Transfer Object)** | `Backend/DTOs/*` | Ningún `Controller` expone directamente una entidad de `Backend/Models/*`: cada endpoint tiene su propio DTO de entrada/salida, evitando fugar campos internos (p. ej. `password_hash` nunca sale en `UsuarioDto`) y desacoplando el contrato de API del esquema de base de datos. |
| **Dependency Injection por interfaz** | `Program.cs` (`AddScoped<IX, X>()` para cada repositorio/servicio) | El contenedor de DI de ASP.NET Core resuelve las implementaciones en tiempo de ejecución; facilita sustituir una implementación (p. ej. para tests) sin tocar el código que la consume. |
| **Provider/Context (React)** | `Frontend/src/auth/AuthContext.tsx` | Equivalente en el frontend al patrón de inyección de dependencias: la sesión del usuario se expone vía contexto de React (`useAuth()`) en vez de pasarse por props a través de todo el árbol de componentes. |

No se usó CQRS: el volumen de lecturas/escrituras y la complejidad del dominio no
justifican separar los modelos de lectura y escritura — la separación
Controller/Service/Repository ya da suficiente claridad para el alcance de esta prueba.

## 6. Configuración de logística por ruta (`rutas_logisticas`)

**Decisión:** una tabla de configuración `rutas_logisticas` (origen, destino,
transportista por defecto, costo, tiempo estimado en días) separada de `transferencias`,
en vez de seguir tecleando transportista/costo/fecha estimada manualmente en cada envío.

**Por qué:**
- El costo y el tiempo de tránsito entre dos sucursales son, en la práctica, un dato de
  la **ruta** (una propiedad relativamente estable de la relación origen→destino), no un
  dato que cambie transferencia a transferencia. Modelarlo como configuración reutilizable
  evita que cada Gerente tenga que inventar/recordar el costo correcto cada vez que envía,
  y evita que el "costo promedio" de Logística termine promediando valores inconsistentes
  introducidos manualmente.
- El costo/tiempo *real* usado en una transferencia concreta sigue viviendo en
  `transferencias.costo_envio` / `fecha_estimada_llegada` (no se elimina ese dato): la
  ruta configurada solo **prellena** el formulario de envío. El Gerente puede ajustar el
  costo manualmente para un caso excepcional ("Modificar costo" en el frontend), y ese
  valor ajustado es el que queda persistido y el que alimenta los cálculos de Logística —
  la configuración de ruta es la fuente por defecto, nunca un valor forzado.
- Se descartó extender `transferencias` con un `ruta_logistica_id` (FK) en vez de una
  tabla de configuración separada, porque `transferencias.ruta` ya es texto libre editable
  por el usuario (puede no coincidir exactamente con un par origen/destino configurado, p.
  ej. variantes de la misma ruta física) — la configuración se busca por
  `(sucursal_origen_id, sucursal_destino_id)`, no por el texto de la ruta.
