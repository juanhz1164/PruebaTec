using InventarioMultiSucursal.Api.Models;

namespace InventarioMultiSucursal.Api.Repositories.Interfaces;

public interface IProductoRepository
{
    Task<List<Producto>> GetAllAsync();
    Task<Producto?> GetByIdAsync(int id);
    Task AddAsync(Producto producto);
    void Remove(Producto producto);
    Task<int> SaveChangesAsync();

    Task<ProductoUnidadMedida?> GetUnidadAlternativaAsync(int productoId, int unidadMedidaId);
    Task AddUnidadAlternativaAsync(ProductoUnidadMedida unidad);
    Task<ProductoUnidadMedida?> GetUnidadAlternativaByIdAsync(int id);
    void RemoveUnidadAlternativa(ProductoUnidadMedida unidad);

    // T34: inventario (con producto y sucursal) cuya cantidad ya llegó al stock mínimo o por debajo.
    Task<List<Inventario>> GetInventarioBajoMinimoAsync(int? sucursalId);
}
