namespace InventarioMultiSucursal.Api.Models;

public class UnidadMedida
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Abreviatura { get; set; } = string.Empty;

    public ICollection<Producto> Productos { get; set; } = new List<Producto>();
}
