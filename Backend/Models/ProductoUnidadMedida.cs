namespace InventarioMultiSucursal.Api.Models;

// Unidad de medida alternativa para un producto (además de su unidad base
// en Producto.UnidadMedidaId). FactorConversion indica cuántas unidades
// base equivalen a 1 unidad de esta fila (ej: 1 "caja" = 12 "un").
public class ProductoUnidadMedida
{
    public int Id { get; set; }
    public int ProductoId { get; set; }
    public int UnidadMedidaId { get; set; }
    public decimal FactorConversion { get; set; }

    // Precio de venta fijo para esta unidad alternativa (ej. precio de la "Caja").
    // Si es null, el precio se calcula como CostoPromedio * FactorConversion.
    public decimal? PrecioVenta { get; set; }

    public Producto? Producto { get; set; }
    public UnidadMedida? UnidadMedida { get; set; }
}
