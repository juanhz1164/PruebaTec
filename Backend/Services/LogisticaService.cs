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
    //
    // Resultado (Pendiente/ATiempo/Retraso/SinDatos) es la ÚNICA fuente de
    // verdad para el estado/color de cada fila en el frontend, y se decide
    // aquí a partir del Estado real de la transferencia — nunca inferido a
    // partir de si un número es null o de su signo:
    //   - EnTransito (todavía sin FechaRecepcion)      → Pendiente
    //   - Recibida sin FechaEstimadaLlegada registrada → SinDatos
    //   - Recibida, día(FechaRecepcion) <= día(FechaEstimada) → ATiempo
    //   - Recibida, día(FechaRecepcion) >  día(FechaEstimada) → Retraso
    // FechaEstimadaLlegada es un campo "solo fecha" (sin hora, ver EnvioForm):
    // por eso la comparación se hace por DÍA CALENDARIO — en hora de
    // Colombia, no UTC — y no por instante exacto, que marcaría como
    // "retraso" cualquier recepción del mismo día después de medianoche.
    public async Task<List<TiempoEnvioDto>> GetTiemposEnvioAsync()
    {
        var enviadas = await _repository.GetEnviadasAsync();

        return enviadas.Select(t =>
        {
            var transferenciaEnTransito = t.Estado == EstadoTransferencia.EnTransito;

            // Dato corrupto histórico (fecha estimada registrada antes del DÍA
            // de envío, de antes de que existiera la validación actual): no se
            // calculan "días estimados" negativos sin sentido — se trata como
            // si no hubiera fecha estimada. Se compara por día calendario en
            // hora Colombia (no instante UTC): FechaEstimadaLlegada es un
            // campo "solo fecha" (medianoche UTC del día elegido), así que es
            // normal y válido que quede antes que la hora exacta del envío
            // del mismo día calendario.
            var fechaEstimadaValida = t.FechaEstimadaLlegada is not null
                && ZonaHorariaColombia.ALocal(t.FechaEstimadaLlegada.Value).Date >= ZonaHorariaColombia.ALocal(t.FechaEnvio!.Value).Date
                ? t.FechaEstimadaLlegada
                : null;

            var diasEstimados = fechaEstimadaValida is not null
                ? (fechaEstimadaValida.Value - t.FechaEnvio!.Value).TotalDays
                : (double?)null;

            var diasReales = t.FechaRecepcion is not null
                ? (t.FechaRecepcion.Value - t.FechaEnvio!.Value).TotalDays
                : (double?)null;

            double? desviacion = diasEstimados is not null && diasReales is not null
                ? diasReales.Value - diasEstimados.Value
                : null;

            ResultadoTiempoEnvio resultado;
            if (transferenciaEnTransito || t.FechaRecepcion is null)
            {
                resultado = ResultadoTiempoEnvio.Pendiente;
            }
            else if (fechaEstimadaValida is null)
            {
                resultado = ResultadoTiempoEnvio.SinDatos;
            }
            else
            {
                var diaEstimado = ZonaHorariaColombia.ALocal(fechaEstimadaValida.Value).Date;
                var diaRecepcion = ZonaHorariaColombia.ALocal(t.FechaRecepcion.Value).Date;
                resultado = diaRecepcion <= diaEstimado
                    ? ResultadoTiempoEnvio.ATiempo
                    : ResultadoTiempoEnvio.Retraso;
            }

            return new TiempoEnvioDto
            {
                TransferenciaId = t.Id,
                Ruta = t.Ruta ?? string.Empty,
                SucursalOrigenNombre = t.SucursalOrigen?.Nombre ?? string.Empty,
                SucursalDestinoNombre = t.SucursalDestino?.Nombre ?? string.Empty,
                FechaEnvio = t.FechaEnvio!.Value,
                FechaEstimadaLlegada = fechaEstimadaValida,
                FechaRecepcion = t.FechaRecepcion,
                DiasEstimados = diasEstimados is not null ? Math.Round(diasEstimados.Value, 2) : null,
                DiasReales = diasReales is not null ? Math.Round(diasReales.Value, 2) : null,
                DesviacionDias = desviacion is not null ? Math.Round(desviacion.Value, 2) : null,
                Resultado = resultado,
                CumplioTiempoEstimado = resultado == ResultadoTiempoEnvio.Pendiente ? null : resultado == ResultadoTiempoEnvio.ATiempo
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

    // Misma regla de "a tiempo" que GetTiemposEnvioAsync: comparación por día
    // calendario en hora de Colombia (FechaEstimadaLlegada es solo fecha).
    private static bool LlegoATiempo(Transferencia t) =>
        t.FechaEstimadaLlegada is not null && t.FechaRecepcion is not null
        && ZonaHorariaColombia.ALocal(t.FechaRecepcion.Value).Date <= ZonaHorariaColombia.ALocal(t.FechaEstimadaLlegada.Value).Date;

    private static CumplimientoDto Agregar(string clave, IEnumerable<Transferencia> transferencias)
    {
        var lista = transferencias.ToList();

        var aTiempo = lista.Count(t => t.FechaEstimadaLlegada is not null && t.FechaRecepcion is not null && LlegoATiempo(t));

        var tarde = lista.Count(t =>
            t.FechaEstimadaLlegada is not null && t.FechaRecepcion is not null && !LlegoATiempo(t));

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
