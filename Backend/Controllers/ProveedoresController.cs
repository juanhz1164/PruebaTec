using InventarioMultiSucursal.Api.DTOs;
using InventarioMultiSucursal.Api.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace InventarioMultiSucursal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProveedoresController : ControllerBase
{
    private readonly IProveedorService _service;

    public ProveedoresController(IProveedorService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProveedorDto>>> GetAll()
    {
        return Ok(await _service.GetAllAsync());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ProveedorDto>> GetById(int id)
    {
        var proveedor = await _service.GetByIdAsync(id);
        return proveedor is null ? NotFound() : Ok(proveedor);
    }

    [HttpPost]
    public async Task<ActionResult<ProveedorDto>> Create(CrearProveedorDto dto)
    {
        var creado = await _service.CrearAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = creado.Id }, creado);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, ActualizarProveedorDto dto)
    {
        var actualizado = await _service.ActualizarAsync(id, dto);
        return actualizado ? NoContent() : NotFound();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var eliminado = await _service.EliminarAsync(id);
        return eliminado ? NoContent() : NotFound();
    }
}
