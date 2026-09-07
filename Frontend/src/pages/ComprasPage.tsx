import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getOrdenesCompra, cambiarEstadoOrdenCompra } from '../api/ordenesCompra'
import { OrdenCompraForm } from '../components/OrdenCompraForm'
import { ESTADO_ORDEN_COMPRA, ESTADO_ORDEN_COMPRA_LABEL } from '../types/ordenCompra'
import type { OrdenCompra } from '../types/ordenCompra'
import { ApiError } from '../api/client'
import { formatearMoneda } from '../utils/format'

const SIGUIENTE_ESTADO: Partial<Record<number, { estado: number; label: string }>> = {
  [ESTADO_ORDEN_COMPRA.Pendiente]: {
    estado: ESTADO_ORDEN_COMPRA.Confirmada,
    label: 'Confirmar',
  },
  [ESTADO_ORDEN_COMPRA.Confirmada]: {
    estado: ESTADO_ORDEN_COMPRA.Recibida,
    label: 'Marcar recibida',
  },
}

export function ComprasPage() {
  const { usuario } = useAuth()
  const esAdmin = usuario?.rol === 'AdministradorGeneral'
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actualizandoId, setActualizandoId] = useState<number | null>(null)

  const cargarOrdenes = useCallback(() => {
    setIsLoading(true)
    setError(null)
    return getOrdenesCompra()
      .then(setOrdenes)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las órdenes')
      })
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    cargarOrdenes()
  }, [cargarOrdenes])

  const cambiarEstado = async (id: number, nuevoEstado: number) => {
    setActualizandoId(id)
    setError(null)
    try {
      await cambiarEstadoOrdenCompra(id, nuevoEstado as OrdenCompra['estado'])
      await cargarOrdenes()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cambiar el estado')
    } finally {
      setActualizandoId(null)
    }
  }

  const cancelar = (id: number) => cambiarEstado(id, ESTADO_ORDEN_COMPRA.Cancelada)

  return (
    <div className="page page-fixed-header">
      <div className="page-header-sticky">
        <h1>Órdenes de compra</h1>
        <OrdenCompraForm onCreada={cargarOrdenes} />
        {error && <p className="error-text">{error}</p>}
      </div>

      <div className="page-scroll-body">
        {isLoading && <p>Cargando...</p>}

        {!isLoading && (
          <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Proveedor</th>
                <th>Sucursal</th>
                <th>Estado</th>
                <th>Total</th>
                {esAdmin && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {ordenes.length === 0 && (
                <tr>
                  <td colSpan={esAdmin ? 6 : 5}>No hay órdenes de compra registradas.</td>
                </tr>
              )}
              {[...ordenes]
                .sort((a, b) => {
                  const pendienteA =
                    a.estado === ESTADO_ORDEN_COMPRA.Pendiente || a.estado === ESTADO_ORDEN_COMPRA.Confirmada
                  const pendienteB =
                    b.estado === ESTADO_ORDEN_COMPRA.Pendiente || b.estado === ESTADO_ORDEN_COMPRA.Confirmada
                  if (pendienteA === pendienteB) return 0
                  return pendienteA ? -1 : 1
                })
                .map((orden) => {
                const siguiente = SIGUIENTE_ESTADO[orden.estado]
                const puedeCancelar =
                  orden.estado === ESTADO_ORDEN_COMPRA.Pendiente ||
                  orden.estado === ESTADO_ORDEN_COMPRA.Confirmada
                return (
                  <tr key={orden.id}>
                    <td>{new Date(orden.fecha).toLocaleDateString()}</td>
                    <td>{orden.proveedorNombre}</td>
                    <td>{orden.sucursalNombre}</td>
                    <td>
                      <span className={`estado-badge estado-${orden.estado}`}>
                        {ESTADO_ORDEN_COMPRA_LABEL[orden.estado]}
                      </span>
                    </td>
                    <td>{formatearMoneda(orden.total)}</td>
                    {esAdmin && (
                      <td>
                        <div className="acciones-cell">
                          {siguiente && (
                            <button
                              type="button"
                              className="success-button"
                              disabled={actualizandoId === orden.id}
                              onClick={() => cambiarEstado(orden.id, siguiente.estado)}
                            >
                              {siguiente.label}
                            </button>
                          )}
                          {puedeCancelar && (
                            <button
                              type="button"
                              className="danger-button tr-linea-quitar"
                              disabled={actualizandoId === orden.id}
                              onClick={() => cancelar(orden.id)}
                              aria-label="Cancelar orden"
                              title="Cancelar orden"
                            >
                              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18" />
                                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}
