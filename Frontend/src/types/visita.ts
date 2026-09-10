// Una visita = un grupo que ingresa junto, no una persona individual.
export interface Visita {
  id: number
  sucursalId: number
  sucursalNombre: string
  usuarioId: number
  usuarioNombre: string
  cantidadPersonas: number
  fechaHora: string
}

export interface CrearVisita {
  cantidadPersonas: number
}

export interface VisitasPorHora {
  hora: number
  cantidadVisitas: number
  cantidadPersonas: number
}

export interface ResumenVisitas {
  totalVisitas: number
  totalPersonas: number
  promedioPersonasPorVisita: number
  porHora: VisitasPorHora[]
}

export interface VisitasPorSucursal {
  sucursalId: number
  sucursalNombre: string
  cantidadVisitas: number
  cantidadPersonas: number
}

// Flujo de personas: usado en Comparación de sucursales (Admin, todas las
// sucursales, día o mes) y en el resumen del Dashboard (Gerente, su sucursal).
export interface FlujoPersonasPorSucursal {
  sucursalId: number
  sucursalNombre: string
  cantidadVisitas: number
  cantidadPersonas: number
  promedioPersonasPorVisita: number
}

export interface FlujoPersonasPorDia {
  fecha: string
  cantidadVisitas: number
  cantidadPersonas: number
}

export interface FlujoPersonasResumen {
  totalVisitas: number
  totalPersonas: number
  promedioPersonasPorVisita: number
  porSucursal: FlujoPersonasPorSucursal[]
  porDia: FlujoPersonasPorDia[]
  // Solo viene lleno cuando el período consultado es un día específico.
  porHora: VisitasPorHora[]
  sucursalMayorFlujo: string | null
}
