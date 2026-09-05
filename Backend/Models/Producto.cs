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

    // Precio de venta al público (fijo, por unidad base): lo usa Ventas como
    // precio por defecto, y en Compras sirve para calcular el % de descuento
    // (cuánto más barato compra la tienda que su propio precio de venta).
    public decimal PrecioVenta { get; set; }

    // Precio de costo al que el proveedor principal vende este producto a la
    // tienda: se autocompleta como precio unitario por defecto al crear una
    // orden de compra.
    public decimal PrecioProveedor { get; set; }

    public DateTime CreatedAt { get; set; }

    public UnidadMedida? UnidadMedida { get; set; }
    public Proveedor? Proveedor { get; set; }
    public ICollection<Inventario> InventarioPorSucursal { get; set; } = new List<Inventario>();
    public ICollection<ProductoUnidadMedida> UnidadesAlternativas { get; set; } = new List<ProductoUnidadMedida>();
}
