import { api } from './client'
import type { Proveedor } from '../types/proveedor'

export function getProveedores() {
  return api.get<Proveedor[]>('/api/Proveedores')
}
