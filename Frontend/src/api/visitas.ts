import { api } from './client'
import type {
  CrearVisita,
  FlujoPersonasResumen,
  ResumenVisitas,
  Visita,
  VisitasPorSucursal,
} from '../types/visita'

export function getVisitas(fecha: string) {
  return api.get<Visita[]>(`/api/Visitas?fecha=${fecha}`)
}

export function getResumenVisitas(fecha: string) {
  return api.get<ResumenVisitas>(`/api/Visitas/resumen?fecha=${fecha}`)
}

export function getResumenVisitasPorSucursal(fecha: string) {
  return api.get<VisitasPorSucursal[]>(`/api/Visitas/resumen-por-sucursal?fecha=${fecha}`)
}

export function registrarVisita(data: CrearVisita) {
  return api.post<Visita>('/api/Visitas', data)
}

export function eliminarVisita(id: number) {
  return api.delete<void>(`/api/Visitas/${id}`)
}

export function getFlujoPersonasPorDia(fecha: string) {
  return api.get<FlujoPersonasResumen>(`/api/Visitas/flujo/dia?fecha=${fecha}`)
}

export function getFlujoPersonasPorMes(anio: number, mes: number) {
  return api.get<FlujoPersonasResumen>(`/api/Visitas/flujo/mes?anio=${anio}&mes=${mes}`)
}
