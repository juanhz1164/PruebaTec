namespace InventarioMultiSucursal.Api.Models;

public class TransferenciaLinea
{
    public int Id { get; set; }
    public int TransferenciaId { get; set; }
    public int ProductoId { get; set; }
    public decimal CantidadSolicitada { get; set; }
    public decimal CantidadEnviada { get; set; }
    public decimal CantidadRecibida { get; set; }

    public Transferencia? Transferencia { get; set; }
    public Producto? Producto { get; set; }
}
