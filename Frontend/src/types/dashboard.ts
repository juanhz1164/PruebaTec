export interface VentasPorMes {
  anio: number
  mes: number
  etiquetaMes: string
  cantidadVentas: number
  totalVendido: number
}

export interface RotacionProducto {
  productoId: number
  productoNombre: string
  productoSku: string
  cantidadVendidaUltimos30Dias: number
  stockActualTotal: number
  indiceRotacion: number | null
  clasificacion: string
}

export interface TransferenciaActiva {
  transferenciaId: number
  estado: string
  sucursalOrigenNombre: string
  sucursalDestinoNombre: string
  cantidadLineas: number
  cantidadTotalEnTransito: number
}

export interface ProductoProximoAgotarse {
  productoId: number
  productoNombre: string
  productoSku: string
  sucursalId: number
  sucursalNombre: string
  cantidad: number
  stockMinimo: number
}

export interface ComparativaSucursal {
  sucursalId: number
  sucursalNombre: string
  totalVentasMesActual: number
  cantidadVentasMesActual: number
  valorInventarioActual: number
  productosBajoMinimo: number
  transferenciasActivas: number
}
