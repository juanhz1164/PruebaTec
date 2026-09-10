using InventarioMultiSucursal.Api.DTOs;

namespace InventarioMultiSucursal.Api.Services.Interfaces;

public interface IVisitaService
{
    // sucursalId: sucursal a consultar. null = todas (solo tiene sentido para el Gerente/vista agregada;
    // el controller ya restringe qué sucursalId puede pedir cada usuario).
    Task<List<VisitaDto>> GetPorSucursalYFechaAsync(int? sucursalId, DateOnly fecha);
    Task<ResumenVisitasDto> GetResumenAsync(int? sucursalId, DateOnly fecha);
    Task<List<VisitasPorSucursalDto>> GetResumenPorSucursalAsync(DateOnly fecha);

    // Flujo de personas: un único día (agrupado por sucursal) o un mes completo
    // (agrupado por sucursal y día a día). sucursalId = null => todas las
    // sucursales (el controller decide quién puede pedir null).
    Task<FlujoPersonasResumenDto> GetFlujoPorDiaAsync(int? sucursalId, DateOnly fecha);
    Task<FlujoPersonasResumenDto> GetFlujoPorMesAsync(int? sucursalId, int anio, int mes);

    Task<ResultadoVisita> RegistrarAsync(int sucursalId, int usuarioId, CrearVisitaDto dto);
    Task<ResultadoVisita> EliminarAsync(int id, int? sucursalIdUsuario);
}

public class ResultadoVisita
{
    public bool Exitoso { get; init; }
    public string? Error { get; init; }
    public VisitaDto? Visita { get; init; }

    public static ResultadoVisita Falla(string error) => new() { Exitoso = false, Error = error };
    public static ResultadoVisita Ok(VisitaDto visita) => new() { Exitoso = true, Visita = visita };
}
