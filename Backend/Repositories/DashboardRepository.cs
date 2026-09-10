using InventarioMultiSucursal.Api.Data;
using InventarioMultiSucursal.Api.Models;
using InventarioMultiSucursal.Api.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace InventarioMultiSucursal.Api.Repositories;

public class DashboardRepository : IDashboardRepository
{
    private readonly AppDbContext _context;

    public DashboardRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<Venta>> GetVentasDesdeAsync(DateTime desde)
    {
        return await _context.Ventas
            .Include(v => v.Sucursal)
            .Where(v => v.Fecha >= desde)
            .ToListAsync();
    }

    public async Task<List<VentaLinea>> GetLineasVentaDesdeAsync(DateTime desde, int? sucursalId)
    {
        var query = _context.VentasLineas
            .Include(l => l.Venta)
            .Include(l => l.Producto)
            .Where(l => l.Venta!.Fecha >= desde)
            .AsQueryable();

        if (sucursalId.HasValue)
        {
            query = query.Where(l => l.Venta!.SucursalId == sucursalId.Value);
        }

        return await query.ToListAsync();
    }

    public async Task<List<Inventario>> GetInventarioCompletoAsync()
    {
        return await _context.Inventarios
            .Include(i => i.Producto)
            .Include(i => i.Sucursal)
            .ToListAsync();
    }

    public async Task<List<Transferencia>> GetTransferenciasActivasAsync()
    {
        return await _context.Transferencias
            .Include(t => t.SucursalOrigen)
            .Include(t => t.SucursalDestino)
            .Include(t => t.Lineas)
            .Where(t => t.Estado == EstadoTransferencia.EnPreparacion || t.Estado == EstadoTransferencia.EnTransito)
            .ToListAsync();
    }

    public async Task<List<Sucursal>> GetSucursalesActivasAsync()
    {
        return await _context.Sucursales
            .Where(s => s.Activa)
            .ToListAsync();
    }
}
