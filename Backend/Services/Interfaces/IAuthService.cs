using InventarioMultiSucursal.Api.DTOs;

namespace InventarioMultiSucursal.Api.Services.Interfaces;

public interface IAuthService
{
    Task<ResultadoLogin> LoginAsync(LoginDto dto);
}

public class ResultadoLogin
{
    public bool Exitoso { get; init; }
    public string? Error { get; init; }
    public LoginResponseDto? Respuesta { get; init; }

    public static ResultadoLogin Falla(string error) => new() { Exitoso = false, Error = error };
    public static ResultadoLogin Ok(LoginResponseDto respuesta) => new() { Exitoso = true, Respuesta = respuesta };
}
