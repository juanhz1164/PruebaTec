using InventarioMultiSucursal.Api.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;

namespace InventarioMultiSucursal.Api.Tests.Integration;

// T83: WebApplicationFactory que arranca la API real (Program.cs) contra una
// base de datos EF Core InMemory en lugar de MySQL, y con una clave JWT fija
// para poder firmar tokens de prueba con TestJwtFactory. Program.cs exige
// "ConnectionStrings:DefaultConnection" y "Jwt:Key" al arrancar (o lanza
// InvalidOperationException), así que ambos se inyectan aquí vía configuración
// en memoria; el connection string real nunca se usa porque el registro de
// AppDbContext se reemplaza por completo en ConfigureServices.
public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    public const string JwtKey = "clave-de-pruebas-integracion-super-larga-1234567890";
    public const string JwtIssuer = "InventarioMultiSucursal.Api.Tests";

    private readonly string _databaseName = Guid.NewGuid().ToString();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Program.cs lee "Jwt:Key" y "ConnectionStrings:DefaultConnection" del
        // IConfiguration directamente al construir el WebApplicationBuilder,
        // antes de que ConfigureAppConfiguration/ConfigureServices puedan
        // intervenir (WebApplicationFactory ejecuta el Main real vía
        // HostFactoryResolver). UseSetting sí se aplica a tiempo porque termina
        // como argumento de línea de comandos / variable de entorno que
        // WebApplicationBuilder.CreateBuilder ya incorpora en su configuración inicial.
        builder.UseSetting("ConnectionStrings:DefaultConnection", "Server=localhost;Database=noop;");
        builder.UseSetting("Jwt:Key", JwtKey);
        builder.UseSetting("Jwt:Issuer", JwtIssuer);

        builder.ConfigureServices(services =>
        {
            // No basta con quitar el descriptor de DbContextOptions<AppDbContext>:
            // AddDbContext con UseMySql también registra servicios internos de EF
            // Core (el "provider" Pomelo) en el contenedor. Si se agrega otro
            // AddDbContext con UseInMemoryDatabase encima, EF ve dos providers
            // registrados en el mismo IServiceCollection y falla al resolver el
            // contexto. Hay que remover TODO lo relacionado a EF Core/AppDbContext
            // antes de volver a registrar con el provider InMemory.
            var descriptors = services
                .Where(d =>
                    d.ServiceType == typeof(DbContextOptions<AppDbContext>) ||
                    d.ServiceType == typeof(AppDbContext) ||
                    (d.ServiceType.FullName?.StartsWith("Microsoft.EntityFrameworkCore") ?? false) ||
                    (d.ServiceType.FullName?.StartsWith("Pomelo.EntityFrameworkCore") ?? false))
                .ToList();

            foreach (var descriptor in descriptors)
            {
                services.Remove(descriptor);
            }

            // Los Services abren transacciones explícitas (BeginTransactionAsync)
            // que el provider InMemory no soporta de verdad; por defecto eleva esa
            // situación a una excepción (TransactionIgnoredWarning). Se suprime
            // porque para estos tests no necesitamos aislamiento transaccional
            // real, solo que el código no explote al intentar abrir la transacción.
            services.AddDbContext<AppDbContext>(options =>
            {
                options.UseInMemoryDatabase(_databaseName);
                options.ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning));
            });
        });
    }

    // Sembrado de datos base compartido por los tests de integración: dos
    // sucursales, unidad de medida base, y un producto con inventario en la
    // sucursal de origen. Cada test puede agregar más datos sobre esta base.
    public async Task<AppDbContext> CrearContextoConSeedAsync()
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await context.Database.EnsureCreatedAsync();
        return context;
    }

    public AppDbContext CrearContexto()
    {
        var scope = Services.CreateScope();
        return scope.ServiceProvider.GetRequiredService<AppDbContext>();
    }
}
