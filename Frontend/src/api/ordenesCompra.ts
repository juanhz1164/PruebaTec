import { api } from './client'
import type { CrearOrdenCompra, EstadoOrdenCompra, OrdenCompra } from '../types/ordenCompra'

export function getOrdenesCompra() {
  return api.get<OrdenCompra[]>('/api/OrdenesCompra')
}

export function crearOrdenCompra(data: CrearOrdenCompra) {
  return api.post<OrdenCompra>('/api/OrdenesCompra', data)
}

export function cambiarEstadoOrdenCompra(id: number, estado: EstadoOrdenCompra) {
  return api.put<OrdenCompra>(`/api/OrdenesCompra/${id}/estado`, { estado })
}
