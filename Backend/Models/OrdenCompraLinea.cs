namespace InventarioMultiSucursal.Api.Models;

public class OrdenCompraLinea
{
    public int Id { get; set; }
    public int OrdenCompraId { get; set; }
    public int ProductoId { get; set; }
    public decimal Cantidad { get; set; }
    public decimal PrecioUnitario { get; set; }
    public decimal Descuento { get; set; }

    public OrdenCompra? OrdenCompra { get; set; }
    public Producto? Producto { get; set; }
}
