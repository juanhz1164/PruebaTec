namespace InventarioMultiSucursal.Api.Services;

// Todo el negocio opera en Colombia, pero el servidor y la base de datos
// guardan y comparan en UTC. Este helper convierte entre ambas para que
// agrupar/filtrar "por día" o "por hora" refleje la hora que realmente vivió
// el usuario, no la hora UTC del servidor.
//
// Usa TimeZoneInfo con el identificador IANA "America/Bogota" (no un offset
// fijo sumado/restado a mano): Colombia no observa horario de verano, así
// que en la práctica el offset es siempre -5, pero resolverlo vía
// TimeZoneInfo es la forma correcta y no depende de que ese supuesto siga
// siendo cierto — y deja explícito que la conversión es "hora de Bogotá",
// no un cálculo arbitrario.
public static class ZonaHorariaColombia
{
    private static readonly TimeZoneInfo Zona = TimeZoneInfo.FindSystemTimeZoneById("America/Bogota");

    public static DateTime AUtc(DateTime horaLocal) =>
        TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(horaLocal, DateTimeKind.Unspecified), Zona);

    public static DateTime ALocal(DateTime horaUtc) =>
        TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(horaUtc, DateTimeKind.Utc), Zona);
}
