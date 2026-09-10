using InventarioMultiSucursal.Api.DTOs;
using InventarioMultiSucursal.Api.Models;
using InventarioMultiSucursal.Api.Repositories.Interfaces;
using InventarioMultiSucursal.Api.Services.Interfaces;

namespace InventarioMultiSucursal.Api.Services;

public class TransferenciaService : ITransferenciaService
{
    private readonly ITransferenciaRepository _repository;

    public TransferenciaService(ITransferenciaRepository repository)
    {
        _repository = repository;
    }

    public async Task<List<TransferenciaDto>> GetAllAsync()
    {
        var transferencias = await _repository.GetAllAsync();
        return transferencias.Select(MapToDto).ToList();
    }

    public async Task<TransferenciaDto?> GetByIdAsync(int id)
    {
        var transferencia = await _repository.GetByIdAsync(id);
        return transferencia is null ? null : MapToDto(transferencia);
    }

    // T44: solicitud de transferencia entre sucursales.
    public async Task<ResultadoTransferencia> CrearAsync(CrearTransferenciaDto dto)
    {
        if (dto.SucursalOrigenId == dto.SucursalDestinoId)
        {
            return ResultadoTransferencia.Falla("La sucursal de origen y destino no pueden ser la misma.");
        }

        if (dto.Lineas.Count == 0)
        {
            return ResultadoTransferencia.Falla("La transferencia debe tener al menos una línea.");
        }

        if (dto.Lineas.Any(l => l.CantidadSolicitada <= 0))
        {
            return ResultadoTransferencia.Falla("La cantidad solicitada de cada línea debe ser mayor que cero.");
        }

        var transferencia = new Transferencia
        {
            SucursalOrigenId = dto.SucursalOrigenId,
            SucursalDestinoId = dto.SucursalDestinoId,
            UsuarioSolicitanteId = dto.UsuarioSolicitanteId,
            Estado = EstadoTransferencia.Solicitada,
            Prioridad = dto.Prioridad ?? PrioridadTransferencia.Media,
            FechaSolicitud = DateTime.UtcNow,
            Lineas = dto.Lineas.Select(l => new TransferenciaLinea
            {
                ProductoId = l.ProductoId,
                CantidadSolicitada = l.CantidadSolicitada,
                CantidadEnviada = 0,
                CantidadRecibida = 0
            }).ToList()
        };

        await _repository.AddAsync(transferencia);
        await _repository.SaveChangesAsync();

        var creada = await _repository.GetByIdAsync(transferencia.Id);
        return ResultadoTransferencia.Ok(MapToDto(creada!));
    }

    // T45 (parte 1): marca la transferencia como en preparación.
    public async Task<ResultadoTransferencia> IniciarPreparacionAsync(int id, int usuarioId)
    {
        var transferencia = await _repository.GetByIdAsync(id);
        if (transferencia is null)
        {
            return ResultadoTransferencia.Falla("La transferencia no existe.");
        }

        if (transferencia.Estado != EstadoTransferencia.Solicitada)
        {
            return ResultadoTransferencia.Falla($"No se puede iniciar preparación desde el estado '{transferencia.Estado}'.");
        }

        transferencia.Estado = EstadoTransferencia.EnPreparacion;
        transferencia.UsuarioPreparadorId = usuarioId;
        await _repository.SaveChangesAsync();

        var actualizada = await _repository.GetByIdAsync(id);
        return ResultadoTransferencia.Ok(MapToDto(actualizada!));
    }

    // T45 (parte 2): confirma el envío — registra transportista/ruta/fecha estimada,
    // fija cuánto se envía realmente por línea, y retira ese stock del origen.
    public async Task<ResultadoTransferencia> RegistrarEnvioAsync(int id, RegistrarEnvioDto dto, int usuarioId)
    {
        var transferencia = await _repository.GetByIdAsync(id);
        if (transferencia is null)
        {
            return ResultadoTransferencia.Falla("La transferencia no existe.");
        }

        if (transferencia.Estado != EstadoTransferencia.EnPreparacion)
        {
            return ResultadoTransferencia.Falla($"No se puede registrar el envío desde el estado '{transferencia.Estado}'.");
        }

        if (dto.Lineas.Count == 0)
        {
            return ResultadoTransferencia.Falla("Debe indicar la cantidad enviada de al menos una línea.");
        }

        // La fecha estimada de llegada es SOLO fecha (sin hora) — no puede ser
        // un día anterior a hoy. Se compara por día calendario en la zona
        // horaria de Colombia (no UTC): la "hoy" del usuario, no la del
        // servidor, evita rechazar "hoy" cerca de medianoche por el desfase
        // de husos horarios.
        if (dto.FechaEstimadaLlegada is not null
            && dto.FechaEstimadaLlegada.Value.Date < ZonaHorariaColombia.ALocal(DateTime.UtcNow).Date)
        {
            return ResultadoTransferencia.Falla("La fecha estimada de llegada no puede ser anterior a hoy.");
        }

        // Valida stock disponible en el origen de TODAS las líneas antes de tocar nada.
        var inventariosOrigen = new Dictionary<int, Inventario>();
        foreach (var lineaEnvio in dto.Lineas)
        {
            var linea = transferencia.Lineas.FirstOrDefault(l => l.Id == lineaEnvio.TransferenciaLineaId);
            if (linea is null)
            {
                return ResultadoTransferencia.Falla($"La línea {lineaEnvio.TransferenciaLineaId} no pertenece a esta transferencia.");
            }

            if (lineaEnvio.CantidadEnviada <= 0)
            {
                return ResultadoTransferencia.Falla("La cantidad enviada debe ser mayor que cero.");
            }

            var inventario = await _repository.GetInventarioAsync(linea.ProductoId, transferencia.SucursalOrigenId);
            if (inventario is null || inventario.Cantidad < lineaEnvio.CantidadEnviada)
            {
                var disponible = inventario?.Cantidad ?? 0;
                return ResultadoTransferencia.Falla($"Stock insuficiente en origen para el producto {linea.ProductoId}: disponible {disponible}, a enviar {lineaEnvio.CantidadEnviada}.");
            }

            inventariosOrigen[linea.Id] = inventario;
        }

        // Si la ruta origen→destino tiene configuración de logística, se usa como
        // respaldo para cualquier campo que no llegue en el DTO (el frontend ya
        // prellena el formulario con estos mismos valores, pero el backend no
        // debe confiar únicamente en eso — es la fuente de verdad real).
        var rutaConfigurada = await _repository.GetRutaLogisticaAsync(transferencia.SucursalOrigenId, transferencia.SucursalDestinoId);

        await using var transaction = await _repository.BeginTransactionAsync();

        transferencia.Transportista = dto.Transportista ?? rutaConfigurada?.Transportista;
        transferencia.Ruta = dto.Ruta;
        transferencia.CostoEnvio = dto.CostoEnvio ?? rutaConfigurada?.CostoEnvio;
        transferencia.FechaEnvio = DateTime.UtcNow;

        // Fallback cuando el frontend no manda fecha estimada explícita: se
        // calcula sumando el tiempo típico de la ruta a la fecha de HOY en
        // Colombia (no a la fecha/hora exacta de envío), para que la fecha
        // estimada resultante quede sin hora, consistente con que este campo
        // es un evento "solo fecha", no un instante.
        var fechaEstimada = dto.FechaEstimadaLlegada
            ?? (rutaConfigurada is not null
                ? ZonaHorariaColombia.AUtc(ZonaHorariaColombia.ALocal(DateTime.UtcNow).Date.AddDays(rutaConfigurada.TiempoEstimadoDias))
                : (DateTime?)null);

        transferencia.FechaEstimadaLlegada = fechaEstimada;
        transferencia.Estado = EstadoTransferencia.EnTransito;
        transferencia.UsuarioEnvioId = usuarioId;

        foreach (var lineaEnvio in dto.Lineas)
        {
            var linea = transferencia.Lineas.First(l => l.Id == lineaEnvio.TransferenciaLineaId);
            var inventario = inventariosOrigen[linea.Id];

            linea.CantidadEnviada = lineaEnvio.CantidadEnviada;

            inventario.Cantidad -= lineaEnvio.CantidadEnviada;
            inventario.UpdatedAt = DateTime.UtcNow;

            await _repository.AddMovimientoAsync(new MovimientoInventario
            {
                ProductoId = linea.ProductoId,
                SucursalId = transferencia.SucursalOrigenId,
                UsuarioId = transferencia.UsuarioSolicitanteId,
                Tipo = TipoMovimiento.Retiro,
                Cantidad = lineaEnvio.CantidadEnviada,
                Motivo = "Envío de transferencia a otra sucursal",
                ReferenciaTipo = "transferencia",
                ReferenciaId = transferencia.Id,
                Fecha = DateTime.UtcNow
            });
        }

        await _repository.SaveChangesAsync();
        await transaction.CommitAsync();

        var actualizada = await _repository.GetByIdAsync(id);
        return ResultadoTransferencia.Ok(MapToDto(actualizada!));
    }

    // T46/T47: confirma cuánto llegó realmente al destino. Si coincide con lo enviado
    // en todas las líneas queda "RecibidaCompleta"; si algo llegó de menos, "RecibidaParcial"
    // (el faltante = enviado - recibido queda expuesto para investigar, sin ajuste automático).
    public async Task<ResultadoTransferencia> ConfirmarRecepcionAsync(int id, ConfirmarRecepcionDto dto, int usuarioId)
    {
        var transferencia = await _repository.GetByIdAsync(id);
        if (transferencia is null)
        {
            return ResultadoTransferencia.Falla("La transferencia no existe.");
        }

        if (transferencia.Estado != EstadoTransferencia.EnTransito)
        {
            return ResultadoTransferencia.Falla($"No se puede confirmar recepción desde el estado '{transferencia.Estado}'.");
        }

        if (dto.Lineas.Count != transferencia.Lineas.Count)
        {
            return ResultadoTransferencia.Falla("Debe confirmar la recepción de todas las líneas de la transferencia.");
        }

        foreach (var lineaRecepcion in dto.Lineas)
        {
            var linea = transferencia.Lineas.FirstOrDefault(l => l.Id == lineaRecepcion.TransferenciaLineaId);
            if (linea is null)
            {
                return ResultadoTransferencia.Falla($"La línea {lineaRecepcion.TransferenciaLineaId} no pertenece a esta transferencia.");
            }

            if (lineaRecepcion.CantidadRecibida < 0 || lineaRecepcion.CantidadRecibida > linea.CantidadEnviada)
            {
                return ResultadoTransferencia.Falla($"La cantidad recibida de la línea {linea.Id} debe estar entre 0 y {linea.CantidadEnviada}.");
            }
        }

        await using var transaction = await _repository.BeginTransactionAsync();

        var huboFaltante = false;

        foreach (var lineaRecepcion in dto.Lineas)
        {
            var linea = transferencia.Lineas.First(l => l.Id == lineaRecepcion.TransferenciaLineaId);
            linea.CantidadRecibida = lineaRecepcion.CantidadRecibida;

            if (lineaRecepcion.CantidadRecibida < linea.CantidadEnviada)
            {
                huboFaltante = true;
            }

            if (lineaRecepcion.CantidadRecibida <= 0)
            {
                continue;
            }

            var inventarioDestino = await _repository.GetInventarioAsync(linea.ProductoId, transferencia.SucursalDestinoId);
            if (inventarioDestino is null)
            {
                inventarioDestino = new Inventario
                {
                    ProductoId = linea.ProductoId,
                    SucursalId = transferencia.SucursalDestinoId,
                    Cantidad = 0,
                    StockMinimo = 0,
                    CostoPromedio = 0,
                    UpdatedAt = DateTime.UtcNow
                };
                await _repository.AddInventarioAsync(inventarioDestino);
            }

            inventarioDestino.Cantidad += lineaRecepcion.CantidadRecibida;
            inventarioDestino.UpdatedAt = DateTime.UtcNow;

            await _repository.AddMovimientoAsync(new MovimientoInventario
            {
                ProductoId = linea.ProductoId,
                SucursalId = transferencia.SucursalDestinoId,
                UsuarioId = transferencia.UsuarioSolicitanteId,
                Tipo = TipoMovimiento.Ingreso,
                Cantidad = lineaRecepcion.CantidadRecibida,
                Motivo = "Recepción de transferencia desde otra sucursal",
                ReferenciaTipo = "transferencia",
                ReferenciaId = transferencia.Id,
                Fecha = DateTime.UtcNow
            });
        }

        transferencia.Estado = huboFaltante ? EstadoTransferencia.RecibidaParcial : EstadoTransferencia.RecibidaCompleta;
        transferencia.FechaRecepcion = DateTime.UtcNow;
        transferencia.UsuarioRecepcionId = usuarioId;

        await _repository.SaveChangesAsync();
        await transaction.CommitAsync();

        var actualizada = await _repository.GetByIdAsync(id);
        return ResultadoTransferencia.Ok(MapToDto(actualizada!));
    }

    public async Task<ResultadoTransferencia> CancelarAsync(int id)
    {
        var transferencia = await _repository.GetByIdAsync(id);
        if (transferencia is null)
        {
            return ResultadoTransferencia.Falla("La transferencia no existe.");
        }

        if (transferencia.Estado is EstadoTransferencia.EnTransito or EstadoTransferencia.RecibidaCompleta
            or EstadoTransferencia.RecibidaParcial or EstadoTransferencia.Cancelada)
        {
            return ResultadoTransferencia.Falla($"No se puede cancelar una transferencia en estado '{transferencia.Estado}'.");
        }

        transferencia.Estado = EstadoTransferencia.Cancelada;
        await _repository.SaveChangesAsync();

        var actualizada = await _repository.GetByIdAsync(id);
        return ResultadoTransferencia.Ok(MapToDto(actualizada!));
    }

    public async Task<List<RutaLogisticaDto>> GetRutasLogisticasAsync()
    {
        var rutas = await _repository.GetRutasLogisticasAsync();
        return rutas.Select(MapRutaToDto).ToList();
    }

    public async Task<RutaLogisticaDto?> GetRutaLogisticaAsync(int sucursalOrigenId, int sucursalDestinoId)
    {
        var ruta = await _repository.GetRutaLogisticaAsync(sucursalOrigenId, sucursalDestinoId);
        return ruta is null ? null : MapRutaToDto(ruta);
    }

    private static RutaLogisticaDto MapRutaToDto(RutaLogistica r) => new()
    {
        Id = r.Id,
        SucursalOrigenId = r.SucursalOrigenId,
        SucursalOrigenNombre = r.SucursalOrigen?.Nombre ?? string.Empty,
        SucursalDestinoId = r.SucursalDestinoId,
        SucursalDestinoNombre = r.SucursalDestino?.Nombre ?? string.Empty,
        Transportista = r.Transportista,
        CostoEnvio = r.CostoEnvio,
        TiempoEstimadoDias = r.TiempoEstimadoDias
    };

    private static TransferenciaDto MapToDto(Transferencia t) => new()
    {
        Id = t.Id,
        SucursalOrigenId = t.SucursalOrigenId,
        SucursalOrigenNombre = t.SucursalOrigen?.Nombre ?? string.Empty,
        SucursalDestinoId = t.SucursalDestinoId,
        SucursalDestinoNombre = t.SucursalDestino?.Nombre ?? string.Empty,
        UsuarioSolicitanteId = t.UsuarioSolicitanteId,
        UsuarioSolicitanteNombre = t.UsuarioSolicitante?.Nombre ?? string.Empty,
        UsuarioPreparadorNombre = t.UsuarioPreparador?.Nombre,
        UsuarioEnvioNombre = t.UsuarioEnvio?.Nombre,
        UsuarioRecepcionNombre = t.UsuarioRecepcion?.Nombre,
        Estado = t.Estado,
        Transportista = t.Transportista,
        Ruta = t.Ruta,
        Prioridad = t.Prioridad,
        CostoEnvio = t.CostoEnvio,
        FechaSolicitud = t.FechaSolicitud,
        FechaEnvio = t.FechaEnvio,
        FechaEstimadaLlegada = t.FechaEstimadaLlegada,
        FechaRecepcion = t.FechaRecepcion,
        Lineas = t.Lineas.Select(l => new TransferenciaLineaDto
        {
            Id = l.Id,
            ProductoId = l.ProductoId,
            ProductoNombre = l.Producto?.Nombre ?? string.Empty,
            ProductoSku = l.Producto?.Sku ?? string.Empty,
            CantidadSolicitada = l.CantidadSolicitada,
            CantidadEnviada = l.CantidadEnviada,
            CantidadRecibida = l.CantidadRecibida
        }).ToList()
    };
}
