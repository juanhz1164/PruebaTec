using InventarioMultiSucursal.Api.DTOs;
using InventarioMultiSucursal.Api.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace InventarioMultiSucursal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductosController : ControllerBase
{
    private readonly IProductoService _service;

    public ProductosController(IProductoService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProductoDto>>> GetAll()
    {
        return Ok(await _service.GetAllAsync());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ProductoDto>> GetById(int id)
    {
        var producto = await _service.GetByIdAsync(id);
        return producto is null ? NotFound() : Ok(producto);
    }

    [HttpPost]
    public async Task<ActionResult<ProductoDto>> Create(CrearProductoDto dto)
    {
        var creado = await _service.CrearAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = creado.Id }, creado);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, ActualizarProductoDto dto)
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

    // POST api/Productos/5/unidades-alternativas
    // T35: registra una unidad de medida alternativa para el producto
    // (ej. el producto se maneja en "unidad" pero también se compra por "caja").
    [HttpPost("{id}/unidades-alternativas")]
    public async Task<ActionResult<UnidadAlternativaDto>> AgregarUnidadAlternativa(int id, CrearUnidadAlternativaDto dto)
    {
        var resultado = await _service.AgregarUnidadAlternativaAsync(id, dto);

        if (!resultado.Exitoso)
        {
            return BadRequest(resultado.Error);
        }

        return CreatedAtAction(nameof(GetById), new { id }, resultado.Unidad);
    }

    // DELETE api/Productos/5/unidades-alternativas/3
    [HttpDelete("{id}/unidades-alternativas/{unidadAlternativaId}")]
    public async Task<IActionResult> EliminarUnidadAlternativa(int id, int unidadAlternativaId)
    {
        var eliminada = await _service.EliminarUnidadAlternativaAsync(id, unidadAlternativaId);
        return eliminada ? NoContent() : NotFound();
    }

    // GET api/Productos/alertas-stock?sucursalId=1
    // T34: productos cuyo inventario llegó al stock mínimo o por debajo.
    [HttpGet("alertas-stock")]
    public async Task<ActionResult<IEnumerable<AlertaStockDto>>> GetAlertasStock([FromQuery] int? sucursalId)
    {
        return Ok(await _service.GetAlertasStockAsync(sucursalId));
    }
}
