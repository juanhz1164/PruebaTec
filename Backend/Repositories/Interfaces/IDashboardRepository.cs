using InventarioMultiSucursal.Api.Models;

namespace InventarioMultiSucursal.Api.Repositories.Interfaces;

public interface IDashboardRepository
{
    Task<List<Venta>> GetVentasDesdeAsync(DateTime desde);
    Task<List<VentaLinea>> GetLineasVentaDesdeAsync(DateTime desde, int? sucursalId);
    Task<List<Inventario>> GetInventarioCompletoAsync();
    Task<List<Transferencia>> GetTransferenciasActivasAsync();
    Task<List<Sucursal>> GetSucursalesActivasAsync();
}
