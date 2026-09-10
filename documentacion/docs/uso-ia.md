# Uso de Inteligencia Artificial en el Desarrollo

Sección exigida por §9 del PDF. Documenta las herramientas de IA usadas, en qué etapas, con
ejemplos concretos y una evaluación crítica honesta.

## 1. Herramienta utilizada

**Claude Code** (Anthropic), corriendo con el modelo Sonnet 5, integrado en terminal como
agente con acceso directo al repositorio (lectura/escritura de archivos, ejecución de
comandos de shell, y un servidor MCP de Trello para gestionar el tablero de tareas). No se
usaron otras herramientas de IA (Copilot, ChatGPT) en este proyecto — todo el desarrollo,
desde la definición inicial del plan hasta el código final, se hizo en sesiones de Claude
Code.

## 2. Log cronológico de uso (por commit)

Registro continuo del uso de Claude Code a lo largo del proyecto, reconstruido a partir del
historial real de commits (`git log`) — no es un recuento posterior aproximado, sino la
traza objetiva de cuándo se usó IA para qué, en qué etapa.

| Fecha | Commit | Etapa | Qué se hizo con IA |
|---|---|---|---|
| 2026-08-27 | `f632ff6` | Infraestructura | Scaffolding inicial del proyecto (estructura de carpetas Backend/Frontend/Database, Docker Compose base). |
| 2026-09-01 | `16f109c` | Backend / Base de datos | Modelos, controladores iniciales, contexto EF Core y scripts SQL de esquema (T15-T24). |
| 2026-09-03 | `2d9daa4`…`4a0d408` | Backend | Refactor a arquitectura por capas (Controllers/Services/Repositories) y los 6 módulos obligatorios completos: Usuarios/Sucursales, Inventario, Compras, Ventas, Transferencias, Logística, Dashboard, JWT (T31-T57). |
| 2026-09-03 | `3d09b36` | Frontend + Documentación | SPA completa en React/TypeScript (T58-T69) y primera versión de la documentación de ingeniería (§6-§10 del PDF). |
| 2026-09-03 – 2026-09-06 | `b05b36a`…`6de074a` | Frontend (UX) | Rediseño de login, reportes del mes, tema oscuro/claro, ajustes de UX en ventas/transferencias/dashboard. |
| 2026-09-07 | `4c77c8b` | Funcionalidad adicional | Módulo de flujo de personas (Visitas) — funcionalidad adicional del §4 del PDF — y corrección de zona horaria a Colombia. |
| 2026-09-07 | `58c89b9` | Frontend + Testing | Módulo de Administración, rediseños de UI y creación de la suite de tests unitarios/integración (T80-T83). |
| 2026-09-08 | `d00b9dc` | Backend + Frontend | Permisos por sucursal y colores de estado en Compras. |
| 2026-09-09 | `201ccd2` | Frontend (layout) | Corrección iterativa del layout del Dashboard (dona de "Ventas por mes", "Productos más vendidos", "Flujo de personas") — sesión larga de depuración real en navegador, incluyendo diagnóstico de un problema de sincronización del contenedor Docker de desarrollo (ver Ejemplo 4 en §3). |
| 2026-09-09 | *(este commit)* | Documentación final | Auditoría del PDF y el tablero de Trello (T73-T88): completar `requerimientos.md` con la funcionalidad adicional, ampliar este log, actualizar el README y limpiar el repositorio. |

## 3. Etapas del desarrollo donde se usó IA

| Etapa | Uso | Impacto |
|---|---|---|
| **Diseño de arquitectura** | Se pidió a Claude analizar el PDF de requerimientos y producir un plan de trabajo por fases (`../Requerimientos/Plan-de-Trabajo.md`) y un desglose de tareas listo para Trello (`../Requerimientos/Tareas-Trello.md`), ambos con la justificación de por qué cada fase depende de la anterior. | Alto — este plan se siguió literalmente durante todo el desarrollo (Backend T31-T57, Frontend T58-T69 en este orden). |
| **Generación de código (backend)** | Implementación completa de los 6 módulos obligatorios: usuarios/roles/sucursales, inventario (CRUD + movimientos + stock mínimo + unidades alternativas), compras (con costo promedio ponderado), ventas (con validación de stock), transferencias (ciclo de 5 pasos), logística y dashboard — todo en capas (Controllers/Services/Repositories/DTOs/Models), con autenticación JWT y Swagger. | Alto — la mayoría del código de backend fue generado por Claude a partir de instrucciones incrementales módulo por módulo, revisado y corregido en el momento (ver §4 más abajo para ejemplos de correcciones). |
| **Generación de código (frontend)** | Implementación completa de la SPA en React/TypeScript: cliente API, contexto de autenticación, rutas protegidas por rol, y las 12 páginas de los 6 módulos (inventario propio/otras sucursales, movimientos, compras, ventas, transferencias, logística, dashboard con gráficas SVG), con diseño responsivo. | Alto — todas las páginas, componentes, tipos y clientes API del frontend fueron generados por Claude, verificando en cada paso `tsc --noEmit`, `oxlint` y `vite build`. |
| **Documentación técnica** | Este mismo documento, `requerimientos.md`, `decisiones-tecnicas.md`, los 4 diagramas obligatorios en `diagramas/` (Mermaid) y el `README.md` raíz fueron redactados por Claude a partir de una auditoría del código real (no inventados de antemano) contra el PDF de requerimientos. | Alto. |
| **Revisión de código / auditoría de cumplimiento** | Se ejecutaron dos auditorías dedicadas contra el PDF completo (§2-§10) y el tablero de Trello: la primera detectó que faltaban los diagramas, `decisiones-tecnicas.md`, el log de IA, el README raíz y la funcionalidad adicional (§4) — todo se completó en el commit `3d09b36`; la segunda (T73-T88, este mismo commit) detectó que la funcionalidad adicional (Visitas) y la suite de tests, aunque ya implementadas en código, no estaban reflejadas en la documentación. | Alto — sin esas auditorías explícitas, estos huecos de documentación habrían pasado desapercibidos hasta la evaluación. |
| **Generación de tests** | Suite de tests unitarios (costo promedio ponderado, validación de stock en ventas, reglas de transferencia) y de integración (endpoints de Inventario, Compras, Ventas, Transferencias, Dashboard) con xUnit, en `InventarioMultiSucursal.Api.Tests/` (T80-T83, commit `58c89b9`). | Alto — 72 pruebas, todas en verde (`dotnet test InventarioMultiSucursal.Api.Tests`). |
| **Consulta de buenas prácticas** | Se usó Claude para decidir convenciones puntuales sobre la marcha: p. ej. verificar accesibilidad de la paleta de colores del dashboard (contraste, daltonismo) usando un validador programático en vez de elegir colores "a ojo", y para decidir la forma correcta de envolver tablas HTML con scroll horizontal sin romper el layout en móvil. | Media. |

## 4. Ejemplos concretos de prompts y resultados

### Ejemplo 1 — Arranque del frontend
> *"estmos haciendo una prueba tecnica, que me haz ayuda, y hemos lleano un tablreo entrello ya hizimos el backen nos falta el front entonces sigamos con lkas tareas"*

Resultado: Claude leyó el tablero de Trello real (vía MCP) para identificar el estado
exacto de las tareas (Backend 100% hecho, Frontend con 12 tarjetas pendientes), inspeccionó
el scaffold de Vite/React ya existente y el contrato de la API (`AuthController`,
`Roles.cs`) antes de escribir una sola línea, y propuso arrancar por login + rutas
protegidas (T58-T59) como base de todo lo demás — no se limitó a "generar una app React
genérica", sino que ató el trabajo a los contratos reales del backend ya construido.

### Ejemplo 2 — Corrección durante la implementación
Durante la implementación del router (`App.tsx`), el primer borrador incluía
`<Route path="*" element={<Navigate to="/" replace />} />` seguido de una ruta `/404`
inalcanzable. Al revisar el propio código generado, se detectó que el catch-all nunca
llegaría a mostrar la página 404 y que redirigir todo error de navegación a `/` ocultaría
bugs reales — se corrigió a que el catch-all renderizara directamente `<NotFoundPage />`.
Este tipo de autocorrección ocurrió en varios puntos (ver también el CORS faltante en el
backend, detectado antes de que el login del frontend pudiera fallar en runtime).

### Ejemplo 3 — Delegación a subagentes para trabajo mecánico
Para envolver todas las tablas HTML existentes en contenedores de scroll horizontal
(diseño responsivo, T69) se lanzó un subagente en background con instrucciones explícitas
de qué archivos tocar y qué patrón aplicar, para no consumir contexto de la conversación
principal en una tarea repetitiva de bajo riesgo. El subagente devolvió un resumen
verificable (tsc/oxlint/build limpios) que se validó de nuevo manualmente antes de continuar.

### Ejemplo 4 — Diagnóstico erróneo por asumir el entorno, corregido con auditoría explícita
Durante la corrección del layout del Dashboard (dona de "Ventas por mes", tarjeta
"Registrar visita" en Visitas), varios cambios de CSS parecían no tener ningún efecto
visual pese a que el código sí se había editado correctamente en disco. La primera
hipótesis (recarga de caché del navegador) era incorrecta. Ante la insistencia del usuario
de que "no había cambiado nada", se hizo una auditoría explícita del entorno en vez de
seguir iterando a ciegas sobre el CSS: se comparó el hash SHA-256 del archivo en el host
contra el que veía el proceso Vite real, se identificó que la app corría dentro de un
contenedor Docker (`inventario_frontend`) con bind mount al código, y se comprobó con una
prueba de humo (un texto de debug temporal insertado y verificado en pantalla) que el
contenedor no siempre recogía las escrituras del host sin un `docker restart`. A partir de
ahí, cada cambio se verificó reiniciando el contenedor y confirmando el hash antes de darlo
por aplicado — evitando seguir "arreglando" código que ya estaba bien mientras el problema
real era de sincronización del entorno, no de CSS.

## 5. Evaluación crítica

**Qué aportó la IA:**
- Velocidad: los 6 módulos backend y las 12 páginas de frontend se construyeron en un
  tiempo muy inferior al que tomaría escribirlos a mano, sin sacrificar la separación en
  capas ni la trazabilidad exigida por el PDF.
- Consistencia: al generar todos los módulos con el mismo agente, los patrones (DTOs,
  manejo de errores de API, estructura de páginas React) se mantuvieron uniformes entre
  módulo y módulo, en vez de derivar según quién escribiera cada parte.
- Detección de huecos: la auditoría final contra el PDF (§9 de este mismo documento, meta)
  encontró documentación y funcionalidad faltante que fácilmente se habría pasado por alto
  bajo presión de tiempo.

**Qué fue necesario ajustar manualmente / dirigir explícitamente:**
- Las decisiones de producto y alcance (qué campos exponer en un DTO, si validar stock en
  el cliente además del servidor, qué CSS reusar vs. crear) requirieron indicaciones
  explícitas del desarrollador en cada paso — la IA no tomó esas decisiones de forma
  autónoma sin dirección.
- La verificación de build/lint/tipos se ejecutó explícitamente después de cada cambio
  (nunca se asumió que el código generado compilaba); esto detectó y corrigió errores de
  tipos varias veces durante el desarrollo del frontend.
- La paleta de colores del dashboard se validó con una herramienta externa (script de
  validación de contraste/daltonismo) en vez de confiar en el criterio estético de la IA a
  ojo — la primera propuesta de colores falló la validación y tuvo que ajustarse.

**Dónde no fue tan útil:**
- Para las decisiones de arquitectura de alto nivel que ya estaban fuertemente
  condicionadas por el PDF (3 capas, JWT, MySQL relacional dado el modelo de datos), el
  espacio real de "exploración creativa" de la IA fue limitado — el valor estuvo más en
  ejecutar esas decisiones consistentemente que en descubrirlas.

## 6. Estimación del porcentaje generado con asistencia de IA

- **Código de backend**: ~95% generado por Claude Code, con dirección y revisión humana en
  cada módulo (aprobación de cada tool call, corrección de rumbo cuando fue necesario).
- **Código de frontend**: ~95% generado por Claude Code, verificado con `tsc`, `oxlint` y
  `vite build` después de cada cambio.
- **Documentación** (README, requerimientos, decisiones técnicas, diagramas, este
  documento): ~100% redactada por Claude Code, pero basada en una auditoría real del
  código existente (no contenido genérico ni inventado).
- **Scripts SQL de esquema y seed**: generados por Claude Code junto con los modelos del
  backend, en el mismo flujo de trabajo por capas.
- **Tests** (72 pruebas unitarias e integración en `InventarioMultiSucursal.Api.Tests/`):
  ~90% generados por Claude Code, con revisión humana de qué casos de negocio cubrir
  (costo promedio, validación de stock, reglas de transferencia).

En conjunto, la práctica totalidad del código y la documentación de este repositorio fue
producida con asistencia de Claude Code, bajo dirección, revisión y aprobación humana
continua en cada paso — consistente con el principio del PDF de que el uso de IA "no es
una señal de debilidad técnica, sino de madurez profesional" cuando se dirige y valida
correctamente.
