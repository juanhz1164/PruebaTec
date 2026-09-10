using InventarioMultiSucursal.Api.Auth;
using InventarioMultiSucursal.Api.DTOs;
using InventarioMultiSucursal.Api.Models;
using InventarioMultiSucursal.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InventarioMultiSucursal.Api.Controllers;

// Cualquier rol autenticado puede consultar y crear órdenes. Cambiar su
// estado se reparte según quién puede saberlo de verdad: el Administrador
// aprueba (Pendiente -> Confirmada) y cancela, pero solo el Gerente de la
// sucursal DESTINO de la orden puede marcarla como recibida (Confirmada ->
// Recibida), porque es quien físicamente ve llegar la mercancía — el Admin
// no tiene forma de saber si ya llegó.
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

    private int? SucursalIdUsuarioActual =>
        int.TryParse(User.FindFirst("sucursalId")?.Value, out var id) ? id : null;

    private bool EsAdmin => User.IsInRole(Roles.Admin);

    private bool EsGerente => User.IsInRole(Roles.Gerente);

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
    //
    // Confirmar y cancelar: solo Administrador (aprueba la compra a nivel de
    // red). Marcar recibida: solo el Gerente de la sucursal a la que llega la
    // orden — es quien físicamente recibe la mercancía, el Admin no puede
    // saber si ya llegó.
    [HttpPut("{id}/estado")]
    [Authorize(Roles = Roles.AdminYGerente)]
    public async Task<IActionResult> CambiarEstado(int id, CambiarEstadoOrdenCompraDto dto)
    {
        if (dto.Estado == EstadoOrdenCompra.Recibida)
        {
            if (!EsGerente)
            {
                return Forbid();
            }

            var orden = await _service.GetByIdAsync(id);
            if (orden is null)
            {
                return BadRequest("La orden de compra no existe.");
            }

            if (orden.SucursalId != SucursalIdUsuarioActual)
            {
                return Forbid();
            }
        }
        else if (!EsAdmin)
        {
            return Forbid();
        }

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
