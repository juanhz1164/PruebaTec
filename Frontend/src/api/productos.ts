import { api } from './client'
import type { Producto } from '../types/producto'

export function getProductos() {
  return api.get<Producto[]>('/api/Productos')
}
