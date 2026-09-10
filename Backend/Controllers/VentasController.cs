using InventarioMultiSucursal.Api.Auth;
using InventarioMultiSucursal.Api.DTOs;
using InventarioMultiSucursal.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InventarioMultiSucursal.Api.Controllers;

// Cualquier rol autenticado puede operar este módulo, pero Gerente/Operador
// quedan limitados a su propia sucursal: listar solo trae sus ventas, y crear
// solo se permite si el SucursalId del DTO coincide con la suya (de lo
// contrario cualquier cliente autenticado podía leer o crear ventas —
// incluyendo datos de cliente y descuento real de stock — en una sucursal
// que no es la suya con solo cambiar ese campo).
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

    private int? SucursalIdUsuarioActual =>
        int.TryParse(User.FindFirst("sucursalId")?.Value, out var id) ? id : null;

    private bool EsAdmin => User.IsInRole(Roles.Admin);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<VentaDto>>> GetAll()
    {
        var sucursalId = EsAdmin ? null : SucursalIdUsuarioActual;
        return Ok(await _service.GetAllAsync(sucursalId));
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
    // y retorna el comprobante generado (T43). Gerente/Operador solo pueden
    // registrar ventas en su propia sucursal.
    [HttpPost]
    public async Task<ActionResult<VentaDto>> Create(CrearVentaDto dto)
    {
        if (!EsAdmin && dto.SucursalId != SucursalIdUsuarioActual)
        {
            return Forbid();
        }

        var resultado = await _service.CrearAsync(dto);

        if (!resultado.Exitoso)
        {
            return BadRequest(resultado.Error);
        }

        return CreatedAtAction(nameof(GetById), new { id = resultado.Venta!.Id }, resultado.Venta);
    }
}
