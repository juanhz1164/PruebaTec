import { useCallback, useEffect, useState } from 'react'
import { getOrdenesCompra, cambiarEstadoOrdenCompra } from '../api/ordenesCompra'
import { OrdenCompraForm } from '../components/OrdenCompraForm'
import { ESTADO_ORDEN_COMPRA, ESTADO_ORDEN_COMPRA_LABEL } from '../types/ordenCompra'
import type { OrdenCompra } from '../types/ordenCompra'
import { ApiError } from '../api/client'

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
    <div className="page">
      <h1>Órdenes de compra</h1>

      <OrdenCompraForm onCreada={cargarOrdenes} />

      {isLoading && <p>Cargando...</p>}
      {error && <p className="error-text">{error}</p>}

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
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ordenes.length === 0 && (
              <tr>
                <td colSpan={6}>No hay órdenes de compra registradas.</td>
              </tr>
            )}
            {ordenes.map((orden) => {
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
                  <td>{orden.total.toFixed(2)}</td>
                  <td className="acciones-cell">
                    {siguiente && (
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={actualizandoId === orden.id}
                        onClick={() => cambiarEstado(orden.id, siguiente.estado)}
                      >
                        {siguiente.label}
                      </button>
                    )}
                    {puedeCancelar && (
                      <button
                        type="button"
                        className="link-button"
                        disabled={actualizandoId === orden.id}
                        onClick={() => cancelar(orden.id)}
                      >
                        Cancelar
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      )}
    </div>
  )
}
