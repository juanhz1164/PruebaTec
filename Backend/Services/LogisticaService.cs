using InventarioMultiSucursal.Api.DTOs;
using InventarioMultiSucursal.Api.Models;
using InventarioMultiSucursal.Api.Repositories.Interfaces;
using InventarioMultiSucursal.Api.Services.Interfaces;

namespace InventarioMultiSucursal.Api.Services;

public class LogisticaService : ILogisticaService
{
    private readonly ITransferenciaRepository _repository;

    public LogisticaService(ITransferenciaRepository repository)
    {
        _repository = repository;
    }

    // T48: tiempos estimados vs. reales de cada transferencia ya enviada.
    public async Task<List<TiempoEnvioDto>> GetTiemposEnvioAsync()
    {
        var enviadas = await _repository.GetEnviadasAsync();

        return enviadas.Select(t =>
        {
            var diasEstimados = t.FechaEstimadaLlegada is not null
                ? (t.FechaEstimadaLlegada.Value - t.FechaEnvio!.Value).TotalDays
                : (double?)null;

            var diasReales = t.FechaRecepcion is not null
                ? (t.FechaRecepcion.Value - t.FechaEnvio!.Value).TotalDays
                : (double?)null;

            double? desviacion = diasEstimados is not null && diasReales is not null
                ? Math.Round(diasReales.Value - diasEstimados.Value, 2)
                : null;

            // Compara fechas exactas (no los días ya redondeados) para no perder
            // atrasos pequeños por el redondeo a 2 decimales.
            bool? cumplioTiempo = t.FechaEstimadaLlegada is not null && t.FechaRecepcion is not null
                ? t.FechaRecepcion.Value <= t.FechaEstimadaLlegada.Value
                : null;

            return new TiempoEnvioDto
            {
                TransferenciaId = t.Id,
                Ruta = t.Ruta ?? string.Empty,
                SucursalOrigenNombre = t.SucursalOrigen?.Nombre ?? string.Empty,
                SucursalDestinoNombre = t.SucursalDestino?.Nombre ?? string.Empty,
                FechaEnvio = t.FechaEnvio!.Value,
                FechaEstimadaLlegada = t.FechaEstimadaLlegada,
                FechaRecepcion = t.FechaRecepcion,
                DiasEstimados = diasEstimados is not null ? Math.Round(diasEstimados.Value, 2) : null,
                DiasReales = diasReales is not null ? Math.Round(diasReales.Value, 2) : null,
                DesviacionDias = desviacion,
                CumplioTiempoEstimado = cumplioTiempo
            };
        }).ToList();
    }

    // T49: agrupa las transferencias por ruta (texto libre), con costo y tiempo promedio,
    // y la prioridad más frecuente asignada a esa ruta.
    public async Task<List<ClasificacionRutaDto>> GetClasificacionRutasAsync()
    {
        var enviadas = await _repository.GetEnviadasAsync();

        return enviadas
            .Where(t => !string.IsNullOrWhiteSpace(t.Ruta))
            .GroupBy(t => t.Ruta!)
            .Select(g => new ClasificacionRutaDto
            {
                Ruta = g.Key,
                CantidadTransferencias = g.Count(),
                PrioridadMasFrecuente = g
                    .Where(t => t.Prioridad is not null)
                    .GroupBy(t => t.Prioridad!.Value)
                    .OrderByDescending(pg => pg.Count())
                    .Select(pg => (PrioridadTransferencia?)pg.Key)
                    .FirstOrDefault(),
                CostoPromedio = g.Any(t => t.CostoEnvio is not null)
                    ? Math.Round(g.Where(t => t.CostoEnvio is not null).Average(t => t.CostoEnvio!.Value), 2)
                    : null,
                TiempoPromedioDias = g.Any(t => t.FechaRecepcion is not null)
                    ? Math.Round(g.Where(t => t.FechaRecepcion is not null)
                        .Average(t => (t.FechaRecepcion!.Value - t.FechaEnvio!.Value).TotalDays), 2)
                    : null
            })
            .OrderByDescending(r => r.CantidadTransferencias)
            .ToList();
    }

    // T50: transferencias que aún no llegaron a un estado final.
    public async Task<List<TransferenciaEnCursoDto>> GetTransferenciasEnCursoAsync()
    {
        var enCurso = await _repository.GetEnCursoAsync();

        return enCurso.Select(t => new TransferenciaEnCursoDto
        {
            Id = t.Id,
            SucursalOrigenNombre = t.SucursalOrigen?.Nombre ?? string.Empty,
            SucursalDestinoNombre = t.SucursalDestino?.Nombre ?? string.Empty,
            Estado = t.Estado,
            Transportista = t.Transportista,
            Ruta = t.Ruta,
            FechaEnvio = t.FechaEnvio,
            FechaEstimadaLlegada = t.FechaEstimadaLlegada
        }).ToList();
    }

    // T51: cumplimiento agregado por sucursal de origen.
    public async Task<List<CumplimientoDto>> GetCumplimientoPorSucursalAsync()
    {
        var cerradas = await _repository.GetCerradasAsync();

        return cerradas
            .GroupBy(t => t.SucursalOrigen?.Nombre ?? string.Empty)
            .Select(g => Agregar(g.Key, g))
            .OrderBy(c => c.Agrupador)
            .ToList();
    }

    // T51: cumplimiento agregado por ruta.
    public async Task<List<CumplimientoDto>> GetCumplimientoPorRutaAsync()
    {
        var cerradas = await _repository.GetCerradasAsync();

        return cerradas
            .Where(t => !string.IsNullOrWhiteSpace(t.Ruta))
            .GroupBy(t => t.Ruta!)
            .Select(g => Agregar(g.Key, g))
            .OrderBy(c => c.Agrupador)
            .ToList();
    }

    private static CumplimientoDto Agregar(string clave, IEnumerable<Transferencia> transferencias)
    {
        var lista = transferencias.ToList();

        var aTiempo = lista.Count(t =>
            t.FechaEstimadaLlegada is not null && t.FechaRecepcion is not null
            && t.FechaRecepcion.Value <= t.FechaEstimadaLlegada.Value);

        var tarde = lista.Count(t =>
            t.FechaEstimadaLlegada is not null && t.FechaRecepcion is not null
            && t.FechaRecepcion.Value > t.FechaEstimadaLlegada.Value);

        return new CumplimientoDto
        {
            Agrupador = clave,
            TotalTransferenciasCerradas = lista.Count,
            RecibidasCompletas = lista.Count(t => t.Estado == EstadoTransferencia.RecibidaCompleta),
            RecibidasParciales = lista.Count(t => t.Estado == EstadoTransferencia.RecibidaParcial),
            EntregasATiempo = aTiempo,
            EntregasTarde = tarde
        };
    }
}
