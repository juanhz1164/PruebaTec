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

    // GET api/Dashboard/ventas-por-mes?sucursalId=1
    // T52: volumen de ventas del mes en curso vs. los 3 meses anteriores.
    [HttpGet("ventas-por-mes")]
    public async Task<ActionResult<IEnumerable<VentasPorMesDto>>> GetVentasPorMes([FromQuery] int? sucursalId)
    {
        return Ok(await _service.GetVentasMesActualVsAnterioresAsync(sucursalId));
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
