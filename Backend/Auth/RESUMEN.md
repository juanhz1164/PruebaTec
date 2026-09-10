# Auth — en general

Aquí solo se definen los **nombres de los roles** que existen en el sistema:
Administrador General, Gerente de Sucursal y Operador de Inventario.

Estos nombres se usan en todo el backend para decidir quién puede hacer qué — por ejemplo,
solo un Administrador puede crear otra sucursal, y solo el Gerente de una sucursal puede
preparar y enviar una transferencia que sale de ella.

No hay lógica de inicio de sesión aquí (eso vive en `Services/`) — esta carpeta es solo el
"catálogo de roles" que el resto del sistema consulta.
