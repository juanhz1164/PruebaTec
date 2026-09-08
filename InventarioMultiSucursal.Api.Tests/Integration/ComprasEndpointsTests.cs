using System.Net;
using System.Net.Http.Json;
using InventarioMultiSucursal.Api.DTOs;
using InventarioMultiSucursal.Api.Models;

namespace InventarioMultiSucursal.Api.Tests.Integration;

// T83: tests de integración del endpoint de Órdenes de compra, incluyendo la
// restricción de rol (solo Admin cambia el estado) y el efecto de recibir una
// orden sobre el inventario (costo promedio ponderado, cubierto a nivel
// unitario en T80; aquí se verifica el flujo end-to-end vía HTTP).
public class ComprasEndpointsTests : IntegrationTestBase
{
    private static CrearOrdenCompraDto CrearOrdenDto(int sucursalId, int usuarioId) => new()
    {
        ProveedorId = ProveedorId,
        SucursalId = sucursalId,
        UsuarioId = usuarioId,
        PlazoPagoDias = 30,
        Lineas = new List<CrearOrdenCompraLineaDto>
        {
            new() { ProductoId = ProductoId, Cantidad = 10m, PrecioUnitario = 600m, Descuento = 0m }
        }
    };

    [Fact]
    public async Task Create_OrdenValida_QuedaPendiente()
    {
        var client = CrearClienteComoOperador();

        var response = await client.PostAsJsonAsync("/api/OrdenesCompra", CrearOrdenDto(SucursalOrigenId, OperadorOrigenUsuarioId));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var orden = await response.Content.ReadFromJsonAsync<OrdenCompraDto>();
        Assert.Equal(EstadoOrdenCompra.Pendiente, orden!.Estado);
    }

    [Fact]
    public async Task CambiarEstado_ComoGerente_DevuelveForbidden()
    {
        var clienteOperador = CrearClienteComoOperador();
        var creada = await clienteOperador.PostAsJsonAsync("/api/OrdenesCompra", CrearOrdenDto(SucursalOrigenId, OperadorOrigenUsuarioId));
        var orden = await creada.Content.ReadFromJsonAsync<OrdenCompraDto>();

        var clienteGerente = CrearClienteComoGerente(SucursalOrigenId);
        var response = await clienteGerente.PutAsJsonAsync(
            $"/api/OrdenesCompra/{orden!.Id}/estado",
            new CambiarEstadoOrdenCompraDto { Estado = EstadoOrdenCompra.Confirmada });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task CambiarEstado_ComoAdmin_ConfirmarYRecibir_ActualizaInventarioYCostoPromedio()
    {
        var clienteOperador = CrearClienteComoOperador();
        var creada = await clienteOperador.PostAsJsonAsync("/api/OrdenesCompra", CrearOrdenDto(SucursalOrigenId, OperadorOrigenUsuarioId));
        var orden = await creada.Content.ReadFromJsonAsync<OrdenCompraDto>();

        var clienteAdmin = CrearClienteComoAdmin();

        var confirmar = await clienteAdmin.PutAsJsonAsync(
            $"/api/OrdenesCompra/{orden!.Id}/estado",
            new CambiarEstadoOrdenCompraDto { Estado = EstadoOrdenCompra.Confirmada });
        confirmar.EnsureSuccessStatusCode();

        var recibir = await clienteAdmin.PutAsJsonAsync(
            $"/api/OrdenesCompra/{orden.Id}/estado",
            new CambiarEstadoOrdenCompraDto { Estado = EstadoOrdenCompra.Recibida });
        recibir.EnsureSuccessStatusCode();

        var ordenActualizada = await recibir.Content.ReadFromJsonAsync<OrdenCompraDto>();
        Assert.Equal(EstadoOrdenCompra.Recibida, ordenActualizada!.Estado);
        Assert.NotNull(ordenActualizada.FechaRecepcion);

        // Inventario inicial sembrado: 100 unidades a costo promedio 500.
        // Se reciben 10 unidades a 600: (100*500 + 10*600) / 110 = 509.0909...
        var inventario = await clienteOperador.GetAsync($"/api/Inventario?sucursalId={SucursalOrigenId}");
        var items = await inventario.Content.ReadFromJsonAsync<List<InventarioDto>>();
        var item = items!.Single(i => i.ProductoId == ProductoId);
        Assert.Equal(110m, item.Cantidad);
        var costoEsperado = Math.Round((100m * 500m + 10m * 600m) / 110m, 10);
        Assert.Equal(costoEsperado, Math.Round(item.CostoPromedio, 10));
    }

    [Fact]
    public async Task CambiarEstado_SaltarDePendienteARecibida_DevuelveBadRequest()
    {
        var clienteOperador = CrearClienteComoOperador();
        var creada = await clienteOperador.PostAsJsonAsync("/api/OrdenesCompra", CrearOrdenDto(SucursalOrigenId, OperadorOrigenUsuarioId));
        var orden = await creada.Content.ReadFromJsonAsync<OrdenCompraDto>();

        var clienteAdmin = CrearClienteComoAdmin();
        var response = await clienteAdmin.PutAsJsonAsync(
            $"/api/OrdenesCompra/{orden!.Id}/estado",
            new CambiarEstadoOrdenCompraDto { Estado = EstadoOrdenCompra.Recibida });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetAll_ListaLaOrdenCreada()
    {
        var client = CrearClienteComoOperador();
        await client.PostAsJsonAsync("/api/OrdenesCompra", CrearOrdenDto(SucursalOrigenId, OperadorOrigenUsuarioId));

        var response = await client.GetAsync("/api/OrdenesCompra");

        response.EnsureSuccessStatusCode();
        var ordenes = await response.Content.ReadFromJsonAsync<List<OrdenCompraDto>>();
        Assert.NotEmpty(ordenes!);
    }
}
