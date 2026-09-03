using InventarioMultiSucursal.Api.Models;

namespace InventarioMultiSucursal.Api.Repositories.Interfaces;

public interface IProveedorRepository
{
    Task<List<Proveedor>> GetAllAsync();
    Task<Proveedor?> GetByIdAsync(int id);
    Task AddAsync(Proveedor proveedor);
    Task<int> SaveChangesAsync();
    void Remove(Proveedor proveedor);
}
