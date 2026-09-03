import { api } from './client'
import type { CrearMovimientoInventario, MovimientoInventario } from '../types/movimiento'

export function getMovimientos(params: { productoId?: number; sucursalId?: number }) {
  const query = new URLSearchParams()
  if (params.productoId) query.set('productoId', String(params.productoId))
  if (params.sucursalId) query.set('sucursalId', String(params.sucursalId))
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return api.get<MovimientoInventario[]>(`/api/Inventario/movimientos${suffix}`)
}

export function crearMovimiento(data: CrearMovimientoInventario) {
  return api.post<MovimientoInventario>('/api/Inventario/movimientos', data)
}
