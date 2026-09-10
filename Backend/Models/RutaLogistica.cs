namespace InventarioMultiSucursal.Api.Models;

// Configuración de logística por par origen→destino: de aquí se autocompletan
// transportista/costo/tiempo estimado al registrar el envío de una
// transferencia (en vez de que el Gerente los invente cada vez). El costo y
// tiempo REALES usados quedan guardados en la transferencia (Transferencia.
// CostoEnvio/FechaEstimadaLlegada) — esta tabla es solo la configuración de
// referencia, no un histórico.
public class RutaLogistica
{
    public int Id { get; set; }
    public int SucursalOrigenId { get; set; }
    public int SucursalDestinoId { get; set; }
    public string Transportista { get; set; } = "Coordinadora";
    public decimal CostoEnvio { get; set; }
    public int TiempoEstimadoDias { get; set; }

    public Sucursal? SucursalOrigen { get; set; }
    public Sucursal? SucursalDestino { get; set; }
}
