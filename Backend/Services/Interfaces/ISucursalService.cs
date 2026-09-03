using InventarioMultiSucursal.Api.DTOs;

namespace InventarioMultiSucursal.Api.Services.Interfaces;

public interface ISucursalService
{
    Task<List<SucursalDto>> GetAllAsync();
    Task<SucursalDto?> GetByIdAsync(int id);
    Task<SucursalDto> CrearAsync(CrearSucursalDto dto);
    Task<bool> ActualizarAsync(int id, ActualizarSucursalDto dto);
    Task<bool> EliminarAsync(int id);
}
