using InventarioMultiSucursal.Api.DTOs;
using InventarioMultiSucursal.Api.Models;
using InventarioMultiSucursal.Api.Repositories.Interfaces;
using InventarioMultiSucursal.Api.Services;
using Moq;

namespace InventarioMultiSucursal.Api.Tests.Unit;

// T82: tests unitarios de las reglas de transferencia entre sucursales, con
// foco en la decisión de recepción completa vs. parcial (ConfirmarRecepcionAsync)
// y las transiciones de estado válidas del ciclo completo.
public class TransferenciaServiceReglasTests
{
    private const int SucursalOrigenId = 1;
    private const int SucursalDestinoId = 2;

    private static Mock<ITransferenciaRepository> CrearRepositorioMock()
    {
        var repo = new Mock<ITransferenciaRepository>();
        repo.Setup(r => r.BeginTransactionAsync()).ReturnsAsync(TestHelpers.CreateFakeTransaction());
        repo.Setup(r => r.SaveChangesAsync()).ReturnsAsync(1);
        repo.Setup(r => r.AddMovimientoAsync(It.IsAny<MovimientoInventario>())).Returns(Task.CompletedTask);
        return repo;
    }

    private static Transferencia CrearTransferenciaEnTransito(params TransferenciaLinea[] lineas)
    {
        return new Transferencia
        {
            Id = 1,
            SucursalOrigenId = SucursalOrigenId,
            SucursalDestinoId = SucursalDestinoId,
            UsuarioSolicitanteId = 1,
            Estado = EstadoTransferencia.EnTransito,
            FechaSolicitud = DateTime.UtcNow.AddDays(-1),
            FechaEnvio = DateTime.UtcNow,
            Lineas = lineas.ToList()
        };
    }

    // ---------- ConfirmarRecepcionAsync: completa vs. parcial ----------

    [Fact]
    public async Task ConfirmarRecepcion_CantidadRecibidaIgualALaEnviada_QuedaRecibidaCompleta()
    {
        var linea = new TransferenciaLinea { Id = 1, ProductoId = 10, CantidadSolicitada = 20m, CantidadEnviada = 20m, CantidadRecibida = 0m };
        var transferencia = CrearTransferenciaEnTransito(linea);

        var repo = CrearRepositorioMock();
        repo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(transferencia);
        repo.Setup(r => r.GetInventarioAsync(10, SucursalDestinoId)).ReturnsAsync((Inventario?)null);

        Inventario? inventarioCreado = null;
        repo.Setup(r => r.AddInventarioAsync(It.IsAny<Inventario>()))
            .Callback<Inventario>(i => inventarioCreado = i)
            .Returns(Task.CompletedTask);

        var service = new TransferenciaService(repo.Object);
        var dto = new ConfirmarRecepcionDto
        {
            Lineas = new List<LineaRecepcionDto> { new() { TransferenciaLineaId = 1, CantidadRecibida = 20m } }
        };

        var resultado = await service.ConfirmarRecepcionAsync(1, dto, 99);

        Assert.True(resultado.Exitoso);
        Assert.Equal(EstadoTransferencia.RecibidaCompleta, transferencia.Estado);
        Assert.NotNull(inventarioCreado);
        Assert.Equal(20m, inventarioCreado!.Cantidad);
    }

    [Fact]
    public async Task ConfirmarRecepcion_CantidadRecibidaMenorALaEnviada_QuedaRecibidaParcial()
    {
        // Se enviaron 20, llegan 15: falta 5. Debe quedar RecibidaParcial y
        // el destino solo recibe las 15 realmente llegadas.
        var linea = new TransferenciaLinea { Id = 1, ProductoId = 10, CantidadSolicitada = 20m, CantidadEnviada = 20m, CantidadRecibida = 0m };
        var transferencia = CrearTransferenciaEnTransito(linea);

        var repo = CrearRepositorioMock();
        repo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(transferencia);
        var inventarioDestino = new Inventario { Id = 5, ProductoId = 10, SucursalId = SucursalDestinoId, Cantidad = 0m, CostoPromedio = 0m };
        repo.Setup(r => r.GetInventarioAsync(10, SucursalDestinoId)).ReturnsAsync(inventarioDestino);

        var service = new TransferenciaService(repo.Object);
        var dto = new ConfirmarRecepcionDto
        {
            Lineas = new List<LineaRecepcionDto> { new() { TransferenciaLineaId = 1, CantidadRecibida = 15m } }
        };

        var resultado = await service.ConfirmarRecepcionAsync(1, dto, 99);

        Assert.True(resultado.Exitoso);
        Assert.Equal(EstadoTransferencia.RecibidaParcial, transferencia.Estado);
        Assert.Equal(15m, inventarioDestino.Cantidad);
        Assert.Equal(15m, linea.CantidadRecibida);
        Assert.Equal(5m, linea.CantidadEnviada - linea.CantidadRecibida); // "Faltante" expuesto en el DTO
    }

    [Fact]
    public async Task ConfirmarRecepcion_UnaSolaLineaConFaltante_MarcaTodaLaTransferenciaComoParcial()
    {
        // Dos líneas: una llega completa, la otra no. Basta con que UNA falle
        // para que toda la transferencia quede parcial (no promedio, no mayoría).
        var lineaCompleta = new TransferenciaLinea { Id = 1, ProductoId = 10, CantidadSolicitada = 10m, CantidadEnviada = 10m, CantidadRecibida = 0m };
        var lineaIncompleta = new TransferenciaLinea { Id = 2, ProductoId = 20, CantidadSolicitada = 10m, CantidadEnviada = 10m, CantidadRecibida = 0m };
        var transferencia = CrearTransferenciaEnTransito(lineaCompleta, lineaIncompleta);

        var repo = CrearRepositorioMock();
        repo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(transferencia);
        repo.Setup(r => r.GetInventarioAsync(10, SucursalDestinoId)).ReturnsAsync(new Inventario { Id = 1, ProductoId = 10, SucursalId = SucursalDestinoId, Cantidad = 0m });
        repo.Setup(r => r.GetInventarioAsync(20, SucursalDestinoId)).ReturnsAsync(new Inventario { Id = 2, ProductoId = 20, SucursalId = SucursalDestinoId, Cantidad = 0m });

        var service = new TransferenciaService(repo.Object);
        var dto = new ConfirmarRecepcionDto
        {
            Lineas = new List<LineaRecepcionDto>
            {
                new() { TransferenciaLineaId = 1, CantidadRecibida = 10m }, // completa
                new() { TransferenciaLineaId = 2, CantidadRecibida = 8m }   // faltan 2
            }
        };

        var resultado = await service.ConfirmarRecepcionAsync(1, dto, 99);

        Assert.True(resultado.Exitoso);
        Assert.Equal(EstadoTransferencia.RecibidaParcial, transferencia.Estado);
    }

    [Fact]
    public async Task ConfirmarRecepcion_CantidadRecibidaCero_NoCreaInventarioNiMovimientoParaEsaLinea()
    {
        var linea = new TransferenciaLinea { Id = 1, ProductoId = 10, CantidadSolicitada = 10m, CantidadEnviada = 10m, CantidadRecibida = 0m };
        var transferencia = CrearTransferenciaEnTransito(linea);

        var repo = CrearRepositorioMock();
        repo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(transferencia);

        var service = new TransferenciaService(repo.Object);
        var dto = new ConfirmarRecepcionDto
        {
            Lineas = new List<LineaRecepcionDto> { new() { TransferenciaLineaId = 1, CantidadRecibida = 0m } }
        };

        var resultado = await service.ConfirmarRecepcionAsync(1, dto, 99);

        Assert.True(resultado.Exitoso);
        Assert.Equal(EstadoTransferencia.RecibidaParcial, transferencia.Estado);
        repo.Verify(r => r.GetInventarioAsync(It.IsAny<int>(), It.IsAny<int>()), Times.Never);
        repo.Verify(r => r.AddMovimientoAsync(It.IsAny<MovimientoInventario>()), Times.Never);
    }

    [Fact]
    public async Task ConfirmarRecepcion_CantidadRecibidaMayorQueLaEnviada_Rechaza()
    {
        var linea = new TransferenciaLinea { Id = 1, ProductoId = 10, CantidadSolicitada = 10m, CantidadEnviada = 10m, CantidadRecibida = 0m };
        var transferencia = CrearTransferenciaEnTransito(linea);

        var repo = CrearRepositorioMock();
        repo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(transferencia);

        var service = new TransferenciaService(repo.Object);
        var dto = new ConfirmarRecepcionDto
        {
            Lineas = new List<LineaRecepcionDto> { new() { TransferenciaLineaId = 1, CantidadRecibida = 11m } }
        };

        var resultado = await service.ConfirmarRecepcionAsync(1, dto, 99);

        Assert.False(resultado.Exitoso);
        Assert.Contains("debe estar entre 0", resultado.Error);
        repo.Verify(r => r.BeginTransactionAsync(), Times.Never);
    }

    [Fact]
    public async Task ConfirmarRecepcion_NoIncluyeTodasLasLineas_Rechaza()
    {
        var lineaA = new TransferenciaLinea { Id = 1, ProductoId = 10, CantidadSolicitada = 10m, CantidadEnviada = 10m, CantidadRecibida = 0m };
        var lineaB = new TransferenciaLinea { Id = 2, ProductoId = 20, CantidadSolicitada = 5m, CantidadEnviada = 5m, CantidadRecibida = 0m };
        var transferencia = CrearTransferenciaEnTransito(lineaA, lineaB);

        var repo = CrearRepositorioMock();
        repo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(transferencia);

        var service = new TransferenciaService(repo.Object);
        var dto = new ConfirmarRecepcionDto
        {
            Lineas = new List<LineaRecepcionDto> { new() { TransferenciaLineaId = 1, CantidadRecibida = 10m } }
        };

        var resultado = await service.ConfirmarRecepcionAsync(1, dto, 99);

        Assert.False(resultado.Exitoso);
        Assert.Contains("todas las líneas", resultado.Error);
    }

    [Fact]
    public async Task ConfirmarRecepcion_DesdeEstadoSolicitada_Rechaza()
    {
        // Solo se puede recibir si está EnTransito.
        var linea = new TransferenciaLinea { Id = 1, ProductoId = 10, CantidadSolicitada = 10m, CantidadEnviada = 0m, CantidadRecibida = 0m };
        var transferencia = new Transferencia
        {
            Id = 1,
            SucursalOrigenId = SucursalOrigenId,
            SucursalDestinoId = SucursalDestinoId,
            UsuarioSolicitanteId = 1,
            Estado = EstadoTransferencia.Solicitada,
            FechaSolicitud = DateTime.UtcNow,
            Lineas = new List<TransferenciaLinea> { linea }
        };

        var repo = CrearRepositorioMock();
        repo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(transferencia);

        var service = new TransferenciaService(repo.Object);
        var dto = new ConfirmarRecepcionDto
        {
            Lineas = new List<LineaRecepcionDto> { new() { TransferenciaLineaId = 1, CantidadRecibida = 0m } }
        };

        var resultado = await service.ConfirmarRecepcionAsync(1, dto, 99);

        Assert.False(resultado.Exitoso);
        Assert.Contains("No se puede confirmar recepción", resultado.Error);
    }

    // ---------- RegistrarEnvioAsync: valida stock de origen ----------

    [Fact]
    public async Task RegistrarEnvio_StockSuficienteEnOrigen_DescuentaYQuedaEnTransito()
    {
        var linea = new TransferenciaLinea { Id = 1, ProductoId = 10, CantidadSolicitada = 20m, CantidadEnviada = 0m, CantidadRecibida = 0m };
        var transferencia = new Transferencia
        {
            Id = 1,
            SucursalOrigenId = SucursalOrigenId,
            SucursalDestinoId = SucursalDestinoId,
            UsuarioSolicitanteId = 1,
            Estado = EstadoTransferencia.EnPreparacion,
            FechaSolicitud = DateTime.UtcNow,
            Lineas = new List<TransferenciaLinea> { linea }
        };

        var repo = CrearRepositorioMock();
        repo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(transferencia);
        var inventarioOrigen = new Inventario { Id = 1, ProductoId = 10, SucursalId = SucursalOrigenId, Cantidad = 30m };
        repo.Setup(r => r.GetInventarioAsync(10, SucursalOrigenId)).ReturnsAsync(inventarioOrigen);

        var service = new TransferenciaService(repo.Object);
        var dto = new RegistrarEnvioDto
        {
            Lineas = new List<LineaEnvioDto> { new() { TransferenciaLineaId = 1, CantidadEnviada = 20m } }
        };

        var resultado = await service.RegistrarEnvioAsync(1, dto, 99);

        Assert.True(resultado.Exitoso);
        Assert.Equal(EstadoTransferencia.EnTransito, transferencia.Estado);
        Assert.Equal(20m, linea.CantidadEnviada);
        Assert.Equal(10m, inventarioOrigen.Cantidad);
    }

    [Fact]
    public async Task RegistrarEnvio_StockInsuficienteEnOrigen_RechazaSinModificarInventario()
    {
        var linea = new TransferenciaLinea { Id = 1, ProductoId = 10, CantidadSolicitada = 20m, CantidadEnviada = 0m, CantidadRecibida = 0m };
        var transferencia = new Transferencia
        {
            Id = 1,
            SucursalOrigenId = SucursalOrigenId,
            SucursalDestinoId = SucursalDestinoId,
            UsuarioSolicitanteId = 1,
            Estado = EstadoTransferencia.EnPreparacion,
            FechaSolicitud = DateTime.UtcNow,
            Lineas = new List<TransferenciaLinea> { linea }
        };

        var repo = CrearRepositorioMock();
        repo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(transferencia);
        var inventarioOrigen = new Inventario { Id = 1, ProductoId = 10, SucursalId = SucursalOrigenId, Cantidad = 5m };
        repo.Setup(r => r.GetInventarioAsync(10, SucursalOrigenId)).ReturnsAsync(inventarioOrigen);

        var service = new TransferenciaService(repo.Object);
        var dto = new RegistrarEnvioDto
        {
            Lineas = new List<LineaEnvioDto> { new() { TransferenciaLineaId = 1, CantidadEnviada = 20m } }
        };

        var resultado = await service.RegistrarEnvioAsync(1, dto, 99);

        Assert.False(resultado.Exitoso);
        Assert.Contains("Stock insuficiente en origen", resultado.Error);
        Assert.Equal(5m, inventarioOrigen.Cantidad);
        Assert.Equal(EstadoTransferencia.EnPreparacion, transferencia.Estado);
    }

    [Fact]
    public async Task RegistrarEnvio_DesdeEstadoSolicitada_Rechaza()
    {
        var linea = new TransferenciaLinea { Id = 1, ProductoId = 10, CantidadSolicitada = 20m };
        var transferencia = new Transferencia
        {
            Id = 1,
            SucursalOrigenId = SucursalOrigenId,
            SucursalDestinoId = SucursalDestinoId,
            UsuarioSolicitanteId = 1,
            Estado = EstadoTransferencia.Solicitada,
            FechaSolicitud = DateTime.UtcNow,
            Lineas = new List<TransferenciaLinea> { linea }
        };

        var repo = CrearRepositorioMock();
        repo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(transferencia);

        var service = new TransferenciaService(repo.Object);
        var dto = new RegistrarEnvioDto
        {
            Lineas = new List<LineaEnvioDto> { new() { TransferenciaLineaId = 1, CantidadEnviada = 5m } }
        };

        var resultado = await service.RegistrarEnvioAsync(1, dto, 99);

        Assert.False(resultado.Exitoso);
        Assert.Contains("No se puede registrar el envío", resultado.Error);
    }

    // ---------- CrearAsync / IniciarPreparacionAsync / CancelarAsync ----------

    [Fact]
    public async Task CrearAsync_MismaSucursalOrigenYDestino_Rechaza()
    {
        var repo = CrearRepositorioMock();
        var service = new TransferenciaService(repo.Object);
        var dto = new CrearTransferenciaDto
        {
            SucursalOrigenId = 1,
            SucursalDestinoId = 1,
            UsuarioSolicitanteId = 1,
            Lineas = new List<CrearTransferenciaLineaDto> { new() { ProductoId = 10, CantidadSolicitada = 5m } }
        };

        var resultado = await service.CrearAsync(dto);

        Assert.False(resultado.Exitoso);
        Assert.Contains("no pueden ser la misma", resultado.Error);
    }

    [Fact]
    public async Task CrearAsync_Valida_CreaConEstadoSolicitadaYCantidadesEnviadaRecibidaEnCero()
    {
        var repo = CrearRepositorioMock();
        Transferencia? creada = null;
        repo.Setup(r => r.AddAsync(It.IsAny<Transferencia>()))
            .Callback<Transferencia>(t => { t.Id = 1; creada = t; })
            .Returns(Task.CompletedTask);
        repo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(() => creada);

        var service = new TransferenciaService(repo.Object);
        var dto = new CrearTransferenciaDto
        {
            SucursalOrigenId = SucursalOrigenId,
            SucursalDestinoId = SucursalDestinoId,
            UsuarioSolicitanteId = 1,
            Lineas = new List<CrearTransferenciaLineaDto> { new() { ProductoId = 10, CantidadSolicitada = 15m } }
        };

        var resultado = await service.CrearAsync(dto);

        Assert.True(resultado.Exitoso);
        Assert.Equal(EstadoTransferencia.Solicitada, creada!.Estado);
        Assert.Equal(0m, creada.Lineas.Single().CantidadEnviada);
        Assert.Equal(0m, creada.Lineas.Single().CantidadRecibida);
    }

    [Theory]
    [InlineData(EstadoTransferencia.EnTransito)]
    [InlineData(EstadoTransferencia.RecibidaCompleta)]
    [InlineData(EstadoTransferencia.RecibidaParcial)]
    [InlineData(EstadoTransferencia.Cancelada)]
    public async Task CancelarAsync_DesdeEstadosNoCancelables_Rechaza(EstadoTransferencia estado)
    {
        var transferencia = new Transferencia
        {
            Id = 1,
            SucursalOrigenId = SucursalOrigenId,
            SucursalDestinoId = SucursalDestinoId,
            UsuarioSolicitanteId = 1,
            Estado = estado,
            FechaSolicitud = DateTime.UtcNow,
            Lineas = new List<TransferenciaLinea>()
        };

        var repo = CrearRepositorioMock();
        repo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(transferencia);

        var service = new TransferenciaService(repo.Object);
        var resultado = await service.CancelarAsync(1);

        Assert.False(resultado.Exitoso);
        Assert.Equal(estado, transferencia.Estado); // no cambió
    }

    [Theory]
    [InlineData(EstadoTransferencia.Solicitada)]
    [InlineData(EstadoTransferencia.EnPreparacion)]
    public async Task CancelarAsync_DesdeEstadosCancelables_Permite(EstadoTransferencia estado)
    {
        var transferencia = new Transferencia
        {
            Id = 1,
            SucursalOrigenId = SucursalOrigenId,
            SucursalDestinoId = SucursalDestinoId,
            UsuarioSolicitanteId = 1,
            Estado = estado,
            FechaSolicitud = DateTime.UtcNow,
            Lineas = new List<TransferenciaLinea>()
        };

        var repo = CrearRepositorioMock();
        repo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(transferencia);

        var service = new TransferenciaService(repo.Object);
        var resultado = await service.CancelarAsync(1);

        Assert.True(resultado.Exitoso);
        Assert.Equal(EstadoTransferencia.Cancelada, transferencia.Estado);
    }

    [Fact]
    public async Task IniciarPreparacionAsync_DesdeSolicitada_CambiaAEnPreparacion()
    {
        var transferencia = new Transferencia
        {
            Id = 1,
            SucursalOrigenId = SucursalOrigenId,
            SucursalDestinoId = SucursalDestinoId,
            UsuarioSolicitanteId = 1,
            Estado = EstadoTransferencia.Solicitada,
            FechaSolicitud = DateTime.UtcNow,
            Lineas = new List<TransferenciaLinea>()
        };

        var repo = CrearRepositorioMock();
        repo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(transferencia);

        var service = new TransferenciaService(repo.Object);
        var resultado = await service.IniciarPreparacionAsync(1, 99);

        Assert.True(resultado.Exitoso);
        Assert.Equal(EstadoTransferencia.EnPreparacion, transferencia.Estado);
    }

    [Fact]
    public async Task IniciarPreparacionAsync_DesdeEnTransito_Rechaza()
    {
        var transferencia = new Transferencia
        {
            Id = 1,
            SucursalOrigenId = SucursalOrigenId,
            SucursalDestinoId = SucursalDestinoId,
            UsuarioSolicitanteId = 1,
            Estado = EstadoTransferencia.EnTransito,
            FechaSolicitud = DateTime.UtcNow,
            Lineas = new List<TransferenciaLinea>()
        };

        var repo = CrearRepositorioMock();
        repo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(transferencia);

        var service = new TransferenciaService(repo.Object);
        var resultado = await service.IniciarPreparacionAsync(1, 99);

        Assert.False(resultado.Exitoso);
        Assert.Equal(EstadoTransferencia.EnTransito, transferencia.Estado);
    }
}
