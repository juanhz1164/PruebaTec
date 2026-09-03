using InventarioMultiSucursal.Api.Data;
using InventarioMultiSucursal.Api.Models;
using InventarioMultiSucursal.Api.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace InventarioMultiSucursal.Api.Repositories;

public class OrdenCompraRepository : IOrdenCompraRepository
{
    private readonly AppDbContext _context;

    public OrdenCompraRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<OrdenCompra>> GetAllAsync()
    {
        return await _context.OrdenesCompra
            .Include(oc => oc.Proveedor)
            .Include(oc => oc.Sucursal)
            .Include(oc => oc.Usuario)
            .Include(oc => oc.Lineas)
                .ThenInclude(l => l.Producto)
            .ToListAsync();
    }

    public async Task<OrdenCompra?> GetByIdAsync(int id)
    {
        return await _context.OrdenesCompra
            .Include(oc => oc.Proveedor)
            .Include(oc => oc.Sucursal)
            .Include(oc => oc.Usuario)
            .Include(oc => oc.Lineas)
                .ThenInclude(l => l.Producto)
            .FirstOrDefaultAsync(oc => oc.Id == id);
    }

    public async Task AddAsync(OrdenCompra orden)
    {
        await _context.OrdenesCompra.AddAsync(orden);
    }

    public Task<int> SaveChangesAsync() => _context.SaveChangesAsync();

    public Task<IDbContextTransaction> BeginTransactionAsync() => _context.Database.BeginTransactionAsync();

    public async Task<List<OrdenCompraLinea>> GetLineasPorProveedorAsync(int proveedorId)
    {
        return await _context.OrdenesCompraLineas
            .Include(l => l.Producto)
            .Include(l => l.OrdenCompra)
                .ThenInclude(oc => oc!.Proveedor)
            .Where(l => l.OrdenCompra!.ProveedorId == proveedorId)
            .OrderByDescending(l => l.OrdenCompra!.Fecha)
            .ToListAsync();
    }

    public async Task<List<OrdenCompraLinea>> GetLineasPorProductoAsync(int productoId)
    {
        return await _context.OrdenesCompraLineas
            .Include(l => l.Producto)
            .Include(l => l.OrdenCompra)
                .ThenInclude(oc => oc!.Proveedor)
            .Where(l => l.ProductoId == productoId)
            .OrderByDescending(l => l.OrdenCompra!.Fecha)
            .ToListAsync();
    }

    public async Task<Inventario?> GetInventarioAsync(int productoId, int sucursalId)
    {
        return await _context.Inventarios
            .FirstOrDefaultAsync(i => i.ProductoId == productoId && i.SucursalId == sucursalId);
    }

    public async Task AddInventarioAsync(Inventario inventario)
    {
        await _context.Inventarios.AddAsync(inventario);
    }

    public async Task AddMovimientoAsync(MovimientoInventario movimiento)
    {
        await _context.MovimientosInventario.AddAsync(movimiento);
    }
}
