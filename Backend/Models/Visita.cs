namespace InventarioMultiSucursal.Api.Models;

// Una visita representa UN GRUPO que ingresa junto a la sucursal, no una
// persona individual. CantidadPersonas es siempre >= 1 (varias personas del
// mismo grupo cuentan como 1 visita, N personas).
public class Visita
{
    public int Id { get; set; }
    public int SucursalId { get; set; }
    public int UsuarioId { get; set; }
    public int CantidadPersonas { get; set; }
    public DateTime FechaHora { get; set; }

    public Sucursal? Sucursal { get; set; }
    public Usuario? Usuario { get; set; }
}
