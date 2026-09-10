# Diagrama de Actividad — Flujo de Transferencia entre Sucursales

Cubre el ciclo completo descrito en §3.4 del PDF: solicitud → preparación → envío →
recepción completa o parcial. Corresponde a `TransferenciasController` /
`TransferenciaService` en el backend.

```mermaid
flowchart TD
    Start([Inicio]) --> Solicitar["Sucursal destino (u Admin) solicita\nproducto + cantidad a sucursal origen"]
    Solicitar --> EstadoSolicitada["Estado: Solicitada"]

    EstadoSolicitada --> RevisaOrigen{"Sucursal origen\nrevisa disponibilidad"}
    RevisaOrigen -- "Gerente/Admin: Preparar" --> EstadoPreparacion["Estado: EnPreparacion"]
    RevisaOrigen -- "Cancelar" --> EstadoCancelada["Estado: Cancelada"]

    EstadoPreparacion --> AjustaCantidad["Confirma o ajusta cantidad a enviar\npor línea"]
    AjustaCantidad --> RegistraEnvio["Registrar envío:\ntransportista, ruta, prioridad,\ncosto, fecha estimada de llegada"]
    RegistraEnvio --> RetiraStock["Retira stock de sucursal origen\n(movimiento de inventario: Retiro)"]
    RetiraStock --> EstadoTransito["Estado: EnTransito"]

    EstadoTransito --> Recibe{"Sucursal destino\nconfirma recepción por línea"}

    Recibe -- "cantidad_recibida = cantidad_enviada\n(todas las líneas)" --> EstadoCompleta["Estado: RecibidaCompleta"]
    Recibe -- "cantidad_recibida < cantidad_enviada\n(alguna línea)" --> EstadoParcial["Estado: RecibidaParcial"]

    EstadoCompleta --> IngresaStockCompleto["Ingresa stock recibido a\nsucursal destino (movimiento: Ingreso)"]
    EstadoParcial --> IngresaStockParcial["Ingresa stock recibido a\nsucursal destino (movimiento: Ingreso)"]
    EstadoParcial --> CalculaFaltante["Calcula faltante por línea\n(cantidad_enviada - cantidad_recibida)"]
    CalculaFaltante --> AlertaFaltante["Expone faltante para seguimiento\n(reenvío, ajuste o reclamación)"]

    IngresaStockCompleto --> End([Fin])
    AlertaFaltante --> End
    EstadoCancelada --> End
```

## Notas

- Los estados persisten en `transferencias.estado` (`ENUM`) y determinan qué acción es
  válida en cada momento — el backend rechaza transiciones inválidas (p. ej. no se puede
  "enviar" una transferencia que sigue en `Solicitada`).
- El retiro de stock ocurre al **registrar el envío** (no antes), y el ingreso ocurre al
  **confirmar la recepción** — el stock "en tránsito" no está disponible ni en origen ni en
  destino durante ese intervalo, lo cual se refleja en el dashboard como "cantidad total en
  tránsito" (`TransferenciaActivaDto.CantidadTotalEnTransito`).
- La decisión de tratamiento ante un faltante (reenvío, ajuste, reclamación) queda como una
  decisión operativa fuera del sistema; el sistema solo calcula y expone el faltante para
  que el gerente decida.
