using InventarioMultiSucursal.Api.Models;

namespace InventarioMultiSucursal.Api.Services.Interfaces;

public interface IJwtService
{
    (string Token, DateTime ExpiraEn) GenerarToken(Usuario usuario);
}
