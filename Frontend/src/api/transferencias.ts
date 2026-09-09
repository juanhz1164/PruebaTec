import { api, ApiError } from './client'
import type {
  ConfirmarRecepcion,
  CrearTransferencia,
  RegistrarEnvio,
  RutaLogistica,
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

// Configuración de logística de la ruta origen→destino (transportista, costo,
// tiempo estimado por defecto). Devuelve null si no hay ninguna configurada
// para ese par de sucursales — en ese caso el formulario de envío pide los
// datos manualmente en vez de inventar un valor.
export async function getRutaLogistica(
  sucursalOrigenId: number,
  sucursalDestinoId: number,
): Promise<RutaLogistica | null> {
  try {
    return await api.get<RutaLogistica>(
      `/api/Transferencias/rutas-logisticas/origen/${sucursalOrigenId}/destino/${sucursalDestinoId}`,
    )
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}
