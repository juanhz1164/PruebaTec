namespace InventarioMultiSucursal.Api.DTOs;

// Lo que la API devuelve al consultar el inventario de una sucursal.
// No expone el DbContext ni la forma exacta de las tablas, solo lo que el cliente necesita.
public class InventarioDto
{
    public int Id { get; set; }
    public int ProductoId { get; set; }
    public string ProductoNombre { get; set; } = string.Empty;
    public string ProductoSku { get; set; } = string.Empty;
    public string UnidadMedidaAbreviatura { get; set; } = string.Empty;
    public int SucursalId { get; set; }
    public decimal Cantidad { get; set; }
    public decimal StockMinimo { get; set; }
    public decimal CostoPromedio { get; set; }
    public DateTime UpdatedAt { get; set; }

    // true cuando el producto no tiene ningún registro de inventario en esta
    // sucursal (nunca se dio de alta ahí) o su cantidad es 0. En ambos casos
    // Id queda en 0 porque no hay una fila real de inventario que editar.
    public bool Agotado { get; set; }
}

// Lo que el cliente envía para crear el registro inicial de stock de un producto en una sucursal.
public class CrearInventarioDto
{
    public int ProductoId { get; set; }
    public int SucursalId { get; set; }
    public decimal Cantidad { get; set; }
    public decimal StockMinimo { get; set; }
    public decimal CostoPromedio { get; set; }
}

// Lo que el cliente envía para actualizar un registro de stock existente.
public class ActualizarInventarioDto
{
    public decimal Cantidad { get; set; }
    public decimal StockMinimo { get; set; }
    public decimal CostoPromedio { get; set; }
}
