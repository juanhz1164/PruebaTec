using InventarioMultiSucursal.Api.DTOs;
using InventarioMultiSucursal.Api.Models;
using InventarioMultiSucursal.Api.Repositories.Interfaces;
using InventarioMultiSucursal.Api.Services.Interfaces;

namespace InventarioMultiSucursal.Api.Services;

public class UsuarioService : IUsuarioService
{
    private readonly IUsuarioRepository _repository;

    public UsuarioService(IUsuarioRepository repository)
    {
        _repository = repository;
    }

    public async Task<List<UsuarioDto>> GetAllAsync()
    {
        var usuarios = await _repository.GetAllAsync();
        return usuarios.Select(MapToDto).ToList();
    }

    public async Task<UsuarioDto?> GetByIdAsync(int id)
    {
        var usuario = await _repository.GetByIdAsync(id);
        return usuario is null ? null : MapToDto(usuario);
    }

    public async Task<UsuarioDto> CrearAsync(CrearUsuarioDto dto)
    {
        var usuario = new Usuario
        {
            SucursalId = dto.SucursalId,
            Nombre = dto.Nombre,
            Email = dto.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Rol = dto.Rol,
            Activo = true,
            CreatedAt = DateTime.UtcNow
        };

        await _repository.AddAsync(usuario);
        await _repository.SaveChangesAsync();

        return MapToDto(usuario);
    }

    public async Task<bool> ActualizarAsync(int id, ActualizarUsuarioDto dto)
    {
        var existente = await _repository.GetByIdAsync(id);
        if (existente is null)
        {
            return false;
        }

        existente.SucursalId = dto.SucursalId;
        existente.Nombre = dto.Nombre;
        existente.Email = dto.Email;
        existente.Rol = dto.Rol;
        existente.Activo = dto.Activo;

        await _repository.SaveChangesAsync();
        return true;
    }

    public async Task<bool> EliminarAsync(int id)
    {
        var existente = await _repository.GetByIdAsync(id);
        if (existente is null)
        {
            return false;
        }

        _repository.Remove(existente);
        await _repository.SaveChangesAsync();
        return true;
    }

    private static UsuarioDto MapToDto(Usuario u) => new()
    {
        Id = u.Id,
        SucursalId = u.SucursalId,
        SucursalNombre = u.Sucursal?.Nombre,
        Nombre = u.Nombre,
        Email = u.Email,
        Rol = u.Rol,
        Activo = u.Activo,
        CreatedAt = u.CreatedAt
    };
}
