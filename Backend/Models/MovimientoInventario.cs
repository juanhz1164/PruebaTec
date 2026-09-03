namespace InventarioMultiSucursal.Api.Models;

public class MovimientoInventario
{
    public int Id { get; set; }
    public int ProductoId { get; set; }
    public int SucursalId { get; set; }
    public int UsuarioId { get; set; }
    public TipoMovimiento Tipo { get; set; }
    public decimal Cantidad { get; set; }
    public string Motivo { get; set; } = string.Empty;
    public string? ReferenciaTipo { get; set; }
    public int? ReferenciaId { get; set; }
    public DateTime Fecha { get; set; }

    public Producto? Producto { get; set; }
    public Sucursal? Sucursal { get; set; }
    public Usuario? Usuario { get; set; }
}
