import { useEffect, useMemo, useState } from 'react'
import { Building2 } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { getInventarioPorSucursal } from '../api/inventario'
import { getSucursales } from '../api/sucursales'
import { KpiTile } from '../components/KpiTile'
import { Pagination } from '../components/Pagination'
import { usePaginacion } from '../hooks/usePaginacion'
import type { InventarioItem } from '../types/inventario'
import type { Sucursal } from '../types/sucursal'
import { ApiError } from '../api/client'

const ITEMS_POR_PAGINA = 15

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

  const { pagina, setPagina, totalPaginas, itemsPagina } = usePaginacion(items, ITEMS_POR_PAGINA)

  const sucursalActual = sucursales.find((s) => s.id === sucursalId)

  const { agotados, stockBajoCount } = useMemo(() => {
    let agotados = 0
    let stockBajoCount = 0
    for (const item of items) {
      if (item.agotado) agotados += 1
      else if (item.cantidad <= item.stockMinimo) stockBajoCount += 1
    }
    return { agotados, stockBajoCount }
  }, [items])

  return (
    <div className="page page-fixed-header">
      <div className="page-header-sticky">
        <div className="admin-section-header">
          <div className="admin-section-heading">
            <h2>Inventario de sucursales</h2>
            <p className="admin-section-subtitle">Consulta el stock de cualquier otra sucursal de la red</p>
          </div>
          <div className="inv-sucursal-selector">
            <Building2 size={15} strokeWidth={2} />
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
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}

        {!isLoading && !error && sucursalId && (
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
          </div>
        )}
      </div>

      <div className="page-scroll-body page-scroll-body--tabla-fija">
        {isLoading && <p>Cargando...</p>}

        {!isLoading && !error && sucursalId && (
          <div className="admin-card admin-card--tabla">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Unidad</th>
                    <th>Stock mínimo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={6}>
                        No hay productos en el inventario de {sucursalActual?.nombre ?? 'esta sucursal'}.
                      </td>
                    </tr>
                  )}
                  {itemsPagina.map((item) => {
                    const stockBajo = !item.agotado && item.cantidad <= item.stockMinimo
                    return (
                      <tr
                        key={`${item.productoId}-${item.id}`}
                        className={item.agotado || stockBajo ? 'row-alert' : undefined}
                      >
                        <td className="celda-mono">{item.productoSku}</td>
                        <td className="celda-principal">{item.productoNombre}</td>
                        <td>{Math.round(item.cantidad)}</td>
                        <td>{item.unidadMedidaAbreviatura}</td>
                        <td>{Math.round(item.stockMinimo)}</td>
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
            <Pagination paginaActual={pagina} totalPaginas={totalPaginas} onCambiarPagina={setPagina} />
          </div>
        )}
      </div>
    </div>
  )
}
