using InventarioMultiSucursal.Api.DTOs;

namespace InventarioMultiSucursal.Api.Services.Interfaces;

public interface IProveedorService
{
    Task<List<ProveedorDto>> GetAllAsync();
    Task<ProveedorDto?> GetByIdAsync(int id);
    Task<ProveedorDto> CrearAsync(CrearProveedorDto dto);
    Task<bool> ActualizarAsync(int id, ActualizarProveedorDto dto);
    Task<bool> EliminarAsync(int id);
}
