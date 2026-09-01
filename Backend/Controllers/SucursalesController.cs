using InventarioMultiSucursal.Api.Data;
using InventarioMultiSucursal.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InventarioMultiSucursal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SucursalesController : ControllerBase
{
    private readonly AppDbContext _context;

    public SucursalesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Sucursal>>> GetAll()
    {
        return await _context.Sucursales.ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Sucursal>> GetById(int id)
    {
        var sucursal = await _context.Sucursales.FindAsync(id);

        if (sucursal is null)
        {
            return NotFound();
        }

        return sucursal;
    }

    [HttpPost]
    public async Task<ActionResult<Sucursal>> Create(Sucursal sucursal)
    {
        sucursal.CreatedAt = DateTime.UtcNow;

        _context.Sucursales.Add(sucursal);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = sucursal.Id }, sucursal);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, Sucursal sucursal)
    {
        if (id != sucursal.Id)
        {
            return BadRequest("El id de la ruta no coincide con el id del cuerpo de la petición.");
        }

        var existe = await _context.Sucursales.AnyAsync(s => s.Id == id);
        if (!existe)
        {
            return NotFound();
        }

        _context.Entry(sucursal).State = EntityState.Modified;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var sucursal = await _context.Sucursales.FindAsync(id);

        if (sucursal is null)
        {
            return NotFound();
        }

        _context.Sucursales.Remove(sucursal);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
