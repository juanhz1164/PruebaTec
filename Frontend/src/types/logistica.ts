export interface TiempoEnvio {
  transferenciaId: number
  ruta: string
  sucursalOrigenNombre: string
  sucursalDestinoNombre: string
  fechaEnvio: string
  fechaEstimadaLlegada: string | null
  fechaRecepcion: string | null
  diasEstimados: number | null
  diasReales: number | null
  desviacionDias: number | null
  cumplioTiempoEstimado: boolean | null
}

export interface ClasificacionRuta {
  ruta: string
  cantidadTransferencias: number
  prioridadMasFrecuente: number | null
  costoPromedio: number | null
  tiempoPromedioDias: number | null
}

export interface TransferenciaEnCurso {
  id: number
  sucursalOrigenNombre: string
  sucursalDestinoNombre: string
  estado: number
  transportista: string | null
  ruta: string | null
  fechaEnvio: string | null
  fechaEstimadaLlegada: string | null
}

export interface Cumplimiento {
  agrupador: string
  totalTransferenciasCerradas: number
  recibidasCompletas: number
  recibidasParciales: number
  entregasATiempo: number
  entregasTarde: number
  porcentajeCompletas: number
  porcentajeATiempo: number
}
