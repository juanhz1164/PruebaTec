namespace InventarioMultiSucursal.Api.Auth;

// Nombres de rol tal como quedan en el claim ClaimTypes.Role del JWT
// (JwtService usa usuario.Rol.ToString(), es decir, el nombre del enum RolUsuario).
public static class Roles
{
    public const string Admin = "AdministradorGeneral";
    public const string Gerente = "GerenteSucursal";
    public const string Operador = "OperadorInventario";

    public const string AdminYGerente = $"{Admin},{Gerente}";
    public const string GerenteYOperador = $"{Gerente},{Operador}";
    public const string Todos = $"{Admin},{Gerente},{Operador}";
}
