using InventarioMultiSucursal.Api.Models;

namespace InventarioMultiSucursal.Api.DTOs;

// T48: tiempos estimados vs. reales de una transferencia ya enviada.
//
// Resultado es la fuente de verdad del estado/color de cada fila — se calcula
// en el backend a partir del Estado real de la transferencia y las fechas, y
// el frontend SOLO lo traduce a texto/color (nunca vuelve a inferirlo a
// partir de los números redondeados, que es lo que causaba filas marcadas
// como "Retraso" con una desviación negativa: la comparación real usa
// timestamps completos, no los días ya redondeados a 1 decimal para mostrar).
public enum ResultadoTiempoEnvio
{
    Pendiente,   // Aún en tránsito: no hay FechaRecepcion todavía.
    ATiempo,     // Recibida, FechaRecepcion <= FechaEstimadaLlegada.
    Retraso,     // Recibida, FechaRecepcion > FechaEstimadaLlegada.
    SinDatos     // Recibida pero sin FechaEstimadaLlegada para comparar.
}

public class TiempoEnvioDto
{
    public int TransferenciaId { get; set; }
    public string Ruta { get; set; } = string.Empty;
    public string SucursalOrigenNombre { get; set; } = string.Empty;
    public string SucursalDestinoNombre { get; set; } = string.Empty;
    public DateTime FechaEnvio { get; set; }
    public DateTime? FechaEstimadaLlegada { get; set; }
    public DateTime? FechaRecepcion { get; set; }
    public double? DiasEstimados { get; set; }
    public double? DiasReales { get; set; }

    // Positivo = llegó tarde (días de atraso); negativo o cero = a tiempo o adelantada.
    public double? DesviacionDias { get; set; }
    public ResultadoTiempoEnvio Resultado { get; set; }

    // Se mantiene por compatibilidad, pero deja de ser la fuente de verdad
    // del color/estado en el frontend — usar Resultado.
    public bool? CumplioTiempoEstimado { get; set; }
}

// T49: agregado por ruta (texto libre en Transferencia.Ruta).
public class ClasificacionRutaDto
{
    public string Ruta { get; set; } = string.Empty;
    public int CantidadTransferencias { get; set; }
    public PrioridadTransferencia? PrioridadMasFrecuente { get; set; }
    public decimal? CostoPromedio { get; set; }
    public double? TiempoPromedioDias { get; set; }
}

// T50: transferencias activas (no cerradas), con su estado actual.
public class TransferenciaEnCursoDto
{
    public int Id { get; set; }
    public string SucursalOrigenNombre { get; set; } = string.Empty;
    public string SucursalDestinoNombre { get; set; } = string.Empty;
    public EstadoTransferencia Estado { get; set; }
    public string? Transportista { get; set; }
    public string? Ruta { get; set; }
    public DateTime? FechaEnvio { get; set; }
    public DateTime? FechaEstimadaLlegada { get; set; }
}

// T51: cumplimiento agregado por sucursal (origen) y por ruta.
public class CumplimientoDto
{
    public string Agrupador { get; set; } = string.Empty; // nombre de sucursal o de ruta
    public int TotalTransferenciasCerradas { get; set; }
    public int RecibidasCompletas { get; set; }
    public int RecibidasParciales { get; set; }
    public int EntregasATiempo { get; set; }
    public int EntregasTarde { get; set; }
    public double PorcentajeCompletas => TotalTransferenciasCerradas == 0
        ? 0
        : Math.Round(RecibidasCompletas * 100.0 / TotalTransferenciasCerradas, 1);
    public double PorcentajeATiempo => (EntregasATiempo + EntregasTarde) == 0
        ? 0
        : Math.Round(EntregasATiempo * 100.0 / (EntregasATiempo + EntregasTarde), 1);
}
