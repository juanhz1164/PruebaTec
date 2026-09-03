using InventarioMultiSucursal.Api.Models;
using Microsoft.EntityFrameworkCore.Storage;

namespace InventarioMultiSucursal.Api.Repositories.Interfaces;

public interface IOrdenCompraRepository
{
    Task<List<OrdenCompra>> GetAllAsync();
    Task<OrdenCompra?> GetByIdAsync(int id);
    Task AddAsync(OrdenCompra orden);
    Task<int> SaveChangesAsync();
    Task<IDbContextTransaction> BeginTransactionAsync();

    // T38: histórico de líneas de compra por proveedor o por producto.
    Task<List<OrdenCompraLinea>> GetLineasPorProveedorAsync(int proveedorId);
    Task<List<OrdenCompraLinea>> GetLineasPorProductoAsync(int productoId);

    // T37/T39: usados para actualizar stock y costo promedio al recibir una orden.
    Task<Inventario?> GetInventarioAsync(int productoId, int sucursalId);
    Task AddInventarioAsync(Inventario inventario);
    Task AddMovimientoAsync(MovimientoInventario movimiento);
}
