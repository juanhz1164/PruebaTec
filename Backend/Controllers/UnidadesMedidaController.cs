using InventarioMultiSucursal.Api.DTOs;
using InventarioMultiSucursal.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InventarioMultiSucursal.Api.Controllers;

// Catálogo de solo lectura: se usa para poblar el selector de unidad de
// medida al crear o editar un producto (PDF §6.2, alta de productos).
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UnidadesMedidaController : ControllerBase
{
    private readonly IUnidadMedidaService _service;

    public UnidadesMedidaController(IUnidadMedidaService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<UnidadMedidaDto>>> GetAll()
    {
        return Ok(await _service.GetAllAsync());
    }
}
