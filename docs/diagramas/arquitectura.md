# Diagrama de Arquitectura

Vista técnica del sistema: capas, servicios Docker y su comunicación (§7.1 y §8.1 del PDF).

```mermaid
flowchart TB
    subgraph Client["Navegador del usuario"]
        Browser["SPA React (servida por Vite dev server\nen contenedor 'frontend')"]
    end

    subgraph DockerHost["Docker Compose — red interna"]
        subgraph FE["Contenedor: frontend (puerto 5173)"]
            direction TB
            Pages["pages/ — vistas por módulo"]
            Components["components/ — UI reutilizable\n(formularios, tablas, gráficas)"]
            Auth_["auth/ — AuthContext, ProtectedRoute"]
            ApiClient["api/ — cliente HTTP (fetch + JWT)"]
            Pages --> Components
            Pages --> Auth_
            Pages --> ApiClient
        end

        subgraph BE["Contenedor: backend (puerto 8080)"]
            direction TB
            Controllers["Controllers/ — endpoints REST\n(+ Swagger en /swagger)"]
            Services["Services/ — lógica de negocio\n(costo promedio, validación de stock,\nreglas de transferencia)"]
            Repositories["Repositories/ — acceso a datos\nvía EF Core (patrón Repository)"]
            JwtAuth["Auth/ — JwtBearer middleware\n+ autorización por rol"]
            Controllers --> Services
            Services --> Repositories
            Controllers -.-> JwtAuth
        end

        subgraph DB["Contenedor: db (puerto 3306)"]
            MySQL[("MySQL 8.4\nesquema relacional único\ncompartido por todas las sucursales")]
        end
    end

    Browser -- "HTTPS/JSON\nREST, Bearer JWT" --> ApiClient
    ApiClient -- "fetch()" --> Controllers
    Repositories -- "EF Core / MySqlConnector" --> MySQL

    FE -. "depends_on" .-> BE
    BE -. "depends_on: service_healthy" .-> DB
```

## Capas y responsabilidades

| Capa | Contenedor | Responsabilidad | Tecnología |
|---|---|---|---|
| **Presentación** | `frontend` | Renderizar UI, manejar sesión local, consumir la API — sin lógica de negocio propia | React 19 + TypeScript + Vite + react-router-dom |
| **Negocio** | `backend` | Validaciones, reglas de transferencia, cálculo de costo promedio ponderado, autenticación/autorización, generación de reportes agregados | ASP.NET Core 9 Web API (C#) |
| **Datos** | `db` | Almacenamiento persistente, integridad referencial (FKs), constraints de unicidad | MySQL 8.4 |

## Comunicación entre capas

- El frontend **nunca** accede a la base de datos directamente ni implementa las reglas de
  negocio del backend (costo promedio, validación de stock, cálculo de faltantes): solo
  llama a la API REST del backend y renderiza su respuesta.
- El backend expone únicamente HTTP/JSON REST (documentado con Swagger en `/swagger`),
  autenticado con JWT Bearer. No expone la base de datos directamente a ningún cliente.
- Los tres contenedores están definidos en `docker-compose.yaml`, en la misma red interna
  de Docker Compose, con `depends_on` + healthcheck para garantizar el orden de arranque
  (`db` → `backend` → `frontend`) sin pasos manuales.

Ver `docs/decisiones-tecnicas.md` para la justificación de cada elección tecnológica.
