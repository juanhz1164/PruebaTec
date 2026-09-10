using InventarioMultiSucursal.Api.Models;

namespace InventarioMultiSucursal.Api.DTOs;

public class OrdenCompraDto
{
    public int Id { get; set; }
    public int ProveedorId { get; set; }
    public string ProveedorNombre { get; set; } = string.Empty;
    public int SucursalId { get; set; }
    public string SucursalNombre { get; set; } = string.Empty;
    public int UsuarioId { get; set; }
    public string UsuarioNombre { get; set; } = string.Empty;
    public EstadoOrdenCompra Estado { get; set; }
    public int PlazoPagoDias { get; set; }
    public DateTime Fecha { get; set; }
    public DateTime? FechaRecepcion { get; set; }
    public List<OrdenCompraLineaDto> Lineas { get; set; } = new();
    public decimal Total => Lineas.Sum(l => l.Subtotal);
}

public class OrdenCompraLineaDto
{
    public int Id { get; set; }
    public int ProductoId { get; set; }
    public string ProductoNombre { get; set; } = string.Empty;
    public string ProductoSku { get; set; } = string.Empty;
    public decimal Cantidad { get; set; }
    public decimal PrecioUnitario { get; set; }
    public decimal Descuento { get; set; }
    public decimal Subtotal => Cantidad * PrecioUnitario * (1 - Descuento / 100m);
}

public class CrearOrdenCompraDto
{
    public int ProveedorId { get; set; }
    public int SucursalId { get; set; }
    public int UsuarioId { get; set; }
    public int PlazoPagoDias { get; set; }
    public List<CrearOrdenCompraLineaDto> Lineas { get; set; } = new();
}

public class CrearOrdenCompraLineaDto
{
    public int ProductoId { get; set; }
    public decimal Cantidad { get; set; }
    public decimal PrecioUnitario { get; set; }
    public decimal Descuento { get; set; }
}

public class CambiarEstadoOrdenCompraDto
{
    public EstadoOrdenCompra Estado { get; set; }
}
