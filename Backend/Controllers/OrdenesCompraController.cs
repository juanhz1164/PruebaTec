using InventarioMultiSucursal.Api.Data;
using InventarioMultiSucursal.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InventarioMultiSucursal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrdenesCompraController : ControllerBase
{
    private readonly AppDbContext _context;

    public OrdenesCompraController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<OrdenCompra>>> GetAll()
    {
        return await _context.OrdenesCompra
            .Include(oc => oc.Proveedor)
            .Include(oc => oc.Lineas)
                .ThenInclude(l => l.Producto)
            .ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<OrdenCompra>> GetById(int id)
    {
        var orden = await _context.OrdenesCompra
            .Include(oc => oc.Proveedor)
            .Include(oc => oc.Lineas)
                .ThenInclude(l => l.Producto)
            .FirstOrDefaultAsync(oc => oc.Id == id);

        if (orden is null)
        {
            return NotFound();
        }

        return orden;
    }

    // POST api/OrdenesCompra
    // Crea la orden y todas sus líneas juntas, en una sola petición.
    // El cuerpo debe traer la lista "Lineas" con al menos un producto.
    [HttpPost]
    public async Task<ActionResult<OrdenCompra>> Create(OrdenCompra orden)
    {
        if (orden.Lineas.Count == 0)
        {
            return BadRequest("La orden de compra debe tener al menos una línea.");
        }

        orden.Estado = EstadoOrdenCompra.Pendiente;
        orden.Fecha = DateTime.UtcNow;
        orden.FechaRecepcion = null;

        _context.OrdenesCompra.Add(orden);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = orden.Id }, orden);
    }

    // PUT api/OrdenesCompra/5/estado
    // Cambia únicamente el estado de la orden (pendiente -> confirmada -> recibida, o cancelada).
    // NOTA: cuando el estado pase a "Recibida", el módulo de Inventario (T37)
    // debe actualizar el stock de cada producto de las líneas — todavía no implementado aquí.
    [HttpPut("{id}/estado")]
    public async Task<IActionResult> CambiarEstado(int id, [FromBody] EstadoOrdenCompra nuevoEstado)
    {
        var orden = await _context.OrdenesCompra.FindAsync(id);

        if (orden is null)
        {
            return NotFound();
        }

        orden.Estado = nuevoEstado;

        if (nuevoEstado == EstadoOrdenCompra.Recibida)
        {
            orden.FechaRecepcion = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        return NoContent();
    }
}
