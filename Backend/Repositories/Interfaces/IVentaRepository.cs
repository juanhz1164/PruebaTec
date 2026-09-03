using InventarioMultiSucursal.Api.Models;
using Microsoft.EntityFrameworkCore.Storage;

namespace InventarioMultiSucursal.Api.Repositories.Interfaces;

public interface IVentaRepository
{
    Task<List<Venta>> GetAllAsync();
    Task<Venta?> GetByIdAsync(int id);
    Task AddAsync(Venta venta);
    Task<int> SaveChangesAsync();
    Task<IDbContextTransaction> BeginTransactionAsync();

    Task<Inventario?> GetInventarioAsync(int productoId, int sucursalId);
    Task AddMovimientoAsync(MovimientoInventario movimiento);
    Task<bool> ExisteNumeroComprobanteAsync(string numeroComprobante);
}
