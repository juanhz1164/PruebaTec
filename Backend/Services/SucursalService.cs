using InventarioMultiSucursal.Api.DTOs;
using InventarioMultiSucursal.Api.Models;
using InventarioMultiSucursal.Api.Repositories.Interfaces;
using InventarioMultiSucursal.Api.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace InventarioMultiSucursal.Api.Services;

public class SucursalService : ISucursalService
{
    private readonly ISucursalRepository _repository;

    public SucursalService(ISucursalRepository repository)
    {
        _repository = repository;
    }

    public async Task<List<SucursalDto>> GetAllAsync()
    {
        var sucursales = await _repository.GetAllAsync();
        return sucursales.Select(MapToDto).ToList();
    }

    public async Task<SucursalDto?> GetByIdAsync(int id)
    {
        var sucursal = await _repository.GetByIdAsync(id);
        return sucursal is null ? null : MapToDto(sucursal);
    }

    public async Task<SucursalDto> CrearAsync(CrearSucursalDto dto)
    {
        var sucursal = new Sucursal
        {
            Nombre = dto.Nombre,
            Direccion = dto.Direccion,
            Ciudad = dto.Ciudad,
            Telefono = dto.Telefono,
            Activa = true,
            CreatedAt = DateTime.UtcNow
        };

        await _repository.AddAsync(sucursal);
        await _repository.SaveChangesAsync();

        return MapToDto(sucursal);
    }

    public async Task<bool> ActualizarAsync(int id, ActualizarSucursalDto dto)
    {
        var existente = await _repository.GetByIdAsync(id);
        if (existente is null)
        {
            return false;
        }

        existente.Nombre = dto.Nombre;
        existente.Direccion = dto.Direccion;
        existente.Ciudad = dto.Ciudad;
        existente.Telefono = dto.Telefono;
        existente.Activa = dto.Activa;

        await _repository.SaveChangesAsync();
        return true;
    }

    public async Task<ResultadoEliminacion> EliminarAsync(int id)
    {
        var existente = await _repository.GetByIdAsync(id);
        if (existente is null)
        {
            return ResultadoEliminacion.NoExiste();
        }

        _repository.Remove(existente);
        try
        {
            await _repository.SaveChangesAsync();
            return ResultadoEliminacion.Ok();
        }
        catch (DbUpdateException)
        {
            return ResultadoEliminacion.Falla(
                "No se puede eliminar esta sucursal porque tiene usuarios, inventario, ventas u otros " +
                "registros asociados. Usa \"Desactivar\" en su lugar.");
        }
    }

    private static SucursalDto MapToDto(Sucursal s) => new()
    {
        Id = s.Id,
        Nombre = s.Nombre,
        Direccion = s.Direccion,
        Ciudad = s.Ciudad,
        Telefono = s.Telefono,
        Activa = s.Activa,
        CreatedAt = s.CreatedAt
    };
}
