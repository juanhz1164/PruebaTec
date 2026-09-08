using InventarioMultiSucursal.Api.DTOs;

namespace InventarioMultiSucursal.Api.Services.Interfaces;

public interface IProductoService
{
    Task<List<ProductoDto>> GetAllAsync();
    Task<ProductoDto?> GetByIdAsync(int id);
    Task<ProductoDto> CrearAsync(CrearProductoDto dto);
    Task<bool> ActualizarAsync(int id, ActualizarProductoDto dto);
    Task<ResultadoEliminacion> EliminarAsync(int id);

    // T35: unidades de medida alternativas por producto.
    Task<ResultadoUnidadAlternativa> AgregarUnidadAlternativaAsync(int productoId, CrearUnidadAlternativaDto dto);
    Task<bool> EliminarUnidadAlternativaAsync(int productoId, int unidadAlternativaId);

    // T34: productos con stock en el mínimo o por debajo, opcionalmente filtrado por sucursal.
    Task<List<AlertaStockDto>> GetAlertasStockAsync(int? sucursalId);
}

public class ResultadoUnidadAlternativa
{
    public bool Exitoso { get; init; }
    public string? Error { get; init; }
    public UnidadAlternativaDto? Unidad { get; init; }

    public static ResultadoUnidadAlternativa Falla(string error) => new() { Exitoso = false, Error = error };
    public static ResultadoUnidadAlternativa Ok(UnidadAlternativaDto unidad) => new() { Exitoso = true, Unidad = unidad };
}
