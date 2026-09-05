import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getInventarioPorSucursal } from '../api/inventario'
import { getProductosProximosAgotarse } from '../api/dashboard'
import { MovimientoForm } from '../components/MovimientoForm'
import type { InventarioItem } from '../types/inventario'
import type { ProductoProximoAgotarse } from '../types/dashboard'
import { ApiError } from '../api/client'
import { formatearMoneda } from '../utils/format'

export function InventarioPage() {
  const { usuario } = useAuth()
  const [items, setItems] = useState<InventarioItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [proximosAgotarse, setProximosAgotarse] = useState<ProductoProximoAgotarse[]>([])

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

  useEffect(() => {
    if (!usuario?.sucursalId) return
    getProductosProximosAgotarse(usuario.sucursalId).then(setProximosAgotarse).catch(() => {})
  }, [usuario?.sucursalId])

  if (!usuario?.sucursalId) {
    return (
      <div className="page">
        <h1>Inventario</h1>
        <p>Tu usuario no tiene una sucursal asignada.</p>
      </div>
    )
  }

  return (
    <div className="page">
      <h1>Inventario — {usuario.sucursalNombre}</h1>

      <MovimientoForm onRegistrado={cargarInventario} />

      {isLoading && <p>Cargando...</p>}
      {error && <p className="error-text">{error}</p>}

      {!isLoading && !error && (
        <div className="table-scroll">
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
      )}

      <h2>Productos próximos a agotarse</h2>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Stock mínimo</th>
            </tr>
          </thead>
          <tbody>
            {proximosAgotarse.length === 0 && (
              <tr>
                <td colSpan={4}>No hay productos próximos a agotarse.</td>
              </tr>
            )}
            {proximosAgotarse.map((p) => (
              <tr key={p.productoId} className="row-alert">
                <td>{p.productoSku}</td>
                <td>{p.productoNombre}</td>
                <td>{p.cantidad}</td>
                <td>{p.stockMinimo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
