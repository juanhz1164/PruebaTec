namespace InventarioMultiSucursal.Api.Models;

public class Transferencia
{
    public int Id { get; set; }
    public int SucursalOrigenId { get; set; }
    public int SucursalDestinoId { get; set; }
    public int UsuarioSolicitanteId { get; set; }
    public EstadoTransferencia Estado { get; set; } = EstadoTransferencia.Solicitada;
    public string? Transportista { get; set; }
    public string? Ruta { get; set; }
    public DateTime FechaSolicitud { get; set; }
    public DateTime? FechaEnvio { get; set; }
    public DateTime? FechaEstimadaLlegada { get; set; }
    public DateTime? FechaRecepcion { get; set; }

    public Sucursal? SucursalOrigen { get; set; }
    public Sucursal? SucursalDestino { get; set; }
    public Usuario? UsuarioSolicitante { get; set; }
    public ICollection<TransferenciaLinea> Lineas { get; set; } = new List<TransferenciaLinea>();
}
