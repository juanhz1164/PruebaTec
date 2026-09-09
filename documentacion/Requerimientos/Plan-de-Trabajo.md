# Plan de Trabajo — Sistema de Inventario Multi-Sucursal

Análisis del documento `Prueba Tecnica Inventario.pdf` (OptiPlant Consultores) y plan de ejecución paso por paso, ordenado por dependencias reales del proyecto. Cada fase indica **qué** hay que hacer, **por qué** va en ese orden y **de qué sección del PDF** proviene.

> Principio rector del cliente: toda decisión de diseño debe poder responder "¿Por qué se hizo así?". Este plan está pensado para dejar esa justificación documentada en cada fase, no solo al final.

---

## Fase 0 — Levantamiento de Requerimientos (Ingeniería de Software §6)

Antes de tocar código o arquitectura, dejar por escrito la base de ingeniería de software que el PDF pide como entregable (§6, §10):

1. **Documento de requerimientos funcionales**: listar qué debe hacer el sistema, derivado de los módulos §3 (inventario, compras, ventas, transferencias, logística, dashboard).
2. **Documento de requerimientos no funcionales**: rendimiento, seguridad, escalabilidad, usabilidad, disponibilidad de sincronización "near-real-time" entre sucursales (§2.1).
3. **Restricciones técnicas y de negocio**: 3 capas obligatorias, comunicación exclusiva por API, Docker Compose de un solo comando, stack libre pero justificado (§5).
4. **Supuestos y dependencias**: p. ej. número de sucursales de prueba, si hay integración real con ERPs externos o solo se deja el endpoint preparado (§6.2, actor "Sistema externo").
5. **Actores y casos de uso** (§6.2): Administrador general, Gerente de sucursal, Operador de inventario, Sistema externo (opcional). Definir responsabilidades y permisos de cada uno — esto determina el modelo de autenticación/autorización que se diseñará en la Fase 1.
6. **Historias de usuario clave** (§6.3, recomendadas): al menos las 3 sugeridas en el PDF (ingreso con costo promedio, dashboard comparativo, transferencia con urgencia) más las que se deriven de cada módulo.

**Por qué va primero:** todos los diagramas (Fase 2) y la arquitectura (Fase 1) dependen de tener actores, roles y alcance funcional cerrado. Hacerlo después obliga a rehacer diagramas.

---

## Fase 1 — Arquitectura y Stack Tecnológico (PDF §12 paso 6, §8)

1. Elegir lenguaje/framework de backend y justificar la elección para este problema (multi-tenant por sucursal, transacciones, concurrencia en transferencias).
2. Elegir motor de base de datos (relacional vs. NoSQL) y justificar según el modelo de datos (relaciones fuertes entre inventario/compras/ventas/transferencias → favorece relacional).
3. Elegir framework de frontend (React/Vue/Angular u otro) — libre, pero debe ser SPA consumiendo la API (§8.1, prohibida lógica de negocio en el cliente).
4. Definir **estrategia de autenticación y autorización** (JWT, sesiones, roles por actor) — obligatorio documentar (§8.2).
5. Definir **mecanismo de sincronización de inventario entre sucursales** (§8.2): ¿base de datos centralizada compartida, eventos, polling, websockets? Esta decisión es central porque el PDF la pide explícitamente como algo a justificar.
6. Decidir patrones de diseño a aplicar (Repository, Factory, CQRS, etc.) si aplica, y dejarlos anotados para documentarlos luego.
7. Redactar el documento de decisiones técnicas (ADR corto o sección en README) con la justificación de cada punto anterior.

**Por qué va aquí:** el modelo de datos (Fase 2) y la estructura de Docker (Fase 3) dependen directamente del stack elegido.

---

## Fase 2 — Modelado de Datos y Diagramas de Ingeniería (PDF §7, §12 paso 7)

1. **Diagrama Entidad-Relación (E-R)** completo: Producto, Sucursal, Usuario/Rol, Movimiento de Inventario, Orden de Compra, Proveedor, Venta, Transferencia (con sus estados), Envío/Logística, Unidad de Medida. Debe reflejar trazabilidad completa (fecha, responsable, motivo, cantidad — §3.1).
2. **Diagrama de casos de uso**: actores del §6.2 contra los módulos del §3.
3. **Diagramas de actividad/flujo** (mínimo obligatorio, §7.1):
   - Flujo de transferencia entre sucursales (solicitud → preparación → envío → recepción completa/parcial, §3.4).
   - Flujo de venta (validación de stock → registro → comprobante, §3.3).
4. **Diagrama de arquitectura**: capas (frontend, backend, base de datos), servicios Docker, y cómo se comunican.
5. Herramienta sugerida por el PDF: draw.io, Lucidchart, PlantUML o Mermaid. Recomendado usar Mermaid para poder versionarlos como texto en el repo.
6. Guardar todos los diagramas como archivos (o embebidos en el README) dentro de una carpeta `docs/diagramas/`.

**Por qué va aquí:** el diseño de tablas/entidades debe cerrarse antes de escribir migraciones o modelos en el backend (Fase 4), y el diagrama de arquitectura formaliza lo decidido en la Fase 1.

---

## Fase 3 — Infraestructura y Contenedorización (PDF §5, §12 paso 8)

1. Definir estructura de carpetas del repo: `Backend/`, `Frontend/`, `Database/` (ya existen vacías), más `docs/` para diagramas y documentación de IA.
2. Escribir `Dockerfile` para backend y para frontend.
3. Escribir `docker-compose.yml` que levante los 3 servicios (frontend, backend, base de datos) con red interna, variables de entorno y volúmenes necesarios.
4. Verificar que el proyecto completo se levante con **un solo comando** (`docker compose up`), sin pasos de configuración manual adicionales — requisito no negociable del PDF (§5, "Contenedorización").
5. Preparar script/seed de datos iniciales (sucursales de ejemplo, usuarios de cada rol, catálogo de productos base) para que el sistema sea evaluable inmediatamente tras el `up`.
6. Excluir del repo `.env`, `node_modules` y artefactos de build (§10, "Código fuente").

**Por qué va aquí:** conviene tener el esqueleto de contenedores listo antes de escribir mucho código de backend/frontend, para desarrollar ya dentro del entorno objetivo y evitar sorpresas de integración al final.

---

## Fase 4 — Backend: Implementación por Módulos en Orden de Dependencia (PDF §3, §12 paso 9)

Orden recomendado (cada módulo depende de datos que crea el anterior):

1. **Base: Usuarios, Roles y Sucursales** — no es un módulo explícito del PDF, pero es prerequisito de todo lo demás (autenticación, permisos por actor, multi-sucursal).
2. **Gestión de Inventario (CRUD completo)** (§3.1): catálogo de productos, ingreso/retiro con trazabilidad (fecha, responsable, motivo, cantidad), stock mínimo y alertas de reabastecimiento, múltiples unidades de medida, consulta de inventario de otras sucursales.
3. **Módulo de Compras** (§3.2): órdenes de compra a proveedores, condiciones (precio, descuentos, plazo de pago), actualización automática de inventario al confirmar recepción, histórico por proveedor/producto, costo promedio ponderado.
4. **Módulo de Ventas** (§3.3): registro de venta, asociación a sucursal/fecha/responsable, validación de stock antes de confirmar, descuentos y listas de precios, comprobante de venta.
5. **Transferencias entre Sucursales** (§3.4): ciclo completo — solicitud → preparación/confirmación de envío → registro de despacho (transportista, fecha estimada) → confirmación de recepción completa o parcial (con alerta y tratamiento de faltantes).
6. **Tiempos de Envío y Logística** (§3.5): tiempos estimados vs. reales, clasificación de rutas, estado de cada transferencia, reportes de cumplimiento logístico.
7. **Endpoints de Dashboard/Analítica** (§3.6): agregaciones para ventas del mes vs. meses anteriores, rotación de inventario, transferencias activas, productos por agotarse, comparativa entre sucursales (solo perfiles administrativos).

**Por qué este orden:** compras y ventas mueven inventario, así que el CRUD de inventario debe existir primero; transferencias necesitan inventario multi-sucursal ya funcionando; logística depende de que existan transferencias; el dashboard es una capa de lectura sobre todo lo anterior, por eso va al final del backend.

---

## Fase 5 — Frontend (PDF §8.1, §12 paso 10)

1. Definir estructura de rutas/vistas por rol (Administrador, Gerente de sucursal, Operador de inventario).
2. Pantallas de Inventario: catálogo propio, consulta de inventario de otras sucursales, formularios de ingreso/retiro.
3. Pantallas de Compras y Ventas: creación de órdenes de compra, registro de ventas con validación de stock en UI (reflejando la respuesta de la API, sin lógica de negocio propia).
4. Pantallas de Transferencias: solicitud, seguimiento de estado (en preparación, en tránsito, recibido, con faltantes), confirmación de recepción.
5. Pantalla de Logística: tiempos estimados vs. reales, estado por ruta.
6. Dashboard con gráficas/KPIs (§3.6): usar librería de charts, priorizar claridad visual sobre cantidad de gráficas.
7. Autenticación en frontend (login, manejo de token/sesión, rutas protegidas por rol).
8. Toda comunicación exclusivamente contra la API del backend (§8.1) — sin cálculos de negocio (costo promedio, validación de stock, etc.) en el cliente.

**Por qué va después del backend:** el frontend consume contratos de API que deben existir (aunque sea en versión mínima) antes de construir las pantallas sobre ellos.

---

## Fase 6 — Funcionalidad Adicional (PDF §4, §12 paso 11)

1. Elegir **al menos una** funcionalidad adicional de valor real. Opciones sugeridas por el PDF:
   - Sistema de alertas inteligentes (umbrales configurables, notificación in-app o email).
   - Predicción de demanda (regresión lineal o promedio móvil sobre histórico de ventas).
   - Gestión de proveedores (registro, asociación a productos, condiciones, tiempos de entrega).
   - Control de caducidad (fechas de vencimiento, alertas preventivas).
   - Auditoría y trazabilidad (quién/cuándo/por qué de cada acción sobre inventario).
   - Módulo de reportes exportables (PDF/Excel de movimientos, ventas o transferencias por rango de fechas).
2. Documentar por qué se eligió esa funcionalidad sobre las demás (relevancia para el negocio, complejidad vs. tiempo disponible).
3. Implementar backend + frontend de la funcionalidad elegida siguiendo el mismo estándar del resto del sistema.

**Por qué va aquí:** requiere que el núcleo (inventario/ventas/compras) ya exista, ya que casi todas las opciones dependen de datos históricos generados por esos módulos.

---

## Fase 7 — Uso de IA: Documentación Transversal (PDF §9)

Esto **no es una fase temporal aislada** sino un registro que se alimenta durante todas las fases anteriores. Al cierre del proyecto, consolidar en un documento dedicado:

1. Herramientas de IA usadas y en qué etapa (diseño de arquitectura, generación de código, tests, documentación, revisión de código, buenas prácticas — §9.1).
2. Ejemplos concretos de prompts usados y resultados obtenidos (capturas o fragmentos reales, no genéricos).
3. Evaluación crítica honesta: qué aportó la IA, qué hubo que ajustar a mano, dónde no sirvió.
4. Estimación del porcentaje de código/documentación generado con asistencia de IA.

**Recomendación práctica:** llevar un log corto (`docs/uso-ia.md`) desde la Fase 0, anotando cada uso relevante en el momento en que ocurre, en vez de reconstruirlo de memoria al final.

---

## Fase 8 — Testing

1. Pruebas unitarias de lógica crítica: cálculo de costo promedio ponderado, validación de stock antes de venta, reglas de transferencia (completa/parcial).
2. Pruebas de integración de los endpoints principales de cada módulo.
3. (Opcional, valorado) generación asistida por IA de estos tests, documentada en la sección de IA.

---

## Fase 9 — Documentación Final y Entregables (PDF §10, §12 paso 12)

1. **README completo**: descripción del proyecto, instrucciones de instalación (`docker compose up`), arquitectura, módulos implementados, decisiones de diseño y su justificación.
2. Verificar que los 4 diagramas obligatorios (casos de uso, actividad/flujo, arquitectura, E-R) estén embebidos o enlazados en el README.
3. Incluir la sección de uso de IA (Fase 7) como documento independiente o sección del README.
4. Revisar que el repositorio tenga historial de commits representativo del proceso (no un solo commit gigante).
5. Limpieza final: sin `.env`, sin `node_modules`, sin archivos temporales.
6. Repaso final contra la checklist de entregables del PDF (§10):
   - [ ] Repositorio GitHub público con estructura clara.
   - [ ] Código fuente (frontend + backend + scripts de BD) organizado y comentado.
   - [ ] `docker-compose.yml` funcional con un solo comando.
   - [ ] README completo.
   - [ ] Diagramas de ingeniería.
   - [ ] Sección de IA con evidencias y evaluación crítica.

---

## Resumen de dependencias (vista rápida)

```
Fase 0 (Requerimientos) → Fase 1 (Arquitectura/Stack) → Fase 2 (Datos/Diagramas)
        → Fase 3 (Docker) → Fase 4 (Backend por módulos) → Fase 5 (Frontend)
        → Fase 6 (Funcionalidad adicional) → Fase 8 (Testing) → Fase 9 (Documentación final)

Fase 7 (Uso de IA) corre en paralelo a todas, alimentándose desde la Fase 0.
```
