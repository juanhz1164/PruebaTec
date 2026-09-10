using InventarioMultiSucursal.Api.DTOs;
using InventarioMultiSucursal.Api.Models;
using InventarioMultiSucursal.Api.Repositories.Interfaces;
using InventarioMultiSucursal.Api.Services.Interfaces;

namespace InventarioMultiSucursal.Api.Services;

public class OrdenCompraService : IOrdenCompraService
{
    private readonly IOrdenCompraRepository _repository;

    public OrdenCompraService(IOrdenCompraRepository repository)
    {
        _repository = repository;
    }

    public async Task<List<OrdenCompraDto>> GetAllAsync()
    {
        var ordenes = await _repository.GetAllAsync();
        return ordenes.Select(MapToDto).ToList();
    }

    public async Task<OrdenCompraDto?> GetByIdAsync(int id)
    {
        var orden = await _repository.GetByIdAsync(id);
        return orden is null ? null : MapToDto(orden);
    }

    public async Task<ResultadoOrdenCompra> CrearAsync(CrearOrdenCompraDto dto)
    {
        if (dto.Lineas.Count == 0)
        {
            return ResultadoOrdenCompra.Falla("La orden de compra debe tener al menos una línea.");
        }

        if (dto.Lineas.Any(l => l.Cantidad <= 0))
        {
            return ResultadoOrdenCompra.Falla("La cantidad de cada línea debe ser mayor que cero.");
        }

        if (dto.Lineas.Any(l => l.PrecioUnitario < 0))
        {
            return ResultadoOrdenCompra.Falla("El precio unitario de cada línea no puede ser negativo.");
        }

        var orden = new OrdenCompra
        {
            ProveedorId = dto.ProveedorId,
            SucursalId = dto.SucursalId,
            UsuarioId = dto.UsuarioId,
            PlazoPagoDias = dto.PlazoPagoDias,
            Estado = EstadoOrdenCompra.Pendiente,
            Fecha = DateTime.UtcNow,
            FechaRecepcion = null,
            Lineas = dto.Lineas.Select(l => new OrdenCompraLinea
            {
                ProductoId = l.ProductoId,
                Cantidad = l.Cantidad,
                PrecioUnitario = l.PrecioUnitario,
                Descuento = l.Descuento
            }).ToList()
        };

        await _repository.AddAsync(orden);
        await _repository.SaveChangesAsync();

        var creada = await _repository.GetByIdAsync(orden.Id);
        return ResultadoOrdenCompra.Ok(MapToDto(creada!));
    }

    public async Task<ResultadoOrdenCompra> CambiarEstadoAsync(int id, CambiarEstadoOrdenCompraDto dto)
    {
        var orden = await _repository.GetByIdAsync(id);
        if (orden is null)
        {
            return ResultadoOrdenCompra.Falla("La orden de compra no existe.");
        }

        if (!EsTransicionValida(orden.Estado, dto.Estado))
        {
            return ResultadoOrdenCompra.Falla($"No se puede cambiar el estado de '{orden.Estado}' a '{dto.Estado}'.");
        }

        await using var transaction = await _repository.BeginTransactionAsync();

        orden.Estado = dto.Estado;

        if (dto.Estado == EstadoOrdenCompra.Recibida)
        {
            orden.FechaRecepcion = DateTime.UtcNow;
            await AplicarRecepcionAlInventarioAsync(orden);
        }

        await _repository.SaveChangesAsync();
        await transaction.CommitAsync();

        var actualizada = await _repository.GetByIdAsync(id);
        return ResultadoOrdenCompra.Ok(MapToDto(actualizada!));
    }

    // T37 + T39: por cada línea de la orden, suma el stock recibido en la sucursal
    // de la orden y recalcula el costo promedio ponderado, dejando trazabilidad
    // con un MovimientoInventario de tipo Ingreso referenciando la orden de compra.
    private async Task AplicarRecepcionAlInventarioAsync(OrdenCompra orden)
    {
        foreach (var linea in orden.Lineas)
        {
            var inventario = await _repository.GetInventarioAsync(linea.ProductoId, orden.SucursalId);

            if (inventario is null)
            {
                inventario = new Inventario
                {
                    ProductoId = linea.ProductoId,
                    SucursalId = orden.SucursalId,
                    Cantidad = 0,
                    StockMinimo = 0,
                    CostoPromedio = 0,
                    UpdatedAt = DateTime.UtcNow
                };
                await _repository.AddInventarioAsync(inventario);
            }

            // Costo promedio ponderado (T39):
            // (stock actual * costo actual + cantidad recibida * precio unitario) / stock total
            var valorActual = inventario.Cantidad * inventario.CostoPromedio;
            var valorRecibido = linea.Cantidad * linea.PrecioUnitario;
            var cantidadTotal = inventario.Cantidad + linea.Cantidad;

            inventario.CostoPromedio = cantidadTotal == 0
                ? 0
                : (valorActual + valorRecibido) / cantidadTotal;
            inventario.Cantidad = cantidadTotal;
            inventario.UpdatedAt = DateTime.UtcNow;

            await _repository.AddMovimientoAsync(new MovimientoInventario
            {
                ProductoId = linea.ProductoId,
                SucursalId = orden.SucursalId,
                UsuarioId = orden.UsuarioId,
                Tipo = TipoMovimiento.Ingreso,
                Cantidad = linea.Cantidad,
                Motivo = "Recepción de orden de compra",
                ReferenciaTipo = "orden_compra",
                ReferenciaId = orden.Id,
                Fecha = DateTime.UtcNow
            });
        }
    }

    private static bool EsTransicionValida(EstadoOrdenCompra actual, EstadoOrdenCompra nuevo)
    {
        if (actual == nuevo)
        {
            return false;
        }

        return actual switch
        {
            EstadoOrdenCompra.Pendiente => nuevo is EstadoOrdenCompra.Confirmada or EstadoOrdenCompra.Cancelada,
            EstadoOrdenCompra.Confirmada => nuevo is EstadoOrdenCompra.Recibida or EstadoOrdenCompra.Cancelada,
            EstadoOrdenCompra.Recibida => false,
            EstadoOrdenCompra.Cancelada => false,
            _ => false
        };
    }

    public async Task<List<OrdenCompraLineaDto>> GetHistoricoPorProveedorAsync(int proveedorId)
    {
        var lineas = await _repository.GetLineasPorProveedorAsync(proveedorId);
        return lineas.Select(MapToDto).ToList();
    }

    public async Task<List<OrdenCompraLineaDto>> GetHistoricoPorProductoAsync(int productoId)
    {
        var lineas = await _repository.GetLineasPorProductoAsync(productoId);
        return lineas.Select(MapToDto).ToList();
    }

    private static OrdenCompraDto MapToDto(OrdenCompra oc) => new()
    {
        Id = oc.Id,
        ProveedorId = oc.ProveedorId,
        ProveedorNombre = oc.Proveedor?.Nombre ?? string.Empty,
        SucursalId = oc.SucursalId,
        SucursalNombre = oc.Sucursal?.Nombre ?? string.Empty,
        UsuarioId = oc.UsuarioId,
        UsuarioNombre = oc.Usuario?.Nombre ?? string.Empty,
        Estado = oc.Estado,
        PlazoPagoDias = oc.PlazoPagoDias,
        Fecha = oc.Fecha,
        FechaRecepcion = oc.FechaRecepcion,
        Lineas = oc.Lineas.Select(MapToDto).ToList()
    };

    private static OrdenCompraLineaDto MapToDto(OrdenCompraLinea l) => new()
    {
        Id = l.Id,
        ProductoId = l.ProductoId,
        ProductoNombre = l.Producto?.Nombre ?? string.Empty,
        ProductoSku = l.Producto?.Sku ?? string.Empty,
        Cantidad = l.Cantidad,
        PrecioUnitario = l.PrecioUnitario,
        Descuento = l.Descuento
    };
}
