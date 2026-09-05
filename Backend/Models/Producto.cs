namespace InventarioMultiSucursal.Api.Models;

public class Producto
{
    public int Id { get; set; }
    public int UnidadMedidaId { get; set; }
    // Proveedor principal que distribuye este producto (opcional). Se usa en
    // Compras para que, al elegir un proveedor, solo se ofrezcan sus productos.
    public int? ProveedorId { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public string? Categoria { get; set; }
    public bool Activo { get; set; } = true;
    public DateTime CreatedAt { get; set; }

    public UnidadMedida? UnidadMedida { get; set; }
    public Proveedor? Proveedor { get; set; }
    public ICollection<Inventario> InventarioPorSucursal { get; set; } = new List<Inventario>();
    public ICollection<ProductoUnidadMedida> UnidadesAlternativas { get; set; } = new List<ProductoUnidadMedida>();
}
