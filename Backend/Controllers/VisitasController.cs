using System.Security.Claims;
using InventarioMultiSucursal.Api.Auth;
using InventarioMultiSucursal.Api.DTOs;
using InventarioMultiSucursal.Api.Services;
using InventarioMultiSucursal.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InventarioMultiSucursal.Api.Controllers;

// Control de ingreso de visitantes por sucursal.
//
// Registrar/consultar/eliminar visitas del día (T*): solo Operador y Gerente,
// cada uno sobre su propia sucursal.
//
// Flujo de personas (día/mes, comparación entre sucursales): Gerente ve solo
// su sucursal (se usa en el Dashboard); Administrador general ve todas las
// sucursales y puede compararlas (se usa en Comparación de sucursales). El
// Operador NO tiene acceso a esta parte del módulo (no aparece esta info en
// ninguna pantalla a la que él entre).
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class VisitasController : ControllerBase
{
    private readonly IVisitaService _service;

    public VisitasController(IVisitaService service)
    {
        _service = service;
    }

    private int? SucursalIdUsuarioActual =>
        int.TryParse(User.FindFirst("sucursalId")?.Value, out var id) ? id : null;

    private int UsuarioIdActual =>
        int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    private bool EsGerente => User.IsInRole(Roles.Gerente);

    private bool EsAdmin => User.IsInRole(Roles.Admin);

    // GET api/Visitas?fecha=2026-09-06&sucursalId=1
    // El Operador siempre consulta su propia sucursal (se ignora cualquier
    // sucursalId que intente pasar). El Gerente puede consultar su sucursal
    // o, si pasa sucursalId=null (sin parámetro) y quiere el agregado de la
    // red, usar GET /resumen-por-sucursal en su lugar.
    [HttpGet]
    [Authorize(Roles = Roles.GerenteYOperador)]
    public async Task<ActionResult<IEnumerable<VisitaDto>>> Get([FromQuery] DateOnly? fecha)
    {
        var sucursalId = SucursalIdUsuarioActual;
        if (sucursalId is null)
        {
            return BadRequest("Tu usuario no tiene una sucursal asignada.");
        }

        var dia = fecha ?? DateOnly.FromDateTime(ZonaHorariaColombia.ALocal(DateTime.UtcNow));
        return Ok(await _service.GetPorSucursalYFechaAsync(sucursalId, dia));
    }

    // GET api/Visitas/resumen?fecha=2026-09-06
    // KPIs (visitas, personas, promedio) y visitas/personas por hora del día consultado.
    [HttpGet("resumen")]
    [Authorize(Roles = Roles.GerenteYOperador)]
    public async Task<ActionResult<ResumenVisitasDto>> GetResumen([FromQuery] DateOnly? fecha)
    {
        var sucursalId = SucursalIdUsuarioActual;
        if (sucursalId is null)
        {
            return BadRequest("Tu usuario no tiene una sucursal asignada.");
        }

        var dia = fecha ?? DateOnly.FromDateTime(ZonaHorariaColombia.ALocal(DateTime.UtcNow));
        return Ok(await _service.GetResumenAsync(sucursalId, dia));
    }

    // GET api/Visitas/resumen-por-sucursal?fecha=2026-09-06
    // Solo Gerente: desglose de visitas/personas por cada sucursal de la red.
    [HttpGet("resumen-por-sucursal")]
    [Authorize(Roles = Roles.Gerente)]
    public async Task<ActionResult<IEnumerable<VisitasPorSucursalDto>>> GetResumenPorSucursal([FromQuery] DateOnly? fecha)
    {
        var dia = fecha ?? DateOnly.FromDateTime(ZonaHorariaColombia.ALocal(DateTime.UtcNow));
        return Ok(await _service.GetResumenPorSucursalAsync(dia));
    }

    // POST api/Visitas
    // Registra una visita (un grupo). Sucursal, usuario y fecha/hora los fija
    // el backend a partir del usuario autenticado; el cliente solo envía
    // cuántas personas ingresan.
    [HttpPost]
    [Authorize(Roles = Roles.GerenteYOperador)]
    public async Task<ActionResult<VisitaDto>> Registrar(CrearVisitaDto dto)
    {
        var sucursalId = SucursalIdUsuarioActual;
        if (sucursalId is null)
        {
            return BadRequest("Tu usuario no tiene una sucursal asignada.");
        }

        var resultado = await _service.RegistrarAsync(sucursalId.Value, UsuarioIdActual, dto);
        return resultado.Exitoso ? Ok(resultado.Visita) : BadRequest(resultado.Error);
    }

    // DELETE api/Visitas/5
    [HttpDelete("{id}")]
    [Authorize(Roles = Roles.GerenteYOperador)]
    public async Task<IActionResult> Eliminar(int id)
    {
        // El Gerente solo puede eliminar via este endpoint las visitas de su propia
        // sucursal (igual que el Operador); no hay rol con alcance multi-sucursal aquí.
        var resultado = await _service.EliminarAsync(id, SucursalIdUsuarioActual);
        return resultado.Exitoso ? NoContent() : BadRequest(resultado.Error);
    }

    // GET api/Visitas/flujo/dia?fecha=2026-09-15
    // Flujo de personas de un día específico. El Gerente solo ve su propia
    // sucursal (se ignora cualquier sucursalId que intente pasar); el
    // Administrador general ve todas las sucursales y puede compararlas.
    [HttpGet("flujo/dia")]
    [Authorize(Roles = Roles.AdminYGerente)]
    public async Task<ActionResult<FlujoPersonasResumenDto>> GetFlujoPorDia([FromQuery] DateOnly? fecha)
    {
        var dia = fecha ?? DateOnly.FromDateTime(ZonaHorariaColombia.ALocal(DateTime.UtcNow));
        var sucursalId = EsAdmin ? null : SucursalIdUsuarioActual;

        if (!EsAdmin && sucursalId is null)
        {
            return BadRequest("Tu usuario no tiene una sucursal asignada.");
        }

        return Ok(await _service.GetFlujoPorDiaAsync(sucursalId, dia));
    }

    // GET api/Visitas/flujo/mes?anio=2026&mes=9
    // Flujo de personas de un mes completo, con desglose por sucursal y
    // flujo día a día. Mismo alcance que el endpoint por día: Gerente => su
    // sucursal; Administrador general => toda la red.
    [HttpGet("flujo/mes")]
    [Authorize(Roles = Roles.AdminYGerente)]
    public async Task<ActionResult<FlujoPersonasResumenDto>> GetFlujoPorMes([FromQuery] int anio, [FromQuery] int mes)
    {
        if (mes < 1 || mes > 12)
        {
            return BadRequest("El mes debe estar entre 1 y 12.");
        }

        var sucursalId = EsAdmin ? null : SucursalIdUsuarioActual;

        if (!EsAdmin && sucursalId is null)
        {
            return BadRequest("Tu usuario no tiene una sucursal asignada.");
        }

        return Ok(await _service.GetFlujoPorMesAsync(sucursalId, anio, mes));
    }
}
