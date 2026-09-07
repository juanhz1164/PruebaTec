using InventarioMultiSucursal.Api.Auth;
using InventarioMultiSucursal.Api.DTOs;
using InventarioMultiSucursal.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InventarioMultiSucursal.Api.Controllers;

// Cualquier rol autenticado puede consultar su propio dashboard (PDF §3.6: "cada
// sucursal debe contar con herramientas de análisis"). La comparativa entre
// sucursales (T56) es la única vista restringida a perfiles administrativos.
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _service;

    public DashboardController(IDashboardService service)
    {
        _service = service;
    }

    // GET api/Dashboard/ventas-por-mes?sucursalId=1&anio=2026&mes=9
    // T52: volumen de ventas del mes indicado (por defecto, el mes en curso)
    // vs. los 3 meses anteriores. anio/mes deben pasarse juntos; si se omiten,
    // se usa el mes en curso. Un mes futuro se recorta al mes en curso.
    [HttpGet("ventas-por-mes")]
    public async Task<ActionResult<IEnumerable<VentasPorMesDto>>> GetVentasPorMes(
        [FromQuery] int? sucursalId,
        [FromQuery] int? anio,
        [FromQuery] int? mes)
    {
        if (mes.HasValue && (mes.Value < 1 || mes.Value > 12))
        {
            return BadRequest("El mes debe estar entre 1 y 12.");
        }

        return Ok(await _service.GetVentasMesActualVsAnterioresAsync(sucursalId, anio, mes));
    }

    // GET api/Dashboard/rotacion-inventario?sucursalId=1
    // T53: rotación de inventario y clasificación de demanda alta/baja por producto.
    [HttpGet("rotacion-inventario")]
    public async Task<ActionResult<IEnumerable<RotacionProductoDto>>> GetRotacionInventario([FromQuery] int? sucursalId)
    {
        return Ok(await _service.GetRotacionInventarioAsync(sucursalId));
    }

    // GET api/Dashboard/transferencias-activas
    // T54: transferencias activas y su impacto en el inventario.
    [HttpGet("transferencias-activas")]
    public async Task<ActionResult<IEnumerable<TransferenciaActivaDto>>> GetTransferenciasActivas()
    {
        return Ok(await _service.GetTransferenciasActivasAsync());
    }

    // GET api/Dashboard/productos-proximos-agotarse?sucursalId=1
    // T55: productos próximos a agotarse (indicadores de reabastecimiento).
    [HttpGet("productos-proximos-agotarse")]
    public async Task<ActionResult<IEnumerable<ProductoProximoAgotarseDto>>> GetProductosProximosAgotarse([FromQuery] int? sucursalId)
    {
        return Ok(await _service.GetProductosProximosAgotarseAsync(sucursalId));
    }

    // GET api/Dashboard/comparativa-sucursales
    // T56: comparativa de rendimiento entre sucursales — solo AdministradorGeneral.
    [HttpGet("comparativa-sucursales")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<IEnumerable<ComparativaSucursalDto>>> GetComparativaSucursales()
    {
        return Ok(await _service.GetComparativaSucursalesAsync());
    }
}
