import { api } from './client'
import type {
  ClasificacionRuta,
  Cumplimiento,
  TiempoEnvio,
  TransferenciaEnCurso,
} from '../types/logistica'

export function getTiemposEnvio() {
  return api.get<TiempoEnvio[]>('/api/Logistica/tiempos-envio')
}

export function getClasificacionRutas() {
  return api.get<ClasificacionRuta[]>('/api/Logistica/rutas')
}

export function getTransferenciasEnCurso() {
  return api.get<TransferenciaEnCurso[]>('/api/Logistica/en-curso')
}

export function getCumplimientoPorSucursal() {
  return api.get<Cumplimiento[]>('/api/Logistica/cumplimiento/sucursal')
}

export function getCumplimientoPorRuta() {
  return api.get<Cumplimiento[]>('/api/Logistica/cumplimiento/ruta')
}
