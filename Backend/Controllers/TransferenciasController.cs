using InventarioMultiSucursal.Api.Auth;
using InventarioMultiSucursal.Api.DTOs;
using InventarioMultiSucursal.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InventarioMultiSucursal.Api.Controllers;

// Cualquier rol autenticado puede consultar y solicitar (T44) una transferencia
// entre dos sucursales cualesquiera (el Administrador general no está atado a
// una sucursal y puede pedirle a cualquier sucursal que transfiera a otra).
//
// Pero preparar/enviar (T45) y confirmar recepción (T46/T47) son operaciones
// físicas que solo puede realizar quien está en la sucursal correspondiente:
// el Gerente de la sucursal ORIGEN prepara y envía; el Gerente de la sucursal
// DESTINO confirma la recepción. El Administrador general no participa en
// estos pasos porque no está físicamente en ninguna sucursal.
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TransferenciasController : ControllerBase
{
    private readonly ITransferenciaService _service;

    public TransferenciasController(ITransferenciaService service)
    {
        _service = service;
    }

    private int? SucursalIdUsuarioActual =>
        int.TryParse(User.FindFirst("sucursalId")?.Value, out var id) ? id : null;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TransferenciaDto>>> GetAll()
    {
        return Ok(await _service.GetAllAsync());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TransferenciaDto>> GetById(int id)
    {
        var transferencia = await _service.GetByIdAsync(id);
        return transferencia is null ? NotFound() : Ok(transferencia);
    }

    // POST api/Transferencias
    // T44: solicita una transferencia entre sucursales.
    [HttpPost]
    public async Task<ActionResult<TransferenciaDto>> Create(CrearTransferenciaDto dto)
    {
        var resultado = await _service.CrearAsync(dto);
        if (!resultado.Exitoso)
        {
            return BadRequest(resultado.Error);
        }

        return CreatedAtAction(nameof(GetById), new { id = resultado.Transferencia!.Id }, resultado.Transferencia);
    }

    // PUT api/Transferencias/5/preparar
    // T45: marca la transferencia como en preparación. Solo el Gerente de la
    // sucursal de ORIGEN (quien físicamente prepara el envío).
    [HttpPut("{id}/preparar")]
    [Authorize(Roles = Roles.Gerente)]
    public async Task<IActionResult> Preparar(int id)
    {
        var transferencia = await _service.GetByIdAsync(id);
        if (transferencia is null)
        {
            return BadRequest("La transferencia no existe.");
        }

        if (transferencia.SucursalOrigenId != SucursalIdUsuarioActual)
        {
            return Forbid();
        }

        var resultado = await _service.IniciarPreparacionAsync(id);
        return resultado.Exitoso ? Ok(resultado.Transferencia) : BadRequest(resultado.Error);
    }

    // PUT api/Transferencias/5/enviar
    // T45: confirma el envío (transportista, ruta, fecha estimada, cantidades enviadas)
    // y retira el stock correspondiente de la sucursal de origen. Solo el Gerente
    // de la sucursal de ORIGEN.
    [HttpPut("{id}/enviar")]
    [Authorize(Roles = Roles.Gerente)]
    public async Task<IActionResult> RegistrarEnvio(int id, RegistrarEnvioDto dto)
    {
        var transferencia = await _service.GetByIdAsync(id);
        if (transferencia is null)
        {
            return BadRequest("La transferencia no existe.");
        }

        if (transferencia.SucursalOrigenId != SucursalIdUsuarioActual)
        {
            return Forbid();
        }

        var resultado = await _service.RegistrarEnvioAsync(id, dto);
        return resultado.Exitoso ? Ok(resultado.Transferencia) : BadRequest(resultado.Error);
    }

    // PUT api/Transferencias/5/recibir
    // T46/T47: confirma la recepción (completa o parcial) e ingresa el stock recibido
    // a la sucursal destino. Solo el Gerente de la sucursal DESTINO (quien
    // físicamente recibe la mercancía).
    [HttpPut("{id}/recibir")]
    [Authorize(Roles = Roles.Gerente)]
    public async Task<IActionResult> ConfirmarRecepcion(int id, ConfirmarRecepcionDto dto)
    {
        var transferencia = await _service.GetByIdAsync(id);
        if (transferencia is null)
        {
            return BadRequest("La transferencia no existe.");
        }

        if (transferencia.SucursalDestinoId != SucursalIdUsuarioActual)
        {
            return Forbid();
        }

        var resultado = await _service.ConfirmarRecepcionAsync(id, dto);
        return resultado.Exitoso ? Ok(resultado.Transferencia) : BadRequest(resultado.Error);
    }

    [HttpPut("{id}/cancelar")]
    public async Task<IActionResult> Cancelar(int id)
    {
        var resultado = await _service.CancelarAsync(id);
        return resultado.Exitoso ? Ok(resultado.Transferencia) : BadRequest(resultado.Error);
    }

    // GET api/Transferencias/rutas-logisticas
    // Configuración de logística por ruta (transportista/costo/tiempo estimado
    // por defecto): el frontend la consulta para prellenar el modal de envío
    // en vez de que el Gerente invente esos valores cada vez.
    [HttpGet("rutas-logisticas")]
    public async Task<ActionResult<IEnumerable<RutaLogisticaDto>>> GetRutasLogisticas()
    {
        return Ok(await _service.GetRutasLogisticasAsync());
    }

    // GET api/Transferencias/rutas-logisticas/origen/5/destino/2
    [HttpGet("rutas-logisticas/origen/{sucursalOrigenId}/destino/{sucursalDestinoId}")]
    public async Task<ActionResult<RutaLogisticaDto>> GetRutaLogistica(int sucursalOrigenId, int sucursalDestinoId)
    {
        var ruta = await _service.GetRutaLogisticaAsync(sucursalOrigenId, sucursalDestinoId);
        return ruta is null ? NotFound() : Ok(ruta);
    }
}
