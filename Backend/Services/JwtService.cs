using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using InventarioMultiSucursal.Api.Models;
using InventarioMultiSucursal.Api.Services.Interfaces;
using Microsoft.IdentityModel.Tokens;

namespace InventarioMultiSucursal.Api.Services;

public class JwtService : IJwtService
{
    private readonly IConfiguration _configuration;

    public JwtService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public (string Token, DateTime ExpiraEn) GenerarToken(Usuario usuario)
    {
        var jwtSection = _configuration.GetSection("Jwt");
        var clave = jwtSection["Key"]
            ?? throw new InvalidOperationException("No se encontró la clave JWT ('Jwt:Key') en la configuración.");
        var emisor = jwtSection["Issuer"] ?? "InventarioMultiSucursal.Api";
        var horasExpiracion = double.TryParse(jwtSection["ExpiracionHoras"], out var h) ? h : 8;

        var expiraEn = DateTime.UtcNow.AddHours(horasExpiracion);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, usuario.Id.ToString()),
            new(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
            new(ClaimTypes.Name, usuario.Nombre),
            new(ClaimTypes.Email, usuario.Email),
            new(ClaimTypes.Role, usuario.Rol.ToString())
        };

        if (usuario.SucursalId.HasValue)
        {
            claims.Add(new Claim("sucursalId", usuario.SucursalId.Value.ToString()));
        }

        var credenciales = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(clave)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: emisor,
            audience: emisor,
            claims: claims,
            expires: expiraEn,
            signingCredentials: credenciales);

        return (new JwtSecurityTokenHandler().WriteToken(token), expiraEn);
    }
}
