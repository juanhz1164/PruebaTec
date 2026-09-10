const formatoMoneda = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatearMoneda(valor: number): string {
  return formatoMoneda.format(valor)
}

// Fecha (dd/mm/aaaa) y hora (hh:mm) por separado, para mostrarlas en dos
// líneas dentro de una misma celda de tabla. El backend envía las fechas en
// UTC con sufijo "Z" (ver AppDbContext.OnModelCreating), y `Date` las
// convierte automáticamente a la hora local del navegador — la misma
// estrategia que ya usa el resto de la app, consistente con la zona horaria
// de Colombia configurada en el sistema del usuario.
export function formatearFechaHora(valorIso: string | null): { fecha: string; hora: string } | null {
  if (!valorIso) return null
  const fecha = new Date(valorIso)
  return {
    fecha: fecha.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    hora: fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }),
  }
}
