namespace InventarioMultiSucursal.Api.DTOs;

public class VisitaDto
{
    public int Id { get; set; }
    public int SucursalId { get; set; }
    public string SucursalNombre { get; set; } = string.Empty;
    public int UsuarioId { get; set; }
    public string UsuarioNombre { get; set; } = string.Empty;
    public int CantidadPersonas { get; set; }
    public DateTime FechaHora { get; set; }
}

// El usuario solo indica cuántas personas ingresan; sucursal, usuario y
// fecha/hora los fija el backend a partir del usuario autenticado y del reloj
// del servidor (nunca se confía en un valor de fecha/hora enviado por el cliente).
public class CrearVisitaDto
{
    public int CantidadPersonas { get; set; }
}

// Resumen de un día (o del rango consultado) para los KPIs y gráficas.
public class ResumenVisitasDto
{
    public int TotalVisitas { get; set; }
    public int TotalPersonas { get; set; }
    public decimal PromedioPersonasPorVisita { get; set; }
    public List<VisitasPorHoraDto> PorHora { get; set; } = new();
}

public class VisitasPorHoraDto
{
    public int Hora { get; set; }
    public int CantidadVisitas { get; set; }
    public int CantidadPersonas { get; set; }
}

// Solo para el Gerente: desglose por sucursal del día consultado.
public class VisitasPorSucursalDto
{
    public int SucursalId { get; set; }
    public string SucursalNombre { get; set; } = string.Empty;
    public int CantidadVisitas { get; set; }
    public int CantidadPersonas { get; set; }
}

// Flujo de personas: usado tanto en Comparación de sucursales (Admin, todas
// las sucursales) como en el resumen del Dashboard (Gerente/Operador, su
// propia sucursal). sucursalId = null => consulta agregada de toda la red.
//
// PromedioPersonasPorVisita SIEMPRE se calcula como TotalPersonas / TotalVisitas
// del período consultado, nunca como promedio de promedios por sucursal.
public class FlujoPersonasResumenDto
{
    public int TotalVisitas { get; set; }
    public int TotalPersonas { get; set; }
    public decimal PromedioPersonasPorVisita { get; set; }
    public List<FlujoPersonasPorSucursalDto> PorSucursal { get; set; } = new();
    public List<FlujoPersonasPorDiaDto> PorDia { get; set; } = new();

    // Solo se llena cuando el período consultado es un único día (GetFlujoPorDiaAsync).
    public List<VisitasPorHoraDto> PorHora { get; set; } = new();

    // Sucursal con más personas en el período (null si no hay datos o si la
    // consulta ya está acotada a una sola sucursal).
    public string? SucursalMayorFlujo { get; set; }
}

public class FlujoPersonasPorSucursalDto
{
    public int SucursalId { get; set; }
    public string SucursalNombre { get; set; } = string.Empty;
    public int CantidadVisitas { get; set; }
    public int CantidadPersonas { get; set; }
    public decimal PromedioPersonasPorVisita { get; set; }
}

public class FlujoPersonasPorDiaDto
{
    public DateOnly Fecha { get; set; }
    public int CantidadVisitas { get; set; }
    public int CantidadPersonas { get; set; }
}
