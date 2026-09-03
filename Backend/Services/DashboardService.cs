using InventarioMultiSucursal.Api.DTOs;
using InventarioMultiSucursal.Api.Repositories.Interfaces;
using InventarioMultiSucursal.Api.Services.Interfaces;

namespace InventarioMultiSucursal.Api.Services;

public class DashboardService : IDashboardService
{
    private readonly IDashboardRepository _repository;

    public DashboardService(IDashboardRepository repository)
    {
        _repository = repository;
    }

    // T52: volumen de ventas del mes en curso vs. los 3 meses anteriores (4 meses en total).
    public async Task<List<VentasPorMesDto>> GetVentasMesActualVsAnterioresAsync(int? sucursalId)
    {
        var inicioRango = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1).AddMonths(-3);
        var ventas = await _repository.GetVentasDesdeAsync(inicioRango);

        if (sucursalId.HasValue)
        {
            ventas = ventas.Where(v => v.SucursalId == sucursalId.Value).ToList();
        }

        // Genera los 4 meses del rango explícitamente, para que un mes sin ventas
        // aparezca en 0 en vez de faltar del todo en la respuesta.
        var meses = Enumerable.Range(0, 4)
            .Select(i => inicioRango.AddMonths(i))
            .ToList();

        return meses.Select(mes =>
        {
            var ventasDelMes = ventas.Where(v => v.Fecha.Year == mes.Year && v.Fecha.Month == mes.Month).ToList();

            return new VentasPorMesDto
            {
                Anio = mes.Year,
                Mes = mes.Month,
                EtiquetaMes = mes.ToString("yyyy-MM"),
                CantidadVentas = ventasDelMes.Count,
                TotalVendido = ventasDelMes.Sum(v => v.Total)
            };
        }).ToList();
    }

    // T53: rotación de inventario (unidades vendidas en 30 días vs. stock actual)
    // y clasificación de demanda alta/baja por producto.
    public async Task<List<RotacionProductoDto>> GetRotacionInventarioAsync(int? sucursalId)
    {
        var hace30Dias = DateTime.UtcNow.AddDays(-30);
        var lineasVenta = await _repository.GetLineasVentaDesdeAsync(hace30Dias, sucursalId);
        var inventario = await _repository.GetInventarioCompletoAsync();

        if (sucursalId.HasValue)
        {
            inventario = inventario.Where(i => i.SucursalId == sucursalId.Value).ToList();
        }

        var ventasPorProducto = lineasVenta
            .GroupBy(l => l.ProductoId)
            .ToDictionary(g => g.Key, g => g.Sum(l => l.Cantidad));

        var stockPorProducto = inventario
            .GroupBy(i => i.ProductoId)
            .ToDictionary(g => g.Key, g => g.Sum(i => i.Cantidad));

        var productoIds = ventasPorProducto.Keys.Union(stockPorProducto.Keys);

        return productoIds.Select(productoId =>
        {
            var vendido = ventasPorProducto.GetValueOrDefault(productoId, 0);
            var stock = stockPorProducto.GetValueOrDefault(productoId, 0);
            var nombre = lineasVenta.FirstOrDefault(l => l.ProductoId == productoId)?.Producto?.Nombre
                ?? inventario.FirstOrDefault(i => i.ProductoId == productoId)?.Producto?.Nombre
                ?? string.Empty;
            var sku = lineasVenta.FirstOrDefault(l => l.ProductoId == productoId)?.Producto?.Sku
                ?? inventario.FirstOrDefault(i => i.ProductoId == productoId)?.Producto?.Sku
                ?? string.Empty;

            decimal? indice = stock > 0 ? Math.Round(vendido / stock, 2) : null;

            var clasificacion = stock <= 0
                ? "Sin stock"
                : vendido <= 0
                    ? "Sin ventas"
                    : indice >= 0.5m
                        ? "Alta demanda"
                        : "Baja demanda";

            return new RotacionProductoDto
            {
                ProductoId = productoId,
                ProductoNombre = nombre,
                ProductoSku = sku,
                CantidadVendidaUltimos30Dias = vendido,
                StockActualTotal = stock,
                IndiceRotacion = indice,
                Clasificacion = clasificacion
            };
        })
        .OrderByDescending(r => r.IndiceRotacion ?? 0)
        .ToList();
    }

    // T54: transferencias activas (EnPreparacion/EnTransito) y cuánto stock
    // está actualmente "en tránsito" entre sucursales.
    public async Task<List<TransferenciaActivaDto>> GetTransferenciasActivasAsync()
    {
        var activas = await _repository.GetTransferenciasActivasAsync();

        return activas.Select(t => new TransferenciaActivaDto
        {
            TransferenciaId = t.Id,
            Estado = t.Estado.ToString(),
            SucursalOrigenNombre = t.SucursalOrigen?.Nombre ?? string.Empty,
            SucursalDestinoNombre = t.SucursalDestino?.Nombre ?? string.Empty,
            CantidadLineas = t.Lineas.Count,
            CantidadTotalEnTransito = t.Lineas.Sum(l => l.CantidadEnviada > 0 ? l.CantidadEnviada : l.CantidadSolicitada)
        }).ToList();
    }

    // T55: productos con stock en el mínimo o por debajo (reutiliza la misma
    // regla de negocio que la alerta de stock de T34).
    public async Task<List<ProductoProximoAgotarseDto>> GetProductosProximosAgotarseAsync(int? sucursalId)
    {
        var inventario = await _repository.GetInventarioCompletoAsync();

        return inventario
            .Where(i => i.Cantidad <= i.StockMinimo)
            .Where(i => !sucursalId.HasValue || i.SucursalId == sucursalId.Value)
            .Select(i => new ProductoProximoAgotarseDto
            {
                ProductoId = i.ProductoId,
                ProductoNombre = i.Producto?.Nombre ?? string.Empty,
                ProductoSku = i.Producto?.Sku ?? string.Empty,
                SucursalId = i.SucursalId,
                SucursalNombre = i.Sucursal?.Nombre ?? string.Empty,
                Cantidad = i.Cantidad,
                StockMinimo = i.StockMinimo
            })
            .OrderBy(p => p.SucursalNombre)
            .ThenBy(p => p.ProductoNombre)
            .ToList();
    }

    // T56: comparativa de rendimiento entre sucursales — solo accesible a
    // AdministradorGeneral (controlado en el Controller con [Authorize]).
    public async Task<List<ComparativaSucursalDto>> GetComparativaSucursalesAsync()
    {
        var inicioMes = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        var ventasDelMes = await _repository.GetVentasDesdeAsync(inicioMes);
        var inventario = await _repository.GetInventarioCompletoAsync();
        var transferenciasActivas = await _repository.GetTransferenciasActivasAsync();
        var sucursales = await _repository.GetSucursalesActivasAsync();

        return sucursales.Select(s => new ComparativaSucursalDto
        {
            SucursalId = s.Id,
            SucursalNombre = s.Nombre,
            TotalVentasMesActual = ventasDelMes.Where(v => v.SucursalId == s.Id).Sum(v => v.Total),
            CantidadVentasMesActual = ventasDelMes.Count(v => v.SucursalId == s.Id),
            ValorInventarioActual = inventario.Where(i => i.SucursalId == s.Id).Sum(i => i.Cantidad * i.CostoPromedio),
            ProductosBajoMinimo = inventario.Count(i => i.SucursalId == s.Id && i.Cantidad <= i.StockMinimo),
            TransferenciasActivas = transferenciasActivas.Count(t => t.SucursalOrigenId == s.Id || t.SucursalDestinoId == s.Id)
        })
        .OrderByDescending(c => c.TotalVentasMesActual)
        .ToList();
    }
}
