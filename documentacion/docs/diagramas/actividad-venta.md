# Diagrama de Actividad — Flujo de Venta

Cubre §3.3 del PDF: validación de stock → registro → comprobante. Corresponde a
`VentasController` / `VentaService` en el backend, con validación de UX espejo (no
autoritativa) en `Frontend/src/pages/VentasPage.tsx`.

```mermaid
flowchart TD
    Start([Inicio]) --> Captura["Operador captura líneas de venta:\nproducto, cantidad, descuento"]
    Captura --> ValidaUI{"UI: ¿cantidad ≤ stock\nvisible en pantalla?"}
    ValidaUI -- No --> MarcaError["Marca la línea en rojo\n(ayuda de UX, no bloquea el envío a la API)"]
    MarcaError --> Captura
    ValidaUI -- Sí --> Envia["POST /api/Ventas"]

    Envia --> ValidaStockBackend{"Backend: valida stock\ndisponible por línea"}
    ValidaStockBackend -- "Insuficiente" --> Rechaza["400 Bad Request\ncon detalle del error"]
    Rechaza --> MuestraError["Frontend muestra el mensaje\ntal cual lo devuelve la API"]
    MuestraError --> Captura

    ValidaStockBackend -- "Stock suficiente" --> CalculaPrecio["Por línea: si no se envía precio,\nusa costo promedio del inventario"]
    CalculaPrecio --> AplicaDescuento["Aplica descuento por línea\n(precio × cantidad × (1 - descuento%))"]
    AplicaDescuento --> RetiraStockVenta["Retira stock vendido\n(movimiento de inventario: Retiro,\nreferencia_tipo = venta)"]
    RetiraStockVenta --> GeneraComprobante["Genera comprobante:\nnúmero, subtotal, descuento total, total"]
    GeneraComprobante --> Persiste["Persiste Venta + VentaLineas"]
    Persiste --> Responde["201 Created con el comprobante"]
    Responde --> MuestraComprobante["Frontend muestra el comprobante\ny refresca el inventario visible"]
    MuestraComprobante --> End([Fin])
```

## Notas

- La validación de stock en el frontend (`stockPorProducto` en `VentasPage.tsx`) es
  puramente una ayuda de UX construida sobre el inventario ya cargado en pantalla — el
  backend (`VentaService`) es la única autoridad real y vuelve a validar de forma
  independiente antes de confirmar, cumpliendo la restricción §5 de "no lógica de negocio
  en el cliente".
- El precio unitario es opcional por línea: si no se envía (o es `0`), el backend usa el
  costo promedio del inventario de ese producto en esa sucursal como precio base
  (`CrearVentaLineaDto.PrecioUnitario: decimal?`).
- El retiro de stock y la generación del comprobante ocurren en la misma transacción del
  backend — si el stock no alcanza, no se genera ningún movimiento ni comprobante parcial.
