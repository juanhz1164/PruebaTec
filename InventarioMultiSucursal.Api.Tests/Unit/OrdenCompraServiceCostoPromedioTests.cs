using InventarioMultiSucursal.Api.DTOs;
using InventarioMultiSucursal.Api.Models;
using InventarioMultiSucursal.Api.Repositories.Interfaces;
using InventarioMultiSucursal.Api.Services;
using Moq;

namespace InventarioMultiSucursal.Api.Tests.Unit;

// T80: tests unitarios del costo promedio ponderado, calculado en
// OrdenCompraService.CambiarEstadoAsync cuando el nuevo estado es Recibida
// (ver AplicarRecepcionAlInventarioAsync). Fórmula bajo prueba:
//   CostoPromedio' = (CantidadActual*CostoActual + CantidadRecibida*PrecioUnitario)
//                     / (CantidadActual + CantidadRecibida)
public class OrdenCompraServiceCostoPromedioTests
{
    private static OrdenCompra CrearOrdenPendiente(int sucursalId, params OrdenCompraLinea[] lineas)
    {
        return new OrdenCompra
        {
            Id = 1,
            ProveedorId = 1,
            SucursalId = sucursalId,
            UsuarioId = 1,
            Estado = EstadoOrdenCompra.Confirmada,
            Fecha = DateTime.UtcNow,
            Lineas = lineas.ToList()
        };
    }

    private static Mock<IOrdenCompraRepository> CrearRepositorioMock(OrdenCompra orden)
    {
        var repo = new Mock<IOrdenCompraRepository>();
        repo.Setup(r => r.GetByIdAsync(orden.Id)).ReturnsAsync(orden);
        repo.Setup(r => r.BeginTransactionAsync()).ReturnsAsync(TestHelpers.CreateFakeTransaction());
        repo.Setup(r => r.SaveChangesAsync()).ReturnsAsync(1);
        return repo;
    }

    [Fact]
    public async Task CambiarEstadoAsync_SinInventarioPrevio_CostoPromedioQuedaIgualAlPrecioDeCompra()
    {
        // Sin inventario existente, se parte de Cantidad=0, CostoPromedio=0:
        // el costo promedio resultante debe ser exactamente el precio unitario recibido.
        var linea = new OrdenCompraLinea { Id = 1, ProductoId = 10, Cantidad = 20m, PrecioUnitario = 5000m };
        var orden = CrearOrdenPendiente(sucursalId: 1, linea);

        var repo = CrearRepositorioMock(orden);
        repo.Setup(r => r.GetInventarioAsync(10, 1)).ReturnsAsync((Inventario?)null);

        Inventario? inventarioCreado = null;
        repo.Setup(r => r.AddInventarioAsync(It.IsAny<Inventario>()))
            .Callback<Inventario>(i => inventarioCreado = i)
            .Returns(Task.CompletedTask);
        repo.Setup(r => r.AddMovimientoAsync(It.IsAny<MovimientoInventario>())).Returns(Task.CompletedTask);

        var service = new OrdenCompraService(repo.Object);

        var resultado = await service.CambiarEstadoAsync(orden.Id, new CambiarEstadoOrdenCompraDto { Estado = EstadoOrdenCompra.Recibida });

        Assert.True(resultado.Exitoso);
        Assert.NotNull(inventarioCreado);
        Assert.Equal(20m, inventarioCreado!.Cantidad);
        Assert.Equal(5000m, inventarioCreado.CostoPromedio);
        repo.Verify(r => r.AddInventarioAsync(It.IsAny<Inventario>()), Times.Once);
    }

    [Fact]
    public async Task CambiarEstadoAsync_ConInventarioPrevio_PromediaCostoPonderadoPorCantidad()
    {
        // Stock actual: 10 unidades a costo promedio 100. Se reciben 10 unidades a 200.
        // Esperado: (10*100 + 10*200) / 20 = 150.
        var inventarioExistente = new Inventario
        {
            Id = 5,
            ProductoId = 10,
            SucursalId = 1,
            Cantidad = 10m,
            StockMinimo = 0,
            CostoPromedio = 100m,
            UpdatedAt = DateTime.UtcNow.AddDays(-1)
        };

        var linea = new OrdenCompraLinea { Id = 1, ProductoId = 10, Cantidad = 10m, PrecioUnitario = 200m };
        var orden = CrearOrdenPendiente(sucursalId: 1, linea);

        var repo = CrearRepositorioMock(orden);
        repo.Setup(r => r.GetInventarioAsync(10, 1)).ReturnsAsync(inventarioExistente);
        repo.Setup(r => r.AddMovimientoAsync(It.IsAny<MovimientoInventario>())).Returns(Task.CompletedTask);

        var service = new OrdenCompraService(repo.Object);

        var resultado = await service.CambiarEstadoAsync(orden.Id, new CambiarEstadoOrdenCompraDto { Estado = EstadoOrdenCompra.Recibida });

        Assert.True(resultado.Exitoso);
        Assert.Equal(20m, inventarioExistente.Cantidad);
        Assert.Equal(150m, inventarioExistente.CostoPromedio);
        repo.Verify(r => r.AddInventarioAsync(It.IsAny<Inventario>()), Times.Never);
    }

    [Fact]
    public async Task CambiarEstadoAsync_ConCantidadesDesiguales_PonderaProporcionalmente()
    {
        // Stock actual: 100 unidades a costo 10. Se reciben 5 unidades a 50 (compra pequeña
        // y cara): el costo promedio apenas debe subir, ponderado por la cantidad relativa.
        // Esperado: (100*10 + 5*50) / 105 = 1250/105 = 11.904761904761904761904761905
        var inventarioExistente = new Inventario
        {
            Id = 5,
            ProductoId = 10,
            SucursalId = 1,
            Cantidad = 100m,
            StockMinimo = 0,
            CostoPromedio = 10m,
            UpdatedAt = DateTime.UtcNow.AddDays(-1)
        };

        var linea = new OrdenCompraLinea { Id = 1, ProductoId = 10, Cantidad = 5m, PrecioUnitario = 50m };
        var orden = CrearOrdenPendiente(sucursalId: 1, linea);

        var repo = CrearRepositorioMock(orden);
        repo.Setup(r => r.GetInventarioAsync(10, 1)).ReturnsAsync(inventarioExistente);
        repo.Setup(r => r.AddMovimientoAsync(It.IsAny<MovimientoInventario>())).Returns(Task.CompletedTask);

        var service = new OrdenCompraService(repo.Object);

        await service.CambiarEstadoAsync(orden.Id, new CambiarEstadoOrdenCompraDto { Estado = EstadoOrdenCompra.Recibida });

        var esperado = (100m * 10m + 5m * 50m) / 105m;
        Assert.Equal(esperado, inventarioExistente.CostoPromedio);
        Assert.Equal(105m, inventarioExistente.Cantidad);
    }

    [Fact]
    public async Task CambiarEstadoAsync_ConMultiplesLineas_ActualizaCadaProductoDeFormaIndependiente()
    {
        var inventarioA = new Inventario { Id = 1, ProductoId = 10, SucursalId = 1, Cantidad = 10m, CostoPromedio = 100m, UpdatedAt = DateTime.UtcNow };
        var inventarioB = new Inventario { Id = 2, ProductoId = 20, SucursalId = 1, Cantidad = 0m, CostoPromedio = 0m, UpdatedAt = DateTime.UtcNow };

        var lineaA = new OrdenCompraLinea { Id = 1, ProductoId = 10, Cantidad = 10m, PrecioUnitario = 200m };
        var lineaB = new OrdenCompraLinea { Id = 2, ProductoId = 20, Cantidad = 4m, PrecioUnitario = 25m };
        var orden = CrearOrdenPendiente(sucursalId: 1, lineaA, lineaB);

        var repo = CrearRepositorioMock(orden);
        repo.Setup(r => r.GetInventarioAsync(10, 1)).ReturnsAsync(inventarioA);
        repo.Setup(r => r.GetInventarioAsync(20, 1)).ReturnsAsync(inventarioB);
        repo.Setup(r => r.AddMovimientoAsync(It.IsAny<MovimientoInventario>())).Returns(Task.CompletedTask);

        var service = new OrdenCompraService(repo.Object);

        var resultado = await service.CambiarEstadoAsync(orden.Id, new CambiarEstadoOrdenCompraDto { Estado = EstadoOrdenCompra.Recibida });

        Assert.True(resultado.Exitoso);
        Assert.Equal(20m, inventarioA.Cantidad);
        Assert.Equal(150m, inventarioA.CostoPromedio); // (10*100+10*200)/20
        Assert.Equal(4m, inventarioB.Cantidad);
        Assert.Equal(25m, inventarioB.CostoPromedio); // sin stock previo: iguala el precio de compra
        repo.Verify(r => r.AddMovimientoAsync(It.IsAny<MovimientoInventario>()), Times.Exactly(2));
    }

    [Fact]
    public async Task CambiarEstadoAsync_DesdeEstadoPendiente_NoPermiteSaltarAConfirmadaDirectoARecibida()
    {
        // Transición inválida: Pendiente -> Recibida no está permitida (debe pasar por Confirmada).
        var linea = new OrdenCompraLinea { Id = 1, ProductoId = 10, Cantidad = 10m, PrecioUnitario = 200m };
        var orden = new OrdenCompra
        {
            Id = 1,
            ProveedorId = 1,
            SucursalId = 1,
            UsuarioId = 1,
            Estado = EstadoOrdenCompra.Pendiente,
            Fecha = DateTime.UtcNow,
            Lineas = new List<OrdenCompraLinea> { linea }
        };

        var repo = CrearRepositorioMock(orden);
        var service = new OrdenCompraService(repo.Object);

        var resultado = await service.CambiarEstadoAsync(orden.Id, new CambiarEstadoOrdenCompraDto { Estado = EstadoOrdenCompra.Recibida });

        Assert.False(resultado.Exitoso);
        Assert.NotNull(resultado.Error);
        repo.Verify(r => r.GetInventarioAsync(It.IsAny<int>(), It.IsAny<int>()), Times.Never);
        repo.Verify(r => r.BeginTransactionAsync(), Times.Never);
    }

    [Fact]
    public async Task CambiarEstadoAsync_DesdeEstadoRecibida_NoPermiteRecibirDeNuevo()
    {
        // Recibida es un estado terminal: no debe permitir volver a aplicar la recepción
        // al inventario (evita duplicar el ingreso de stock).
        var linea = new OrdenCompraLinea { Id = 1, ProductoId = 10, Cantidad = 10m, PrecioUnitario = 200m };
        var orden = new OrdenCompra
        {
            Id = 1,
            ProveedorId = 1,
            SucursalId = 1,
            UsuarioId = 1,
            Estado = EstadoOrdenCompra.Recibida,
            Fecha = DateTime.UtcNow,
            FechaRecepcion = DateTime.UtcNow,
            Lineas = new List<OrdenCompraLinea> { linea }
        };

        var repo = CrearRepositorioMock(orden);
        var service = new OrdenCompraService(repo.Object);

        var resultado = await service.CambiarEstadoAsync(orden.Id, new CambiarEstadoOrdenCompraDto { Estado = EstadoOrdenCompra.Recibida });

        Assert.False(resultado.Exitoso);
        repo.Verify(r => r.BeginTransactionAsync(), Times.Never);
    }

    [Fact]
    public async Task CambiarEstadoAsync_OrdenInexistente_RetornaFalla()
    {
        var repo = new Mock<IOrdenCompraRepository>();
        repo.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((OrdenCompra?)null);

        var service = new OrdenCompraService(repo.Object);

        var resultado = await service.CambiarEstadoAsync(999, new CambiarEstadoOrdenCompraDto { Estado = EstadoOrdenCompra.Confirmada });

        Assert.False(resultado.Exitoso);
        Assert.Equal("La orden de compra no existe.", resultado.Error);
    }
}
