using System.Net;
using System.Net.Http.Json;
using InventarioMultiSucursal.Api.DTOs;

namespace InventarioMultiSucursal.Api.Tests.Integration;

// T83: tests de integración del endpoint de Inventario, montando la API real
// (Program.cs) sobre una base de datos EF Core InMemory.
public class InventarioEndpointsTests : IntegrationTestBase
{
    [Fact]
    public async Task GetPorSucursal_ConTokenValido_DevuelveElInventarioSembrado()
    {
        var client = CrearClienteComoOperador();

        var response = await client.GetAsync($"/api/Inventario?sucursalId={SucursalOrigenId}");

        response.EnsureSuccessStatusCode();
        var items = await response.Content.ReadFromJsonAsync<List<InventarioDto>>();
        Assert.NotNull(items);
        var item = Assert.Single(items!, i => i.ProductoId == ProductoId);
        Assert.Equal(100m, item.Cantidad);
        Assert.Equal(500m, item.CostoPromedio);
    }

    [Fact]
    public async Task GetPorSucursal_SinToken_DevuelveUnauthorized()
    {
        var client = CrearClienteSinAutenticar();

        var response = await client.GetAsync($"/api/Inventario?sucursalId={SucursalOrigenId}");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetPorSucursal_SucursalSinInventario_DevuelveElProductoMarcadoComoAgotado()
    {
        // El catálogo de productos es global: una sucursal sin stock de un
        // producto lo sigue listando, marcado como Agotado, en vez de omitirlo.
        var client = CrearClienteComoGerente(SucursalDestinoId);

        var response = await client.GetAsync($"/api/Inventario?sucursalId={SucursalDestinoId}");

        response.EnsureSuccessStatusCode();
        var items = await response.Content.ReadFromJsonAsync<List<InventarioDto>>();
        Assert.NotNull(items);
        var item = Assert.Single(items!, i => i.ProductoId == ProductoId);
        Assert.True(item.Agotado);
        Assert.Equal(0m, item.Cantidad);
    }

    [Fact]
    public async Task CrearMovimiento_RetiroMayorAlStock_DevuelveBadRequestYNoDescuentaStock()
    {
        var client = CrearClienteComoOperador();

        var dto = new
        {
            ProductoId,
            SucursalId = SucursalOrigenId,
            UsuarioId = OperadorOrigenUsuarioId,
            Tipo = 1, // Retiro
            Cantidad = 999m,
            Motivo = "Prueba de integración"
        };

        var response = await client.PostAsJsonAsync("/api/Inventario/movimientos", dto);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var verificacion = await client.GetAsync($"/api/Inventario?sucursalId={SucursalOrigenId}");
        var items = await verificacion.Content.ReadFromJsonAsync<List<InventarioDto>>();
        var item = items!.Single(i => i.ProductoId == ProductoId);
        Assert.Equal(100m, item.Cantidad); // intacto
    }

    [Fact]
    public async Task CrearMovimiento_IngresoValido_ActualizaElStock()
    {
        var client = CrearClienteComoOperador();

        var dto = new
        {
            ProductoId,
            SucursalId = SucursalOrigenId,
            UsuarioId = OperadorOrigenUsuarioId,
            Tipo = 0, // Ingreso
            Cantidad = 20m,
            Motivo = "Ajuste por conteo físico"
        };

        var response = await client.PostAsJsonAsync("/api/Inventario/movimientos", dto);

        response.EnsureSuccessStatusCode();

        var verificacion = await client.GetAsync($"/api/Inventario?sucursalId={SucursalOrigenId}");
        var items = await verificacion.Content.ReadFromJsonAsync<List<InventarioDto>>();
        var item = items!.Single(i => i.ProductoId == ProductoId);
        Assert.Equal(120m, item.Cantidad);
    }
}
