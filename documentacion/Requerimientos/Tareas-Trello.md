# Tareas para Tablero de Trello — Sistema de Inventario Multi-Sucursal

Desglose tarea por tarea, listo para copiar como tarjetas de Trello. Estructura sugerida de **listas** (columnas) y, dentro de cada una, las **tarjetas** con: descripción, checklist y criterios de aceptación (Definition of Done). Las etiquetas sugeridas (`Backend`, `Frontend`, `DB`, `Docs`, `Infra`, `IA`) se pueden crear como labels de Trello.

Listas sugeridas del tablero:
1. Backlog
2. Documentación & Análisis
3. Arquitectura & Diseño
4. Base de Datos
5. Infraestructura (Docker)
6. Backend
7. Frontend
8. Funcionalidad Adicional
9. Uso de IA
10. Testing & QA
11. Documentación Final
12. Done

---

## Lista: Documentación & Análisis

### T1. Redactar requerimientos funcionales
- **Descripción:** Documentar qué debe hacer el sistema, cubriendo los 6 módulos del PDF (inventario, compras, ventas, transferencias, logística, dashboard).
- **Checklist:**
  - [ ] Listar funcionalidades de cada módulo (§3 del PDF).
  - [ ] Revisar que cada capacidad específica quede como requerimiento individual.
- **Criterio de aceptación:** Documento revisable que cubre el 100% de las capacidades listadas en §3 del PDF.
- **Etiqueta:** `Docs`

### T2. Redactar requerimientos no funcionales
- **Descripción:** Rendimiento, seguridad, escalabilidad, usabilidad, sincronización near-real-time entre sucursales.
- **Checklist:**
  - [ ] Definir expectativa de tiempo de sincronización entre sucursales.
  - [ ] Definir requisitos de seguridad (autenticación, autorización, cifrado de datos sensibles).
  - [ ] Definir requisitos de usabilidad por rol.
- **Criterio de aceptación:** Cada requerimiento no funcional es medible o verificable.
- **Etiqueta:** `Docs`

### T3. Definir restricciones técnicas y de negocio
- **Descripción:** Documentar las restricciones obligatorias: 3 capas, API exclusiva, Docker Compose de un comando, stack libre justificado.
- **Etiqueta:** `Docs`

### T4. Definir supuestos y dependencias del sistema
- **Descripción:** Ej. cantidad de sucursales de prueba, alcance real vs. mock de integración con ERP externo.
- **Etiqueta:** `Docs`

### T5. Definir actores y responsabilidades (casos de uso)
- **Descripción:** Administrador general, Gerente de sucursal, Operador de inventario, Sistema externo (opcional). Documentar responsabilidades de cada uno (tabla §6.2 del PDF).
- **Criterio de aceptación:** Tabla de actores con responsabilidades claras, usada luego para diseñar roles/permisos.
- **Etiqueta:** `Docs`

### T6. Redactar historias de usuario clave
- **Descripción:** Incluir mínimo las 3 historias sugeridas por el PDF (§6.3) más historias adicionales por módulo.
- **Checklist:**
  - [ ] Historia: ingreso de producto con costo promedio ponderado.
  - [ ] Historia: dashboard comparativo de ventas (mes actual vs. 3 anteriores).
  - [ ] Historia: solicitud de transferencia con nivel de urgencia.
  - [ ] Historias adicionales para compras, ventas, logística.
- **Etiqueta:** `Docs`

---

## Lista: Arquitectura & Diseño

### T7. Elegir y justificar lenguaje/framework de backend
- **Descripción:** Documentar por qué se elige (ej. Node/NestJS, Python/Django, .NET, etc.) en relación al problema (concurrencia, transacciones, multi-sucursal).
- **Etiqueta:** `Backend`, `Docs`

### T8. Elegir y justificar motor de base de datos
- **Descripción:** Relacional vs. NoSQL, justificado por el modelo de datos con relaciones fuertes.
- **Etiqueta:** `DB`, `Docs`

### T9. Elegir y justificar framework de frontend
- **Descripción:** React/Vue/Angular u otro, como SPA consumidora de API.
- **Etiqueta:** `Frontend`, `Docs`

### T10. Diseñar estrategia de autenticación y autorización
- **Descripción:** Definir mecanismo (JWT/sesiones) y modelo de roles/permisos alineado a los actores de T5.
- **Criterio de aceptación:** Diagrama o tabla de permisos por rol y endpoint.
- **Etiqueta:** `Backend`, `Docs`

### T11. Diseñar mecanismo de sincronización de inventario entre sucursales
- **Descripción:** Decidir y justificar el enfoque (BD centralizada compartida, eventos, polling, websockets) para visibilidad near-real-time entre nodos.
- **Criterio de aceptación:** Documento de decisión técnica explicando trade-offs.
- **Etiqueta:** `Backend`, `DB`, `Docs`

### T12. Definir patrones de diseño a utilizar
- **Descripción:** Repository, Factory, CQRS u otros, justificando dónde y por qué se aplican.
- **Etiqueta:** `Backend`, `Docs`

### T13. Diagrama de arquitectura del sistema
- **Descripción:** Vista técnica con capas (frontend, backend, BD), servicios Docker y su comunicación.
- **Herramienta sugerida:** Mermaid, draw.io, Lucidchart o PlantUML.
- **Criterio de aceptación:** Diagrama exportado como imagen o archivo versionable en `docs/diagramas/`.
- **Etiqueta:** `Docs`

### T14. Diagrama de casos de uso
- **Descripción:** Actores (T5) vs. módulos funcionales (§3 del PDF).
- **Etiqueta:** `Docs`

---

## Lista: Base de Datos

### T15. Modelar entidades principales
- **Descripción:** Producto, Sucursal, Usuario/Rol, Unidad de Medida.
- **Etiqueta:** `DB`

### T16. Modelar entidades de movimientos de inventario
- **Descripción:** Modelo de ingreso/retiro con fecha, responsable, motivo, cantidad (trazabilidad completa, §3.1).
- **Etiqueta:** `DB`

### T17. Modelar entidades de compras
- **Descripción:** Orden de compra, Proveedor, línea de compra (precio unitario, descuento, plazo de pago).
- **Etiqueta:** `DB`

### T18. Modelar entidades de ventas
- **Descripción:** Venta, línea de venta, lista de precios, descuentos.
- **Etiqueta:** `DB`

### T19. Modelar entidades de transferencias y logística
- **Descripción:** Transferencia (con estados: solicitada, en preparación, en tránsito, recibida completa/parcial), envío, ruta, transportista, tiempos estimado/real.
- **Etiqueta:** `DB`

### T20. Diagrama Entidad-Relación (E-R) completo
- **Descripción:** Consolidar T15–T19 en un único diagrama E-R con todas las relaciones.
- **Criterio de aceptación:** Diagrama exportado en `docs/diagramas/`, cubre todas las entidades usadas por el backend.
- **Etiqueta:** `DB`, `Docs`

### T21. Diagrama de actividad: flujo de transferencia entre sucursales
- **Descripción:** Solicitud → preparación → envío → recepción completa/parcial (§3.4).
- **Etiqueta:** `Docs`

### T22. Diagrama de actividad: flujo de venta
- **Descripción:** Validación de stock → registro → comprobante (§3.3).
- **Etiqueta:** `Docs`

### T23. Scripts de migración / creación de esquema
- **Descripción:** Migraciones versionadas para crear el esquema definido en T15–T19.
- **Etiqueta:** `DB`

### T24. Script de datos semilla (seed)
- **Descripción:** Sucursales de ejemplo, usuarios por rol, catálogo de productos base, proveedores de ejemplo.
- **Criterio de aceptación:** Al levantar el sistema con Docker, hay datos suficientes para evaluar todos los módulos sin carga manual.
- **Etiqueta:** `DB`

---

## Lista: Infraestructura (Docker)

### T25. Definir estructura de carpetas del repositorio
- **Descripción:** Confirmar/organizar `Backend/`, `Frontend/`, `Database/`, `docs/`.
- **Etiqueta:** `Infra`

### T26. Dockerfile de backend
- **Etiqueta:** `Infra`, `Backend`

### T27. Dockerfile de frontend
- **Etiqueta:** `Infra`, `Frontend`

### T28. docker-compose.yml (orquestación completa)
- **Descripción:** Servicios de frontend, backend y base de datos, red interna, variables de entorno, volúmenes.
- **Criterio de aceptación:** `docker compose up` levanta todo el sistema con un solo comando, sin configuración manual adicional (requisito obligatorio, §5).
- **Etiqueta:** `Infra`

### T29. Variables de entorno y plantilla `.env.example`
- **Descripción:** Documentar variables necesarias sin exponer secretos reales; excluir `.env` real del repo.
- **Etiqueta:** `Infra`

### T30. Verificación end-to-end de arranque limpio
- **Descripción:** Probar en limpio (`docker compose down -v && docker compose up`) que el sistema arranca sin pasos manuales.
- **Etiqueta:** `Infra`

---

## Lista: Backend

> Orden de implementación por dependencia: primero autenticación/sucursales, luego inventario, luego compras/ventas, luego transferencias/logística, y al final los endpoints de dashboard.

### T31. Módulo base: usuarios, roles y sucursales
- **Descripción:** CRUD de usuarios y sucursales, login y emisión de token, middleware de autorización por rol.
- **Criterio de aceptación:** Los 3 roles principales (Administrador, Gerente de sucursal, Operador) pueden autenticarse y reciben permisos distintos.
- **Etiqueta:** `Backend`

### T32. Inventario: CRUD de productos y catálogo por sucursal
- **Descripción:** Visualizar catálogo propio, consultar inventario de otras sucursales.
- **Etiqueta:** `Backend`

### T33. Inventario: registro de ingresos y retiros con trazabilidad
- **Descripción:** Cada movimiento registra fecha, responsable, motivo, cantidad (compras, devoluciones, ajustes, ventas, mermas).
- **Etiqueta:** `Backend`

### T34. Inventario: stock mínimo y alertas de reabastecimiento
- **Etiqueta:** `Backend`

### T35. Inventario: gestión de múltiples unidades de medida por producto
- **Etiqueta:** `Backend`

### T36. Compras: CRUD de órdenes de compra a proveedores
- **Descripción:** Precio unitario, descuentos, plazo de pago.
- **Etiqueta:** `Backend`

### T37. Compras: actualización automática de inventario al confirmar recepción
- **Etiqueta:** `Backend`

### T38. Compras: histórico por proveedor y por producto
- **Etiqueta:** `Backend`

### T39. Compras: cálculo de costo promedio ponderado
- **Descripción:** Lógica crítica de negocio — debe recalcularse en cada ingreso de compra.
- **Etiqueta:** `Backend`

### T40. Ventas: registro de transacción de venta
- **Descripción:** Producto, cantidad, precio, sucursal, fecha, responsable.
- **Etiqueta:** `Backend`

### T41. Ventas: validación de stock antes de confirmar
- **Etiqueta:** `Backend`

### T42. Ventas: descuentos y listas de precios
- **Etiqueta:** `Backend`

### T43. Ventas: generación de comprobante/registro consultable
- **Etiqueta:** `Backend`

### T44. Transferencias: solicitud de transferencia
- **Descripción:** Sucursal destino o administrador genera solicitud (producto, cantidad, origen).
- **Etiqueta:** `Backend`

### T45. Transferencias: preparación y confirmación de envío
- **Descripción:** Sucursal origen revisa disponibilidad, confirma/ajusta cantidad, registra despacho con fecha estimada y transportista.
- **Etiqueta:** `Backend`

### T46. Transferencias: confirmación de recepción completa
- **Descripción:** Actualiza automáticamente el inventario de la sucursal destino.
- **Etiqueta:** `Backend`

### T47. Transferencias: confirmación de recepción parcial
- **Descripción:** Registrar diferencia (faltantes), generar alerta, definir tratamiento (reenvío, ajuste, reclamación).
- **Etiqueta:** `Backend`

### T48. Logística: registro de tiempos estimados vs. reales
- **Etiqueta:** `Backend`

### T49. Logística: clasificación de rutas (prioridad, costo, tiempo)
- **Etiqueta:** `Backend`

### T50. Logística: estado de transferencias en curso
- **Descripción:** Estados: en preparación, en tránsito, recibido, con faltantes.
- **Etiqueta:** `Backend`

### T51. Logística: reportes de cumplimiento por sucursal y ruta
- **Etiqueta:** `Backend`

### T52. Dashboard: endpoint de ventas mes actual vs. anteriores
- **Etiqueta:** `Backend`

### T53. Dashboard: endpoint de rotación de inventario y demanda alta/baja
- **Etiqueta:** `Backend`

### T54. Dashboard: endpoint de transferencias activas y su impacto
- **Etiqueta:** `Backend`

### T55. Dashboard: endpoint de productos próximos a agotarse
- **Etiqueta:** `Backend`

### T56. Dashboard: endpoint comparativo entre sucursales (solo perfil administrativo)
- **Etiqueta:** `Backend`

### T57. Documentación de la API (OpenAPI/Swagger o equivalente)
- **Etiqueta:** `Backend`, `Docs`

---

## Lista: Frontend

### T58. Login y manejo de sesión/token
- **Etiqueta:** `Frontend`

### T59. Enrutamiento protegido por rol
- **Etiqueta:** `Frontend`

### T60. Vista de catálogo de inventario propio
- **Etiqueta:** `Frontend`

### T61. Vista de consulta de inventario de otras sucursales
- **Etiqueta:** `Frontend`

### T62. Formulario de ingreso/retiro de producto
- **Etiqueta:** `Frontend`

### T63. Vista y formulario de órdenes de compra
- **Etiqueta:** `Frontend`

### T64. Vista de registro de venta con validación de stock (UI)
- **Descripción:** Refleja la respuesta de la API; no implementa lógica de negocio propia.
- **Etiqueta:** `Frontend`

### T65. Vista de solicitud y seguimiento de transferencias
- **Descripción:** Incluye estados visuales (en preparación, en tránsito, recibido, con faltantes).
- **Etiqueta:** `Frontend`

### T66. Vista de confirmación de recepción (completa/parcial)
- **Etiqueta:** `Frontend`

### T67. Vista de logística (tiempos estimados vs. reales, rutas)
- **Etiqueta:** `Frontend`

### T68. Dashboard con gráficas y KPIs
- **Descripción:** Ventas comparativas, rotación de inventario, alertas de reabastecimiento, comparativa entre sucursales.
- **Etiqueta:** `Frontend`

### T69. Diseño responsivo general
- **Etiqueta:** `Frontend`

---

## Lista: Funcionalidad Adicional

### T70. Seleccionar y justificar la funcionalidad adicional a implementar
- **Descripción:** Elegir entre: alertas inteligentes, predicción de demanda, gestión de proveedores, control de caducidad, auditoría y trazabilidad, o reportes exportables (§4 del PDF). Documentar por qué se elige sobre las demás.
- **Etiqueta:** `Docs`

### T71. Backend de la funcionalidad adicional elegida
- **Etiqueta:** `Backend`

### T72. Frontend de la funcionalidad adicional elegida
- **Etiqueta:** `Frontend`

---

## Lista: Uso de IA

### T73. Crear log continuo de uso de IA (`docs/uso-ia.md`)
- **Descripción:** Registrar desde el inicio del proyecto cada uso relevante: herramienta, etapa, prompt usado, resultado.
- **Etiqueta:** `IA`, `Docs`

### T74. Documentar uso de IA en diseño de arquitectura
- **Etiqueta:** `IA`

### T75. Documentar uso de IA en generación de código (CRUDs, endpoints)
- **Etiqueta:** `IA`

### T76. Documentar uso de IA en generación de tests
- **Etiqueta:** `IA`

### T77. Documentar uso de IA en documentación técnica (README, docstrings)
- **Etiqueta:** `IA`

### T78. Documentar uso de IA en revisión de código
- **Etiqueta:** `IA`

### T79. Redactar evaluación crítica final del uso de IA
- **Descripción:** Qué aportó, qué se ajustó manualmente, dónde no fue útil, estimación de % de código/documentación generado con IA.
- **Etiqueta:** `IA`, `Docs`

---

## Lista: Testing & QA

### T80. Tests unitarios: costo promedio ponderado
- **Etiqueta:** `Backend`

### T81. Tests unitarios: validación de stock en ventas
- **Etiqueta:** `Backend`

### T82. Tests unitarios: reglas de transferencia (completa/parcial)
- **Etiqueta:** `Backend`

### T83. Tests de integración de endpoints principales
- **Descripción:** Cubrir al menos inventario, ventas, compras y transferencias.
- **Etiqueta:** `Backend`

---

## Lista: Documentación Final

### T84. Redactar README completo
- **Descripción:** Descripción del proyecto, instalación (`docker compose up`), arquitectura, módulos implementados, decisiones de diseño y su justificación.
- **Etiqueta:** `Docs`

### T85. Embeber/enlazar los 4 diagramas obligatorios en el README
- **Descripción:** Casos de uso, actividad/flujo, arquitectura, E-R.
- **Etiqueta:** `Docs`

### T86. Incluir sección/documento de uso de IA en el repositorio
- **Etiqueta:** `Docs`, `IA`

### T87. Limpieza final del repositorio
- **Descripción:** Sin `.env`, sin `node_modules`, sin archivos temporales; estructura de carpetas clara.
- **Etiqueta:** `Infra`

### T88. Revisión final contra checklist de entregables del PDF (§10)
- **Checklist:**
  - [ ] Repositorio GitHub público con estructura clara.
  - [ ] Código fuente organizado y comentado (frontend, backend, scripts BD).
  - [ ] `docker-compose.yml` funcional con un solo comando.
  - [ ] README completo.
  - [ ] Diagramas de ingeniería completos.
  - [ ] Sección de IA con evidencias y evaluación crítica.
- **Etiqueta:** `Docs`

---

## Notas para armar el tablero en Trello

- Cada `T#` de este documento = una tarjeta. El título sugerido de la tarjeta es el texto después del número (ej. "Inventario: CRUD de productos y catálogo por sucursal").
- El contenido bajo **Descripción** va en la descripción de la tarjeta; el **Checklist** como checklist nativo de Trello; el **Criterio de aceptación** puede ir al final de la descripción o como último ítem del checklist.
- Las **Etiquetas** sugeridas mapean directo a labels de Trello: `Backend`, `Frontend`, `DB`, `Infra`, `Docs`, `IA`.
- Orden recomendado de listas de izquierda a derecha según el flujo de trabajo: Backlog → Documentación & Análisis → Arquitectura & Diseño → Base de Datos → Infraestructura → Backend → Frontend → Funcionalidad Adicional → Uso de IA (en paralelo) → Testing & QA → Documentación Final → Done.
