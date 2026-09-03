export const ESTADO_TRANSFERENCIA = {
  Solicitada: 0,
  EnPreparacion: 1,
  EnTransito: 2,
  RecibidaCompleta: 3,
  RecibidaParcial: 4,
  Cancelada: 5,
} as const

export type EstadoTransferencia =
  (typeof ESTADO_TRANSFERENCIA)[keyof typeof ESTADO_TRANSFERENCIA]

export const ESTADO_TRANSFERENCIA_LABEL: Record<EstadoTransferencia, string> = {
  [ESTADO_TRANSFERENCIA.Solicitada]: 'Solicitada',
  [ESTADO_TRANSFERENCIA.EnPreparacion]: 'En preparación',
  [ESTADO_TRANSFERENCIA.EnTransito]: 'En tránsito',
  [ESTADO_TRANSFERENCIA.RecibidaCompleta]: 'Recibida completa',
  [ESTADO_TRANSFERENCIA.RecibidaParcial]: 'Recibida parcial',
  [ESTADO_TRANSFERENCIA.Cancelada]: 'Cancelada',
}

export const PRIORIDAD_TRANSFERENCIA = {
  Baja: 0,
  Media: 1,
  Alta: 2,
} as const

export type PrioridadTransferencia =
  (typeof PRIORIDAD_TRANSFERENCIA)[keyof typeof PRIORIDAD_TRANSFERENCIA]

export const PRIORIDAD_TRANSFERENCIA_LABEL: Record<PrioridadTransferencia, string> = {
  [PRIORIDAD_TRANSFERENCIA.Baja]: 'Baja',
  [PRIORIDAD_TRANSFERENCIA.Media]: 'Media',
  [PRIORIDAD_TRANSFERENCIA.Alta]: 'Alta',
}

export interface TransferenciaLinea {
  id: number
  productoId: number
  productoNombre: string
  productoSku: string
  cantidadSolicitada: number
  cantidadEnviada: number
  cantidadRecibida: number
  faltante: number
}

export interface Transferencia {
  id: number
  sucursalOrigenId: number
  sucursalOrigenNombre: string
  sucursalDestinoId: number
  sucursalDestinoNombre: string
  usuarioSolicitanteId: number
  usuarioSolicitanteNombre: string
  estado: EstadoTransferencia
  transportista: string | null
  ruta: string | null
  prioridad: PrioridadTransferencia | null
  costoEnvio: number | null
  fechaSolicitud: string
  fechaEnvio: string | null
  fechaEstimadaLlegada: string | null
  fechaRecepcion: string | null
  lineas: TransferenciaLinea[]
}

export interface CrearTransferenciaLinea {
  productoId: number
  cantidadSolicitada: number
}

export interface CrearTransferencia {
  sucursalOrigenId: number
  sucursalDestinoId: number
  usuarioSolicitanteId: number
  lineas: CrearTransferenciaLinea[]
}

export interface LineaEnvio {
  transferenciaLineaId: number
  cantidadEnviada: number
}

export interface RegistrarEnvio {
  transportista?: string | null
  ruta?: string | null
  prioridad?: PrioridadTransferencia | null
  costoEnvio?: number | null
  fechaEstimadaLlegada?: string | null
  lineas: LineaEnvio[]
}

export interface LineaRecepcion {
  transferenciaLineaId: number
  cantidadRecibida: number
}

export interface ConfirmarRecepcion {
  lineas: LineaRecepcion[]
}
