using System.Net;
using System.Net.Http.Json;
using InventarioMultiSucursal.Api.DTOs;
using InventarioMultiSucursal.Api.Models;

namespace InventarioMultiSucursal.Api.Tests.Integration;

// T83: tests de integración del flujo completo de Transferencias (solicitar ->
// preparar -> enviar -> recibir), incluyendo la restricción de que solo el
// Gerente de la sucursal correspondiente (origen para preparar/enviar, destino
// para recibir) puede avanzar cada paso.
public class TransferenciasEndpointsTests : IntegrationTestBase
{
    private async Task<TransferenciaDto> CrearYPrepararYEnviarAsync(HttpClient clienteGerenteOrigen, decimal cantidadSolicitada, decimal cantidadEnviada)
    {
        var crear = await clienteGerenteOrigen.PostAsJsonAsync("/api/Transferencias", new CrearTransferenciaDto
        {
            SucursalOrigenId = SucursalOrigenId,
            SucursalDestinoId = SucursalDestinoId,
            UsuarioSolicitanteId = GerenteOrigenUsuarioId,
            Lineas = new List<CrearTransferenciaLineaDto> { new() { ProductoId = ProductoId, CantidadSolicitada = cantidadSolicitada } }
        });
        var transferencia = await crear.Content.ReadFromJsonAsync<TransferenciaDto>();

        var preparar = await clienteGerenteOrigen.PutAsync($"/api/Transferencias/{transferencia!.Id}/preparar", null);
        preparar.EnsureSuccessStatusCode();

        var lineaId = transferencia.Lineas.Single().Id;
        var enviar = await clienteGerenteOrigen.PutAsJsonAsync($"/api/Transferencias/{transferencia.Id}/enviar", new RegistrarEnvioDto
        {
            Transportista = "Transportes Test",
            Lineas = new List<LineaEnvioDto> { new() { TransferenciaLineaId = lineaId, CantidadEnviada = cantidadEnviada } }
        });
        enviar.EnsureSuccessStatusCode();

        return (await enviar.Content.ReadFromJsonAsync<TransferenciaDto>())!;
    }

    [Fact]
    public async Task FlujoCompleto_RecepcionIgualALaEnviada_QuedaRecibidaCompletaYActualizaAmbosInventarios()
    {
        var gerenteOrigen = CrearClienteComoGerente(SucursalOrigenId);
        var gerenteDestino = CrearClienteComoGerente(SucursalDestinoId);

        var enTransito = await CrearYPrepararYEnviarAsync(gerenteOrigen, cantidadSolicitada: 30m, cantidadEnviada: 30m);
        Assert.Equal(EstadoTransferencia.EnTransito, enTransito.Estado);

        var origenTrasEnvio = await gerenteOrigen.GetAsync($"/api/Inventario?sucursalId={SucursalOrigenId}");
        var itemsOrigen = await origenTrasEnvio.Content.ReadFromJsonAsync<List<InventarioDto>>();
        Assert.Equal(70m, itemsOrigen!.Single(i => i.ProductoId == ProductoId).Cantidad);

        var lineaId = enTransito.Lineas.Single().Id;
        var recibir = await gerenteDestino.PutAsJsonAsync($"/api/Transferencias/{enTransito.Id}/recibir", new ConfirmarRecepcionDto
        {
            Lineas = new List<LineaRecepcionDto> { new() { TransferenciaLineaId = lineaId, CantidadRecibida = 30m } }
        });
        recibir.EnsureSuccessStatusCode();

        var final = await recibir.Content.ReadFromJsonAsync<TransferenciaDto>();
        Assert.Equal(EstadoTransferencia.RecibidaCompleta, final!.Estado);

        var destino = await gerenteDestino.GetAsync($"/api/Inventario?sucursalId={SucursalDestinoId}");
        var itemsDestino = await destino.Content.ReadFromJsonAsync<List<InventarioDto>>();
        Assert.Equal(30m, itemsDestino!.Single(i => i.ProductoId == ProductoId).Cantidad);
    }

    [Fact]
    public async Task FlujoCompleto_RecepcionMenorALaEnviada_QuedaRecibidaParcial()
    {
        var gerenteOrigen = CrearClienteComoGerente(SucursalOrigenId);
        var gerenteDestino = CrearClienteComoGerente(SucursalDestinoId);

        var enTransito = await CrearYPrepararYEnviarAsync(gerenteOrigen, cantidadSolicitada: 20m, cantidadEnviada: 20m);
        var lineaId = enTransito.Lineas.Single().Id;

        var recibir = await gerenteDestino.PutAsJsonAsync($"/api/Transferencias/{enTransito.Id}/recibir", new ConfirmarRecepcionDto
        {
            Lineas = new List<LineaRecepcionDto> { new() { TransferenciaLineaId = lineaId, CantidadRecibida = 12m } }
        });
        recibir.EnsureSuccessStatusCode();

        var final = await recibir.Content.ReadFromJsonAsync<TransferenciaDto>();
        Assert.Equal(EstadoTransferencia.RecibidaParcial, final!.Estado);
        Assert.Equal(8m, final.Lineas.Single().Faltante);

        var destino = await gerenteDestino.GetAsync($"/api/Inventario?sucursalId={SucursalDestinoId}");
        var itemsDestino = await destino.Content.ReadFromJsonAsync<List<InventarioDto>>();
        Assert.Equal(12m, itemsDestino!.Single(i => i.ProductoId == ProductoId).Cantidad);
    }

    [Fact]
    public async Task Preparar_ComoGerenteDeOtraSucursal_DevuelveForbidden()
    {
        var gerenteOrigen = CrearClienteComoGerente(SucursalOrigenId);
        var gerenteDestino = CrearClienteComoGerente(SucursalDestinoId);

        var crear = await gerenteOrigen.PostAsJsonAsync("/api/Transferencias", new CrearTransferenciaDto
        {
            SucursalOrigenId = SucursalOrigenId,
            SucursalDestinoId = SucursalDestinoId,
            UsuarioSolicitanteId = GerenteOrigenUsuarioId,
            Lineas = new List<CrearTransferenciaLineaDto> { new() { ProductoId = ProductoId, CantidadSolicitada = 5m } }
        });
        var transferencia = await crear.Content.ReadFromJsonAsync<TransferenciaDto>();

        // El Gerente de destino intenta preparar una transferencia cuyo origen no es su sucursal.
        var response = await gerenteDestino.PutAsync($"/api/Transferencias/{transferencia!.Id}/preparar", null);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task ConfirmarRecepcion_ComoGerenteDeOrigen_DevuelveForbidden()
    {
        var gerenteOrigen = CrearClienteComoGerente(SucursalOrigenId);

        var enTransito = await CrearYPrepararYEnviarAsync(gerenteOrigen, cantidadSolicitada: 5m, cantidadEnviada: 5m);
        var lineaId = enTransito.Lineas.Single().Id;

        // El propio Gerente de origen intenta confirmar la recepción, que le corresponde al destino.
        var response = await gerenteOrigen.PutAsJsonAsync($"/api/Transferencias/{enTransito.Id}/recibir", new ConfirmarRecepcionDto
        {
            Lineas = new List<LineaRecepcionDto> { new() { TransferenciaLineaId = lineaId, CantidadRecibida = 5m } }
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task RegistrarEnvio_StockInsuficienteEnOrigen_DevuelveBadRequest()
    {
        var gerenteOrigen = CrearClienteComoGerente(SucursalOrigenId);

        var crear = await gerenteOrigen.PostAsJsonAsync("/api/Transferencias", new CrearTransferenciaDto
        {
            SucursalOrigenId = SucursalOrigenId,
            SucursalDestinoId = SucursalDestinoId,
            UsuarioSolicitanteId = GerenteOrigenUsuarioId,
            Lineas = new List<CrearTransferenciaLineaDto> { new() { ProductoId = ProductoId, CantidadSolicitada = 500m } }
        });
        var transferencia = await crear.Content.ReadFromJsonAsync<TransferenciaDto>();
        await gerenteOrigen.PutAsync($"/api/Transferencias/{transferencia!.Id}/preparar", null);

        var lineaId = transferencia.Lineas.Single().Id;
        var enviar = await gerenteOrigen.PutAsJsonAsync($"/api/Transferencias/{transferencia.Id}/enviar", new RegistrarEnvioDto
        {
            Lineas = new List<LineaEnvioDto> { new() { TransferenciaLineaId = lineaId, CantidadEnviada = 500m } } // solo hay 100 en stock
        });

        Assert.Equal(HttpStatusCode.BadRequest, enviar.StatusCode);
    }

    [Fact]
    public async Task Cancelar_TransferenciaSolicitada_QuedaCancelada()
    {
        var gerenteOrigen = CrearClienteComoGerente(SucursalOrigenId);
        var crear = await gerenteOrigen.PostAsJsonAsync("/api/Transferencias", new CrearTransferenciaDto
        {
            SucursalOrigenId = SucursalOrigenId,
            SucursalDestinoId = SucursalDestinoId,
            UsuarioSolicitanteId = GerenteOrigenUsuarioId,
            Lineas = new List<CrearTransferenciaLineaDto> { new() { ProductoId = ProductoId, CantidadSolicitada = 5m } }
        });
        var transferencia = await crear.Content.ReadFromJsonAsync<TransferenciaDto>();

        var response = await gerenteOrigen.PutAsync($"/api/Transferencias/{transferencia!.Id}/cancelar", null);

        response.EnsureSuccessStatusCode();
        var actualizada = await response.Content.ReadFromJsonAsync<TransferenciaDto>();
        Assert.Equal(EstadoTransferencia.Cancelada, actualizada!.Estado);
    }
}
