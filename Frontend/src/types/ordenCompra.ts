export const ESTADO_ORDEN_COMPRA = {
  Pendiente: 0,
  Confirmada: 1,
  Recibida: 2,
  Cancelada: 3,
} as const

export type EstadoOrdenCompra = (typeof ESTADO_ORDEN_COMPRA)[keyof typeof ESTADO_ORDEN_COMPRA]

// Los nombres del enum (Pendiente/Confirmada) reflejan la transición real en
// el backend, pero de cara al usuario se muestran como lo que significan en
// el flujo físico de la compra: "Pendiente por confirmar" (nadie la ha
// aprobado) y "Pendiente de recibir" (ya aprobada, esperando que llegue a la
// sucursal) — ambas se resaltan en el mismo tono de "atención" para no
// confundirlas con un estado ya cerrado (Recibida/Cancelada).
export const ESTADO_ORDEN_COMPRA_LABEL: Record<EstadoOrdenCompra, string> = {
  [ESTADO_ORDEN_COMPRA.Pendiente]: 'Pendiente por confirmar',
  [ESTADO_ORDEN_COMPRA.Confirmada]: 'Pendiente de recibir',
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
