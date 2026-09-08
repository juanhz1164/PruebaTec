import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getInventarioPorSucursal } from '../api/inventario'
import type { InventarioItem } from '../types/inventario'
import { ApiError } from '../api/client'
import { formatearMoneda } from '../utils/format'

export function InventarioPage() {
  const { usuario } = useAuth()
  const [items, setItems] = useState<InventarioItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargarInventario = useCallback(() => {
    if (!usuario?.sucursalId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    return getInventarioPorSucursal(usuario.sucursalId)
      .then((data) => setItems(data))
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar el inventario')
      })
      .finally(() => setIsLoading(false))
  }, [usuario?.sucursalId])

  useEffect(() => {
    cargarInventario()
  }, [cargarInventario])

  if (!usuario?.sucursalId) {
    return (
      <div className="page">
        <h1>Inventario</h1>
        <p>Tu usuario no tiene una sucursal asignada.</p>
      </div>
    )
  }

  return (
    <div className="page page-fixed-header">
      <div className="page-header-sticky">
        <h1>Inventario</h1>

        {error && <p className="error-text">{error}</p>}
      </div>

      <div className="page-scroll-body page-scroll-body--tabla-fija">
        {isLoading && <p>Cargando...</p>}

        {!isLoading && !error && (
          <div className="admin-card admin-card--tabla">
            <div className="table-scroll table-scroll--sin-padding-inferior">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Unidad</th>
                    <th>Stock mínimo</th>
                    <th>Costo promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={6}>No hay productos en el inventario de esta sucursal.</td>
                    </tr>
                  )}
                  {items.map((item) => {
                    const stockBajo = !item.agotado && item.cantidad <= item.stockMinimo
                    return (
                      <tr key={`${item.productoId}-${item.id}`} className={item.agotado || stockBajo ? 'row-alert' : undefined}>
                        <td>{item.productoSku}</td>
                        <td>{item.productoNombre}</td>
                        <td>
                          {item.cantidad}
                          {item.agotado && <span className="badge-alert">agotado</span>}
                          {stockBajo && <span className="badge-alert">stock bajo</span>}
                        </td>
                        <td>{item.unidadMedidaAbreviatura}</td>
                        <td>{item.stockMinimo}</td>
                        <td>{formatearMoneda(item.costoPromedio)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
