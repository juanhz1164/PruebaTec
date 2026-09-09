using InventarioMultiSucursal.Api.Models;

namespace InventarioMultiSucursal.Api.DTOs;

public class TransferenciaDto
{
    public int Id { get; set; }
    public int SucursalOrigenId { get; set; }
    public string SucursalOrigenNombre { get; set; } = string.Empty;
    public int SucursalDestinoId { get; set; }
    public string SucursalDestinoNombre { get; set; } = string.Empty;
    public int UsuarioSolicitanteId { get; set; }
    public string UsuarioSolicitanteNombre { get; set; } = string.Empty;
    public EstadoTransferencia Estado { get; set; }
    public string? Transportista { get; set; }
    public string? Ruta { get; set; }
    public PrioridadTransferencia? Prioridad { get; set; }
    public decimal? CostoEnvio { get; set; }
    public DateTime FechaSolicitud { get; set; }
    public DateTime? FechaEnvio { get; set; }
    public DateTime? FechaEstimadaLlegada { get; set; }
    public DateTime? FechaRecepcion { get; set; }
    public List<TransferenciaLineaDto> Lineas { get; set; } = new();
}

public class TransferenciaLineaDto
{
    public int Id { get; set; }
    public int ProductoId { get; set; }
    public string ProductoNombre { get; set; } = string.Empty;
    public string ProductoSku { get; set; } = string.Empty;
    public decimal CantidadSolicitada { get; set; }
    public decimal CantidadEnviada { get; set; }
    public decimal CantidadRecibida { get; set; }
    public decimal Faltante => CantidadEnviada - CantidadRecibida;
}

// T44: solicitud inicial de transferencia (solo cantidades solicitadas).
public class CrearTransferenciaDto
{
    public int SucursalOrigenId { get; set; }
    public int SucursalDestinoId { get; set; }
    public int UsuarioSolicitanteId { get; set; }
    // La prioridad pertenece a la transferencia completa (aplica a todas sus
    // líneas por igual), no a cada producto — se define aquí, al solicitar,
    // no en el envío. Opcional: si no se especifica, el Service la fija en
    // Media por defecto.
    public PrioridadTransferencia? Prioridad { get; set; }
    public List<CrearTransferenciaLineaDto> Lineas { get; set; } = new();
}

public class CrearTransferenciaLineaDto
{
    public int ProductoId { get; set; }
    public decimal CantidadSolicitada { get; set; }
}

// T45: registro de despacho (transportista, ruta, fecha estimada) y cantidades
// realmente enviadas por línea (pueden diferir de lo solicitado). La
// prioridad NO se pide aquí — ya se fijó al solicitar la transferencia
// (CrearTransferenciaDto.Prioridad) y aplica a toda la transferencia, no
// solo al envío.
public class RegistrarEnvioDto
{
    public string? Transportista { get; set; }
    public string? Ruta { get; set; }
    public decimal? CostoEnvio { get; set; }
    public DateTime? FechaEstimadaLlegada { get; set; }
    public List<LineaEnvioDto> Lineas { get; set; } = new();
}

public class LineaEnvioDto
{
    public int TransferenciaLineaId { get; set; }
    public decimal CantidadEnviada { get; set; }
}

// T46/T47: confirmación de recepción (completa o parcial según lo recibido vs. lo enviado).
public class ConfirmarRecepcionDto
{
    public List<LineaRecepcionDto> Lineas { get; set; } = new();
}

public class LineaRecepcionDto
{
    public int TransferenciaLineaId { get; set; }
    public decimal CantidadRecibida { get; set; }
}
