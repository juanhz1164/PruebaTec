import { api } from './client'
import {
  normalizarRol,
  rolAIndice,
  type ActualizarUsuarioRequest,
  type CrearUsuarioRequest,
  type Usuario,
} from '../types/auth'

export function getUsuarios() {
  return api
    .get<Usuario[]>('/api/Usuarios')
    .then((usuarios) => usuarios.map((u) => ({ ...u, rol: normalizarRol(u.rol) })))
}

export function crearUsuario(data: CrearUsuarioRequest) {
  return api.post<Usuario>('/api/Usuarios', { ...data, rol: rolAIndice(data.rol) })
}

export function actualizarUsuario(id: number, data: ActualizarUsuarioRequest) {
  return api.put<void>(`/api/Usuarios/${id}`, { ...data, rol: rolAIndice(data.rol) })
}

export function eliminarUsuario(id: number) {
  return api.delete<void>(`/api/Usuarios/${id}`)
}
