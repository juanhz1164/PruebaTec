import { api } from './client'
import type { ActualizarProductoRequest, CrearProductoRequest, Producto } from '../types/producto'

export function getProductos() {
  return api.get<Producto[]>('/api/Productos')
}

export function crearProducto(data: CrearProductoRequest) {
  return api.post<Producto>('/api/Productos', data)
}

export function actualizarProducto(id: number, data: ActualizarProductoRequest) {
  return api.put<void>(`/api/Productos/${id}`, data)
}

export function eliminarProducto(id: number) {
  return api.delete<void>(`/api/Productos/${id}`)
}
