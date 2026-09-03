using InventarioMultiSucursal.Api.DTOs;

namespace InventarioMultiSucursal.Api.Services.Interfaces;

// Contrato de la lógica de negocio de inventario. El Controller depende de esta interfaz.
public interface IInventarioService
{
    Task<List<InventarioDto>> GetPorSucursalAsync(int sucursalId);
    Task<InventarioDto?> GetByIdAsync(int id);
    Task<InventarioDto> CrearAsync(CrearInventarioDto dto);
    Task<bool> ActualizarAsync(int id, ActualizarInventarioDto dto);
    Task<List<MovimientoInventarioDto>> GetMovimientosAsync(int? productoId, int? sucursalId);
    Task<ResultadoMovimiento> CrearMovimientoAsync(CrearMovimientoInventarioDto dto);
}

// Resultado de intentar crear un movimiento: puede fallar por reglas de negocio
// (stock insuficiente, inventario inexistente), no solo por errores técnicos.
public class ResultadoMovimiento
{
    public bool Exitoso { get; init; }
    public string? Error { get; init; }
    public MovimientoInventarioDto? Movimiento { get; init; }

    public static ResultadoMovimiento Falla(string error) => new() { Exitoso = false, Error = error };
    public static ResultadoMovimiento Ok(MovimientoInventarioDto movimiento) => new() { Exitoso = true, Movimiento = movimiento };
}
