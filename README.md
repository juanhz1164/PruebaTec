# Sistema de Inventario Multi-Sucursal

Prueba técnica para OptiPlant Consultores: aplicación para gestionar inventario, compras,
ventas, transferencias y logística de múltiples sucursales de una misma organización, con
visibilidad compartida de inventario en tiempo real y autonomía operativa por sucursal.

> Ver `Requerimientos/Prueba Tecnica Inventario.pdf` para el enunciado original.

## Instalación y arranque

Requisito único: **Docker** y **Docker Compose**.

```bash
cp .env.example .env
docker compose up
```

Esto levanta 3 contenedores — `db` (MySQL), `backend` (API) y `frontend` (SPA) — en ese
orden, sin ningún paso de configuración manual adicional. Al terminar de arrancar:

| Servicio | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API (Swagger) | http://localhost:8080/swagger |

La base de datos se siembra automáticamente (`Database/init/`) con 3 sucursales, 5
usuarios (uno por rol, más un gerente adicional) y un catálogo de 5 productos con
inventario inicial, listos para evaluar todos los módulos sin carga manual de datos.

### Usuarios de prueba

Todos con la contraseña `Password123!`.

| Email | Rol | Sucursal |
|---|---|---|
| `admin@inventario.com` | Administrador general | — (acceso a todas) |
| `gerente.centro@inventario.com` | Gerente de sucursal | Sucursal Centro |
| `operador.centro@inventario.com` | Operador de inventario | Sucursal Centro |
| `gerente.norte@inventario.com` | Gerente de sucursal | Sucursal Norte |
| `gerente.medellin@inventario.com` | Gerente de sucursal | Sucursal Medellín |

## Arquitectura

3 capas independientes, cada una en su propio contenedor Docker, comunicadas
exclusivamente por API REST (sin lógica de negocio en el cliente):

```
Frontend (React + TS)  --HTTP/JSON, JWT-->  Backend (ASP.NET Core)  --EF Core-->  MySQL 8.4
```

- **Frontend** (`Frontend/`) — SPA en React 19 + TypeScript + Vite, organizada por capas:
  `api/` (cliente HTTP), `auth/` (sesión y rutas protegidas por rol), `types/` (modelos),
  `components/` (UI reutilizable), `pages/` (vistas), `layouts/`.
- **Backend** (`Backend/`) — API REST en ASP.NET Core, organizada por capas:
  `Controllers/` → `Services/` (lógica de negocio) → `Repositories/` (acceso a datos vía
  EF Core) → `Models/`/`Data/`, más `DTOs/` para los contratos de la API y `Auth/` para JWT
  y roles.
- **Base de datos** (`Database/`) — esquema y seed de MySQL, versionados como SQL plano en
  `Database/init/`.

Diagrama completo con el detalle de cada contenedor: **[`docs/diagramas/arquitectura.md`](docs/diagramas/arquitectura.md)**.

## Módulos implementados

Los 6 módulos obligatorios del PDF (§3), cada uno con backend + frontend:

1. **Gestión de inventario** — catálogo por sucursal, consulta de inventario de otras
   sucursales, ingresos/retiros con trazabilidad completa, stock mínimo con alertas,
   múltiples unidades de medida por producto.
2. **Compras** — órdenes de compra a proveedores, condiciones (precio, descuento, plazo),
   actualización automática de inventario y costo promedio ponderado al confirmar
   recepción, histórico por proveedor/producto.
3. **Ventas** — registro de venta con validación de stock, descuentos por línea,
   comprobante consultable.
4. **Transferencias entre sucursales** — ciclo completo: solicitud → preparación → envío →
   confirmación de recepción completa o parcial (con cálculo de faltantes).
5. **Logística** — tiempos estimados vs. reales, clasificación de rutas, estado de
   transferencias en curso, reportes de cumplimiento por sucursal y por ruta.
6. **Dashboard** — KPIs y gráficas: ventas del mes vs. anteriores, rotación de inventario,
   transferencias activas, productos próximos a agotarse, comparativa entre sucursales
   (solo perfil administrativo).

Más la funcionalidad adicional (§4 del PDF):

7. **Control de flujo de personas (Visitas)** — variante de "Auditoría y trazabilidad"
   aplicada al ingreso físico a cada sucursal: registro de visitas del día (cantidad de
   personas, hora, responsable) por Operador/Gerente sobre su propia sucursal, resumen del
   día, y "Flujo de personas" (hoy/mes) integrado en el Dashboard — el Gerente ve su
   sucursal, el Administrador general compara todas las sucursales.

## Testing

Suite de pruebas del backend (`InventarioMultiSucursal.Api.Tests/`) con xUnit:

- **Unitarios**: costo promedio ponderado en compras, validación de stock en ventas,
  reglas de transferencia (completa/parcial).
- **Integración**: endpoints principales de Inventario, Compras, Ventas, Transferencias y
  Dashboard, contra una base de datos real levantada para las pruebas.

```bash
dotnet test InventarioMultiSucursal.Api.Tests
```

72 pruebas, todas en verde.

## Documentación

| Documento | Contenido |
|---|---|
| [`docs/requerimientos.md`](docs/requerimientos.md) | Requerimientos funcionales, no funcionales, restricciones, supuestos, actores y responsabilidades, historias de usuario (§6 del PDF). |
| [`docs/decisiones-tecnicas.md`](docs/decisiones-tecnicas.md) | Justificación de cada decisión de arquitectura: lenguaje de backend, motor de BD, autenticación/autorización, sincronización de inventario, patrones de diseño (§8.2 del PDF). |
| [`docs/uso-ia.md`](docs/uso-ia.md) | Uso de inteligencia artificial durante el desarrollo, con ejemplos y evaluación crítica (§9 del PDF). |
| [`docs/diagramas/casos-de-uso.md`](docs/diagramas/casos-de-uso.md) | Diagrama de casos de uso (actores × módulos). |
| [`docs/diagramas/actividad-transferencia.md`](docs/diagramas/actividad-transferencia.md) | Diagrama de actividad del flujo de transferencia entre sucursales. |
| [`docs/diagramas/actividad-venta.md`](docs/diagramas/actividad-venta.md) | Diagrama de actividad del flujo de venta. |
| [`docs/diagramas/arquitectura.md`](docs/diagramas/arquitectura.md) | Diagrama de arquitectura del sistema. |
| [`docs/diagramas/er.md`](docs/diagramas/er.md) | Diagrama entidad-relación completo. |
| `Requerimientos/Plan-de-Trabajo.md` | Plan de ejecución por fases usado durante el desarrollo. |
| `Requerimientos/Tareas-Trello.md` | Desglose de tareas usado como tablero de trabajo (`pruebatec` en Trello). |

## Stack tecnológico

| Capa | Tecnología | Justificación breve |
|---|---|---|
| Frontend | React 19, TypeScript, Vite, react-router-dom | SPA tipada, sin lógica de negocio — solo consume la API. |
| Backend | ASP.NET Core 9 (C#), Entity Framework Core | Tipado fuerte para cálculos financieros, transacciones explícitas, autorización declarativa por rol, Swagger nativo. |
| Base de datos | MySQL 8.4 | Modelo con relaciones fuertes e integridad referencial crítica entre inventario, compras, ventas y transferencias. |
| Autenticación | JWT (Bearer) | Stateless, permite escalar el backend sin sesión compartida. |
| Infraestructura | Docker Compose | Los 3 servicios arrancan con un solo comando, sin configuración manual. |

Justificación completa de cada elección: **[`docs/decisiones-tecnicas.md`](docs/decisiones-tecnicas.md)**.

## Estructura del repositorio

```
Backend/          API REST en ASP.NET Core (Controllers/Services/Repositories/Models/DTOs)
Frontend/         SPA en React + TypeScript (api/auth/types/components/pages/layouts)
Database/         Esquema y seed de MySQL (Database/init/)
docs/             Documentación de arquitectura, decisiones técnicas, uso de IA y diagramas
Requerimientos/   Enunciado original (PDF) y planificación interna del proyecto
docker-compose.yaml
.env.example
```
