export interface Proveedor {
  id: number
  nombre: string
  contacto: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  activo: boolean
  createdAt: string
}
