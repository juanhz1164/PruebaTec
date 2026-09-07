using InventarioMultiSucursal.Api.DTOs;
using InventarioMultiSucursal.Api.Models;
using InventarioMultiSucursal.Api.Repositories.Interfaces;
using InventarioMultiSucursal.Api.Services.Interfaces;

namespace InventarioMultiSucursal.Api.Services;

public class VisitaService : IVisitaService
{
    private readonly IVisitaRepository _repository;

    public VisitaService(IVisitaRepository repository)
    {
        _repository = repository;
    }

    public async Task<List<VisitaDto>> GetPorSucursalYFechaAsync(int? sucursalId, DateOnly fecha)
    {
        var visitas = await _repository.GetPorSucursalYFechaAsync(sucursalId, fecha);
        return visitas.Select(MapToDto).ToList();
    }

    public async Task<ResumenVisitasDto> GetResumenAsync(int? sucursalId, DateOnly fecha)
    {
        var visitas = await _repository.GetPorSucursalYFechaAsync(sucursalId, fecha);

        var totalVisitas = visitas.Count;
        var totalPersonas = visitas.Sum(v => v.CantidadPersonas);

        var porHora = visitas
            .GroupBy(v => ZonaHorariaColombia.ALocal(v.FechaHora).Hour)
            .Select(g => new VisitasPorHoraDto
            {
                Hora = g.Key,
                CantidadVisitas = g.Count(),
                CantidadPersonas = g.Sum(v => v.CantidadPersonas)
            })
            .OrderBy(h => h.Hora)
            .ToList();

        return new ResumenVisitasDto
        {
            TotalVisitas = totalVisitas,
            TotalPersonas = totalPersonas,
            // Promedio = personas totales / visitas totales (0 si no hay visitas, para no dividir por cero).
            PromedioPersonasPorVisita = totalVisitas > 0
                ? Math.Round((decimal)totalPersonas / totalVisitas, 2)
                : 0,
            PorHora = porHora
        };
    }

    public async Task<List<VisitasPorSucursalDto>> GetResumenPorSucursalAsync(DateOnly fecha)
    {
        var visitas = await _repository.GetPorSucursalYFechaAsync(null, fecha);

        return visitas
            .GroupBy(v => new { v.SucursalId, SucursalNombre = v.Sucursal?.Nombre ?? string.Empty })
            .Select(g => new VisitasPorSucursalDto
            {
                SucursalId = g.Key.SucursalId,
                SucursalNombre = g.Key.SucursalNombre,
                CantidadVisitas = g.Count(),
                CantidadPersonas = g.Sum(v => v.CantidadPersonas)
            })
            .OrderByDescending(r => r.CantidadVisitas)
            .ToList();
    }

    public async Task<FlujoPersonasResumenDto> GetFlujoPorDiaAsync(int? sucursalId, DateOnly fecha)
    {
        var visitas = await _repository.GetPorSucursalYFechaAsync(sucursalId, fecha);
        return ConstruirResumenFlujo(visitas, incluirPorDia: false, incluirPorHora: true);
    }

    public async Task<FlujoPersonasResumenDto> GetFlujoPorMesAsync(int? sucursalId, int anio, int mes)
    {
        var desde = new DateOnly(anio, mes, 1);
        var hasta = desde.AddMonths(1).AddDays(-1);

        var visitas = await _repository.GetPorSucursalYRangoAsync(sucursalId, desde, hasta);
        return ConstruirResumenFlujo(visitas, incluirPorDia: true, incluirPorHora: false, desde, hasta);
    }

    // Promedio SIEMPRE = personas totales / visitas totales del conjunto que se está
    // resumiendo (nunca el promedio de los promedios por sucursal/día).
    private static FlujoPersonasResumenDto ConstruirResumenFlujo(
        List<Visita> visitas,
        bool incluirPorDia,
        bool incluirPorHora,
        DateOnly? desde = null,
        DateOnly? hasta = null)
    {
        var totalVisitas = visitas.Count;
        var totalPersonas = visitas.Sum(v => v.CantidadPersonas);

        var porSucursal = visitas
            .GroupBy(v => new { v.SucursalId, SucursalNombre = v.Sucursal?.Nombre ?? string.Empty })
            .Select(g =>
            {
                var personasSucursal = g.Sum(v => v.CantidadPersonas);
                var visitasSucursal = g.Count();
                return new FlujoPersonasPorSucursalDto
                {
                    SucursalId = g.Key.SucursalId,
                    SucursalNombre = g.Key.SucursalNombre,
                    CantidadVisitas = visitasSucursal,
                    CantidadPersonas = personasSucursal,
                    PromedioPersonasPorVisita = visitasSucursal > 0
                        ? Math.Round((decimal)personasSucursal / visitasSucursal, 2)
                        : 0
                };
            })
            .OrderByDescending(s => s.CantidadPersonas)
            .ToList();

        List<FlujoPersonasPorDiaDto> porDia = new();
        if (incluirPorDia && desde.HasValue && hasta.HasValue)
        {
            var visitasPorFecha = visitas
                .GroupBy(v => DateOnly.FromDateTime(ZonaHorariaColombia.ALocal(v.FechaHora)))
                .ToDictionary(g => g.Key, g => g.ToList());

            for (var dia = desde.Value; dia <= hasta.Value; dia = dia.AddDays(1))
            {
                visitasPorFecha.TryGetValue(dia, out var visitasDelDia);
                porDia.Add(new FlujoPersonasPorDiaDto
                {
                    Fecha = dia,
                    CantidadVisitas = visitasDelDia?.Count ?? 0,
                    CantidadPersonas = visitasDelDia?.Sum(v => v.CantidadPersonas) ?? 0
                });
            }
        }

        var porHora = incluirPorHora
            ? visitas
                .GroupBy(v => ZonaHorariaColombia.ALocal(v.FechaHora).Hour)
                .Select(g => new VisitasPorHoraDto
                {
                    Hora = g.Key,
                    CantidadVisitas = g.Count(),
                    CantidadPersonas = g.Sum(v => v.CantidadPersonas)
                })
                .OrderBy(h => h.Hora)
                .ToList()
            : new List<VisitasPorHoraDto>();

        return new FlujoPersonasResumenDto
        {
            TotalVisitas = totalVisitas,
            TotalPersonas = totalPersonas,
            PromedioPersonasPorVisita = totalVisitas > 0
                ? Math.Round((decimal)totalPersonas / totalVisitas, 2)
                : 0,
            PorSucursal = porSucursal,
            PorDia = porDia,
            PorHora = porHora,
            // Solo tiene sentido cuando hay más de una sucursal en el resultado
            // (si la consulta ya viene acotada a una sola sucursal, no aporta información nueva).
            SucursalMayorFlujo = porSucursal.Count > 1 ? porSucursal[0].SucursalNombre : null
        };
    }

    public async Task<ResultadoVisita> RegistrarAsync(int sucursalId, int usuarioId, CrearVisitaDto dto)
    {
        if (dto.CantidadPersonas < 1)
        {
            return ResultadoVisita.Falla("La cantidad de personas debe ser un número entero mayor o igual a 1.");
        }

        var visita = new Visita
        {
            SucursalId = sucursalId,
            UsuarioId = usuarioId,
            CantidadPersonas = dto.CantidadPersonas,
            FechaHora = DateTime.UtcNow
        };

        await _repository.AddAsync(visita);
        await _repository.SaveChangesAsync();

        var creada = await _repository.GetByIdAsync(visita.Id);
        return ResultadoVisita.Ok(MapToDto(creada!));
    }

    public async Task<ResultadoVisita> EliminarAsync(int id, int? sucursalIdUsuario)
    {
        var visita = await _repository.GetByIdAsync(id);
        if (visita is null)
        {
            return ResultadoVisita.Falla("La visita no existe.");
        }

        // sucursalIdUsuario == null significa "sin restricción" (Administrador general,
        // aunque hoy Visitas no está expuesto a ese rol). Operador/Gerente solo pueden
        // eliminar visitas de su propia sucursal.
        if (sucursalIdUsuario.HasValue && visita.SucursalId != sucursalIdUsuario.Value)
        {
            return ResultadoVisita.Falla("No puedes eliminar una visita de otra sucursal.");
        }

        var dto = MapToDto(visita);
        _repository.Remove(visita);
        await _repository.SaveChangesAsync();

        return ResultadoVisita.Ok(dto);
    }

    // FechaHora se guarda en UTC pero MySQL no conserva el Kind (vuelve como
    // Unspecified), así que sin esto el JSON se serializa sin "Z" y el
    // navegador lo interpreta como hora local (sin restar el offset),
    // duplicando el desfase horario en vez de corregirlo.
    private static VisitaDto MapToDto(Visita v) => new()
    {
        Id = v.Id,
        SucursalId = v.SucursalId,
        SucursalNombre = v.Sucursal?.Nombre ?? string.Empty,
        UsuarioId = v.UsuarioId,
        UsuarioNombre = v.Usuario?.Nombre ?? string.Empty,
        CantidadPersonas = v.CantidadPersonas,
        FechaHora = DateTime.SpecifyKind(v.FechaHora, DateTimeKind.Utc)
    };
}
