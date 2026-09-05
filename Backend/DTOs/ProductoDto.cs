namespace InventarioMultiSucursal.Api.DTOs;

public class ProductoDto
{
    public int Id { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public string? Categoria { get; set; }
    public bool Activo { get; set; }
    public int UnidadMedidaId { get; set; }
    public string UnidadMedidaNombre { get; set; } = string.Empty;
    public string UnidadMedidaAbreviatura { get; set; } = string.Empty;
    public int? ProveedorId { get; set; }
    public string? ProveedorNombre { get; set; }
    public decimal PrecioVenta { get; set; }
    public decimal PrecioProveedor { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<UnidadAlternativaDto> UnidadesAlternativas { get; set; } = new();
}

// Unidad de medida alternativa expuesta dentro de un producto (T35).
public class UnidadAlternativaDto
{
    public int Id { get; set; }
    public int UnidadMedidaId { get; set; }
    public string UnidadMedidaNombre { get; set; } = string.Empty;
    public string UnidadMedidaAbreviatura { get; set; } = string.Empty;
    public decimal FactorConversion { get; set; }
    public decimal? PrecioVenta { get; set; }
}

public class CrearProductoDto
{
    public int UnidadMedidaId { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public string? Categoria { get; set; }
}

public class ActualizarProductoDto
{
    public int UnidadMedidaId { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public string? Categoria { get; set; }
    public bool Activo { get; set; }
}

// Alta o edición de una unidad de medida alternativa para un producto (T35).
public class CrearUnidadAlternativaDto
{
    public int UnidadMedidaId { get; set; }
    public decimal FactorConversion { get; set; }
    public decimal? PrecioVenta { get; set; }
}

// Fila del reporte de productos con stock por debajo (o igual) del mínimo, en una sucursal (T34).
public class AlertaStockDto
{
    public int InventarioId { get; set; }
    public int ProductoId { get; set; }
    public string ProductoNombre { get; set; } = string.Empty;
    public string ProductoSku { get; set; } = string.Empty;
    public int SucursalId { get; set; }
    public string SucursalNombre { get; set; } = string.Empty;
    public decimal Cantidad { get; set; }
    public decimal StockMinimo { get; set; }
    public decimal Faltante { get; set; }
}
