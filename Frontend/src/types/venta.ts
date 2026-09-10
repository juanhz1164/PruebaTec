export interface VentaLinea {
  id: number
  productoId: number
  productoNombre: string
  productoSku: string
  cantidad: number
  unidadMedidaAbreviatura: string
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
  clienteNombre: string | null
  clienteEmail: string | null
  clienteTelefono: string | null
  subtotal: number
  descuentoTotal: number
  total: number
  fecha: string
  lineas: VentaLinea[]
}

export interface CrearVentaLinea {
  productoId: number
  unidadMedidaId?: number | null
  cantidad: number
  precioUnitario?: number | null
}

export interface CrearVenta {
  sucursalId: number
  usuarioId: number
  clienteNombre?: string | null
  clienteEmail?: string | null
  clienteTelefono?: string | null
  lineas: CrearVentaLinea[]
}
