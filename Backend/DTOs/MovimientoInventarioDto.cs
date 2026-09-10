using InventarioMultiSucursal.Api.Models;

namespace InventarioMultiSucursal.Api.DTOs;

// Lo que la API devuelve al consultar el historial de movimientos.
public class MovimientoInventarioDto
{
    public int Id { get; set; }
    public int ProductoId { get; set; }
    public string ProductoNombre { get; set; } = string.Empty;
    public int SucursalId { get; set; }
    public int UsuarioId { get; set; }
    public string UsuarioNombre { get; set; } = string.Empty;
    public TipoMovimiento Tipo { get; set; }
    public decimal Cantidad { get; set; }
    public string Motivo { get; set; } = string.Empty;
    public string? ReferenciaTipo { get; set; }
    public int? ReferenciaId { get; set; }
    public DateTime Fecha { get; set; }
}

// Lo que el cliente envía para registrar un ingreso o retiro de stock.
public class CrearMovimientoInventarioDto
{
    public int ProductoId { get; set; }
    public int SucursalId { get; set; }
    public int UsuarioId { get; set; }
    public TipoMovimiento Tipo { get; set; }
    public decimal Cantidad { get; set; }
    public string Motivo { get; set; } = string.Empty;
    public string? ReferenciaTipo { get; set; }
    public int? ReferenciaId { get; set; }
}
