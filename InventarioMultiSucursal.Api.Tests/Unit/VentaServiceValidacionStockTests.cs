using InventarioMultiSucursal.Api.DTOs;
using InventarioMultiSucursal.Api.Models;
using InventarioMultiSucursal.Api.Repositories.Interfaces;
using InventarioMultiSucursal.Api.Services;
using Moq;

namespace InventarioMultiSucursal.Api.Tests.Unit;

// T81: tests unitarios de la validación de stock en VentaService.CrearAsync.
// La regla bajo prueba: antes de descontar cualquier inventario, se valida el
// stock disponible de TODAS las líneas de la venta; si UNA sola línea no tiene
// stock suficiente, la venta completa se rechaza sin tocar ningún inventario
// (ni siquiera el de líneas anteriores que sí tenían stock).
public class VentaServiceValidacionStockTests
{
    private const int SucursalId = 1;
    private const int UsuarioId = 1;

    private static Producto CrearProducto(int id, string sku, int unidadMedidaId = 1, decimal precioVenta = 1000m)
    {
        return new Producto
        {
            Id = id,
            Sku = sku,
            Nombre = $"Producto {id}",
            UnidadMedidaId = unidadMedidaId,
            PrecioVenta = precioVenta,
            PrecioProveedor = precioVenta / 2,
            Activo = true
        };
    }

    private static (Mock<IVentaRepository> repo, Mock<IProductoRepository> productoRepo) CrearMocks()
    {
        var repo = new Mock<IVentaRepository>();
        repo.Setup(r => r.BeginTransactionAsync()).ReturnsAsync(TestHelpers.CreateFakeTransaction());
        repo.Setup(r => r.SaveChangesAsync()).ReturnsAsync(1);
        repo.Setup(r => r.ExisteNumeroComprobanteAsync(It.IsAny<string>())).ReturnsAsync(false);
        repo.Setup(r => r.AddMovimientoAsync(It.IsAny<MovimientoInventario>())).Returns(Task.CompletedTask);

        Venta? ventaCreada = null;
        repo.Setup(r => r.AddAsync(It.IsAny<Venta>()))
            .Callback<Venta>(v => { v.Id = 1; ventaCreada = v; })
            .Returns(Task.CompletedTask);
        repo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(() => ventaCreada);

        var productoRepo = new Mock<IProductoRepository>();
        return (repo, productoRepo);
    }

    [Fact]
    public async Task CrearAsync_StockSuficiente_DescuentaInventarioYRegistraVenta()
    {
        var (repo, productoRepo) = CrearMocks();
        var producto = CrearProducto(10, "PROD-001");
        productoRepo.Setup(p => p.GetByIdAsync(10)).ReturnsAsync(producto);

        var inventario = new Inventario { Id = 1, ProductoId = 10, SucursalId = SucursalId, Cantidad = 50m, CostoPromedio = 500m };
        repo.Setup(r => r.GetInventarioAsync(10, SucursalId)).ReturnsAsync(inventario);

        var service = new VentaService(repo.Object, productoRepo.Object);
        var dto = new CrearVentaDto
        {
            SucursalId = SucursalId,
            UsuarioId = UsuarioId,
            Lineas = new List<CrearVentaLineaDto> { new() { ProductoId = 10, Cantidad = 5m } }
        };

        var resultado = await service.CrearAsync(dto);

        Assert.True(resultado.Exitoso);
        Assert.Equal(45m, inventario.Cantidad);
        repo.Verify(r => r.AddAsync(It.IsAny<Venta>()), Times.Once);
    }

    [Fact]
    public async Task CrearAsync_StockExactoAlSolicitado_PermiteLaVenta()
    {
        // Caso borde: stock == cantidad solicitada debe permitirse (la validación es "<", no "<=").
        var (repo, productoRepo) = CrearMocks();
        var producto = CrearProducto(10, "PROD-001");
        productoRepo.Setup(p => p.GetByIdAsync(10)).ReturnsAsync(producto);

        var inventario = new Inventario { Id = 1, ProductoId = 10, SucursalId = SucursalId, Cantidad = 5m, CostoPromedio = 500m };
        repo.Setup(r => r.GetInventarioAsync(10, SucursalId)).ReturnsAsync(inventario);

        var service = new VentaService(repo.Object, productoRepo.Object);
        var dto = new CrearVentaDto
        {
            SucursalId = SucursalId,
            UsuarioId = UsuarioId,
            Lineas = new List<CrearVentaLineaDto> { new() { ProductoId = 10, Cantidad = 5m } }
        };

        var resultado = await service.CrearAsync(dto);

        Assert.True(resultado.Exitoso);
        Assert.Equal(0m, inventario.Cantidad);
    }

    [Fact]
    public async Task CrearAsync_StockInsuficiente_RechazaVentaYNoModificaInventario()
    {
        var (repo, productoRepo) = CrearMocks();
        var producto = CrearProducto(10, "PROD-001");
        productoRepo.Setup(p => p.GetByIdAsync(10)).ReturnsAsync(producto);

        var inventario = new Inventario { Id = 1, ProductoId = 10, SucursalId = SucursalId, Cantidad = 3m, CostoPromedio = 500m };
        repo.Setup(r => r.GetInventarioAsync(10, SucursalId)).ReturnsAsync(inventario);

        var service = new VentaService(repo.Object, productoRepo.Object);
        var dto = new CrearVentaDto
        {
            SucursalId = SucursalId,
            UsuarioId = UsuarioId,
            Lineas = new List<CrearVentaLineaDto> { new() { ProductoId = 10, Cantidad = 5m } }
        };

        var resultado = await service.CrearAsync(dto);

        Assert.False(resultado.Exitoso);
        Assert.Contains("Stock insuficiente", resultado.Error);
        Assert.Equal(3m, inventario.Cantidad); // no se tocó
        repo.Verify(r => r.AddAsync(It.IsAny<Venta>()), Times.Never);
        repo.Verify(r => r.BeginTransactionAsync(), Times.Never);
    }

    [Fact]
    public async Task CrearAsync_SegundaLineaSinStock_NoDescuentaNiSiquieraLaPrimeraLineaConStock()
    {
        // "Todo o nada": la primera línea sí tiene stock suficiente, pero la
        // segunda no. Ninguna de las dos debe descontarse.
        var (repo, productoRepo) = CrearMocks();
        var productoA = CrearProducto(10, "PROD-001");
        var productoB = CrearProducto(20, "PROD-002");
        productoRepo.Setup(p => p.GetByIdAsync(10)).ReturnsAsync(productoA);
        productoRepo.Setup(p => p.GetByIdAsync(20)).ReturnsAsync(productoB);

        var inventarioA = new Inventario { Id = 1, ProductoId = 10, SucursalId = SucursalId, Cantidad = 100m, CostoPromedio = 500m };
        var inventarioB = new Inventario { Id = 2, ProductoId = 20, SucursalId = SucursalId, Cantidad = 2m, CostoPromedio = 500m };
        repo.Setup(r => r.GetInventarioAsync(10, SucursalId)).ReturnsAsync(inventarioA);
        repo.Setup(r => r.GetInventarioAsync(20, SucursalId)).ReturnsAsync(inventarioB);

        var service = new VentaService(repo.Object, productoRepo.Object);
        var dto = new CrearVentaDto
        {
            SucursalId = SucursalId,
            UsuarioId = UsuarioId,
            Lineas = new List<CrearVentaLineaDto>
            {
                new() { ProductoId = 10, Cantidad = 5m },
                new() { ProductoId = 20, Cantidad = 10m } // solo hay 2 disponibles
            }
        };

        var resultado = await service.CrearAsync(dto);

        Assert.False(resultado.Exitoso);
        Assert.Equal(100m, inventarioA.Cantidad); // intacto pese a tener stock suficiente
        Assert.Equal(2m, inventarioB.Cantidad);
        repo.Verify(r => r.AddAsync(It.IsAny<Venta>()), Times.Never);
    }

    [Fact]
    public async Task CrearAsync_SinInventarioParaElProducto_RechazaVenta()
    {
        var (repo, productoRepo) = CrearMocks();
        var producto = CrearProducto(10, "PROD-001");
        productoRepo.Setup(p => p.GetByIdAsync(10)).ReturnsAsync(producto);
        repo.Setup(r => r.GetInventarioAsync(10, SucursalId)).ReturnsAsync((Inventario?)null);

        var service = new VentaService(repo.Object, productoRepo.Object);
        var dto = new CrearVentaDto
        {
            SucursalId = SucursalId,
            UsuarioId = UsuarioId,
            Lineas = new List<CrearVentaLineaDto> { new() { ProductoId = 10, Cantidad = 1m } }
        };

        var resultado = await service.CrearAsync(dto);

        Assert.False(resultado.Exitoso);
        Assert.Contains("No existe inventario", resultado.Error);
    }

    [Fact]
    public async Task CrearAsync_ProductoInexistente_RechazaVentaAntesDeConsultarInventario()
    {
        var (repo, productoRepo) = CrearMocks();
        productoRepo.Setup(p => p.GetByIdAsync(999)).ReturnsAsync((Producto?)null);

        var service = new VentaService(repo.Object, productoRepo.Object);
        var dto = new CrearVentaDto
        {
            SucursalId = SucursalId,
            UsuarioId = UsuarioId,
            Lineas = new List<CrearVentaLineaDto> { new() { ProductoId = 999, Cantidad = 1m } }
        };

        var resultado = await service.CrearAsync(dto);

        Assert.False(resultado.Exitoso);
        Assert.Contains("No existe el producto", resultado.Error);
        repo.Verify(r => r.GetInventarioAsync(It.IsAny<int>(), It.IsAny<int>()), Times.Never);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task CrearAsync_CantidadCeroONegativa_RechazaVentaSinConsultarProductoOInventario(decimal cantidad)
    {
        var (repo, productoRepo) = CrearMocks();

        var service = new VentaService(repo.Object, productoRepo.Object);
        var dto = new CrearVentaDto
        {
            SucursalId = SucursalId,
            UsuarioId = UsuarioId,
            Lineas = new List<CrearVentaLineaDto> { new() { ProductoId = 10, Cantidad = cantidad } }
        };

        var resultado = await service.CrearAsync(dto);

        Assert.False(resultado.Exitoso);
        Assert.Contains("mayor que cero", resultado.Error);
        productoRepo.Verify(p => p.GetByIdAsync(It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task CrearAsync_CantidadNoEntera_RechazaVenta()
    {
        var (repo, productoRepo) = CrearMocks();

        var service = new VentaService(repo.Object, productoRepo.Object);
        var dto = new CrearVentaDto
        {
            SucursalId = SucursalId,
            UsuarioId = UsuarioId,
            Lineas = new List<CrearVentaLineaDto> { new() { ProductoId = 10, Cantidad = 2.5m } }
        };

        var resultado = await service.CrearAsync(dto);

        Assert.False(resultado.Exitoso);
        Assert.Contains("número entero", resultado.Error);
    }

    [Fact]
    public async Task CrearAsync_SinLineas_RechazaVenta()
    {
        var (repo, productoRepo) = CrearMocks();
        var service = new VentaService(repo.Object, productoRepo.Object);
        var dto = new CrearVentaDto { SucursalId = SucursalId, UsuarioId = UsuarioId, Lineas = new List<CrearVentaLineaDto>() };

        var resultado = await service.CrearAsync(dto);

        Assert.False(resultado.Exitoso);
        Assert.Contains("al menos una línea", resultado.Error);
    }

    [Fact]
    public async Task CrearAsync_UnidadAlternativa_ValidaStockEnUnidadBaseConvertida()
    {
        // Se vende en "Caja" (factor 12): 3 cajas = 36 unidades base. Con solo 30
        // unidades en inventario, debe rechazarse aunque "3" parezca poco.
        var (repo, productoRepo) = CrearMocks();
        var producto = CrearProducto(9, "PROD-009", unidadMedidaId: 1);
        productoRepo.Setup(p => p.GetByIdAsync(9)).ReturnsAsync(producto);
        productoRepo.Setup(p => p.GetUnidadAlternativaAsync(9, 2))
            .ReturnsAsync(new ProductoUnidadMedida { Id = 1, ProductoId = 9, UnidadMedidaId = 2, FactorConversion = 12m });

        var inventario = new Inventario { Id = 1, ProductoId = 9, SucursalId = SucursalId, Cantidad = 30m, CostoPromedio = 100m };
        repo.Setup(r => r.GetInventarioAsync(9, SucursalId)).ReturnsAsync(inventario);

        var service = new VentaService(repo.Object, productoRepo.Object);
        var dto = new CrearVentaDto
        {
            SucursalId = SucursalId,
            UsuarioId = UsuarioId,
            Lineas = new List<CrearVentaLineaDto> { new() { ProductoId = 9, UnidadMedidaId = 2, Cantidad = 3m } }
        };

        var resultado = await service.CrearAsync(dto);

        Assert.False(resultado.Exitoso);
        Assert.Contains("Stock insuficiente", resultado.Error);
        Assert.Equal(30m, inventario.Cantidad);
    }
}
