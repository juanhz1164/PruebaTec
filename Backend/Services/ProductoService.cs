using InventarioMultiSucursal.Api.DTOs;
using InventarioMultiSucursal.Api.Models;
using InventarioMultiSucursal.Api.Repositories.Interfaces;
using InventarioMultiSucursal.Api.Services.Interfaces;

namespace InventarioMultiSucursal.Api.Services;

public class ProductoService : IProductoService
{
    private readonly IProductoRepository _repository;

    public ProductoService(IProductoRepository repository)
    {
        _repository = repository;
    }

    public async Task<List<ProductoDto>> GetAllAsync()
    {
        var productos = await _repository.GetAllAsync();
        return productos.Select(MapToDto).ToList();
    }

    public async Task<ProductoDto?> GetByIdAsync(int id)
    {
        var producto = await _repository.GetByIdAsync(id);
        return producto is null ? null : MapToDto(producto);
    }

    public async Task<ProductoDto> CrearAsync(CrearProductoDto dto)
    {
        var producto = new Producto
        {
            UnidadMedidaId = dto.UnidadMedidaId,
            Sku = dto.Sku,
            Nombre = dto.Nombre,
            Descripcion = dto.Descripcion,
            Categoria = dto.Categoria,
            Activo = true,
            CreatedAt = DateTime.UtcNow
        };

        await _repository.AddAsync(producto);
        await _repository.SaveChangesAsync();

        var creado = await _repository.GetByIdAsync(producto.Id);
        return MapToDto(creado!);
    }

    public async Task<bool> ActualizarAsync(int id, ActualizarProductoDto dto)
    {
        var existente = await _repository.GetByIdAsync(id);
        if (existente is null)
        {
            return false;
        }

        existente.UnidadMedidaId = dto.UnidadMedidaId;
        existente.Sku = dto.Sku;
        existente.Nombre = dto.Nombre;
        existente.Descripcion = dto.Descripcion;
        existente.Categoria = dto.Categoria;
        existente.Activo = dto.Activo;

        await _repository.SaveChangesAsync();
        return true;
    }

    public async Task<bool> EliminarAsync(int id)
    {
        var existente = await _repository.GetByIdAsync(id);
        if (existente is null)
        {
            return false;
        }

        _repository.Remove(existente);
        await _repository.SaveChangesAsync();
        return true;
    }

    public async Task<ResultadoUnidadAlternativa> AgregarUnidadAlternativaAsync(int productoId, CrearUnidadAlternativaDto dto)
    {
        if (dto.FactorConversion <= 0)
        {
            return ResultadoUnidadAlternativa.Falla("El factor de conversión debe ser mayor que cero.");
        }

        var producto = await _repository.GetByIdAsync(productoId);
        if (producto is null)
        {
            return ResultadoUnidadAlternativa.Falla("El producto no existe.");
        }

        if (producto.UnidadMedidaId == dto.UnidadMedidaId)
        {
            return ResultadoUnidadAlternativa.Falla("La unidad alternativa no puede ser igual a la unidad base del producto.");
        }

        var existente = await _repository.GetUnidadAlternativaAsync(productoId, dto.UnidadMedidaId);
        if (existente is not null)
        {
            return ResultadoUnidadAlternativa.Falla("Ese producto ya tiene registrada esa unidad de medida alternativa.");
        }

        var unidad = new ProductoUnidadMedida
        {
            ProductoId = productoId,
            UnidadMedidaId = dto.UnidadMedidaId,
            FactorConversion = dto.FactorConversion
        };

        await _repository.AddUnidadAlternativaAsync(unidad);
        await _repository.SaveChangesAsync();

        var creada = await _repository.GetUnidadAlternativaByIdAsync(unidad.Id);
        return ResultadoUnidadAlternativa.Ok(MapToDto(creada!));
    }

    public async Task<bool> EliminarUnidadAlternativaAsync(int productoId, int unidadAlternativaId)
    {
        var unidad = await _repository.GetUnidadAlternativaByIdAsync(unidadAlternativaId);
        if (unidad is null || unidad.ProductoId != productoId)
        {
            return false;
        }

        _repository.RemoveUnidadAlternativa(unidad);
        await _repository.SaveChangesAsync();
        return true;
    }

    public async Task<List<AlertaStockDto>> GetAlertasStockAsync(int? sucursalId)
    {
        var inventarioBajoMinimo = await _repository.GetInventarioBajoMinimoAsync(sucursalId);

        return inventarioBajoMinimo.Select(i => new AlertaStockDto
        {
            InventarioId = i.Id,
            ProductoId = i.ProductoId,
            ProductoNombre = i.Producto?.Nombre ?? string.Empty,
            ProductoSku = i.Producto?.Sku ?? string.Empty,
            SucursalId = i.SucursalId,
            SucursalNombre = i.Sucursal?.Nombre ?? string.Empty,
            Cantidad = i.Cantidad,
            StockMinimo = i.StockMinimo,
            Faltante = i.StockMinimo - i.Cantidad
        }).ToList();
    }

    private static ProductoDto MapToDto(Producto p) => new()
    {
        Id = p.Id,
        Sku = p.Sku,
        Nombre = p.Nombre,
        Descripcion = p.Descripcion,
        Categoria = p.Categoria,
        Activo = p.Activo,
        UnidadMedidaId = p.UnidadMedidaId,
        UnidadMedidaNombre = p.UnidadMedida?.Nombre ?? string.Empty,
        UnidadMedidaAbreviatura = p.UnidadMedida?.Abreviatura ?? string.Empty,
        CreatedAt = p.CreatedAt,
        UnidadesAlternativas = p.UnidadesAlternativas.Select(MapToDto).ToList()
    };

    private static UnidadAlternativaDto MapToDto(ProductoUnidadMedida ua) => new()
    {
        Id = ua.Id,
        UnidadMedidaId = ua.UnidadMedidaId,
        UnidadMedidaNombre = ua.UnidadMedida?.Nombre ?? string.Empty,
        UnidadMedidaAbreviatura = ua.UnidadMedida?.Abreviatura ?? string.Empty,
        FactorConversion = ua.FactorConversion
    };
}
