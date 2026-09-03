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

    public InventarioService(IInventarioRepository repository)
    {
        _repository = repository;
    }

    public async Task<List<InventarioDto>> GetPorSucursalAsync(int sucursalId)
    {
        var items = await _repository.GetPorSucursalAsync(sucursalId);
        return items.Select(MapToDto).ToList();
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
        UpdatedAt = i.UpdatedAt
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
