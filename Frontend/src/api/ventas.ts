import { api } from './client'
import type { CrearVenta, Venta } from '../types/venta'

export function getVentas() {
  return api.get<Venta[]>('/api/Ventas')
}

export function crearVenta(data: CrearVenta) {
  return api.post<Venta>('/api/Ventas', data)
}
