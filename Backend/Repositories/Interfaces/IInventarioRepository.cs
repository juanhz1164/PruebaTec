using InventarioMultiSucursal.Api.Models;
using Microsoft.EntityFrameworkCore.Storage;

namespace InventarioMultiSucursal.Api.Repositories.Interfaces;

// Contrato de acceso a datos de inventario. El Service depende de esta interfaz,
// no de la implementación concreta ni de EF Core directamente.
public interface IInventarioRepository
{
    Task<List<Inventario>> GetPorSucursalAsync(int sucursalId);
    Task<Inventario?> GetByIdAsync(int id);
    Task<Inventario?> GetPorProductoYSucursalAsync(int productoId, int sucursalId);
    Task AddAsync(Inventario inventario);
    Task<List<MovimientoInventario>> GetMovimientosAsync(int? productoId, int? sucursalId);
    Task AddMovimientoAsync(MovimientoInventario movimiento);
    Task<MovimientoInventario> GetMovimientoConDetalleAsync(int id);
    Task<int> SaveChangesAsync();
    Task<IDbContextTransaction> BeginTransactionAsync();
}
