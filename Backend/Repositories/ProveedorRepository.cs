using InventarioMultiSucursal.Api.Data;
using InventarioMultiSucursal.Api.Models;
using InventarioMultiSucursal.Api.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace InventarioMultiSucursal.Api.Repositories;

public class ProveedorRepository : IProveedorRepository
{
    private readonly AppDbContext _context;

    public ProveedorRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<Proveedor>> GetAllAsync() => await _context.Proveedores.ToListAsync();

    public async Task<Proveedor?> GetByIdAsync(int id) => await _context.Proveedores.FindAsync(id);

    public async Task AddAsync(Proveedor proveedor) => await _context.Proveedores.AddAsync(proveedor);

    public Task<int> SaveChangesAsync() => _context.SaveChangesAsync();

    public void Remove(Proveedor proveedor) => _context.Proveedores.Remove(proveedor);
}
