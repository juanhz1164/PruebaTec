using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace InventarioMultiSucursal.Api.Tests.Integration;

// Genera JWTs con la misma forma que JwtService.GenerarToken (mismos claims:
// NameIdentifier, Name, Email, Role, y "sucursalId" opcional), firmados con la
// clave fija de CustomWebApplicationFactory, para poder probar endpoints
// protegidos con [Authorize(Roles = ...)] sin pasar por el flujo real de login.
public static class TestJwtFactory
{
    public static string GenerarToken(int usuarioId, string nombre, string email, string rol, int? sucursalId = null)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, usuarioId.ToString()),
            new(ClaimTypes.NameIdentifier, usuarioId.ToString()),
            new(ClaimTypes.Name, nombre),
            new(ClaimTypes.Email, email),
            new(ClaimTypes.Role, rol)
        };

        if (sucursalId.HasValue)
        {
            claims.Add(new Claim("sucursalId", sucursalId.Value.ToString()));
        }

        var credenciales = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(CustomWebApplicationFactory.JwtKey)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: CustomWebApplicationFactory.JwtIssuer,
            audience: CustomWebApplicationFactory.JwtIssuer,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: credenciales);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
