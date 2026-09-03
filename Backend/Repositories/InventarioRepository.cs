using InventarioMultiSucursal.Api.Data;
using InventarioMultiSucursal.Api.Models;
using InventarioMultiSucursal.Api.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace InventarioMultiSucursal.Api.Repositories;

// Única clase que conoce el AppDbContext para todo lo relacionado a inventario.
// Si mañana cambia el motor de base de datos o la forma de consultar, solo se toca aquí.
public class InventarioRepository : IInventarioRepository
{
    private readonly AppDbContext _context;

    public InventarioRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<Inventario>> GetPorSucursalAsync(int sucursalId)
    {
        return await _context.Inventarios
            .Where(i => i.SucursalId == sucursalId)
            .Include(i => i.Producto)
                .ThenInclude(p => p!.UnidadMedida)
            .ToListAsync();
    }

    public async Task<Inventario?> GetByIdAsync(int id)
    {
        return await _context.Inventarios
            .Include(i => i.Producto)
                .ThenInclude(p => p!.UnidadMedida)
            .FirstOrDefaultAsync(i => i.Id == id);
    }

    public async Task<Inventario?> GetPorProductoYSucursalAsync(int productoId, int sucursalId)
    {
        return await _context.Inventarios
            .FirstOrDefaultAsync(i => i.ProductoId == productoId && i.SucursalId == sucursalId);
    }

    public async Task AddAsync(Inventario inventario)
    {
        await _context.Inventarios.AddAsync(inventario);
    }

    public async Task<List<MovimientoInventario>> GetMovimientosAsync(int? productoId, int? sucursalId)
    {
        var query = _context.MovimientosInventario
            .Include(m => m.Producto)
            .Include(m => m.Usuario)
            .AsQueryable();

        if (productoId.HasValue)
        {
            query = query.Where(m => m.ProductoId == productoId.Value);
        }

        if (sucursalId.HasValue)
        {
            query = query.Where(m => m.SucursalId == sucursalId.Value);
        }

        return await query
            .OrderByDescending(m => m.Fecha)
            .ToListAsync();
    }

    public async Task AddMovimientoAsync(MovimientoInventario movimiento)
    {
        await _context.MovimientosInventario.AddAsync(movimiento);
    }

    public async Task<MovimientoInventario> GetMovimientoConDetalleAsync(int id)
    {
        return await _context.MovimientosInventario
            .Include(m => m.Producto)
            .Include(m => m.Usuario)
            .FirstAsync(m => m.Id == id);
    }

    public Task<int> SaveChangesAsync() => _context.SaveChangesAsync();

    public Task<IDbContextTransaction> BeginTransactionAsync() => _context.Database.BeginTransactionAsync();
}
