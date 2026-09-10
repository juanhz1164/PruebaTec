const formatoMoneda = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatearMoneda(valor: number): string {
  return formatoMoneda.format(valor)
}

// Zona horaria fija para TODA la presentación de fechas/horas al usuario —
// la aplicación es de uso exclusivo en Colombia, así que se fuerza siempre
// "America/Bogota" en vez de depender de la zona horaria del navegador (que
// podría no ser la correcta, p. ej. un equipo mal configurado). El backend
// envía las fechas en UTC con sufijo "Z" (ver AppDbContext.OnModelCreating,
// aplicado tanto a DateTime como a DateTime?), y el motor de Intl las
// convierte a hora de Bogotá — nunca se suma/resta un offset a mano.
const ZONA_COLOMBIA = 'America/Bogota'

// Fecha (dd/mm/aaaa) y hora (hh:mm, 24h) por separado, para mostrarlas en
// dos líneas dentro de una misma celda de tabla — para EVENTOS reales
// (creación, envío, recepción), que sí tienen hora.
export function formatearFechaHora(valorIso: string | null): { fecha: string; hora: string } | null {
  if (!valorIso) return null
  const fecha = new Date(valorIso)
  return {
    fecha: fecha.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: ZONA_COLOMBIA }),
    hora: fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: ZONA_COLOMBIA }),
  }
}

// Solo fecha (dd/mm/aaaa), sin hora — para la fecha ESTIMADA de llegada, que
// es un campo "solo fecha" por diseño (no un instante exacto).
export function formatearFecha(valorIso: string | null): string | null {
  if (!valorIso) return null
  return new Date(valorIso).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: ZONA_COLOMBIA,
  })
}
