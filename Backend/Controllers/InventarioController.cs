using InventarioMultiSucursal.Api.Auth;
using InventarioMultiSucursal.Api.DTOs;
using InventarioMultiSucursal.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InventarioMultiSucursal.Api.Controllers;

// Cualquier rol autenticado puede LEER el inventario de cualquier sucursal
// (pantalla "Inventario de sucursales", abierta a todos por diseño). Pero
// escribir (crear registro de stock, registrar movimientos) y consultar el
// historial detallado de movimientos de Gerente/Operador queda limitado a su
// propia sucursal: de lo contrario cualquier cliente autenticado podía crear
// stock o mover cantidades en una sucursal que no es la suya con solo cambiar
// el sucursalId del body/query.
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InventarioController : ControllerBase
{
    private readonly IInventarioService _service;

    public InventarioController(IInventarioService service)
    {
        _service = service;
    }

    private int? SucursalIdUsuarioActual =>
        int.TryParse(User.FindFirst("sucursalId")?.Value, out var id) ? id : null;

    private bool EsAdmin => User.IsInRole(Roles.Admin);

    // GET api/Inventario?sucursalId=1
    // Catálogo de productos con su stock en una sucursal específica. Lectura
    // abierta a cualquier rol para cualquier sucursal (pantalla "Inventario de
    // sucursales"), sin restricción — esto es intencional, no un bug.
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
    // (cuando ese producto todavía no existe en esa sucursal). Gerente/Operador
    // solo pueden crear stock en su propia sucursal.
    [HttpPost]
    public async Task<ActionResult<InventarioDto>> Create(CrearInventarioDto dto)
    {
        if (!EsAdmin && dto.SucursalId != SucursalIdUsuarioActual)
        {
            return Forbid();
        }

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
    // Solo Admin puede consultar libremente cualquier sucursal (o todas, sin
    // filtro); Gerente/Operador quedan fijados a la suya, ignorando cualquier
    // sucursalId distinto que envíen.
    [HttpGet("movimientos")]
    public async Task<ActionResult<IEnumerable<MovimientoInventarioDto>>> GetMovimientos(
        [FromQuery] int? productoId,
        [FromQuery] int? sucursalId)
    {
        var sucursalEfectiva = EsAdmin ? sucursalId : SucursalIdUsuarioActual;
        return Ok(await _service.GetMovimientosAsync(productoId, sucursalEfectiva));
    }

    // POST api/Inventario/movimientos
    // Registra un ingreso o retiro (compra, devolución, ajuste, venta, merma) y
    // actualiza el stock correspondiente de forma atómica. Gerente/Operador
    // solo pueden registrar movimientos en su propia sucursal.
    [HttpPost("movimientos")]
    public async Task<ActionResult<MovimientoInventarioDto>> CrearMovimiento(CrearMovimientoInventarioDto dto)
    {
        if (!EsAdmin && dto.SucursalId != SucursalIdUsuarioActual)
        {
            return Forbid();
        }

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
