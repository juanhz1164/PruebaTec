using System.Net.Http.Json;
using InventarioMultiSucursal.Api.DTOs;

namespace InventarioMultiSucursal.Api.Tests.Integration;

// T83: tests de integración del endpoint de Dashboard, con foco en que
// Gerente/Operador queden limitados a su propia sucursal en rotacion-inventario
// y productos-proximos-agotarse, sin importar qué sucursalId envíen en la
// query — antes cualquier cliente autenticado podía pedir el endpoint SIN
// sucursalId y obtener el consolidado de toda la red (el mismo dato que
// comparativa-sucursales restringe a Admin).
public class DashboardEndpointsTests : IntegrationTestBase
{
    [Fact]
    public async Task RotacionInventario_GerenteSinSucursalIdEnQuery_SoloVeSuPropiaSucursal()
    {
        // Se crea stock en ambas sucursales para el mismo producto.
        var clienteAdmin = CrearClienteComoAdmin();
        await clienteAdmin.PostAsJsonAsync("/api/Inventario", new
        {
            ProductoId,
            SucursalId = SucursalDestinoId,
            Cantidad = 50m,
            StockMinimo = 5m,
            CostoPromedio = 500m
        });

        var clienteGerenteOrigen = CrearClienteComoGerente(SucursalOrigenId);

        // Sin pasar sucursalId: antes del fix, esto devolvía el stock
        // consolidado de TODAS las sucursales (100 + 50 = 150).
        var response = await clienteGerenteOrigen.GetAsync("/api/Dashboard/rotacion-inventario");

        response.EnsureSuccessStatusCode();
        var rotacion = await response.Content.ReadFromJsonAsync<List<RotacionProductoDto>>();
        var item = Assert.Single(rotacion!, r => r.ProductoId == ProductoId);
        Assert.Equal(100m, item.StockActualTotal);
    }

    [Fact]
    public async Task RotacionInventario_GerenteConSucursalIdAjenaEnQuery_IgnoraElParametro()
    {
        var clienteAdmin = CrearClienteComoAdmin();
        await clienteAdmin.PostAsJsonAsync("/api/Inventario", new
        {
            ProductoId,
            SucursalId = SucursalDestinoId,
            Cantidad = 50m,
            StockMinimo = 5m,
            CostoPromedio = 500m
        });

        var clienteGerenteOrigen = CrearClienteComoGerente(SucursalOrigenId);

        // Intenta pedir explícitamente el stock de la sucursal ajena.
        var response = await clienteGerenteOrigen.GetAsync($"/api/Dashboard/rotacion-inventario?sucursalId={SucursalDestinoId}");

        response.EnsureSuccessStatusCode();
        var rotacion = await response.Content.ReadFromJsonAsync<List<RotacionProductoDto>>();
        var item = Assert.Single(rotacion!, r => r.ProductoId == ProductoId);
        Assert.Equal(100m, item.StockActualTotal); // sigue viendo la suya, no la ajena
    }

    [Fact]
    public async Task RotacionInventario_ComoAdmin_SinSucursalIdVeElConsolidadoDeTodas()
    {
        var clienteAdmin = CrearClienteComoAdmin();
        await clienteAdmin.PostAsJsonAsync("/api/Inventario", new
        {
            ProductoId,
            SucursalId = SucursalDestinoId,
            Cantidad = 50m,
            StockMinimo = 5m,
            CostoPromedio = 500m
        });

        var response = await clienteAdmin.GetAsync("/api/Dashboard/rotacion-inventario");

        response.EnsureSuccessStatusCode();
        var rotacion = await response.Content.ReadFromJsonAsync<List<RotacionProductoDto>>();
        var item = Assert.Single(rotacion!, r => r.ProductoId == ProductoId);
        Assert.Equal(150m, item.StockActualTotal);
    }

    [Fact]
    public async Task ProductosProximosAgotarse_OperadorSinSucursalIdEnQuery_SoloVeSuPropiaSucursal()
    {
        // Baja el stock de Origen por debajo del mínimo (5) con un retiro.
        var clienteOperador = CrearClienteComoOperador();
        await clienteOperador.PostAsJsonAsync("/api/Inventario/movimientos", new
        {
            ProductoId,
            SucursalId = SucursalOrigenId,
            UsuarioId = OperadorOrigenUsuarioId,
            Tipo = 1, // Retiro
            Cantidad = 98m,
            Motivo = "Bajar stock para la prueba"
        });

        var response = await clienteOperador.GetAsync("/api/Dashboard/productos-proximos-agotarse");

        response.EnsureSuccessStatusCode();
        var alertas = await response.Content.ReadFromJsonAsync<List<ProductoProximoAgotarseDto>>();
        Assert.All(alertas!, a => Assert.Equal(SucursalOrigenId, a.SucursalId));
    }

    [Fact]
    public async Task VentasPorMes_GerenteConSucursalIdAjenaEnQuery_IgnoraElParametro()
    {
        var clienteOperador = CrearClienteComoOperador();
        await clienteOperador.PostAsJsonAsync("/api/Ventas", new CrearVentaDto
        {
            SucursalId = SucursalOrigenId,
            UsuarioId = OperadorOrigenUsuarioId,
            Lineas = new List<CrearVentaLineaDto> { new() { ProductoId = ProductoId, Cantidad = 1m } }
        });

        var clienteGerenteDestino = CrearClienteComoGerente(SucursalDestinoId);
        var response = await clienteGerenteDestino.GetAsync($"/api/Dashboard/ventas-por-mes?sucursalId={SucursalOrigenId}");

        response.EnsureSuccessStatusCode();
        var meses = await response.Content.ReadFromJsonAsync<List<VentasPorMesDto>>();
        // Ningún mes debe contar la venta de Origen: el Gerente de Destino
        // queda fijado a su propia sucursal (sin ventas), sin importar el
        // sucursalId que haya pedido.
        Assert.All(meses!, m => Assert.Equal(0, m.CantidadVentas));
    }
}
