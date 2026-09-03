using System.Text;
using InventarioMultiSucursal.Api.Data;
using InventarioMultiSucursal.Api.Repositories;
using InventarioMultiSucursal.Api.Repositories.Interfaces;
using InventarioMultiSucursal.Api.Services;
using InventarioMultiSucursal.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("No se encontró la cadena de conexión 'DefaultConnection'.");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(connectionString, new MySqlServerVersion(new Version(8, 4, 0))));

// Cada capa se registra por su interfaz: el Controller pide IInventarioService,
// el Service pide IInventarioRepository, y el contenedor de DI resuelve las
// implementaciones concretas en tiempo de ejecución.
builder.Services.AddScoped<IInventarioRepository, InventarioRepository>();
builder.Services.AddScoped<IInventarioService, InventarioService>();
builder.Services.AddScoped<ISucursalRepository, SucursalRepository>();
builder.Services.AddScoped<ISucursalService, SucursalService>();
builder.Services.AddScoped<IUsuarioRepository, UsuarioRepository>();
builder.Services.AddScoped<IUsuarioService, UsuarioService>();
builder.Services.AddScoped<IProductoRepository, ProductoRepository>();
builder.Services.AddScoped<IProductoService, ProductoService>();
builder.Services.AddScoped<IProveedorRepository, ProveedorRepository>();
builder.Services.AddScoped<IProveedorService, ProveedorService>();
builder.Services.AddScoped<IOrdenCompraRepository, OrdenCompraRepository>();
builder.Services.AddScoped<IOrdenCompraService, OrdenCompraService>();
builder.Services.AddScoped<IVentaRepository, VentaRepository>();
builder.Services.AddScoped<IVentaService, VentaService>();
builder.Services.AddScoped<ITransferenciaRepository, TransferenciaRepository>();
builder.Services.AddScoped<ITransferenciaService, TransferenciaService>();
builder.Services.AddScoped<ILogisticaService, LogisticaService>();
builder.Services.AddScoped<IDashboardRepository, DashboardRepository>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IAuthService, AuthService>();

var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("No se encontró la clave JWT ('Jwt:Key') en la configuración.");
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "InventarioMultiSucursal.Api";

builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtIssuer,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(2)
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddControllers();

// T57: documentación de la API vía Swagger/OpenAPI, con soporte para probar
// endpoints protegidos pegando el JWT en el botón "Authorize".
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Inventario Multi-Sucursal API",
        Version = "v1",
        Description = "API REST para la gestión de inventario, compras, ventas, transferencias y logística entre sucursales."
    });

    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath);
    }

    var esquemaJwt = new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Description = "Token JWT obtenido en POST /api/Auth/login. Formato: Bearer {token}",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
    };
    options.AddSecurityDefinition("Bearer", esquemaJwt);
    options.AddSecurityRequirement(new OpenApiSecurityRequirement { { esquemaJwt, Array.Empty<string>() } });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "Inventario Multi-Sucursal API v1");
});

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
