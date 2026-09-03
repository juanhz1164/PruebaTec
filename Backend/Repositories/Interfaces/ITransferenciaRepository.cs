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

    // T48-T51: logística lee sobre el mismo conjunto de transferencias, sin tocar inventario.
    Task<List<Transferencia>> GetEnviadasAsync();
    Task<List<Transferencia>> GetEnCursoAsync();
    Task<List<Transferencia>> GetCerradasAsync();
}
