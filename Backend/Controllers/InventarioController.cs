using InventarioMultiSucursal.Api.DTOs;
using InventarioMultiSucursal.Api.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace InventarioMultiSucursal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InventarioController : ControllerBase
{
    private readonly IInventarioService _service;

    public InventarioController(IInventarioService service)
    {
        _service = service;
    }

    // GET api/Inventario?sucursalId=1
    // Catálogo de productos con su stock en una sucursal específica.
    [HttpGet]
    public async Task<ActionResult<IEnumerable<InventarioDto>>> GetPorSucursal([FromQuery] int sucursalId)
    {
        return Ok(await _service.GetPorSucursalAsync(sucursalId));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<InventarioDto>> GetById(int id)
    {
        var item = await _service.GetByIdAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    // POST api/Inventario
    // Crea el registro de stock inicial de un producto en una sucursal
    // (cuando ese producto todavía no existe en esa sucursal).
    [HttpPost]
    public async Task<ActionResult<InventarioDto>> Create(CrearInventarioDto dto)
    {
        var creado = await _service.CrearAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = creado.Id }, creado);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, ActualizarInventarioDto dto)
    {
        var actualizado = await _service.ActualizarAsync(id, dto);
        return actualizado ? NoContent() : NotFound();
    }

    // GET api/Inventario/movimientos?productoId=1&sucursalId=1
    // Historial de movimientos (ingresos/retiros) con trazabilidad completa.
    [HttpGet("movimientos")]
    public async Task<ActionResult<IEnumerable<MovimientoInventarioDto>>> GetMovimientos(
        [FromQuery] int? productoId,
        [FromQuery] int? sucursalId)
    {
        return Ok(await _service.GetMovimientosAsync(productoId, sucursalId));
    }

    // POST api/Inventario/movimientos
    // Registra un ingreso o retiro (compra, devolución, ajuste, venta, merma) y
    // actualiza el stock correspondiente de forma atómica.
    [HttpPost("movimientos")]
    public async Task<ActionResult<MovimientoInventarioDto>> CrearMovimiento(CrearMovimientoInventarioDto dto)
    {
        var resultado = await _service.CrearMovimientoAsync(dto);

        if (!resultado.Exitoso)
        {
            return BadRequest(resultado.Error);
        }

        return CreatedAtAction(
            nameof(GetMovimientos),
            new { productoId = dto.ProductoId, sucursalId = dto.SucursalId },
            resultado.Movimiento);
    }
}
