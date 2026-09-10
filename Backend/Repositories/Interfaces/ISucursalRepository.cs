using InventarioMultiSucursal.Api.Models;

namespace InventarioMultiSucursal.Api.Repositories.Interfaces;

public interface ISucursalRepository
{
    Task<List<Sucursal>> GetAllAsync();
    Task<Sucursal?> GetByIdAsync(int id);
    Task AddAsync(Sucursal sucursal);
    Task<int> SaveChangesAsync();
    void Remove(Sucursal sucursal);
}
