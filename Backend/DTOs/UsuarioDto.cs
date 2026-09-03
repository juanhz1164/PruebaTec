using InventarioMultiSucursal.Api.Models;

namespace InventarioMultiSucursal.Api.DTOs;

// Nunca incluye PasswordHash: eso jamás debe salir de la API.
public class UsuarioDto
{
    public int Id { get; set; }
    public int? SucursalId { get; set; }
    public string? SucursalNombre { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public RolUsuario Rol { get; set; }
    public bool Activo { get; set; }
    public DateTime CreatedAt { get; set; }
}

// NOTA: por ahora se guarda "Password" tal cual como hash de prueba.
// Cuando se implemente el módulo de autenticación (T10), aquí debe calcularse
// el hash real (por ejemplo con BCrypt.Net-Next) antes de guardarlo.
public class CrearUsuarioDto
{
    public int? SucursalId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public RolUsuario Rol { get; set; }
}

public class ActualizarUsuarioDto
{
    public int? SucursalId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public RolUsuario Rol { get; set; }
    public bool Activo { get; set; }
}
