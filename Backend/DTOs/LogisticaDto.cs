using InventarioMultiSucursal.Api.Models;

namespace InventarioMultiSucursal.Api.DTOs;

// T48: tiempos estimados vs. reales de una transferencia ya enviada.
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
