using InventarioMultiSucursal.Api.DTOs;
using InventarioMultiSucursal.Api.Models;
using InventarioMultiSucursal.Api.Repositories.Interfaces;
using InventarioMultiSucursal.Api.Services.Interfaces;

namespace InventarioMultiSucursal.Api.Services;

public class VentaService : IVentaService
{
    // SKU con escala de descuento propia (ver CalcularDescuentoPorCajas): cada
    // caja ya trae 12 lapiceros, así que su umbral de cantidad es mucho menor
    // que el de productos vendidos por unidad suelta.
    private const string SkuCajaLapiceros = "PROD-009";

    private readonly IVentaRepository _repository;
    private readonly IProductoRepository _productoRepository;

    public VentaService(IVentaRepository repository, IProductoRepository productoRepository)
    {
        _repository = repository;
        _productoRepository = productoRepository;
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

        if (dto.Lineas.Any(l => l.Cantidad != decimal.Truncate(l.Cantidad)))
        {
            return ResultadoVenta.Falla("La cantidad de cada línea debe ser un número entero.");
        }

        // T41: validar stock disponible de cada línea ANTES de tocar nada.
        // Cada línea puede venderse en la unidad base del producto o en una unidad
        // alternativa (ej. "Caja"); en ese caso se convierte a unidad base con su
        // FactorConversion para comparar contra el stock, que siempre está en unidad base.
        var inventarios = new Dictionary<int, Inventario>();
        var cantidadesBase = new Dictionary<int, decimal>();
        var unidadesVenta = new Dictionary<int, int>();
        var factoresConversion = new Dictionary<int, decimal>();
        var preciosVentaUnidad = new Dictionary<int, decimal?>();
        var skuPorProducto = new Dictionary<int, string>();
        var preciosVentaProducto = new Dictionary<int, decimal>();

        foreach (var linea in dto.Lineas)
        {
            var producto = await _productoRepository.GetByIdAsync(linea.ProductoId);
            if (producto is null)
            {
                return ResultadoVenta.Falla($"No existe el producto {linea.ProductoId}.");
            }

            skuPorProducto[linea.ProductoId] = producto.Sku;
            preciosVentaProducto[linea.ProductoId] = producto.PrecioVenta;

            var unidadMedidaId = linea.UnidadMedidaId ?? producto.UnidadMedidaId;
            decimal factorConversion = 1m;
            decimal? precioVentaUnidad = null;

            if (unidadMedidaId != producto.UnidadMedidaId)
            {
                var unidadAlternativa = await _productoRepository.GetUnidadAlternativaAsync(linea.ProductoId, unidadMedidaId);
                if (unidadAlternativa is null)
                {
                    return ResultadoVenta.Falla($"El producto {linea.ProductoId} no tiene esa unidad de venta configurada.");
                }
                factorConversion = unidadAlternativa.FactorConversion;
                precioVentaUnidad = unidadAlternativa.PrecioVenta;
            }

            var cantidadBase = linea.Cantidad * factorConversion;

            var inventario = await _repository.GetInventarioAsync(linea.ProductoId, dto.SucursalId);
            if (inventario is null)
            {
                return ResultadoVenta.Falla($"No existe inventario del producto {linea.ProductoId} en esa sucursal.");
            }

            if (inventario.Cantidad < cantidadBase)
            {
                return ResultadoVenta.Falla($"Stock insuficiente para el producto {linea.ProductoId}: disponible {inventario.Cantidad}, solicitado {cantidadBase}.");
            }

            inventarios[linea.ProductoId] = inventario;
            cantidadesBase[linea.ProductoId] = cantidadBase;
            unidadesVenta[linea.ProductoId] = unidadMedidaId;
            factoresConversion[linea.ProductoId] = factorConversion;
            preciosVentaUnidad[linea.ProductoId] = precioVentaUnidad;
        }

        // Regla de negocio: el descuento por volumen general se calcula sobre la
        // SUMA de unidades de todos los productos de la venta (ej. 15 arroz + 5
        // lapiceros = 20 unidades → aplica descuento a esas líneas), EXCEPTO
        // "Caja de lapiceros", que por traer 12 lapiceros cada una tiene su
        // propia escala de cantidad de cajas y no se mezcla con el total general.
        var cantidadTotalGeneral = dto.Lineas
            .Where(l => skuPorProducto[l.ProductoId] != SkuCajaLapiceros)
            .Sum(l => cantidadesBase[l.ProductoId]);
        var descuentoGeneral = CalcularDescuentoPorCantidad(cantidadTotalGeneral);

        await using var transaction = await _repository.BeginTransactionAsync();

        var lineasVenta = new List<VentaLinea>();
        decimal subtotal = 0;
        decimal descuentoTotal = 0;

        foreach (var lineaDto in dto.Lineas)
        {
            var inventario = inventarios[lineaDto.ProductoId];
            var cantidadBase = cantidadesBase[lineaDto.ProductoId];
            var factorConversion = factoresConversion[lineaDto.ProductoId];
            var esCajaLapiceros = skuPorProducto[lineaDto.ProductoId] == SkuCajaLapiceros;

            // T42: precio base = precio de venta fijo del producto (por unidad
            // base) si no se envía uno explícito. Si se vende en unidad
            // alternativa, el precio explícito se interpreta por esa unidad (ej.
            // precio de 1 caja). Si la unidad alternativa tiene un precio de
            // venta fijo propio (ej. la caja se vende más barata que 12 unidades
            // sueltas), ese precio fijo tiene prioridad sobre el del producto.
            var precioVentaUnidad = preciosVentaUnidad[lineaDto.ProductoId];
            var precioUnitario = lineaDto.PrecioUnitario is > 0
                ? lineaDto.PrecioUnitario.Value
                : precioVentaUnidad is > 0
                    ? precioVentaUnidad.Value
                    : preciosVentaProducto[lineaDto.ProductoId] * factorConversion;

            var descuentoPorcentaje = esCajaLapiceros
                ? CalcularDescuentoPorCajas(lineaDto.Cantidad)
                : descuentoGeneral;
            var subtotalLinea = lineaDto.Cantidad * precioUnitario;
            var descuentoLinea = subtotalLinea * (descuentoPorcentaje / 100m);

            subtotal += subtotalLinea;
            descuentoTotal += descuentoLinea;

            lineasVenta.Add(new VentaLinea
            {
                ProductoId = lineaDto.ProductoId,
                Cantidad = cantidadBase,
                UnidadMedidaId = unidadesVenta[lineaDto.ProductoId],
                CantidadVendida = lineaDto.Cantidad,
                PrecioUnitario = precioUnitario,
                Descuento = descuentoPorcentaje
            });

            // T40: retira el stock vendido (siempre en unidad base).
            inventario.Cantidad -= cantidadBase;
            inventario.UpdatedAt = DateTime.UtcNow;
        }

        var venta = new Venta
        {
            SucursalId = dto.SucursalId,
            UsuarioId = dto.UsuarioId,
            NumeroComprobante = await GenerarNumeroComprobanteAsync(),
            ClienteNombre = dto.ClienteNombre,
            ClienteEmail = dto.ClienteEmail,
            ClienteTelefono = dto.ClienteTelefono,
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
                Cantidad = cantidadesBase[lineaDto.ProductoId],
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

    // Regla de negocio: descuento automático por volumen (unidad base), tope 15%.
    // 20+ unidades -> 5%, 30+ -> 10%, 40+ -> 15%. Se calcula sobre la suma de
    // TODOS los productos "normales" de la venta (no solo uno), y no aplica a
    // "Caja de lapiceros", que tiene su propia escala (ver CalcularDescuentoPorCajas).
    // No es configurable por el cliente.
    private static decimal CalcularDescuentoPorCantidad(decimal cantidadBase)
    {
        if (cantidadBase >= 40m) return 15m;
        if (cantidadBase >= 30m) return 10m;
        if (cantidadBase >= 20m) return 5m;
        return 0m;
    }

    // Regla de negocio: descuento por volumen para "Caja de lapiceros", en
    // cantidad de CAJAS (no de lapiceros sueltos), ya que cada caja ya trae 12.
    // 2+ cajas -> 5%, 5+ -> 10%, 8+ -> 15%. Independiente del descuento general
    // y no se mezcla con las unidades de otros productos de la misma venta.
    private static decimal CalcularDescuentoPorCajas(decimal cantidadCajas)
    {
        if (cantidadCajas >= 8m) return 15m;
        if (cantidadCajas >= 5m) return 10m;
        if (cantidadCajas >= 2m) return 5m;
        return 0m;
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
        ClienteNombre = v.ClienteNombre,
        ClienteEmail = v.ClienteEmail,
        ClienteTelefono = v.ClienteTelefono,
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
            Cantidad = l.CantidadVendida,
            UnidadMedidaAbreviatura = l.UnidadMedida?.Abreviatura ?? string.Empty,
            PrecioUnitario = l.PrecioUnitario,
            Descuento = l.Descuento,
            Subtotal = l.CantidadVendida * l.PrecioUnitario * (1 - l.Descuento / 100m)
        }).ToList()
    };
}
