import { api } from './client'
import type { ActualizarSucursalRequest, CrearSucursalRequest, Sucursal } from '../types/sucursal'

export function getSucursales() {
  return api.get<Sucursal[]>('/api/Sucursales')
}

export function crearSucursal(data: CrearSucursalRequest) {
  return api.post<Sucursal>('/api/Sucursales', data)
}

export function actualizarSucursal(id: number, data: ActualizarSucursalRequest) {
  return api.put<void>(`/api/Sucursales/${id}`, data)
}

export function eliminarSucursal(id: number) {
  return api.delete<void>(`/api/Sucursales/${id}`)
}
