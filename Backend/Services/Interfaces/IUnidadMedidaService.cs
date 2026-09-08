using InventarioMultiSucursal.Api.DTOs;

namespace InventarioMultiSucursal.Api.Services.Interfaces;

public interface IUnidadMedidaService
{
    Task<List<UnidadMedidaDto>> GetAllAsync();
}
