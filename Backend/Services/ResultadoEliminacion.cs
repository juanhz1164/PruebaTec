namespace InventarioMultiSucursal.Api.Services;

// Resultado de un borrado físico: puede fallar porque el registro no existe
// o porque la base de datos rechaza el borrado por una restricción de llave
// foránea (el registro todavía tiene datos relacionados).
public class ResultadoEliminacion
{
    public bool Exitoso { get; init; }
    public bool NoEncontrado { get; init; }
    public string? Error { get; init; }

    public static ResultadoEliminacion Ok() => new() { Exitoso = true };
    public static ResultadoEliminacion NoExiste() => new() { Exitoso = false, NoEncontrado = true };
    public static ResultadoEliminacion Falla(string error) => new() { Exitoso = false, Error = error };
}
