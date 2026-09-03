export type TipoMovimiento = 0 | 1

export const TIPO_MOVIMIENTO = {
  Ingreso: 0 as TipoMovimiento,
  Retiro: 1 as TipoMovimiento,
}

export interface MovimientoInventario {
  id: number
  productoId: number
  productoNombre: string
  sucursalId: number
  usuarioId: number
  usuarioNombre: string
  tipo: TipoMovimiento
  cantidad: number
  motivo: string
  referenciaTipo: string | null
  referenciaId: number | null
  fecha: string
}

export interface CrearMovimientoInventario {
  productoId: number
  sucursalId: number
  usuarioId: number
  tipo: TipoMovimiento
  cantidad: number
  motivo: string
  referenciaTipo?: string | null
  referenciaId?: number | null
}
