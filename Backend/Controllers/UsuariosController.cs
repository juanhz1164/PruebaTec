using InventarioMultiSucursal.Api.Auth;
using InventarioMultiSucursal.Api.DTOs;
using InventarioMultiSucursal.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InventarioMultiSucursal.Api.Controllers;

// Gestión de usuarios: responsabilidad exclusiva del Administrador general (PDF §6.2).
// Los demás roles solo pueden consultar (necesitan la lista para otros formularios).
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsuariosController : ControllerBase
{
    private readonly IUsuarioService _service;

    public UsuariosController(IUsuarioService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<UsuarioDto>>> GetAll()
    {
        return Ok(await _service.GetAllAsync());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<UsuarioDto>> GetById(int id)
    {
        var usuario = await _service.GetByIdAsync(id);
        return usuario is null ? NotFound() : Ok(usuario);
    }

    [HttpPost]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<UsuarioDto>> Create(CrearUsuarioDto dto)
    {
        var creado = await _service.CrearAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = creado.Id }, creado);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> Update(int id, ActualizarUsuarioDto dto)
    {
        var actualizado = await _service.ActualizarAsync(id, dto);
        return actualizado ? NoContent() : NotFound();
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
