using InventarioMultiSucursal.Api.DTOs;
using InventarioMultiSucursal.Api.Models;
using InventarioMultiSucursal.Api.Repositories.Interfaces;
using InventarioMultiSucursal.Api.Services.Interfaces;

namespace InventarioMultiSucursal.Api.Services;

public class VentaService : IVentaService
{
    private readonly IVentaRepository _repository;

    public VentaService(IVentaRepository repository)
    {
        _repository = repository;
    }

    public async Task<List<VentaDto>> GetAllAsync()
    {
        var ventas = await _repository.GetAllAsync();
        return ventas.Select(MapToDto).ToList();
    }

    public async Task<VentaDto?> GetByIdAsync(int id)
    {
        var venta = await _repository.GetByIdAsync(id);
        return venta is null ? null : MapToDto(venta);
    }

    // T40 (registro de venta) + T41 (validación de stock) + T42 (precio base
    // desde el costo promedio + descuento por línea) + T43 (comprobante consultable).
    public async Task<ResultadoVenta> CrearAsync(CrearVentaDto dto)
    {
        if (dto.Lineas.Count == 0)
        {
            return ResultadoVenta.Falla("La venta debe tener al menos una línea.");
        }

        if (dto.Lineas.Any(l => l.Cantidad <= 0))
        {
            return ResultadoVenta.Falla("La cantidad de cada línea debe ser mayor que cero.");
        }

        // Regla de negocio: el descuento por línea solo aplica a partir de 20 unidades.
        const decimal cantidadMinimaParaDescuento = 20m;
        if (dto.Lineas.Any(l => l.Descuento > 0 && l.Cantidad < cantidadMinimaParaDescuento))
        {
            return ResultadoVenta.Falla(
                $"El descuento solo aplica a partir de {cantidadMinimaParaDescuento} unidades por producto.");
        }

        // T41: validar stock disponible de cada línea ANTES de tocar nada.
        var inventarios = new Dictionary<int, Inventario>();
        foreach (var linea in dto.Lineas)
        {
            var inventario = await _repository.GetInventarioAsync(linea.ProductoId, dto.SucursalId);
            if (inventario is null)
            {
                return ResultadoVenta.Falla($"No existe inventario del producto {linea.ProductoId} en esa sucursal.");
            }

            if (inventario.Cantidad < linea.Cantidad)
            {
                return ResultadoVenta.Falla($"Stock insuficiente para el producto {linea.ProductoId}: disponible {inventario.Cantidad}, solicitado {linea.Cantidad}.");
            }

            inventarios[linea.ProductoId] = inventario;
        }

        await using var transaction = await _repository.BeginTransactionAsync();

        var lineasVenta = new List<VentaLinea>();
        decimal subtotal = 0;
        decimal descuentoTotal = 0;

        foreach (var lineaDto in dto.Lineas)
        {
            var inventario = inventarios[lineaDto.ProductoId];

            // T42: precio base = costo promedio del inventario si no se envía uno explícito.
            var precioUnitario = lineaDto.PrecioUnitario is > 0
                ? lineaDto.PrecioUnitario.Value
                : inventario.CostoPromedio;

            var subtotalLinea = lineaDto.Cantidad * precioUnitario;
            var descuentoLinea = subtotalLinea * (lineaDto.Descuento / 100m);

            subtotal += subtotalLinea;
            descuentoTotal += descuentoLinea;

            lineasVenta.Add(new VentaLinea
            {
                ProductoId = lineaDto.ProductoId,
                Cantidad = lineaDto.Cantidad,
                PrecioUnitario = precioUnitario,
                Descuento = lineaDto.Descuento
            });

            // T40: retira el stock vendido.
            inventario.Cantidad -= lineaDto.Cantidad;
            inventario.UpdatedAt = DateTime.UtcNow;
        }

        var venta = new Venta
        {
            SucursalId = dto.SucursalId,
            UsuarioId = dto.UsuarioId,
            NumeroComprobante = await GenerarNumeroComprobanteAsync(),
            Subtotal = subtotal,
            DescuentoTotal = descuentoTotal,
            Total = subtotal - descuentoTotal,
            Fecha = DateTime.UtcNow,
            Lineas = lineasVenta
        };

        await _repository.AddAsync(venta);
        await _repository.SaveChangesAsync();

        // Trazabilidad: un movimiento de retiro por línea, referenciando ya la venta creada.
        foreach (var lineaDto in dto.Lineas)
        {
            await _repository.AddMovimientoAsync(new MovimientoInventario
            {
                ProductoId = lineaDto.ProductoId,
                SucursalId = dto.SucursalId,
                UsuarioId = dto.UsuarioId,
                Tipo = TipoMovimiento.Retiro,
                Cantidad = lineaDto.Cantidad,
                Motivo = "Venta",
                ReferenciaTipo = "venta",
                ReferenciaId = venta.Id,
                Fecha = DateTime.UtcNow
            });
        }

        await _repository.SaveChangesAsync();
        await transaction.CommitAsync();

        var creada = await _repository.GetByIdAsync(venta.Id);
        return ResultadoVenta.Ok(MapToDto(creada!));
    }

    // T43: comprobante único y consultable (VTA-<fecha>-<consecutivo>).
    private async Task<string> GenerarNumeroComprobanteAsync()
    {
        string numero;
        do
        {
            numero = $"VTA-{DateTime.UtcNow:yyyyMMddHHmmss}-{Random.Shared.Next(1000, 9999)}";
        } while (await _repository.ExisteNumeroComprobanteAsync(numero));

        return numero;
    }

    private static VentaDto MapToDto(Venta v) => new()
    {
        Id = v.Id,
        SucursalId = v.SucursalId,
        SucursalNombre = v.Sucursal?.Nombre ?? string.Empty,
        UsuarioId = v.UsuarioId,
        UsuarioNombre = v.Usuario?.Nombre ?? string.Empty,
        NumeroComprobante = v.NumeroComprobante,
        Subtotal = v.Subtotal,
        DescuentoTotal = v.DescuentoTotal,
        Total = v.Total,
        Fecha = v.Fecha,
        Lineas = v.Lineas.Select(l => new VentaLineaDto
        {
            Id = l.Id,
            ProductoId = l.ProductoId,
            ProductoNombre = l.Producto?.Nombre ?? string.Empty,
            ProductoSku = l.Producto?.Sku ?? string.Empty,
            Cantidad = l.Cantidad,
            PrecioUnitario = l.PrecioUnitario,
            Descuento = l.Descuento,
            Subtotal = l.Cantidad * l.PrecioUnitario * (1 - l.Descuento / 100m)
        }).ToList()
    };
}
