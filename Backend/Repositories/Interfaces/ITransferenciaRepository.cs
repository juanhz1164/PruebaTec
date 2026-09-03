using InventarioMultiSucursal.Api.Models;
using Microsoft.EntityFrameworkCore.Storage;

namespace InventarioMultiSucursal.Api.Repositories.Interfaces;

public interface ITransferenciaRepository
{
    Task<List<Transferencia>> GetAllAsync();
    Task<Transferencia?> GetByIdAsync(int id);
    Task AddAsync(Transferencia transferencia);
    Task<int> SaveChangesAsync();
    Task<IDbContextTransaction> BeginTransactionAsync();

    Task<Inventario?> GetInventarioAsync(int productoId, int sucursalId);
    Task AddInventarioAsync(Inventario inventario);
    Task AddMovimientoAsync(MovimientoInventario movimiento);
}
