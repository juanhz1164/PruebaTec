# Services — en general

Esta carpeta es el **cerebro del negocio**: aquí es donde el sistema realmente "piensa" y
decide qué es correcto y qué no.

Cuando alguien pide hacer algo (por ejemplo, "vender 10 unidades de este producto"), es
aquí donde se revisa: ¿hay suficiente stock? ¿qué descuento le corresponde? ¿en qué orden
tienen que pasar las cosas para que no se dañe nada si algo falla a mitad de camino?

Algunos ejemplos de las reglas que viven aquí:

- **Ventas** — no se puede vender más de lo que hay en stock; si se compran muchas unidades
  se aplica un descuento automático por volumen.
- **Compras** — al recibir mercancía de un proveedor, se recalcula el costo promedio del
  producto en inventario.
- **Transferencias entre sucursales** — sigue un orden estricto: se solicita, se prepara,
  se envía, y solo la sucursal que la recibe puede confirmar que llegó. Una vez confirmada
  la recepción, la transferencia queda cerrada para siempre — no puede "revivir" ni volver
  a un paso anterior.
- **Logística** — calcula si una entrega llegó a tiempo o con retraso, comparando la fecha
  estimada contra la fecha real de recepción.
- **Visitas** — registra cuántas personas entran a cada sucursal, siempre con la fecha y
  hora que pone el propio sistema (nunca algo que el usuario pueda inventar).

En resumen: si algo en el sistema calcula, valida o decide, está en esta carpeta.
