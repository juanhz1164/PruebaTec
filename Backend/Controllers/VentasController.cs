using InventarioMultiSucursal.Api.DTOs;
using InventarioMultiSucursal.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InventarioMultiSucursal.Api.Controllers;

// Cualquier rol autenticado puede operar este módulo.
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class VentasController : ControllerBase
{
    private readonly IVentaService _service;

    public VentasController(IVentaService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<VentaDto>>> GetAll()
    {
        return Ok(await _service.GetAllAsync());
    }

    // GET api/Ventas/5
    // Consulta el comprobante de una venta específica (T43).
    [HttpGet("{id}")]
    public async Task<ActionResult<VentaDto>> GetById(int id)
    {
        var venta = await _service.GetByIdAsync(id);
        return venta is null ? NotFound() : Ok(venta);
    }

    // POST api/Ventas
    // Registra una venta (T40), valida stock antes de confirmar (T41),
    // aplica precio base (costo promedio) + descuento por línea (T42),
    // y retorna el comprobante generado (T43).
    [HttpPost]
    public async Task<ActionResult<VentaDto>> Create(CrearVentaDto dto)
    {
        var resultado = await _service.CrearAsync(dto);

        if (!resultado.Exitoso)
        {
            return BadRequest(resultado.Error);
        }

        return CreatedAtAction(nameof(GetById), new { id = resultado.Venta!.Id }, resultado.Venta);
    }
}
