export interface UnidadAlternativa {
  id: number
  unidadMedidaId: number
  unidadMedidaNombre: string
  unidadMedidaAbreviatura: string
  factorConversion: number
  precioVenta: number | null
}

export interface Producto {
  id: number
  sku: string
  nombre: string
  descripcion: string | null
  categoria: string | null
  activo: boolean
  unidadMedidaId: number
  unidadMedidaNombre: string
  unidadMedidaAbreviatura: string
  proveedorId: number | null
  proveedorNombre: string | null
  precioVenta: number
  precioProveedor: number
  createdAt: string
  unidadesAlternativas: UnidadAlternativa[]
}

export interface CrearProductoRequest {
  unidadMedidaId: number
  proveedorId: number | null
  sku: string
  nombre: string
  descripcion: string | null
  categoria: string | null
  precioVenta: number
  precioProveedor: number
}

export interface ActualizarProductoRequest extends CrearProductoRequest {
  activo: boolean
}
