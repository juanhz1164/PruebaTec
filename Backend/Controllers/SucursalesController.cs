using InventarioMultiSucursal.Api.DTOs;
using InventarioMultiSucursal.Api.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace InventarioMultiSucursal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SucursalesController : ControllerBase
{
    private readonly ISucursalService _service;

    public SucursalesController(ISucursalService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<SucursalDto>>> GetAll()
    {
        return Ok(await _service.GetAllAsync());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<SucursalDto>> GetById(int id)
    {
        var sucursal = await _service.GetByIdAsync(id);
        return sucursal is null ? NotFound() : Ok(sucursal);
    }

    [HttpPost]
    public async Task<ActionResult<SucursalDto>> Create(CrearSucursalDto dto)
    {
        var creada = await _service.CrearAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = creada.Id }, creada);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, ActualizarSucursalDto dto)
    {
        var actualizada = await _service.ActualizarAsync(id, dto);
        return actualizada ? NoContent() : NotFound();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var eliminada = await _service.EliminarAsync(id);
        return eliminada ? NoContent() : NotFound();
    }
}
