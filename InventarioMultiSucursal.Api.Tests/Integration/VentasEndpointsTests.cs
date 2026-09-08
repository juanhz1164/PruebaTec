using System.Net;
using System.Net.Http.Json;
using InventarioMultiSucursal.Api.DTOs;

namespace InventarioMultiSucursal.Api.Tests.Integration;

// T83: tests de integración del endpoint de Ventas.
public class VentasEndpointsTests : IntegrationTestBase
{
    [Fact]
    public async Task Create_VentaValida_DescuentaStockYDevuelveComprobante()
    {
        var client = CrearClienteComoOperador();
        var dto = new CrearVentaDto
        {
            SucursalId = SucursalOrigenId,
            UsuarioId = OperadorOrigenUsuarioId,
            ClienteNombre = "Cliente de prueba",
            Lineas = new List<CrearVentaLineaDto> { new() { ProductoId = ProductoId, Cantidad = 10m } }
        };

        var response = await client.PostAsJsonAsync("/api/Ventas", dto);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var venta = await response.Content.ReadFromJsonAsync<VentaDto>();
        Assert.NotNull(venta);
        Assert.StartsWith("VTA-", venta!.NumeroComprobante);
        Assert.Single(venta.Lineas);

        var inventario = await client.GetAsync($"/api/Inventario?sucursalId={SucursalOrigenId}");
        var items = await inventario.Content.ReadFromJsonAsync<List<InventarioDto>>();
        Assert.Equal(90m, items!.Single(i => i.ProductoId == ProductoId).Cantidad);
    }

    [Fact]
    public async Task Create_VentaSinStockSuficiente_DevuelveBadRequestYNoDescuenta()
    {
        var client = CrearClienteComoOperador();
        var dto = new CrearVentaDto
        {
            SucursalId = SucursalOrigenId,
            UsuarioId = OperadorOrigenUsuarioId,
            Lineas = new List<CrearVentaLineaDto> { new() { ProductoId = ProductoId, Cantidad = 999m } }
        };

        var response = await client.PostAsJsonAsync("/api/Ventas", dto);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var inventario = await client.GetAsync($"/api/Inventario?sucursalId={SucursalOrigenId}");
        var items = await inventario.Content.ReadFromJsonAsync<List<InventarioDto>>();
        Assert.Equal(100m, items!.Single(i => i.ProductoId == ProductoId).Cantidad);
    }

    [Fact]
    public async Task GetById_VentaCreada_SeConsultaPorSuId()
    {
        var client = CrearClienteComoOperador();
        var creada = await client.PostAsJsonAsync("/api/Ventas", new CrearVentaDto
        {
            SucursalId = SucursalOrigenId,
            UsuarioId = OperadorOrigenUsuarioId,
            Lineas = new List<CrearVentaLineaDto> { new() { ProductoId = ProductoId, Cantidad = 1m } }
        });
        var ventaCreada = await creada.Content.ReadFromJsonAsync<VentaDto>();

        var response = await client.GetAsync($"/api/Ventas/{ventaCreada!.Id}");

        response.EnsureSuccessStatusCode();
        var venta = await response.Content.ReadFromJsonAsync<VentaDto>();
        Assert.Equal(ventaCreada.Id, venta!.Id);
    }

    [Fact]
    public async Task GetById_VentaInexistente_DevuelveNotFound()
    {
        var client = CrearClienteComoOperador();

        var response = await client.GetAsync("/api/Ventas/99999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Create_SinToken_DevuelveUnauthorized()
    {
        var client = CrearClienteSinAutenticar();
        var dto = new CrearVentaDto
        {
            SucursalId = SucursalOrigenId,
            UsuarioId = OperadorOrigenUsuarioId,
            Lineas = new List<CrearVentaLineaDto> { new() { ProductoId = ProductoId, Cantidad = 1m } }
        };

        var response = await client.PostAsJsonAsync("/api/Ventas", dto);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Create_OperadorConSucursalAjena_DevuelveForbidden()
    {
        // El Operador de la sucursal Origen intenta registrar una venta en la
        // sucursal Destino (cambiando solo el SucursalId del body): debe
        // rechazarse, no confiar en el valor que envía el cliente.
        var client = CrearClienteComoOperador();
        var dto = new CrearVentaDto
        {
            SucursalId = SucursalDestinoId,
            UsuarioId = OperadorOrigenUsuarioId,
            Lineas = new List<CrearVentaLineaDto> { new() { ProductoId = ProductoId, Cantidad = 1m } }
        };

        var response = await client.PostAsJsonAsync("/api/Ventas", dto);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetAll_ComoGerente_SoloDevuelveVentasDeSuPropiaSucursal()
    {
        var clienteOrigen = CrearClienteComoOperador();
        await clienteOrigen.PostAsJsonAsync("/api/Ventas", new CrearVentaDto
        {
            SucursalId = SucursalOrigenId,
            UsuarioId = OperadorOrigenUsuarioId,
            Lineas = new List<CrearVentaLineaDto> { new() { ProductoId = ProductoId, Cantidad = 1m } }
        });

        var clienteGerenteDestino = CrearClienteComoGerente(SucursalDestinoId);
        var response = await clienteGerenteDestino.GetAsync("/api/Ventas");

        response.EnsureSuccessStatusCode();
        var ventas = await response.Content.ReadFromJsonAsync<List<VentaDto>>();
        Assert.Empty(ventas!);
    }

    [Fact]
    public async Task GetAll_ComoAdmin_DevuelveVentasDeTodasLasSucursales()
    {
        var clienteOrigen = CrearClienteComoOperador();
        await clienteOrigen.PostAsJsonAsync("/api/Ventas", new CrearVentaDto
        {
            SucursalId = SucursalOrigenId,
            UsuarioId = OperadorOrigenUsuarioId,
            Lineas = new List<CrearVentaLineaDto> { new() { ProductoId = ProductoId, Cantidad = 1m } }
        });

        var clienteAdmin = CrearClienteComoAdmin();
        var response = await clienteAdmin.GetAsync("/api/Ventas");

        response.EnsureSuccessStatusCode();
        var ventas = await response.Content.ReadFromJsonAsync<List<VentaDto>>();
        Assert.Single(ventas!);
    }
}
