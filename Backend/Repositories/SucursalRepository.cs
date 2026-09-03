using InventarioMultiSucursal.Api.Data;
using InventarioMultiSucursal.Api.Models;
using InventarioMultiSucursal.Api.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace InventarioMultiSucursal.Api.Repositories;

public class SucursalRepository : ISucursalRepository
{
    private readonly AppDbContext _context;

    public SucursalRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<Sucursal>> GetAllAsync()
    {
        return await _context.Sucursales.ToListAsync();
    }

    public async Task<Sucursal?> GetByIdAsync(int id)
    {
        return await _context.Sucursales.FindAsync(id);
    }

    public async Task AddAsync(Sucursal sucursal)
    {
        await _context.Sucursales.AddAsync(sucursal);
    }

    public Task<int> SaveChangesAsync() => _context.SaveChangesAsync();

    public void Remove(Sucursal sucursal) => _context.Sucursales.Remove(sucursal);
}
