export interface InventarioItem {
  id: number
  productoId: number
  productoNombre: string
  productoSku: string
  unidadMedidaAbreviatura: string
  sucursalId: number
  cantidad: number
  stockMinimo: number
  costoPromedio: number
  updatedAt: string
}
