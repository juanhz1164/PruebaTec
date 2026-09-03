export type Rol = 'AdministradorGeneral' | 'GerenteSucursal' | 'OperadorInventario'

export interface Usuario {
  id: number
  sucursalId: number | null
  sucursalNombre: string | null
  nombre: string
  email: string
  rol: Rol
  activo: boolean
  createdAt: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  expiraEn: string
  usuario: Usuario
}
