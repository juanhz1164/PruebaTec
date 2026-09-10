using InventarioMultiSucursal.Api.DTOs;
using InventarioMultiSucursal.Api.Repositories.Interfaces;
using InventarioMultiSucursal.Api.Services.Interfaces;

namespace InventarioMultiSucursal.Api.Services;

public class UnidadMedidaService : IUnidadMedidaService
{
    private readonly IUnidadMedidaRepository _repository;

    public UnidadMedidaService(IUnidadMedidaRepository repository)
    {
        _repository = repository;
    }

    public async Task<List<UnidadMedidaDto>> GetAllAsync()
    {
        var unidades = await _repository.GetAllAsync();
        return unidades
            .Select(u => new UnidadMedidaDto { Id = u.Id, Nombre = u.Nombre, Abreviatura = u.Abreviatura })
            .ToList();
    }
}
