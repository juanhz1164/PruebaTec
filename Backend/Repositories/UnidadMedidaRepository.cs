using InventarioMultiSucursal.Api.Data;
using InventarioMultiSucursal.Api.Models;
using InventarioMultiSucursal.Api.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace InventarioMultiSucursal.Api.Repositories;

public class UnidadMedidaRepository : IUnidadMedidaRepository
{
    private readonly AppDbContext _context;

    public UnidadMedidaRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<UnidadMedida>> GetAllAsync() => await _context.UnidadesMedida.ToListAsync();
}
