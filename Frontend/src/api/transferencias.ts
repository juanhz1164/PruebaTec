import { api } from './client'
import type {
  ConfirmarRecepcion,
  CrearTransferencia,
  RegistrarEnvio,
  Transferencia,
} from '../types/transferencia'

export function getTransferencias() {
  return api.get<Transferencia[]>('/api/Transferencias')
}

export function crearTransferencia(data: CrearTransferencia) {
  return api.post<Transferencia>('/api/Transferencias', data)
}

export function prepararTransferencia(id: number) {
  return api.put<Transferencia>(`/api/Transferencias/${id}/preparar`)
}

export function registrarEnvioTransferencia(id: number, data: RegistrarEnvio) {
  return api.put<Transferencia>(`/api/Transferencias/${id}/enviar`, data)
}

export function confirmarRecepcionTransferencia(id: number, data: ConfirmarRecepcion) {
  return api.put<Transferencia>(`/api/Transferencias/${id}/recibir`, data)
}

export function cancelarTransferencia(id: number) {
  return api.put<Transferencia>(`/api/Transferencias/${id}/cancelar`)
}
