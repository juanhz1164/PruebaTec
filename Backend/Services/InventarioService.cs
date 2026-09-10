using InventarioMultiSucursal.Api.DTOs;
using InventarioMultiSucursal.Api.Models;
using InventarioMultiSucursal.Api.Repositories.Interfaces;
using InventarioMultiSucursal.Api.Services.Interfaces;

namespace InventarioMultiSucursal.Api.Services;

// Aquí vive la lógica de negocio: reglas de stock, validaciones, transacciones.
// No sabe nada de HTTP (no usa ActionResult) ni de EF Core (no usa DbContext) directamente,
// solo habla con el repositorio a través de su interfaz.
public class InventarioService : IInventarioService
{
    private readonly IInventarioRepository _repository;
    private readonly IProductoRepository _productoRepository;

    public InventarioService(IInventarioRepository repository, IProductoRepository productoRepository)
    {
        _repository = repository;
        _productoRepository = productoRepository;
    }

    // Devuelve una fila por CADA producto activo del catálogo, no solo los que
    // ya tienen inventario dado de alta en esta sucursal: los que no tienen
    // registro (o su cantidad es 0) aparecen marcados como Agotado, en vez de
    // simplemente faltar de la lista.
    public async Task<List<InventarioDto>> GetPorSucursalAsync(int sucursalId)
    {
        var items = await _repository.GetPorSucursalAsync(sucursalId);
        var itemsPorProducto = items.ToDictionary(i => i.ProductoId);

        var productos = await _productoRepository.GetAllAsync();

        // El stock mínimo de un producto es el mismo en todas las sucursales
        // (es una propiedad del producto, aunque se guarde por sucursal). Para
        // un producto agotado en esta sucursal se usa el stock mínimo definido
        // en cualquier otra sucursal donde sí exista, en vez de mostrar 0.
        var todosLosItems = await _repository.GetTodosAsync();
        var stockMinimoPorProducto = todosLosItems
            .GroupBy(i => i.ProductoId)
            .ToDictionary(g => g.Key, g => g.First().StockMinimo);

        return productos
            .Where(p => p.Activo)
            .Select(p => itemsPorProducto.TryGetValue(p.Id, out var item)
                ? MapToDto(item)
                : MapAgotado(p, sucursalId, stockMinimoPorProducto.GetValueOrDefault(p.Id)))
            .OrderBy(dto => dto.ProductoNombre)
            .ToList();
    }

    public async Task<InventarioDto?> GetByIdAsync(int id)
    {
        var item = await _repository.GetByIdAsync(id);
        return item is null ? null : MapToDto(item);
    }

    public async Task<InventarioDto> CrearAsync(CrearInventarioDto dto)
    {
        var inventario = new Inventario
        {
            ProductoId = dto.ProductoId,
            SucursalId = dto.SucursalId,
            Cantidad = dto.Cantidad,
            StockMinimo = dto.StockMinimo,
            CostoPromedio = dto.CostoPromedio,
            UpdatedAt = DateTime.UtcNow
        };

        await _repository.AddAsync(inventario);
        await _repository.SaveChangesAsync();

        return MapToDto(inventario);
    }

    public async Task<bool> ActualizarAsync(int id, ActualizarInventarioDto dto)
    {
        var existente = await _repository.GetByIdAsync(id);
        if (existente is null)
        {
            return false;
        }

        existente.Cantidad = dto.Cantidad;
        existente.StockMinimo = dto.StockMinimo;
        existente.CostoPromedio = dto.CostoPromedio;
        existente.UpdatedAt = DateTime.UtcNow;

        await _repository.SaveChangesAsync();
        return true;
    }

    public async Task<List<MovimientoInventarioDto>> GetMovimientosAsync(int? productoId, int? sucursalId)
    {
        var movimientos = await _repository.GetMovimientosAsync(productoId, sucursalId);
        return movimientos.Select(MapToDto).ToList();
    }

    public async Task<ResultadoMovimiento> CrearMovimientoAsync(CrearMovimientoInventarioDto dto)
    {
        if (dto.Cantidad <= 0)
        {
            return ResultadoMovimiento.Falla("La cantidad del movimiento debe ser mayor que cero.");
        }

        var inventario = await _repository.GetPorProductoYSucursalAsync(dto.ProductoId, dto.SucursalId);
        if (inventario is null)
        {
            return ResultadoMovimiento.Falla("No existe registro de inventario para ese producto en esa sucursal.");
        }

        if (dto.Tipo == TipoMovimiento.Retiro && inventario.Cantidad < dto.Cantidad)
        {
            return ResultadoMovimiento.Falla("Stock insuficiente para realizar el retiro.");
        }

        await using var transaction = await _repository.BeginTransactionAsync();

        var movimiento = new MovimientoInventario
        {
            ProductoId = dto.ProductoId,
            SucursalId = dto.SucursalId,
            UsuarioId = dto.UsuarioId,
            Tipo = dto.Tipo,
            Cantidad = dto.Cantidad,
            Motivo = dto.Motivo,
            ReferenciaTipo = dto.ReferenciaTipo,
            ReferenciaId = dto.ReferenciaId,
            Fecha = DateTime.UtcNow
        };

        await _repository.AddMovimientoAsync(movimiento);

        inventario.Cantidad += dto.Tipo == TipoMovimiento.Ingreso
            ? dto.Cantidad
            : -dto.Cantidad;
        inventario.UpdatedAt = DateTime.UtcNow;

        await _repository.SaveChangesAsync();
        await transaction.CommitAsync();

        var movimientoConDetalle = await _repository.GetMovimientoConDetalleAsync(movimiento.Id);
        return ResultadoMovimiento.Ok(MapToDto(movimientoConDetalle));
    }

    private static InventarioDto MapToDto(Inventario i) => new()
    {
        Id = i.Id,
        ProductoId = i.ProductoId,
        ProductoNombre = i.Producto?.Nombre ?? string.Empty,
        ProductoSku = i.Producto?.Sku ?? string.Empty,
        UnidadMedidaAbreviatura = i.Producto?.UnidadMedida?.Abreviatura ?? string.Empty,
        SucursalId = i.SucursalId,
        Cantidad = i.Cantidad,
        StockMinimo = i.StockMinimo,
        CostoPromedio = i.CostoPromedio,
        UpdatedAt = i.UpdatedAt,
        Agotado = i.Cantidad <= 0
    };

    // Producto activo sin ningún registro de inventario en esta sucursal: se
    // muestra igual, pero marcado como agotado, sin un Id de inventario real.
    // El stock mínimo se toma de otra sucursal donde el producto sí exista
    // (es el mismo valor en toda la red), no se inventa un 0.
    private static InventarioDto MapAgotado(Producto p, int sucursalId, decimal stockMinimoReferencia) => new()
    {
        Id = 0,
        ProductoId = p.Id,
        ProductoNombre = p.Nombre,
        ProductoSku = p.Sku,
        UnidadMedidaAbreviatura = p.UnidadMedida?.Abreviatura ?? string.Empty,
        SucursalId = sucursalId,
        Cantidad = 0,
        StockMinimo = stockMinimoReferencia,
        CostoPromedio = 0,
        UpdatedAt = p.CreatedAt,
        Agotado = true
    };

    private static MovimientoInventarioDto MapToDto(MovimientoInventario m) => new()
    {
        Id = m.Id,
        ProductoId = m.ProductoId,
        ProductoNombre = m.Producto?.Nombre ?? string.Empty,
        SucursalId = m.SucursalId,
        UsuarioId = m.UsuarioId,
        UsuarioNombre = m.Usuario?.Nombre ?? string.Empty,
        Tipo = m.Tipo,
        Cantidad = m.Cantidad,
        Motivo = m.Motivo,
        ReferenciaTipo = m.ReferenciaTipo,
        ReferenciaId = m.ReferenciaId,
        Fecha = m.Fecha
    };
}
