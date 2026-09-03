using InventarioMultiSucursal.Api.DTOs;

namespace InventarioMultiSucursal.Api.Services.Interfaces;

public interface IVentaService
{
    Task<List<VentaDto>> GetAllAsync();
    Task<VentaDto?> GetByIdAsync(int id);
    Task<ResultadoVenta> CrearAsync(CrearVentaDto dto);
}

public class ResultadoVenta
{
    public bool Exitoso { get; init; }
    public string? Error { get; init; }
    public VentaDto? Venta { get; init; }

    public static ResultadoVenta Falla(string error) => new() { Exitoso = false, Error = error };
    public static ResultadoVenta Ok(VentaDto venta) => new() { Exitoso = true, Venta = venta };
}
