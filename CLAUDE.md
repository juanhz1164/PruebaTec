# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Sistema de Inventario Multi-Sucursal — prueba técnica para OptiPlant Consultores. Ver
`README.md` en la raíz para arquitectura, módulos implementados y arranque completo.

## Repository layout

- `Backend/` — API REST en ASP.NET Core 9 (C#), organizada por capas:
  `Controllers/` → `Services/` → `Repositories/` (EF Core) → `Models/`/`Data/`, más `DTOs/`
  y `Auth/` (JWT + roles).
- `Frontend/` — SPA en React 19 + TypeScript + Vite: `api/`, `auth/`, `types/`,
  `components/`, `pages/`, `layouts/`.
- `Database/` — esquema y seed de MySQL en `Database/init/` (SQL plano).
- `InventarioMultiSucursal.Api.Tests/` — suite de tests (xUnit): unitarios e integración.
- `documentacion/docs/` — requerimientos, decisiones técnicas, uso de IA, diagramas
  (Mermaid) exigidos por el enunciado.
- `documentacion/Requerimientos/` — PDF original del enunciado y planificación interna
  (plan de trabajo, desglose de tareas de Trello).

## Running the project

```bash
cp .env.example .env
docker compose up
```

Levanta 3 contenedores: `db` (MySQL 8.4), `backend` (puerto 8080, Swagger en
`/swagger`), `frontend` (puerto 5173, Vite dev server). La base de datos se siembra
automáticamente — no hace falta carga manual de datos. Usuarios de prueba y más detalle
en `README.md`.

**Nota sobre el frontend en Docker**: el contenedor `frontend` usa un bind mount al
código del host, pero el file-watcher de Vite dentro del contenedor no siempre detecta
ediciones hechas desde fuera del contenedor de forma confiable. Si un cambio de código no
se refleja en `http://localhost:5173` tras guardarlo, reinicia el contenedor:
`docker restart inventario_frontend` (o el nombre real del contenedor, ver `docker ps`).

## Build / lint / test

```bash
# Frontend
cd Frontend
npm run build     # tsc -b && vite build
npm run lint       # oxlint

# Backend / tests
dotnet test InventarioMultiSucursal.Api.Tests
```

## Working in this repo

- El frontend nunca implementa lógica de negocio (costo promedio, validación de stock,
  cálculo de faltantes): solo consume la API del backend y renderiza su respuesta.
- Cada decisión de arquitectura significativa debe quedar justificada en
  `documentacion/docs/decisiones-tecnicas.md` — es un requisito explícito del enunciado
  (§8.2 del PDF), no una convención opcional.
- Los diagramas obligatorios (casos de uso, actividad, arquitectura, E-R) viven en
  `documentacion/docs/diagramas/` como Mermaid embebido en Markdown — al agregar o
  modificar un módulo con impacto en el modelo de datos o los actores, actualiza el
  diagrama correspondiente en el mismo cambio, no como tarea aparte.
