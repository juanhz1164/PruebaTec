using InventarioMultiSucursal.Api.DTOs;

namespace InventarioMultiSucursal.Api.Services.Interfaces;

public interface ILogisticaService
{
    Task<List<TiempoEnvioDto>> GetTiemposEnvioAsync();
    Task<List<ClasificacionRutaDto>> GetClasificacionRutasAsync();
    Task<List<TransferenciaEnCursoDto>> GetTransferenciasEnCursoAsync();
    Task<List<CumplimientoDto>> GetCumplimientoPorSucursalAsync();
    Task<List<CumplimientoDto>> GetCumplimientoPorRutaAsync();
}
