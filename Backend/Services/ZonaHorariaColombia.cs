namespace InventarioMultiSucursal.Api.Services;

// Todo el negocio opera en Colombia (UTC-5, sin horario de verano), pero el
// servidor y la base de datos guardan y comparan en UTC. Este helper convierte
// entre ambas para que agrupar/filtrar "por día" o "por hora" refleje la hora
// que realmente vivió el usuario, no la hora UTC del servidor.
public static class ZonaHorariaColombia
{
    private static readonly TimeSpan Offset = TimeSpan.FromHours(-5);

    public static DateTime AUtc(DateTime horaLocal) => DateTime.SpecifyKind(horaLocal - Offset, DateTimeKind.Utc);

    public static DateTime ALocal(DateTime horaUtc) => DateTime.SpecifyKind(horaUtc + Offset, DateTimeKind.Unspecified);
}
