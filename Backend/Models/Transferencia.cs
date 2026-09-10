namespace InventarioMultiSucursal.Api.Models;

public class Transferencia
{
    public int Id { get; set; }
    public int SucursalOrigenId { get; set; }
    public int SucursalDestinoId { get; set; }
    public int UsuarioSolicitanteId { get; set; }
    // Quién ejecutó cada paso físico — distinto del solicitante, que puede ser
    // de cualquiera de las dos sucursales (ver nota en TransferenciasController).
    // Nulos hasta que ese paso ocurre.
    public int? UsuarioPreparadorId { get; set; }
    public int? UsuarioEnvioId { get; set; }
    public int? UsuarioRecepcionId { get; set; }
    public EstadoTransferencia Estado { get; set; } = EstadoTransferencia.Solicitada;
    public string? Transportista { get; set; }
    public string? Ruta { get; set; }
    public PrioridadTransferencia? Prioridad { get; set; }
    public decimal? CostoEnvio { get; set; }
    public DateTime FechaSolicitud { get; set; }
    public DateTime? FechaEnvio { get; set; }
    public DateTime? FechaEstimadaLlegada { get; set; }
    public DateTime? FechaRecepcion { get; set; }

    public Sucursal? SucursalOrigen { get; set; }
    public Sucursal? SucursalDestino { get; set; }
    public Usuario? UsuarioSolicitante { get; set; }
    public Usuario? UsuarioPreparador { get; set; }
    public Usuario? UsuarioEnvio { get; set; }
    public Usuario? UsuarioRecepcion { get; set; }
    public ICollection<TransferenciaLinea> Lineas { get; set; } = new List<TransferenciaLinea>();
}
