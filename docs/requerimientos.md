# Requerimientos — Sistema de Inventario Multi-Sucursal

Este documento consolida el levantamiento de requerimientos exigido en la sección 6 de
`Requerimientos/Prueba Tecnica Inventario.pdf`: requerimientos funcionales, no funcionales,
restricciones técnicas/de negocio, supuestos y dependencias, actores y casos de uso, e
historias de usuario clave.

## 1. Requerimientos funcionales

Derivados de los 6 módulos obligatorios del PDF (§3).

### 1.1 Gestión de inventario
- Visualizar el catálogo de productos de la sucursal propia.
- Consultar el inventario de cualquier otra sucursal de la red (solo lectura).
- Registrar ingresos de producto (compras, devoluciones, ajustes) y retiros (ventas, mermas,
  ajustes), con trazabilidad completa: fecha, responsable, motivo y cantidad.
- Controlar stock mínimo por producto/sucursal y exponer alertas de reabastecimiento.
- Gestionar múltiples unidades de medida por producto, con factor de conversión.

### 1.2 Compras
- Crear y gestionar órdenes de compra a proveedores, con líneas de producto.
- Registrar condiciones de compra: precio unitario, descuento por línea, plazo de pago.
- Al confirmar la recepción de una orden, actualizar automáticamente el inventario y
  recalcular el costo promedio ponderado del producto en esa sucursal.
- Consultar histórico de compras por proveedor y por producto.

### 1.3 Ventas
- Registrar una venta con una o más líneas (producto, cantidad, precio, descuento).
- Asociar cada venta a sucursal, fecha y usuario responsable.
- Validar disponibilidad de stock antes de confirmar la venta (rechazo si no alcanza).
- Aplicar descuento por línea; si no se especifica precio, usar el costo promedio del
  inventario como base.
- Generar un comprobante consultable posteriormente (folio, líneas, totales).

### 1.4 Transferencias entre sucursales
Ciclo completo con 5 pasos y persistencia de estado en cada uno:
1. **Solicitud**: la sucursal destino (o un administrador) solicita producto y cantidad a
   una sucursal origen.
2. **Preparación**: la sucursal origen revisa disponibilidad y confirma o ajusta cantidades.
3. **Envío**: se registra transportista, ruta, prioridad, costo y fecha estimada de llegada;
   se retira el stock de la sucursal origen.
4. **Recepción completa**: el inventario destino se actualiza automáticamente con lo enviado.
5. **Recepción parcial**: se registra lo realmente recibido por línea, se calcula el
   faltante y la transferencia queda marcada como parcial para su seguimiento.

### 1.5 Logística
- Registrar y consultar tiempos estimados vs. reales de entrega por transferencia.
- Clasificar rutas por prioridad, costo promedio y tiempo promedio.
- Visualizar transferencias en curso y su estado actual.
- Generar reportes de cumplimiento (% completas, % a tiempo) por sucursal y por ruta.

### 1.6 Dashboard / análisis
- Ventas del mes en curso vs. los 3 meses anteriores.
- Rotación de inventario y clasificación de demanda (alta/baja) por producto.
- Transferencias activas y su impacto en inventario (unidades "en tránsito").
- Productos próximos a agotarse (stock ≤ mínimo).
- Comparativa de rendimiento entre sucursales, visible solo para el perfil administrativo.

### 1.7 Autenticación y autorización
- Login con email/contraseña, devuelve un token de sesión y los datos del usuario.
- Acceso a cada módulo restringido según el rol del usuario autenticado.

## 2. Requerimientos no funcionales

| Categoría | Requerimiento |
|---|---|
| **Seguridad** | Autenticación basada en JWT firmado con clave simétrica (mínimo 32 caracteres), validado en cada request (`issuer`, `audience`, expiración, firma). Autorización por rol a nivel de endpoint (`[Authorize(Roles=...)]`). Contraseñas nunca se exponen en las respuestas de la API (`UsuarioDto` excluye el hash). |
| **Usabilidad** | La interfaz oculta del menú de navegación las secciones a las que el rol del usuario no tiene acceso (p. ej. "Compras" no aparece para un Operador). Mensajes de error de la API se muestran tal cual al usuario para acciones que fallan (stock insuficiente, validaciones de negocio). |
| **Escalabilidad** | Separación en 3 capas desplegables de forma independiente (frontend, backend, base de datos), cada una en su propio contenedor Docker, permitiendo escalar o reemplazar cada capa sin afectar a las otras. |
| **Rendimiento** | Las consultas de catálogo, inventario y dashboard se resuelven en un solo round-trip por vista (sin cascadas de N+1 desde el cliente); el cliente pagina/filtra en servidor mediante query params (`sucursalId`, `productoId`, etc.). |
| **Disponibilidad de datos entre sucursales** | La visibilidad de inventario entre sucursales es *síncrona* (no eventual): todas las sucursales leen de la misma base de datos relacional, por lo que cualquier movimiento confirmado es visible de inmediato a las demás sucursales que consulten la API. Ver `docs/decisiones-tecnicas.md` §4 para el detalle de esta decisión. |
| **Portabilidad / despliegue** | El sistema completo debe levantar con un único comando (`docker compose up`), sin pasos de configuración manual adicionales en un entorno limpio. |
| **Mantenibilidad** | Backend organizado en capas (Controllers → Services → Repositories → Data/Models) con inyección de dependencias por interfaz; frontend organizado en capas equivalentes (`api/`, `auth/`, `types/`, `components/`, `pages/`, `layouts/`). |

## 3. Restricciones técnicas y de negocio

- **Separación de capas obligatoria**: frontend, backend y base de datos son proyectos y
  contenedores independientes; ninguna capa accede directamente a los datos de otra salvo
  a través de su API pública.
- **Comunicación exclusiva por API**: el frontend no calcula ni valida reglas de negocio
  (costo promedio, disponibilidad de stock, totales de venta); solo refleja lo que la API
  devuelve. La única validación que el cliente hace de forma adelantada (p. ej. en el
  formulario de venta) es una ayuda de UX que no reemplaza la validación del backend, que
  es la autoridad final.
- **Contenedorización total**: no se admite ningún paso de instalación manual (crear base
  de datos, instalar dependencias, configurar variables) fuera de `docker compose up`.
- **Stack libre pero justificado**: cada elección tecnológica relevante debe estar
  documentada con su razón — ver `docs/decisiones-tecnicas.md`.
- **Multi-sucursal con autonomía operativa**: cada sucursal opera sus transacciones locales
  (ventas, ingresos/retiros) sin depender de otra sucursal, pero comparte visibilidad total
  del inventario de la red.
- **Roles cerrados**: solo existen 3 roles de usuario (`AdministradorGeneral`,
  `GerenteSucursal`, `OperadorInventario`); no hay registro de usuarios público — los crea
  un administrador.

## 4. Supuestos y dependencias

- El número de sucursales de prueba es reducido (2-3), sembradas por el script de seed
  (`Database/init/02_seed.sql`) para que el sistema sea evaluable sin carga manual de datos.
- No existe integración real con un ERP o sistema de punto de venta externo; el PDF lo
  marca como actor **opcional** ("Sistema externo") y no se implementa en este alcance —
  la API REST documentada en Swagger queda como el punto de integración disponible si en
  el futuro se requiere.
- El "tiempo real / near-real-time" de sincronización de inventario entre sucursales (§2.1
  del PDF) se resuelve mediante una única base de datos relacional compartida por todas las
  sucursales (ver decisión en `docs/decisiones-tecnicas.md`), no mediante mensajería o
  replicación asíncrona — se asume que esto es aceptable porque el volumen y la
  concurrencia esperados para esta prueba técnica no justifican la complejidad adicional de
  un mecanismo de eventos.
- Se asume que "reportes de cumplimiento logístico" (§3.5) se refiere a indicadores
  agregados consultables vía API/dashboard, no a archivos exportables — la exportación a
  PDF/Excel es una de las funcionalidades adicionales opcionales del §4, no un requisito
  del módulo de logística en sí.
- El entorno de evaluación tiene Docker y Docker Compose instalados; no se asume ningún
  otro software preinstalado (Node, .NET SDK, MySQL client, etc.).

## 5. Actores y responsabilidades

| Actor | Responsabilidades |
|---|---|
| **Administrador general** (`AdministradorGeneral`) | Gestiona usuarios y sucursales, tiene visibilidad total del sistema, es el único perfil con acceso a la comparativa de rendimiento entre sucursales del dashboard, y puede aprobar/enviar transferencias desde cualquier sucursal origen. |
| **Gerente de sucursal** (`GerenteSucursal`) | Supervisa las operaciones de su sucursal, aprueba (prepara/envía) transferencias que salen de su sucursal, gestiona órdenes de compra, y consulta los reportes y el dashboard de su sucursal. |
| **Operador de inventario** (`OperadorInventario`) | Realiza ingresos y retiros de inventario, registra ventas, solicita transferencias hacia su sucursal y confirma la recepción de las que llegan, y consulta el catálogo propio y el de otras sucursales. |
| **Sistema externo** (opcional, no implementado) | Podría integrarse vía la misma API REST documentada en Swagger (`/swagger`) para sincronizar con un ERP o POS externo; fuera del alcance de esta entrega. |

## 6. Historias de usuario clave

Las 3 sugeridas explícitamente por el PDF (§6.3), más historias adicionales derivadas de
cada módulo implementado.

### Sugeridas por el PDF

> **Como** operador de inventario, **quiero** registrar el ingreso de productos con su
> precio de compra, **para** mantener el costo promedio del inventario actualizado y
> generar órdenes de pago a proveedores.
> — Implementado en el módulo de Compras: al confirmar la recepción de una orden
> (`PUT /api/OrdenesCompra/{id}/estado` → `Recibida`), el backend recalcula el costo
> promedio ponderado del producto en la sucursal de la orden.

> **Como** gerente de sucursal, **quiero** ver en un dashboard la comparativa de ventas
> entre el mes actual y los tres meses anteriores, **para** identificar tendencias y tomar
> decisiones de compra anticipadas.
> — Implementado en `GET /api/Dashboard/ventas-por-mes` y la gráfica de barras del
> Dashboard del frontend.

> **Como** operador de inventario, **quiero** solicitar la transferencia de un producto
> desde otra sucursal con indicación de urgencia, **para** que la sucursal origen pueda
> priorizar el despacho según disponibilidad.
> — Implementado: `Transferencia.Prioridad` (Baja/Media/Alta) se registra al momento del
> envío y se usa en la clasificación de rutas de Logística.

### Adicionales por módulo

- **Como** administrador general, **quiero** consultar el inventario de cualquier sucursal
  sin poder modificarlo, **para** tener visibilidad de red sin comprometer la autonomía
  operativa de cada sucursal.
- **Como** operador de inventario, **quiero** que el sistema me impida vender más unidades
  de las que hay en stock, **para** evitar inconsistencias entre lo vendido y lo disponible.
- **Como** gerente de sucursal, **quiero** ver qué transferencias llegaron incompletas y
  cuánto falta por producto, **para** decidir si reclamo, reenvío o ajusto el inventario.
- **Como** gerente de sucursal, **quiero** ver el % de entregas a tiempo por ruta, **para**
  negociar mejor con transportistas o priorizar rutas más confiables.
- **Como** administrador general, **quiero** comparar ventas, inventario y transferencias
  activas entre todas las sucursales, **para** identificar qué sucursales necesitan más
  atención.
