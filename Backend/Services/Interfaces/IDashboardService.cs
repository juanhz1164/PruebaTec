using InventarioMultiSucursal.Api.DTOs;

namespace InventarioMultiSucursal.Api.Services.Interfaces;

public interface IDashboardService
{
    Task<List<VentasPorMesDto>> GetVentasMesActualVsAnterioresAsync(int? sucursalId);
    Task<List<RotacionProductoDto>> GetRotacionInventarioAsync(int? sucursalId);
    Task<List<TransferenciaActivaDto>> GetTransferenciasActivasAsync();
    Task<List<ProductoProximoAgotarseDto>> GetProductosProximosAgotarseAsync(int? sucursalId);
    Task<List<ComparativaSucursalDto>> GetComparativaSucursalesAsync();
}
