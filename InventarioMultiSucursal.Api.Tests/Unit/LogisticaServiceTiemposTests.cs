using InventarioMultiSucursal.Api.DTOs;
using InventarioMultiSucursal.Api.Models;
using InventarioMultiSucursal.Api.Repositories.Interfaces;
using InventarioMultiSucursal.Api.Services;
using Moq;

namespace InventarioMultiSucursal.Api.Tests.Unit;

// Cubre los 5 casos obligatorios de "Tiempos estimados vs. reales": el
// resultado (Pendiente/ATiempo/Retraso/SinDatos) debe depender del Estado
// real de la transferencia y de una comparación de fechas completas, nunca
// del signo de un número ya redondeado.
public class LogisticaServiceTiemposTests
{
    private static Transferencia CrearBase(EstadoTransferencia estado, DateTime fechaEnvio,
        DateTime? fechaEstimada, DateTime? fechaRecepcion) => new()
    {
        Id = 1,
        SucursalOrigenId = 1,
        SucursalDestinoId = 2,
        UsuarioSolicitanteId = 1,
        Estado = estado,
        FechaSolicitud = fechaEnvio.AddHours(-1),
        FechaEnvio = fechaEnvio,
        FechaEstimadaLlegada = fechaEstimada,
        FechaRecepcion = fechaRecepcion,
        Ruta = "Sucursal Origen → Sucursal Destino",
        Lineas = new List<TransferenciaLinea>()
    };

    private static async Task<TiempoEnvioDto> EjecutarConUnaTransferencia(Transferencia t)
    {
        var repo = new Mock<ITransferenciaRepository>();
        repo.Setup(r => r.GetEnviadasAsync()).ReturnsAsync(new List<Transferencia> { t });

        var service = new LogisticaService(repo.Object);
        var resultado = await service.GetTiemposEnvioAsync();

        return Assert.Single(resultado);
    }

    // CASO 1: enviada, fecha estimada = mañana, todavía no recibida.
    [Fact]
    public async Task EnTransito_SinRecepcion_EsPendiente()
    {
        var ahora = DateTime.UtcNow;
        var t = CrearBase(EstadoTransferencia.EnTransito, ahora, ahora.AddDays(1), null);

        var dto = await EjecutarConUnaTransferencia(t);

        Assert.Equal(ResultadoTiempoEnvio.Pendiente, dto.Resultado);
        Assert.Null(dto.DiasReales);
        Assert.Null(dto.DesviacionDias);
        Assert.Null(dto.CumplioTiempoEstimado);
    }

    // CASO 2: fecha estimada = mañana, recibida hoy (antes de lo estimado) → A tiempo, desviación negativa.
    [Fact]
    public async Task RecibidaAntesDeLoEstimado_EsATiempo_ConDesviacionNegativa()
    {
        var envio = DateTime.UtcNow;
        var estimada = envio.AddDays(1);
        var recepcion = envio.AddHours(2); // llega mucho antes del día estimado

        var t = CrearBase(EstadoTransferencia.RecibidaCompleta, envio, estimada, recepcion);

        var dto = await EjecutarConUnaTransferencia(t);

        Assert.Equal(ResultadoTiempoEnvio.ATiempo, dto.Resultado);
        Assert.True(dto.DesviacionDias < 0, $"Se esperaba desviación negativa, fue {dto.DesviacionDias}");
        Assert.True(dto.CumplioTiempoEstimado);
    }

    // CASO 3: fecha estimada = hoy, recibida hoy en el mismo instante → A tiempo, desviación 0.
    [Fact]
    public async Task RecibidaExactoEnLaFechaEstimada_EsATiempo_ConDesviacionCero()
    {
        var envio = DateTime.UtcNow;
        var estimada = envio.AddHours(3);
        var recepcion = estimada; // llega exactamente cuando se esperaba

        var t = CrearBase(EstadoTransferencia.RecibidaCompleta, envio, estimada, recepcion);

        var dto = await EjecutarConUnaTransferencia(t);

        Assert.Equal(ResultadoTiempoEnvio.ATiempo, dto.Resultado);
        Assert.Equal(0, dto.DesviacionDias);
        Assert.True(dto.CumplioTiempoEstimado);
    }

    // CASO 4: fecha estimada = ayer, recibida hoy → Retraso, desviación positiva.
    [Fact]
    public async Task RecibidaDespuesDeLoEstimado_EsRetraso_ConDesviacionPositiva()
    {
        var envio = DateTime.UtcNow.AddDays(-2);
        var estimada = envio.AddDays(1); // "ayer" respecto a la recepción
        var recepcion = DateTime.UtcNow; // hoy, después de lo estimado

        var t = CrearBase(EstadoTransferencia.RecibidaCompleta, envio, estimada, recepcion);

        var dto = await EjecutarConUnaTransferencia(t);

        Assert.Equal(ResultadoTiempoEnvio.Retraso, dto.Resultado);
        Assert.True(dto.DesviacionDias > 0, $"Se esperaba desviación positiva, fue {dto.DesviacionDias}");
        Assert.False(dto.CumplioTiempoEstimado);
    }

    // CASO 5: fecha estimada futura, aún sin recibir → nunca "A tiempo" ni "Retraso": Pendiente.
    [Fact]
    public async Task ConFechaEstimadaFutura_SinRecibir_NuncaEsATiempoNiRetraso()
    {
        var envio = DateTime.UtcNow;
        var estimada = envio.AddDays(5);

        var t = CrearBase(EstadoTransferencia.EnTransito, envio, estimada, null);

        var dto = await EjecutarConUnaTransferencia(t);

        Assert.Equal(ResultadoTiempoEnvio.Pendiente, dto.Resultado);
        Assert.NotEqual(ResultadoTiempoEnvio.ATiempo, dto.Resultado);
        Assert.NotEqual(ResultadoTiempoEnvio.Retraso, dto.Resultado);
    }

    // Regresión del bug reportado: una fecha estimada corrupta (anterior al
    // envío, de datos históricos previos a la validación actual) no debe
    // producir "días estimados" negativos ni desviaciones sin sentido.
    [Fact]
    public async Task ConFechaEstimadaAnteriorAlEnvio_SeTrataComoSinDatos()
    {
        var envio = DateTime.UtcNow;
        var estimadaCorrupta = envio.AddDays(-1); // dato histórico inconsistente
        var recepcion = envio.AddMinutes(10);

        var t = CrearBase(EstadoTransferencia.RecibidaCompleta, envio, estimadaCorrupta, recepcion);

        var dto = await EjecutarConUnaTransferencia(t);

        Assert.Equal(ResultadoTiempoEnvio.SinDatos, dto.Resultado);
        Assert.Null(dto.DiasEstimados);
        Assert.Null(dto.DesviacionDias);
    }

    // Recibida pero sin fecha estimada registrada en absoluto → SinDatos, no Retraso.
    [Fact]
    public async Task RecibidaSinFechaEstimada_EsSinDatos()
    {
        var envio = DateTime.UtcNow;
        var recepcion = envio.AddHours(5);

        var t = CrearBase(EstadoTransferencia.RecibidaCompleta, envio, null, recepcion);

        var dto = await EjecutarConUnaTransferencia(t);

        Assert.Equal(ResultadoTiempoEnvio.SinDatos, dto.Resultado);
    }

    // Caso crítico de zona horaria (el que reportó el usuario): el usuario
    // elige "10/09/2026" como fecha estimada — el frontend la codifica como
    // medianoche EN HORA COLOMBIA (2026-09-10T00:00:00-05:00 == 2026-09-10T
    // 05:00:00 UTC, ver EnvioForm.fechaSoloDiaAIsoColombia), no medianoche
    // UTC. La recepción ocurre a las 20:47 hora Colombia del MISMO día
    // 10/09 — que en UTC es 2026-09-11T01:47:00 (ya cruzó a otro día en
    // UTC). Comparar instantes UTC crudos marcaría esto como Retraso
    // (11/09 > 10/09 en UTC); comparando por día calendario en hora Colombia
    // (ZonaHorariaColombia.ALocal) ambos caen el mismo 10/09 → A tiempo.
    [Fact]
    public async Task RecepcionMismoDiaColombia_CruzandoMedianocheUtc_EsATiempo()
    {
        var envio = new DateTime(2026, 9, 10, 13, 0, 0, DateTimeKind.Utc); // 08:00 Colombia
        var estimada = new DateTime(2026, 9, 10, 5, 0, 0, DateTimeKind.Utc); // "10/09/2026" medianoche Colombia
        var recepcionUtc = new DateTime(2026, 9, 11, 1, 47, 0, DateTimeKind.Utc); // 20:47 Colombia del 10/09

        var t = CrearBase(EstadoTransferencia.RecibidaCompleta, envio, estimada, recepcionUtc);

        var dto = await EjecutarConUnaTransferencia(t);

        Assert.Equal(ResultadoTiempoEnvio.ATiempo, dto.Resultado);
    }

    // Mismo escenario pero un día después (11/09 08:00 Colombia) → sí es Retraso.
    [Fact]
    public async Task RecepcionDiaSiguienteColombia_EsRetraso()
    {
        var envio = new DateTime(2026, 9, 10, 13, 0, 0, DateTimeKind.Utc); // 08:00 Colombia
        var estimada = new DateTime(2026, 9, 10, 5, 0, 0, DateTimeKind.Utc); // "10/09/2026" medianoche Colombia
        var recepcionUtc = new DateTime(2026, 9, 11, 13, 0, 0, DateTimeKind.Utc); // 08:00 Colombia del 11/09

        var t = CrearBase(EstadoTransferencia.RecibidaCompleta, envio, estimada, recepcionUtc);

        var dto = await EjecutarConUnaTransferencia(t);

        Assert.Equal(ResultadoTiempoEnvio.Retraso, dto.Resultado);
    }
}
