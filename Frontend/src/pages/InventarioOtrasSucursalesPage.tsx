import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getInventarioPorSucursal } from '../api/inventario'
import { getSucursales } from '../api/sucursales'
import { getProductosProximosAgotarse } from '../api/dashboard'
import type { InventarioItem } from '../types/inventario'
import type { Sucursal } from '../types/sucursal'
import type { ProductoProximoAgotarse } from '../types/dashboard'
import { ApiError } from '../api/client'

export function InventarioOtrasSucursalesPage() {
  const { usuario } = useAuth()
  const esAdmin = usuario?.rol === 'AdministradorGeneral'
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [sucursalId, setSucursalId] = useState<number | null>(null)
  const [items, setItems] = useState<InventarioItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [proximosAgotarse, setProximosAgotarse] = useState<ProductoProximoAgotarse[]>([])

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

    // El Administrador ve los próximos a agotarse de toda la red (esta es su
    // única pantalla de inventario); Gerente y Operador ya los ven en su
    // propia pantalla "Inventario", así que aquí no hace falta duplicarlo.
    if (esAdmin) {
      getProductosProximosAgotarse().then(setProximosAgotarse).catch(() => {})
    }
  }, [usuario?.sucursalId, esAdmin])

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
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {esAdmin && (
        <>
          <h2>Productos próximos a agotarse</h2>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Producto</th>
                  <th>Sucursal</th>
                  <th>Cantidad</th>
                  <th>Stock mínimo</th>
                </tr>
              </thead>
              <tbody>
                {proximosAgotarse.length === 0 && (
                  <tr>
                    <td colSpan={5}>No hay productos próximos a agotarse.</td>
                  </tr>
                )}
                {proximosAgotarse.map((p) => (
                  <tr key={`${p.productoId}-${p.sucursalId}`} className="row-alert">
                    <td>{p.productoSku}</td>
                    <td>{p.productoNombre}</td>
                    <td>{p.sucursalNombre}</td>
                    <td>{p.cantidad}</td>
                    <td>{p.stockMinimo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
