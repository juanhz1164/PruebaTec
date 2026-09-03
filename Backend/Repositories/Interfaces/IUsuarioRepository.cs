using InventarioMultiSucursal.Api.Models;

namespace InventarioMultiSucursal.Api.Repositories.Interfaces;

public interface IUsuarioRepository
{
    Task<List<Usuario>> GetAllAsync();
    Task<Usuario?> GetByIdAsync(int id);
    Task AddAsync(Usuario usuario);
    Task<int> SaveChangesAsync();
    void Remove(Usuario usuario);
}
