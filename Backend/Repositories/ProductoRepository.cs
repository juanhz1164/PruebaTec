using InventarioMultiSucursal.Api.Data;
using InventarioMultiSucursal.Api.Models;
using InventarioMultiSucursal.Api.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace InventarioMultiSucursal.Api.Repositories;

public class ProductoRepository : IProductoRepository
{
    private readonly AppDbContext _context;

    public ProductoRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<Producto>> GetAllAsync()
    {
        return await _context.Productos
            .Include(p => p.UnidadMedida)
            .Include(p => p.Proveedor)
            .Include(p => p.UnidadesAlternativas)
                .ThenInclude(ua => ua.UnidadMedida)
            .ToListAsync();
    }

    public async Task<Producto?> GetByIdAsync(int id)
    {
        return await _context.Productos
            .Include(p => p.UnidadMedida)
            .Include(p => p.Proveedor)
            .Include(p => p.UnidadesAlternativas)
                .ThenInclude(ua => ua.UnidadMedida)
            .FirstOrDefaultAsync(p => p.Id == id);
    }

    public async Task AddAsync(Producto producto)
    {
        await _context.Productos.AddAsync(producto);
    }

    public void Remove(Producto producto) => _context.Productos.Remove(producto);

    public Task<int> SaveChangesAsync() => _context.SaveChangesAsync();

    public async Task<ProductoUnidadMedida?> GetUnidadAlternativaAsync(int productoId, int unidadMedidaId)
    {
        return await _context.ProductoUnidadesMedida
            .FirstOrDefaultAsync(pum => pum.ProductoId == productoId && pum.UnidadMedidaId == unidadMedidaId);
    }

    public async Task AddUnidadAlternativaAsync(ProductoUnidadMedida unidad)
    {
        await _context.ProductoUnidadesMedida.AddAsync(unidad);
    }

    public async Task<ProductoUnidadMedida?> GetUnidadAlternativaByIdAsync(int id)
    {
        return await _context.ProductoUnidadesMedida
            .Include(pum => pum.UnidadMedida)
            .FirstOrDefaultAsync(pum => pum.Id == id);
    }

    public void RemoveUnidadAlternativa(ProductoUnidadMedida unidad) =>
        _context.ProductoUnidadesMedida.Remove(unidad);

    public async Task<List<Inventario>> GetInventarioBajoMinimoAsync(int? sucursalId)
    {
        var query = _context.Inventarios
            .Include(i => i.Producto)
            .Include(i => i.Sucursal)
            .Where(i => i.Cantidad <= i.StockMinimo)
            .AsQueryable();

        if (sucursalId.HasValue)
        {
            query = query.Where(i => i.SucursalId == sucursalId.Value);
        }

        return await query
            .OrderBy(i => i.SucursalId)
            .ThenBy(i => i.Producto!.Nombre)
            .ToListAsync();
    }
}
