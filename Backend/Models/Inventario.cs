namespace InventarioMultiSucursal.Api.Models;

public class Inventario
{
    public int Id { get; set; }
    public int ProductoId { get; set; }
    public int SucursalId { get; set; }
    public decimal Cantidad { get; set; }
    public decimal StockMinimo { get; set; }
    public decimal CostoPromedio { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Producto? Producto { get; set; }
    public Sucursal? Sucursal { get; set; }
}
