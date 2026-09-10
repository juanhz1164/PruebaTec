using InventarioMultiSucursal.Api.Models;

namespace InventarioMultiSucursal.Api.Repositories.Interfaces;

public interface IVisitaRepository
{
    Task<List<Visita>> GetPorSucursalYFechaAsync(int? sucursalId, DateOnly fecha);

    // Rango [desde, hasta] inclusivo, en fechas locales de calendario (se convierte
    // internamente a UTC igual que GetPorSucursalYFechaAsync). Se usa para el
    // resumen mensual y el flujo día a día de Comparación de sucursales.
    Task<List<Visita>> GetPorSucursalYRangoAsync(int? sucursalId, DateOnly desde, DateOnly hasta);

    Task<Visita?> GetByIdAsync(int id);
    Task AddAsync(Visita visita);
    void Remove(Visita visita);
    Task<int> SaveChangesAsync();
}
