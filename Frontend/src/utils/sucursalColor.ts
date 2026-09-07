const PALETA = ['--chart-1', '--chart-2', '--chart-3', '--chart-4'] as const

// Asigna un color consistente a cada sucursal según su nombre (orden
// alfabético), para que el mismo color represente siempre la misma
// sucursal en todas las gráficas, sin importar el orden en que llegan
// los datos en cada endpoint.
export function crearMapaColoresSucursal(nombres: string[]): Record<string, string> {
  const ordenados = [...new Set(nombres)].sort((a, b) => a.localeCompare(b, 'es'))
  return Object.fromEntries(ordenados.map((nombre, i) => [nombre, PALETA[i % PALETA.length]]))
}
