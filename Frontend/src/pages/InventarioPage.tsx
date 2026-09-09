import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getInventarioPorSucursal } from '../api/inventario'
import { KpiTile } from '../components/KpiTile'
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

  const { agotados, stockBajoCount, valorTotal } = useMemo(() => {
    let agotados = 0
    let stockBajoCount = 0
    let valorTotal = 0
    for (const item of items) {
      if (item.agotado) agotados += 1
      else if (item.cantidad <= item.stockMinimo) stockBajoCount += 1
      valorTotal += item.cantidad * item.costoPromedio
    }
    return { agotados, stockBajoCount, valorTotal }
  }, [items])

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
        <p className="page-subtitle">Stock disponible en {usuario.sucursalNombre}</p>

        {error && <p className="error-text">{error}</p>}

        {!isLoading && !error && (
          <div className="kpi-row kpi-row--compacta">
            <KpiTile icon="inventario" label="Productos en inventario" value={String(items.length)} />
            <KpiTile
              icon="agotandose"
              label="Stock bajo"
              value={String(stockBajoCount)}
              tone={stockBajoCount > 0 ? 'warning' : 'neutral'}
            />
            <KpiTile
              icon="agotandose"
              label="Agotados"
              value={String(agotados)}
              tone={agotados > 0 ? 'critical' : 'neutral'}
            />
            <KpiTile icon="dinero" label="Valor en inventario" value={formatearMoneda(valorTotal)} />
          </div>
        )}
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
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={7}>No hay productos en el inventario de esta sucursal.</td>
                    </tr>
                  )}
                  {items.map((item) => {
                    const stockBajo = !item.agotado && item.cantidad <= item.stockMinimo
                    return (
                      <tr key={`${item.productoId}-${item.id}`} className={item.agotado || stockBajo ? 'row-alert' : undefined}>
                        <td className="celda-mono">{item.productoSku}</td>
                        <td className="celda-principal">{item.productoNombre}</td>
                        <td>{Math.round(item.cantidad)}</td>
                        <td>{item.unidadMedidaAbreviatura}</td>
                        <td>{Math.round(item.stockMinimo)}</td>
                        <td>{formatearMoneda(item.costoPromedio)}</td>
                        <td>
                          {item.agotado ? (
                            <span className="estado-badge estado-3">Agotado</span>
                          ) : stockBajo ? (
                            <span className="estado-badge estado-0">Stock bajo</span>
                          ) : (
                            <span className="estado-badge estado-badge-ok">Normal</span>
                          )}
                        </td>
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
