import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getInventarioPorSucursal } from '../api/inventario'
import { getSucursales } from '../api/sucursales'
import type { InventarioItem } from '../types/inventario'
import type { Sucursal } from '../types/sucursal'
import { ApiError } from '../api/client'

export function InventarioOtrasSucursalesPage() {
  const { usuario } = useAuth()
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [sucursalId, setSucursalId] = useState<number | null>(null)
  const [items, setItems] = useState<InventarioItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getSucursales()
      .then((data) => {
        const otras = data.filter((s) => s.id !== usuario?.sucursalId)
        setSucursales(otras)
        setSucursalId((current) => current ?? otras[0]?.id ?? null)
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las sucursales')
      })
  }, [usuario?.sucursalId])

  useEffect(() => {
    if (!sucursalId) {
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    getInventarioPorSucursal(sucursalId)
      .then((data) => {
        if (!cancelled) setItems(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'No se pudo cargar el inventario')
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [sucursalId])

  return (
    <div className="page">
      <h1>Inventario de otras sucursales</h1>

      <label htmlFor="sucursal-select">Sucursal</label>
      <select
        id="sucursal-select"
        value={sucursalId ?? ''}
        onChange={(e) => setSucursalId(Number(e.target.value))}
      >
        {sucursales.length === 0 && <option value="">Sin otras sucursales</option>}
        {sucursales.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nombre}
          </option>
        ))}
      </select>

      {isLoading && <p>Cargando...</p>}
      {error && <p className="error-text">{error}</p>}

      {!isLoading && !error && sucursalId && (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Unidad</th>
                <th>Stock mínimo</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={5}>No hay productos en el inventario de esta sucursal.</td>
                </tr>
              )}
              {items.map((item) => {
                const stockBajo = item.cantidad <= item.stockMinimo
                return (
                  <tr key={item.id} className={stockBajo ? 'row-alert' : undefined}>
                    <td>{item.productoSku}</td>
                    <td>{item.productoNombre}</td>
                    <td>
                      {item.cantidad}
                      {stockBajo && <span className="badge-alert">stock bajo</span>}
                    </td>
                    <td>{item.unidadMedidaAbreviatura}</td>
                    <td>{item.stockMinimo}</td>
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
