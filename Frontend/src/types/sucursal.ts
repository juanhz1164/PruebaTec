export interface Sucursal {
  id: number
  nombre: string
  direccion: string | null
  ciudad: string | null
  telefono: string | null
  activa: boolean
  createdAt: string
}

export interface CrearSucursalRequest {
  nombre: string
  direccion: string | null
  ciudad: string | null
  telefono: string | null
}

export interface ActualizarSucursalRequest extends CrearSucursalRequest {
  activa: boolean
}
