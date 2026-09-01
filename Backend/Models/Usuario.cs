namespace InventarioMultiSucursal.Api.Models;

public class Usuario
{
    public int Id { get; set; }
    public int? SucursalId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public RolUsuario Rol { get; set; }
    public bool Activo { get; set; } = true;
    public DateTime CreatedAt { get; set; }

    public Sucursal? Sucursal { get; set; }
}
