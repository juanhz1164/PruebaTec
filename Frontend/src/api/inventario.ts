import { api } from './client'
import type { InventarioItem } from '../types/inventario'

export function getInventarioPorSucursal(sucursalId: number) {
  return api.get<InventarioItem[]>(`/api/Inventario?sucursalId=${sucursalId}`)
}
