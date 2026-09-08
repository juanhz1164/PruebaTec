using InventarioMultiSucursal.Api.Models;

namespace InventarioMultiSucursal.Api.Repositories.Interfaces;

public interface IUnidadMedidaRepository
{
    Task<List<UnidadMedida>> GetAllAsync();
}
