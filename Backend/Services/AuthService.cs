using InventarioMultiSucursal.Api.DTOs;
using InventarioMultiSucursal.Api.Repositories.Interfaces;
using InventarioMultiSucursal.Api.Services.Interfaces;

namespace InventarioMultiSucursal.Api.Services;

public class AuthService : IAuthService
{
    private readonly IUsuarioRepository _usuarioRepository;
    private readonly IJwtService _jwtService;

    public AuthService(IUsuarioRepository usuarioRepository, IJwtService jwtService)
    {
        _usuarioRepository = usuarioRepository;
        _jwtService = jwtService;
    }

    public async Task<ResultadoLogin> LoginAsync(LoginDto dto)
    {
        var usuario = await _usuarioRepository.GetByEmailAsync(dto.Email);

        // Mismo mensaje genérico si el usuario no existe o la contraseña no coincide,
        // para no revelar si un email está registrado en el sistema.
        if (usuario is null || !BCrypt.Net.BCrypt.Verify(dto.Password, usuario.PasswordHash))
        {
            return ResultadoLogin.Falla("Credenciales inválidas.");
        }

        if (!usuario.Activo)
        {
            return ResultadoLogin.Falla("El usuario está inactivo.");
        }

        var (token, expiraEn) = _jwtService.GenerarToken(usuario);

        return ResultadoLogin.Ok(new LoginResponseDto
        {
            Token = token,
            ExpiraEn = expiraEn,
            Usuario = new UsuarioDto
            {
                Id = usuario.Id,
                SucursalId = usuario.SucursalId,
                SucursalNombre = usuario.Sucursal?.Nombre,
                Nombre = usuario.Nombre,
                Email = usuario.Email,
                Rol = usuario.Rol,
                Activo = usuario.Activo,
                CreatedAt = usuario.CreatedAt
            }
        });
    }
}
