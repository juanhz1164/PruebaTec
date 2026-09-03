export const ESTADO_ORDEN_COMPRA = {
  Pendiente: 0,
  Confirmada: 1,
  Recibida: 2,
  Cancelada: 3,
} as const

export type EstadoOrdenCompra = (typeof ESTADO_ORDEN_COMPRA)[keyof typeof ESTADO_ORDEN_COMPRA]

export const ESTADO_ORDEN_COMPRA_LABEL: Record<EstadoOrdenCompra, string> = {
  [ESTADO_ORDEN_COMPRA.Pendiente]: 'Pendiente',
  [ESTADO_ORDEN_COMPRA.Confirmada]: 'Confirmada',
  [ESTADO_ORDEN_COMPRA.Recibida]: 'Recibida',
  [ESTADO_ORDEN_COMPRA.Cancelada]: 'Cancelada',
}

export interface OrdenCompraLinea {
  id: number
  productoId: number
  productoNombre: string
  productoSku: string
  cantidad: number
  precioUnitario: number
  descuento: number
  subtotal: number
}

export interface OrdenCompra {
  id: number
  proveedorId: number
  proveedorNombre: string
  sucursalId: number
  sucursalNombre: string
  usuarioId: number
  usuarioNombre: string
  estado: EstadoOrdenCompra
  plazoPagoDias: number
  fecha: string
  fechaRecepcion: string | null
  lineas: OrdenCompraLinea[]
  total: number
}

export interface CrearOrdenCompraLinea {
  productoId: number
  cantidad: number
  precioUnitario: number
  descuento: number
}

export interface CrearOrdenCompra {
  proveedorId: number
  sucursalId: number
  usuarioId: number
  plazoPagoDias: number
  lineas: CrearOrdenCompraLinea[]
}
