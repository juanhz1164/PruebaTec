using InventarioMultiSucursal.Api.Data;
using InventarioMultiSucursal.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InventarioMultiSucursal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InventarioController : ControllerBase
{
    private readonly AppDbContext _context;

    public InventarioController(AppDbContext context)
    {
        _context = context;
    }

    // GET api/Inventario?sucursalId=1
    // Catálogo de productos con su stock en una sucursal específica.
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Inventario>>> GetPorSucursal([FromQuery] int sucursalId)
    {
        return await _context.Inventarios
            .Where(i => i.SucursalId == sucursalId)
            .Include(i => i.Producto)
                .ThenInclude(p => p!.UnidadMedida)
            .ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Inventario>> GetById(int id)
    {
        var item = await _context.Inventarios
            .Include(i => i.Producto)
                .ThenInclude(p => p!.UnidadMedida)
            .FirstOrDefaultAsync(i => i.Id == id);

        if (item is null)
        {
            return NotFound();
        }

        return item;
    }

    // POST api/Inventario
    // Crea el registro de stock inicial de un producto en una sucursal
    // (cuando ese producto todavía no existe en esa sucursal).
    [HttpPost]
    public async Task<ActionResult<Inventario>> Create(Inventario item)
    {
        item.UpdatedAt = DateTime.UtcNow;

        _context.Inventarios.Add(item);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = item.Id }, item);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, Inventario item)
    {
        if (id != item.Id)
        {
            return BadRequest("El id de la ruta no coincide con el id del cuerpo de la petición.");
        }

        var existente = await _context.Inventarios.FindAsync(id);
        if (existente is null)
        {
            return NotFound();
        }

        existente.Cantidad = item.Cantidad;
        existente.StockMinimo = item.StockMinimo;
        existente.CostoPromedio = item.CostoPromedio;
        existente.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return NoContent();
    }
}
