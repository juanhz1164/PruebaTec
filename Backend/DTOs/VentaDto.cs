namespace InventarioMultiSucursal.Api.DTOs;

public class VentaDto
{
    public int Id { get; set; }
    public int SucursalId { get; set; }
    public string SucursalNombre { get; set; } = string.Empty;
    public int UsuarioId { get; set; }
    public string UsuarioNombre { get; set; } = string.Empty;
    public string NumeroComprobante { get; set; } = string.Empty;
    public decimal Subtotal { get; set; }
    public decimal DescuentoTotal { get; set; }
    public decimal Total { get; set; }
    public DateTime Fecha { get; set; }
    public List<VentaLineaDto> Lineas { get; set; } = new();
}

public class VentaLineaDto
{
    public int Id { get; set; }
    public int ProductoId { get; set; }
    public string ProductoNombre { get; set; } = string.Empty;
    public string ProductoSku { get; set; } = string.Empty;
    public decimal Cantidad { get; set; }
    public string UnidadMedidaAbreviatura { get; set; } = string.Empty;
    public decimal PrecioUnitario { get; set; }
    public decimal Descuento { get; set; }
    public decimal Subtotal { get; set; }
}

public class CrearVentaDto
{
    public int SucursalId { get; set; }
    public int UsuarioId { get; set; }
    public List<CrearVentaLineaDto> Lineas { get; set; } = new();
}

// PrecioUnitario es opcional: si no se envía (o es 0), el sistema toma como
// precio base el costo promedio del inventario de ese producto en la sucursal (T42).
// UnidadMedidaId es opcional: si no se envía, se vende en la unidad base del producto.
// Si se envía una unidad alternativa (ej. "Caja"), Cantidad se expresa en esa unidad
// y se convierte a unidad base (usando su FactorConversion) para descontar del stock.
// El descuento por línea ya no se recibe del cliente: se calcula automáticamente por
// tramos de cantidad (ver VentaService.CalcularDescuentoPorCantidad).
public class CrearVentaLineaDto
{
    public int ProductoId { get; set; }
    public int? UnidadMedidaId { get; set; }
    public decimal Cantidad { get; set; }
    public decimal? PrecioUnitario { get; set; }
}
