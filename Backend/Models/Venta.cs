namespace InventarioMultiSucursal.Api.Models;

public class Venta
{
    public int Id { get; set; }
    public int SucursalId { get; set; }
    public int UsuarioId { get; set; }
    public string NumeroComprobante { get; set; } = string.Empty;
    public string? ClienteNombre { get; set; }
    public string? ClienteEmail { get; set; }
    public string? ClienteTelefono { get; set; }
    public decimal Subtotal { get; set; }
    public decimal DescuentoTotal { get; set; }
    public decimal Total { get; set; }
    public DateTime Fecha { get; set; }

    public Sucursal? Sucursal { get; set; }
    public Usuario? Usuario { get; set; }
    public ICollection<VentaLinea> Lineas { get; set; } = new List<VentaLinea>();
}
