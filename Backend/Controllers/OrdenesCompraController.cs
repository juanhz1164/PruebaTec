using InventarioMultiSucursal.Api.DTOs;
using InventarioMultiSucursal.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InventarioMultiSucursal.Api.Controllers;

// Cualquier rol autenticado puede operar este módulo.
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OrdenesCompraController : ControllerBase
{
    private readonly IOrdenCompraService _service;

    public OrdenesCompraController(IOrdenCompraService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<OrdenCompraDto>>> GetAll()
    {
        return Ok(await _service.GetAllAsync());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<OrdenCompraDto>> GetById(int id)
    {
        var orden = await _service.GetByIdAsync(id);
        return orden is null ? NotFound() : Ok(orden);
    }

    // POST api/OrdenesCompra
    // Crea la orden y todas sus líneas juntas, en una sola petición.
    [HttpPost]
    public async Task<ActionResult<OrdenCompraDto>> Create(CrearOrdenCompraDto dto)
    {
        var resultado = await _service.CrearAsync(dto);

        if (!resultado.Exitoso)
        {
            return BadRequest(resultado.Error);
        }

        return CreatedAtAction(nameof(GetById), new { id = resultado.Orden!.Id }, resultado.Orden);
    }

    // PUT api/OrdenesCompra/5/estado
    // Cambia el estado de la orden. Pendiente -> Confirmada -> Recibida, o -> Cancelada.
    // Al pasar a "Recibida", actualiza el stock y el costo promedio ponderado
    // de cada producto de las líneas en la sucursal de la orden (T37, T39).
    [HttpPut("{id}/estado")]
    public async Task<IActionResult> CambiarEstado(int id, CambiarEstadoOrdenCompraDto dto)
    {
        var resultado = await _service.CambiarEstadoAsync(id, dto);

        if (!resultado.Exitoso)
        {
            return BadRequest(resultado.Error);
        }

        return Ok(resultado.Orden);
    }

    // GET api/OrdenesCompra/historico/proveedor/5
    // T38: histórico de líneas de compra a un proveedor específico.
    [HttpGet("historico/proveedor/{proveedorId}")]
    public async Task<ActionResult<IEnumerable<OrdenCompraLineaDto>>> GetHistoricoPorProveedor(int proveedorId)
    {
        return Ok(await _service.GetHistoricoPorProveedorAsync(proveedorId));
    }

    // GET api/OrdenesCompra/historico/producto/5
    // T38: histórico de compras de un producto específico, entre proveedores.
    [HttpGet("historico/producto/{productoId}")]
    public async Task<ActionResult<IEnumerable<OrdenCompraLineaDto>>> GetHistoricoPorProducto(int productoId)
    {
        return Ok(await _service.GetHistoricoPorProductoAsync(productoId));
    }
}
