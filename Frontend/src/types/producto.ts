export interface UnidadAlternativa {
  id: number
  unidadMedidaId: number
  unidadMedidaNombre: string
  unidadMedidaAbreviatura: string
  factorConversion: number
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
  createdAt: string
  unidadesAlternativas: UnidadAlternativa[]
}
