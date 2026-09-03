namespace InventarioMultiSucursal.Api.DTOs;

public class SucursalDto
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Direccion { get; set; }
    public string? Ciudad { get; set; }
    public string? Telefono { get; set; }
    public bool Activa { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CrearSucursalDto
{
    public string Nombre { get; set; } = string.Empty;
    public string? Direccion { get; set; }
    public string? Ciudad { get; set; }
    public string? Telefono { get; set; }
}

public class ActualizarSucursalDto
{
    public string Nombre { get; set; } = string.Empty;
    public string? Direccion { get; set; }
    public string? Ciudad { get; set; }
    public string? Telefono { get; set; }
    public bool Activa { get; set; }
}
