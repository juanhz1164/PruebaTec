// Única fuente de verdad del estado/color de cada fila en "Tiempos estimados
// vs. reales" — la decide el backend a partir del Estado real de la
// transferencia y las fechas, nunca se re-infiere en el frontend a partir de
// números o de su signo. Serializado como número (igual que EstadoTransferencia/
// PrioridadTransferencia en este proyecto): debe coincidir 1:1 con el orden
// del enum ResultadoTiempoEnvio en Backend/DTOs/LogisticaDto.cs.
export const RESULTADO_TIEMPO_ENVIO = {
  Pendiente: 0,
  ATiempo: 1,
  Retraso: 2,
  SinDatos: 3,
} as const

export type ResultadoTiempoEnvio =
  (typeof RESULTADO_TIEMPO_ENVIO)[keyof typeof RESULTADO_TIEMPO_ENVIO]

export interface TiempoEnvio {
  transferenciaId: number
  ruta: string
  sucursalOrigenNombre: string
  sucursalDestinoNombre: string
  fechaEnvio: string
  fechaEstimadaLlegada: string | null
  fechaRecepcion: string | null
  diasEstimados: number | null
  diasReales: number | null
  desviacionDias: number | null
  resultado: ResultadoTiempoEnvio
  /** @deprecated usar `resultado` */
  cumplioTiempoEstimado: boolean | null
}

export interface ClasificacionRuta {
  ruta: string
  cantidadTransferencias: number
  prioridadMasFrecuente: number | null
  costoPromedio: number | null
  tiempoPromedioDias: number | null
}

export interface TransferenciaEnCurso {
  id: number
  sucursalOrigenNombre: string
  sucursalDestinoNombre: string
  estado: number
  transportista: string | null
  ruta: string | null
  fechaEnvio: string | null
  fechaEstimadaLlegada: string | null
}

export interface Cumplimiento {
  agrupador: string
  totalTransferenciasCerradas: number
  recibidasCompletas: number
  recibidasParciales: number
  entregasATiempo: number
  entregasTarde: number
  porcentajeCompletas: number
  porcentajeATiempo: number
}
