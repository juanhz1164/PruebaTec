import { api } from './client'
import type { Sucursal } from '../types/sucursal'

export function getSucursales() {
  return api.get<Sucursal[]>('/api/Sucursales')
}
