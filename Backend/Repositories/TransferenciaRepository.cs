using InventarioMultiSucursal.Api.Data;
using InventarioMultiSucursal.Api.Models;
using InventarioMultiSucursal.Api.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace InventarioMultiSucursal.Api.Repositories;

public class TransferenciaRepository : ITransferenciaRepository
{
    private readonly AppDbContext _context;

    public TransferenciaRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<Transferencia>> GetAllAsync()
    {
        return await ConsultaBase()
            .OrderByDescending(t => t.FechaSolicitud)
            .ToListAsync();
    }

    public async Task<Transferencia?> GetByIdAsync(int id)
    {
        return await ConsultaBase()
            .FirstOrDefaultAsync(t => t.Id == id);
    }

    public async Task AddAsync(Transferencia transferencia)
    {
        await _context.Transferencias.AddAsync(transferencia);
    }

    public Task<int> SaveChangesAsync() => _context.SaveChangesAsync();

    public Task<IDbContextTransaction> BeginTransactionAsync() => _context.Database.BeginTransactionAsync();

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

    private IQueryable<Transferencia> ConsultaBase() => _context.Transferencias
        .Include(t => t.SucursalOrigen)
        .Include(t => t.SucursalDestino)
        .Include(t => t.UsuarioSolicitante)
        .Include(t => t.UsuarioPreparador)
        .Include(t => t.UsuarioEnvio)
        .Include(t => t.UsuarioRecepcion)
        .Include(t => t.Lineas)
            .ThenInclude(l => l.Producto);

    public async Task<List<Transferencia>> GetEnviadasAsync()
    {
        return await ConsultaBase()
            .Where(t => t.FechaEnvio != null)
            .OrderByDescending(t => t.FechaEnvio)
            .ToListAsync();
    }

    public async Task<List<Transferencia>> GetEnCursoAsync()
    {
        return await ConsultaBase()
            .Where(t => t.Estado == EstadoTransferencia.EnPreparacion || t.Estado == EstadoTransferencia.EnTransito)
            .OrderByDescending(t => t.FechaSolicitud)
            .ToListAsync();
    }

    public async Task<List<Transferencia>> GetCerradasAsync()
    {
        return await ConsultaBase()
            .Where(t => t.Estado == EstadoTransferencia.RecibidaCompleta || t.Estado == EstadoTransferencia.RecibidaParcial)
            .OrderByDescending(t => t.FechaRecepcion)
            .ToListAsync();
    }

    public async Task<RutaLogistica?> GetRutaLogisticaAsync(int sucursalOrigenId, int sucursalDestinoId)
    {
        return await _context.RutasLogisticas
            .FirstOrDefaultAsync(r => r.SucursalOrigenId == sucursalOrigenId && r.SucursalDestinoId == sucursalDestinoId);
    }

    public async Task<List<RutaLogistica>> GetRutasLogisticasAsync()
    {
        return await _context.RutasLogisticas
            .Include(r => r.SucursalOrigen)
            .Include(r => r.SucursalDestino)
            .ToListAsync();
    }
}
