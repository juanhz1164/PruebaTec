using InventarioMultiSucursal.Api.DTOs;
using InventarioMultiSucursal.Api.Models;
using InventarioMultiSucursal.Api.Repositories.Interfaces;
using InventarioMultiSucursal.Api.Services.Interfaces;

namespace InventarioMultiSucursal.Api.Services;

public class ProveedorService : IProveedorService
{
    private readonly IProveedorRepository _repository;

    public ProveedorService(IProveedorRepository repository)
    {
        _repository = repository;
    }

    public async Task<List<ProveedorDto>> GetAllAsync()
    {
        var proveedores = await _repository.GetAllAsync();
        return proveedores.Select(MapToDto).ToList();
    }

    public async Task<ProveedorDto?> GetByIdAsync(int id)
    {
        var proveedor = await _repository.GetByIdAsync(id);
        return proveedor is null ? null : MapToDto(proveedor);
    }

    public async Task<ProveedorDto> CrearAsync(CrearProveedorDto dto)
    {
        var proveedor = new Proveedor
        {
            Nombre = dto.Nombre,
            Contacto = dto.Contacto,
            Telefono = dto.Telefono,
            Email = dto.Email,
            Direccion = dto.Direccion,
            Activo = true,
            CreatedAt = DateTime.UtcNow
        };

        await _repository.AddAsync(proveedor);
        await _repository.SaveChangesAsync();

        return MapToDto(proveedor);
    }

    public async Task<bool> ActualizarAsync(int id, ActualizarProveedorDto dto)
    {
        var existente = await _repository.GetByIdAsync(id);
        if (existente is null)
        {
            return false;
        }

        existente.Nombre = dto.Nombre;
        existente.Contacto = dto.Contacto;
        existente.Telefono = dto.Telefono;
        existente.Email = dto.Email;
        existente.Direccion = dto.Direccion;
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

    private static ProveedorDto MapToDto(Proveedor p) => new()
    {
        Id = p.Id,
        Nombre = p.Nombre,
        Contacto = p.Contacto,
        Telefono = p.Telefono,
        Email = p.Email,
        Direccion = p.Direccion,
        Activo = p.Activo,
        CreatedAt = p.CreatedAt
    };
}
