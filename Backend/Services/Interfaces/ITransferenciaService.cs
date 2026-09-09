using InventarioMultiSucursal.Api.DTOs;

namespace InventarioMultiSucursal.Api.Services.Interfaces;

public interface ITransferenciaService
{
    Task<List<TransferenciaDto>> GetAllAsync();
    Task<TransferenciaDto?> GetByIdAsync(int id);

    // T44: solicitud de transferencia.
    Task<ResultadoTransferencia> CrearAsync(CrearTransferenciaDto dto);

    // T45: preparación (marca en_preparacion) y confirmación de envío (marca en_transito,
    // retira stock del origen, registra transportista/ruta/fecha estimada). El usuarioId
    // queda registrado como quien ejecutó ese paso (trazabilidad, distinta del solicitante).
    Task<ResultadoTransferencia> IniciarPreparacionAsync(int id, int usuarioId);
    Task<ResultadoTransferencia> RegistrarEnvioAsync(int id, RegistrarEnvioDto dto, int usuarioId);

    // T46/T47: confirmación de recepción completa o parcial (ingresa stock al destino).
    Task<ResultadoTransferencia> ConfirmarRecepcionAsync(int id, ConfirmarRecepcionDto dto, int usuarioId);

    Task<ResultadoTransferencia> CancelarAsync(int id);

    // Configuración de logística por ruta: de aquí el frontend prellena
    // transportista/costo/tiempo estimado al registrar un envío.
    Task<List<RutaLogisticaDto>> GetRutasLogisticasAsync();
    Task<RutaLogisticaDto?> GetRutaLogisticaAsync(int sucursalOrigenId, int sucursalDestinoId);
}

public class ResultadoTransferencia
{
    public bool Exitoso { get; init; }
    public string? Error { get; init; }
    public TransferenciaDto? Transferencia { get; init; }

    public static ResultadoTransferencia Falla(string error) => new() { Exitoso = false, Error = error };
    public static ResultadoTransferencia Ok(TransferenciaDto transferencia) => new() { Exitoso = true, Transferencia = transferencia };
}
