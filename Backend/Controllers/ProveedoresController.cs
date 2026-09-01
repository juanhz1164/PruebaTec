using InventarioMultiSucursal.Api.Data;
using InventarioMultiSucursal.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InventarioMultiSucursal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProveedoresController : ControllerBase
{
    private readonly AppDbContext _context;

    public ProveedoresController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Proveedor>>> GetAll()
    {
        return await _context.Proveedores.ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Proveedor>> GetById(int id)
    {
        var proveedor = await _context.Proveedores.FindAsync(id);

        if (proveedor is null)
        {
            return NotFound();
        }

        return proveedor;
    }

    [HttpPost]
    public async Task<ActionResult<Proveedor>> Create(Proveedor proveedor)
    {
        proveedor.CreatedAt = DateTime.UtcNow;

        _context.Proveedores.Add(proveedor);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = proveedor.Id }, proveedor);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, Proveedor proveedor)
    {
        if (id != proveedor.Id)
        {
            return BadRequest("El id de la ruta no coincide con el id del cuerpo de la petición.");
        }

        var existe = await _context.Proveedores.AnyAsync(p => p.Id == id);
        if (!existe)
        {
            return NotFound();
        }

        _context.Entry(proveedor).State = EntityState.Modified;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var proveedor = await _context.Proveedores.FindAsync(id);

        if (proveedor is null)
        {
            return NotFound();
        }

        _context.Proveedores.Remove(proveedor);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
