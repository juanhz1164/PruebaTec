export type Rol = 'AdministradorGeneral' | 'GerenteSucursal' | 'OperadorInventario'

export const ROL_LABEL: Record<Rol, string> = {
  AdministradorGeneral: 'Administrador general',
  GerenteSucursal: 'Gerente de sucursal',
  OperadorInventario: 'Operador de inventario',
}

// El backend serializa el enum RolUsuario como número (0/1/2) en el JSON del login,
// no como el nombre del enum. Este mapa normaliza ambas formas al string canónico
// que usa el resto del frontend (menús, ProtectedRoute, badges de rol, etc.).
const ROL_POR_INDICE: Rol[] = ['AdministradorGeneral', 'GerenteSucursal', 'OperadorInventario']

export function normalizarRol(valor: Rol | number): Rol {
  if (typeof valor === 'number') {
    return ROL_POR_INDICE[valor] ?? 'OperadorInventario'
  }
  return valor
}

// Inverso de normalizarRol: el backend espera el índice numérico del enum
// RolUsuario al crear/actualizar un usuario, no el nombre del rol.
export function rolAIndice(rol: Rol): number {
  return ROL_POR_INDICE.indexOf(rol)
}

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

export interface CrearUsuarioRequest {
  sucursalId: number | null
  nombre: string
  email: string
  password: string
  rol: Rol
}

export interface ActualizarUsuarioRequest {
  sucursalId: number | null
  nombre: string
  email: string
  rol: Rol
  activo: boolean
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
