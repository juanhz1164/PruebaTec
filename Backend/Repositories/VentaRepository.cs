using InventarioMultiSucursal.Api.Data;
using InventarioMultiSucursal.Api.Models;
using InventarioMultiSucursal.Api.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace InventarioMultiSucursal.Api.Repositories;

public class VentaRepository : IVentaRepository
{
    private readonly AppDbContext _context;

    public VentaRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<Venta>> GetAllAsync()
    {
        return await _context.Ventas
            .Include(v => v.Sucursal)
            .Include(v => v.Usuario)
            .Include(v => v.Lineas)
                .ThenInclude(l => l.Producto)
            .OrderByDescending(v => v.Fecha)
            .ToListAsync();
    }

    public async Task<Venta?> GetByIdAsync(int id)
    {
        return await _context.Ventas
            .Include(v => v.Sucursal)
            .Include(v => v.Usuario)
            .Include(v => v.Lineas)
                .ThenInclude(l => l.Producto)
            .FirstOrDefaultAsync(v => v.Id == id);
    }

    public async Task AddAsync(Venta venta)
    {
        await _context.Ventas.AddAsync(venta);
    }

    public Task<int> SaveChangesAsync() => _context.SaveChangesAsync();

    public Task<IDbContextTransaction> BeginTransactionAsync() => _context.Database.BeginTransactionAsync();

    public async Task<Inventario?> GetInventarioAsync(int productoId, int sucursalId)
    {
        return await _context.Inventarios
            .FirstOrDefaultAsync(i => i.ProductoId == productoId && i.SucursalId == sucursalId);
    }

    public async Task AddMovimientoAsync(MovimientoInventario movimiento)
    {
        await _context.MovimientosInventario.AddAsync(movimiento);
    }

    public async Task<bool> ExisteNumeroComprobanteAsync(string numeroComprobante)
    {
        return await _context.Ventas.AnyAsync(v => v.NumeroComprobante == numeroComprobante);
    }
}
