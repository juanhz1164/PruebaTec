namespace InventarioMultiSucursal.Api.Models;

public class VentaLinea
{
    public int Id { get; set; }
    public int VentaId { get; set; }
    public int ProductoId { get; set; }

    // Cantidad en la unidad base del producto (la misma unidad en que se lleva el
    // inventario). Es lo que se descuenta del stock.
    public decimal Cantidad { get; set; }

    // Unidad y cantidad tal como se vendió (ej. "2 Caja"), para mostrar en el
    // comprobante. Si se vendió en la unidad base, coincide con Cantidad.
    public int UnidadMedidaId { get; set; }
    public decimal CantidadVendida { get; set; }

    public decimal PrecioUnitario { get; set; }
    public decimal Descuento { get; set; }

    public Venta? Venta { get; set; }
    public Producto? Producto { get; set; }
    public UnidadMedida? UnidadMedida { get; set; }
}
