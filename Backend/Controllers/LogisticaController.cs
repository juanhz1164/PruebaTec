using InventarioMultiSucursal.Api.DTOs;
using InventarioMultiSucursal.Api.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace InventarioMultiSucursal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LogisticaController : ControllerBase
{
    private readonly ILogisticaService _service;

    public LogisticaController(ILogisticaService service)
    {
        _service = service;
    }

    // GET api/Logistica/tiempos-envio
    // T48: tiempos estimados vs. reales de las transferencias ya enviadas.
    [HttpGet("tiempos-envio")]
    public async Task<ActionResult<IEnumerable<TiempoEnvioDto>>> GetTiemposEnvio()
    {
        return Ok(await _service.GetTiemposEnvioAsync());
    }

    // GET api/Logistica/rutas
    // T49: clasificación de rutas por prioridad, costo y tiempo promedio.
    [HttpGet("rutas")]
    public async Task<ActionResult<IEnumerable<ClasificacionRutaDto>>> GetClasificacionRutas()
    {
        return Ok(await _service.GetClasificacionRutasAsync());
    }

    // GET api/Logistica/en-curso
    // T50: transferencias que aún no llegaron a un estado final.
    [HttpGet("en-curso")]
    public async Task<ActionResult<IEnumerable<TransferenciaEnCursoDto>>> GetEnCurso()
    {
        return Ok(await _service.GetTransferenciasEnCursoAsync());
    }

    // GET api/Logistica/cumplimiento/sucursal
    // T51: % de entregas completas y a tiempo, agrupado por sucursal de origen.
    [HttpGet("cumplimiento/sucursal")]
    public async Task<ActionResult<IEnumerable<CumplimientoDto>>> GetCumplimientoPorSucursal()
    {
        return Ok(await _service.GetCumplimientoPorSucursalAsync());
    }

    // GET api/Logistica/cumplimiento/ruta
    // T51: % de entregas completas y a tiempo, agrupado por ruta.
    [HttpGet("cumplimiento/ruta")]
    public async Task<ActionResult<IEnumerable<CumplimientoDto>>> GetCumplimientoPorRuta()
    {
        return Ok(await _service.GetCumplimientoPorRutaAsync());
    }
}
