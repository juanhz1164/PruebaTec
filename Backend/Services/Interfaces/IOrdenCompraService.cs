using InventarioMultiSucursal.Api.DTOs;

namespace InventarioMultiSucursal.Api.Services.Interfaces;

public interface IOrdenCompraService
{
    Task<List<OrdenCompraDto>> GetAllAsync();
    Task<OrdenCompraDto?> GetByIdAsync(int id);
    Task<ResultadoOrdenCompra> CrearAsync(CrearOrdenCompraDto dto);
    Task<ResultadoOrdenCompra> CambiarEstadoAsync(int id, CambiarEstadoOrdenCompraDto dto);

    // T38: histórico de compras por proveedor o por producto.
    Task<List<OrdenCompraLineaDto>> GetHistoricoPorProveedorAsync(int proveedorId);
    Task<List<OrdenCompraLineaDto>> GetHistoricoPorProductoAsync(int productoId);
}

public class ResultadoOrdenCompra
{
    public bool Exitoso { get; init; }
    public string? Error { get; init; }
    public OrdenCompraDto? Orden { get; init; }

    public static ResultadoOrdenCompra Falla(string error) => new() { Exitoso = false, Error = error };
    public static ResultadoOrdenCompra Ok(OrdenCompraDto orden) => new() { Exitoso = true, Orden = orden };
}
