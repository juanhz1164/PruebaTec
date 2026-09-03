using InventarioMultiSucursal.Api.DTOs;
using InventarioMultiSucursal.Api.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace InventarioMultiSucursal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TransferenciasController : ControllerBase
{
    private readonly ITransferenciaService _service;

    public TransferenciasController(ITransferenciaService service)
    {
        _service = service;
    }

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
    // T45: marca la transferencia como en preparación.
    [HttpPut("{id}/preparar")]
    public async Task<IActionResult> Preparar(int id)
    {
        var resultado = await _service.IniciarPreparacionAsync(id);
        return resultado.Exitoso ? Ok(resultado.Transferencia) : BadRequest(resultado.Error);
    }

    // PUT api/Transferencias/5/enviar
    // T45: confirma el envío (transportista, ruta, fecha estimada, cantidades enviadas)
    // y retira el stock correspondiente de la sucursal de origen.
    [HttpPut("{id}/enviar")]
    public async Task<IActionResult> RegistrarEnvio(int id, RegistrarEnvioDto dto)
    {
        var resultado = await _service.RegistrarEnvioAsync(id, dto);
        return resultado.Exitoso ? Ok(resultado.Transferencia) : BadRequest(resultado.Error);
    }

    // PUT api/Transferencias/5/recibir
    // T46/T47: confirma la recepción (completa o parcial) e ingresa el stock recibido
    // a la sucursal destino.
    [HttpPut("{id}/recibir")]
    public async Task<IActionResult> ConfirmarRecepcion(int id, ConfirmarRecepcionDto dto)
    {
        var resultado = await _service.ConfirmarRecepcionAsync(id, dto);
        return resultado.Exitoso ? Ok(resultado.Transferencia) : BadRequest(resultado.Error);
    }

    [HttpPut("{id}/cancelar")]
    public async Task<IActionResult> Cancelar(int id)
    {
        var resultado = await _service.CancelarAsync(id);
        return resultado.Exitoso ? Ok(resultado.Transferencia) : BadRequest(resultado.Error);
    }
}
