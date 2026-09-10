using InventarioMultiSucursal.Api.Data;
using InventarioMultiSucursal.Api.Models;
using InventarioMultiSucursal.Api.Repositories.Interfaces;
using InventarioMultiSucursal.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace InventarioMultiSucursal.Api.Repositories;

public class VisitaRepository : IVisitaRepository
{
    private readonly AppDbContext _context;

    public VisitaRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<Visita>> GetPorSucursalYFechaAsync(int? sucursalId, DateOnly fecha)
    {
        return await GetPorSucursalYRangoAsync(sucursalId, fecha, fecha);
    }

    public async Task<List<Visita>> GetPorSucursalYRangoAsync(int? sucursalId, DateOnly desde, DateOnly hasta)
    {
        var inicio = ZonaHorariaColombia.AUtc(desde.ToDateTime(TimeOnly.MinValue));
        var fin = ZonaHorariaColombia.AUtc(hasta.ToDateTime(TimeOnly.MaxValue));

        var query = _context.Visitas
            .Include(v => v.Sucursal)
            .Include(v => v.Usuario)
            .Where(v => v.FechaHora >= inicio && v.FechaHora <= fin);

        if (sucursalId.HasValue)
        {
            query = query.Where(v => v.SucursalId == sucursalId.Value);
        }

        return await query.OrderByDescending(v => v.FechaHora).ToListAsync();
    }

    public async Task<Visita?> GetByIdAsync(int id)
    {
        return await _context.Visitas
            .Include(v => v.Sucursal)
            .Include(v => v.Usuario)
            .FirstOrDefaultAsync(v => v.Id == id);
    }

    public async Task AddAsync(Visita visita)
    {
        await _context.Visitas.AddAsync(visita);
    }

    public void Remove(Visita visita)
    {
        _context.Visitas.Remove(visita);
    }

    public Task<int> SaveChangesAsync() => _context.SaveChangesAsync();
}
