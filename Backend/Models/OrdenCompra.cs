namespace InventarioMultiSucursal.Api.Models;

public class OrdenCompra
{
    public int Id { get; set; }
    public int ProveedorId { get; set; }
    public int SucursalId { get; set; }
    public int UsuarioId { get; set; }
    public EstadoOrdenCompra Estado { get; set; } = EstadoOrdenCompra.Pendiente;
    public int PlazoPagoDias { get; set; }
    public DateTime Fecha { get; set; }
    public DateTime? FechaRecepcion { get; set; }

    public Proveedor? Proveedor { get; set; }
    public Sucursal? Sucursal { get; set; }
    public Usuario? Usuario { get; set; }
    public ICollection<OrdenCompraLinea> Lineas { get; set; } = new List<OrdenCompraLinea>();
}
