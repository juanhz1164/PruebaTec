using InventarioMultiSucursal.Api.DTOs;

namespace InventarioMultiSucursal.Api.Services.Interfaces;

public interface IUsuarioService
{
    Task<List<UsuarioDto>> GetAllAsync();
    Task<UsuarioDto?> GetByIdAsync(int id);
    Task<UsuarioDto> CrearAsync(CrearUsuarioDto dto);
    Task<bool> ActualizarAsync(int id, ActualizarUsuarioDto dto);
    Task<bool> EliminarAsync(int id);
}
