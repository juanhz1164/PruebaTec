using System.Net.Http.Headers;
using InventarioMultiSucursal.Api.Data;
using InventarioMultiSucursal.Api.Models;
using Microsoft.Extensions.DependencyInjection;

namespace InventarioMultiSucursal.Api.Tests.Integration;

// Base compartida por los tests de integración (T83): cada test hereda de esta
// clase para obtener acceso a la factory con InMemory DB y un helper de seed
// con datos base consistentes (sucursales, unidad de medida, producto,
// inventario) más HttpClients ya autenticados por rol.
//
// Cada instancia de test de xUnit crea su propia CustomWebApplicationFactory
// (con un nombre de base InMemory distinto vía Guid), por lo que los tests no
// comparten estado entre sí aunque corran en paralelo.
public abstract class IntegrationTestBase : IAsyncLifetime
{
    protected readonly CustomWebApplicationFactory Factory = new();

    protected const int SucursalOrigenId = 1;
    protected const int SucursalDestinoId = 2;
    protected const int UnidadMedidaBaseId = 1;
    protected const int ProductoId = 1;
    protected const int ProveedorId = 1;

    protected const int AdminUsuarioId = 1;
    protected const int GerenteOrigenUsuarioId = 2;
    protected const int GerenteDestinoUsuarioId = 3;
    protected const int OperadorOrigenUsuarioId = 4;

    public async Task InitializeAsync()
    {
        using var scope = Factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await context.Database.EnsureCreatedAsync();

        context.Sucursales.AddRange(
            new Sucursal { Id = SucursalOrigenId, Nombre = "Sucursal Origen", Activa = true, CreatedAt = DateTime.UtcNow },
            new Sucursal { Id = SucursalDestinoId, Nombre = "Sucursal Destino", Activa = true, CreatedAt = DateTime.UtcNow });

        context.UnidadesMedida.Add(new UnidadMedida { Id = UnidadMedidaBaseId, Nombre = "Unidad", Abreviatura = "un" });

        context.Usuarios.AddRange(
            new Usuario { Id = AdminUsuarioId, Nombre = "Admin", Email = "admin@test.com", PasswordHash = "x", Rol = RolUsuario.AdministradorGeneral, SucursalId = null, Activo = true, CreatedAt = DateTime.UtcNow },
            new Usuario { Id = GerenteOrigenUsuarioId, Nombre = "Gerente Origen", Email = "gerente.origen@test.com", PasswordHash = "x", Rol = RolUsuario.GerenteSucursal, SucursalId = SucursalOrigenId, Activo = true, CreatedAt = DateTime.UtcNow },
            new Usuario { Id = GerenteDestinoUsuarioId, Nombre = "Gerente Destino", Email = "gerente.destino@test.com", PasswordHash = "x", Rol = RolUsuario.GerenteSucursal, SucursalId = SucursalDestinoId, Activo = true, CreatedAt = DateTime.UtcNow },
            new Usuario { Id = OperadorOrigenUsuarioId, Nombre = "Operador Origen", Email = "operador.origen@test.com", PasswordHash = "x", Rol = RolUsuario.OperadorInventario, SucursalId = SucursalOrigenId, Activo = true, CreatedAt = DateTime.UtcNow });

        context.Proveedores.Add(new Proveedor { Id = ProveedorId, Nombre = "Proveedor Test", Activo = true, CreatedAt = DateTime.UtcNow });

        context.Productos.Add(new Producto
        {
            Id = ProductoId,
            UnidadMedidaId = UnidadMedidaBaseId,
            ProveedorId = ProveedorId,
            Sku = "TEST-001",
            Nombre = "Producto de prueba",
            PrecioVenta = 1000m,
            PrecioProveedor = 500m,
            Activo = true,
            CreatedAt = DateTime.UtcNow
        });

        context.Inventarios.Add(new Inventario
        {
            ProductoId = ProductoId,
            SucursalId = SucursalOrigenId,
            Cantidad = 100m,
            StockMinimo = 5m,
            CostoPromedio = 500m,
            UpdatedAt = DateTime.UtcNow
        });

        await context.SaveChangesAsync();
    }

    public Task DisposeAsync()
    {
        Factory.Dispose();
        return Task.CompletedTask;
    }

    protected HttpClient CrearClienteComoAdmin()
        => CrearCliente(AdminUsuarioId, "Admin", "admin@test.com", "AdministradorGeneral", sucursalId: null);

    protected HttpClient CrearClienteComoGerente(int sucursalId)
        => sucursalId == SucursalOrigenId
            ? CrearCliente(GerenteOrigenUsuarioId, "Gerente Origen", "gerente.origen@test.com", "GerenteSucursal", sucursalId)
            : CrearCliente(GerenteDestinoUsuarioId, "Gerente Destino", "gerente.destino@test.com", "GerenteSucursal", sucursalId);

    protected HttpClient CrearClienteComoOperador()
        => CrearCliente(OperadorOrigenUsuarioId, "Operador Origen", "operador.origen@test.com", "OperadorInventario", SucursalOrigenId);

    protected HttpClient CrearClienteSinAutenticar() => Factory.CreateClient();

    private HttpClient CrearCliente(int usuarioId, string nombre, string email, string rol, int? sucursalId)
    {
        var client = Factory.CreateClient();
        var token = TestJwtFactory.GenerarToken(usuarioId, nombre, email, rol, sucursalId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }
}
