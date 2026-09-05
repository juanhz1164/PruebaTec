import { useEffect, useState } from 'react'
import { getComparativaSucursales } from '../api/dashboard'
import { BarChart } from '../components/BarChart'
import type { ComparativaSucursal } from '../types/dashboard'
import { ApiError } from '../api/client'
import { formatearMoneda } from '../utils/format'

const COLORES_SUCURSAL = ['--chart-gold-1', '--chart-gold-2', '--chart-gold-3', '--chart-gold-4']

export function ComparativaSucursalesPage() {
  const [comparativa, setComparativa] = useState<ComparativaSucursal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    setError(null)
    getComparativaSucursales()
      .then(setComparativa)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar la comparativa')
      })
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="page">
      <h1>Comparativa entre sucursales</h1>

      {isLoading && <p>Cargando...</p>}
      {error && <p className="error-text">{error}</p>}

      {!isLoading && !error && (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Sucursal</th>
                <th>Ventas mes actual</th>
                <th># Ventas</th>
                <th>Valor de inventario</th>
                <th>Productos bajo mínimo</th>
                <th>Transferencias activas</th>
              </tr>
            </thead>
            <tbody>
              {comparativa.length === 0 && (
                <tr>
                  <td colSpan={6}>Sin datos.</td>
                </tr>
              )}
              {comparativa.map((c) => (
                <tr key={c.sucursalId}>
                  <td>{c.sucursalNombre}</td>
                  <td>{formatearMoneda(c.totalVentasMesActual)}</td>
                  <td>{c.cantidadVentasMesActual}</td>
                  <td>{formatearMoneda(c.valorInventarioActual)}</td>
                  <td>{c.productosBajoMinimo}</td>
                  <td>{c.transferenciasActivas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && !error && (
        <>
          <h2>Ventas del mes por sucursal</h2>
          <BarChart
            data={comparativa.map((c, i) => ({
              label: c.sucursalNombre,
              value: c.totalVentasMesActual,
              colorVar: COLORES_SUCURSAL[i % COLORES_SUCURSAL.length],
            }))}
            valueFormatter={(v) => formatearMoneda(v)}
            barWidthRatio={0.4}
          />
        </>
      )}
    </div>
  )
}
