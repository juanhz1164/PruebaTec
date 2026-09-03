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

## 2. Etapas del desarrollo donde se usó IA

| Etapa | Uso | Impacto |
|---|---|---|
| **Diseño de arquitectura** | Se pidió a Claude analizar el PDF de requerimientos y producir un plan de trabajo por fases (`Requerimientos/Plan-de-Trabajo.md`) y un desglose de tareas listo para Trello (`Requerimientos/Tareas-Trello.md`), ambos con la justificación de por qué cada fase depende de la anterior. | Alto — este plan se siguió literalmente durante todo el desarrollo (Backend T31-T57, Frontend T58-T69 en este orden). |
| **Generación de código (backend)** | Implementación completa de los 6 módulos obligatorios: usuarios/roles/sucursales, inventario (CRUD + movimientos + stock mínimo + unidades alternativas), compras (con costo promedio ponderado), ventas (con validación de stock), transferencias (ciclo de 5 pasos), logística y dashboard — todo en capas (Controllers/Services/Repositories/DTOs/Models), con autenticación JWT y Swagger. | Alto — la mayoría del código de backend fue generado por Claude a partir de instrucciones incrementales módulo por módulo, revisado y corregido en el momento (ver §3 más abajo para ejemplos de correcciones). |
| **Generación de código (frontend)** | Implementación completa de la SPA en React/TypeScript: cliente API, contexto de autenticación, rutas protegidas por rol, y las 12 páginas de los 6 módulos (inventario propio/otras sucursales, movimientos, compras, ventas, transferencias, logística, dashboard con gráficas SVG), con diseño responsivo. | Alto — todas las páginas, componentes, tipos y clientes API del frontend fueron generados por Claude, verificando en cada paso `tsc --noEmit`, `oxlint` y `vite build`. |
| **Documentación técnica** | Este mismo documento, `docs/requerimientos.md`, `docs/decisiones-tecnicas.md`, los 4 diagramas obligatorios en `docs/diagramas/` (Mermaid) y el `README.md` raíz fueron redactados por Claude a partir de una auditoría del código real (no inventados de antemano) contra el PDF de requerimientos. | Alto. |
| **Revisión de código / auditoría de cumplimiento** | Se ejecutó una auditoría dedicada (agente en background) que releyó el PDF completo y comparó cada sección (§2-§10) contra el estado real del repositorio, para detectar qué faltaba antes de esta entrega — encontró que faltaban los diagramas, la documentación de decisiones técnicas, el log de IA, el README raíz y la funcionalidad adicional (§4). | Alto — sin esa auditoría explícita, estos huecos de documentación habrían pasado desapercibidos hasta la evaluación. |
| **Generación de tests** | No se generaron tests automatizados con IA en esta entrega — el módulo de Testing & QA (Trello T80-T83) queda pendiente. | Ninguno (por ahora). |
| **Consulta de buenas prácticas** | Se usó Claude para decidir convenciones puntuales sobre la marcha: p. ej. verificar accesibilidad de la paleta de colores del dashboard (contraste, daltonismo) usando un validador programático en vez de elegir colores "a ojo", y para decidir la forma correcta de envolver tablas HTML con scroll horizontal sin romper el layout en móvil. | Media. |

## 3. Ejemplos concretos de prompts y resultados

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

## 4. Evaluación crítica

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

## 5. Estimación del porcentaje generado con asistencia de IA

- **Código de backend**: ~95% generado por Claude Code, con dirección y revisión humana en
  cada módulo (aprobación de cada tool call, corrección de rumbo cuando fue necesario).
- **Código de frontend**: ~95% generado por Claude Code, verificado con `tsc`, `oxlint` y
  `vite build` después de cada cambio.
- **Documentación** (README, requerimientos, decisiones técnicas, diagramas, este
  documento): ~100% redactada por Claude Code, pero basada en una auditoría real del
  código existente (no contenido genérico ni inventado).
- **Scripts SQL de esquema y seed**: generados por Claude Code junto con los modelos del
  backend, en el mismo flujo de trabajo por capas.

En conjunto, la práctica totalidad del código y la documentación de este repositorio fue
producida con asistencia de Claude Code, bajo dirección, revisión y aprobación humana
continua en cada paso — consistente con el principio del PDF de que el uso de IA "no es
una señal de debilidad técnica, sino de madurez profesional" cuando se dirige y valida
correctamente.
