import { api } from './client'
import type {
  ComparativaSucursal,
  ProductoProximoAgotarse,
  RotacionProducto,
  TransferenciaActiva,
  VentasPorMes,
} from '../types/dashboard'

export function getVentasPorMes(sucursalId?: number, anio?: number, mes?: number) {
  const params = new URLSearchParams()
  if (sucursalId) params.set('sucursalId', String(sucursalId))
  if (anio && mes) {
    params.set('anio', String(anio))
    params.set('mes', String(mes))
  }
  const query = params.toString()
  return api.get<VentasPorMes[]>(`/api/Dashboard/ventas-por-mes${query ? `?${query}` : ''}`)
}

export function getRotacionInventario(sucursalId?: number) {
  const suffix = sucursalId ? `?sucursalId=${sucursalId}` : ''
  return api.get<RotacionProducto[]>(`/api/Dashboard/rotacion-inventario${suffix}`)
}

export function getTransferenciasActivas() {
  return api.get<TransferenciaActiva[]>('/api/Dashboard/transferencias-activas')
}

export function getProductosProximosAgotarse(sucursalId?: number) {
  const suffix = sucursalId ? `?sucursalId=${sucursalId}` : ''
  return api.get<ProductoProximoAgotarse[]>(`/api/Dashboard/productos-proximos-agotarse${suffix}`)
}

export function getComparativaSucursales() {
  return api.get<ComparativaSucursal[]>('/api/Dashboard/comparativa-sucursales')
}
