using Microsoft.EntityFrameworkCore.Storage;
using Moq;

namespace InventarioMultiSucursal.Api.Tests.Unit;

// Helpers compartidos por los tests unitarios de Services que abren una
// transacción explícita (OrdenCompraService, VentaService, TransferenciaService).
// Todos usan "await using var transaction = await _repository.BeginTransactionAsync();"
// seguido de transaction.CommitAsync(), así que el mock de IDbContextTransaction
// debe soportar CommitAsync y DisposeAsync sin lanzar.
internal static class TestHelpers
{
    public static IDbContextTransaction CreateFakeTransaction()
    {
        var transaction = new Mock<IDbContextTransaction>();
        transaction.Setup(t => t.CommitAsync(It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        transaction.Setup(t => t.RollbackAsync(It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        transaction.Setup(t => t.DisposeAsync()).Returns(ValueTask.CompletedTask);
        return transaction.Object;
    }
}
