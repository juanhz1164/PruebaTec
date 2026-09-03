export interface VentaLinea {
  id: number
  productoId: number
  productoNombre: string
  productoSku: string
  cantidad: number
  precioUnitario: number
  descuento: number
  subtotal: number
}

export interface Venta {
  id: number
  sucursalId: number
  sucursalNombre: string
  usuarioId: number
  usuarioNombre: string
  numeroComprobante: string
  subtotal: number
  descuentoTotal: number
  total: number
  fecha: string
  lineas: VentaLinea[]
}

export interface CrearVentaLinea {
  productoId: number
  cantidad: number
  precioUnitario?: number | null
  descuento: number
}

export interface CrearVenta {
  sucursalId: number
  usuarioId: number
  lineas: CrearVentaLinea[]
}
