using InventarioMultiSucursal.Api.Auth;
using InventarioMultiSucursal.Api.DTOs;
using InventarioMultiSucursal.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InventarioMultiSucursal.Api.Controllers;

// Gestión de sucursales: responsabilidad exclusiva del Administrador general (PDF §6.2).
[ApiController]
[Route("api/[controller]")]
[Authorize]
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
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<SucursalDto>> Create(CrearSucursalDto dto)
    {
        var creada = await _service.CrearAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = creada.Id }, creada);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> Update(int id, ActualizarSucursalDto dto)
    {
        var actualizada = await _service.ActualizarAsync(id, dto);
        return actualizada ? NoContent() : NotFound();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> Delete(int id)
    {
        var resultado = await _service.EliminarAsync(id);
        if (resultado.NoEncontrado) return NotFound();
        if (!resultado.Exitoso) return Conflict(new { mensaje = resultado.Error });
        return NoContent();
    }
}
