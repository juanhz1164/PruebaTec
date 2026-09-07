import { useMemo, useState, useEffect } from 'react'
import { getComparativaSucursales } from '../api/dashboard'
import { HorizontalBarChart } from '../components/HorizontalBarChart'
import { DoughnutChart } from '../components/DoughnutChart'
import { KpiTile } from '../components/KpiTile'
import type { ComparativaSucursal } from '../types/dashboard'
import { ApiError } from '../api/client'
import { formatearMoneda } from '../utils/format'
import { crearMapaColoresSucursal } from '../utils/sucursalColor'

type AnalisisTab = 'ventas' | 'inventario' | 'participacion' | 'stockCritico' | 'transferencias'

const TABS: { id: AnalisisTab; label: string }[] = [
  { id: 'ventas', label: 'Ventas' },
  { id: 'inventario', label: 'Inventario' },
  { id: 'participacion', label: 'Participación' },
  { id: 'stockCritico', label: 'Stock crítico' },
  { id: 'transferencias', label: 'Transferencias' },
]

export function ComparativaSucursalesPage() {
  const [comparativa, setComparativa] = useState<ComparativaSucursal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<AnalisisTab>('ventas')

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

  const totalVentas = comparativa.reduce((sum, c) => sum + c.totalVentasMesActual, 0)
  const totalCantidadVentas = comparativa.reduce((sum, c) => sum + c.cantidadVentasMesActual, 0)
  const totalInventario = comparativa.reduce((sum, c) => sum + c.valorInventarioActual, 0)
  const totalTransferencias = comparativa.reduce((sum, c) => sum + c.transferenciasActivas, 0)

  const coloresSucursal = useMemo(
    () => crearMapaColoresSucursal(comparativa.map((c) => c.sucursalNombre)),
    [comparativa],
  )

  const ordenadaPorVentas = [...comparativa].sort((a, b) => b.totalVentasMesActual - a.totalVentasMesActual)
  const ordenadaPorBajoMinimo = [...comparativa].sort((a, b) => b.productosBajoMinimo - a.productosBajoMinimo)

  return (
    <div className="page page-fixed-header">
      <div className="page-header-sticky">
        <h1>Comparación de sucursales</h1>
        <p className="page-subtitle">Analiza el rendimiento y estado del inventario de cada sucursal</p>

        {isLoading && <p>Cargando...</p>}
        {error && <p className="error-text">{error}</p>}
        {!isLoading && !error && comparativa.length === 0 && <p>Sin datos.</p>}

        {!isLoading && !error && comparativa.length > 0 && (
          <>
            <div className="kpi-row">
              <KpiTile icon="dinero" label="Ventas totales" value={formatearMoneda(totalVentas)} />
              <KpiTile icon="ventas" label="Número total de ventas" value={String(totalCantidadVentas)} />
              <KpiTile
                icon="inventario"
                label="Valor total del inventario"
                value={formatearMoneda(totalInventario)}
              />
              <KpiTile
                icon="transferencias"
                label="Transferencias activas"
                value={String(totalTransferencias)}
              />
            </div>

            <h2 className="analisis-sucursal-titulo">Análisis por sucursal</h2>

            <div className="tabs tabs--scroll">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`tab-button ${tab === t.id ? 'tab-button--activo' : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {!isLoading && !error && comparativa.length > 0 && (
        <div className="page-scroll-body">
          <section className="dash-card analisis-sucursal-card">
            <div className="analisis-sucursal-body">
                {tab === 'ventas' && (
                  <>
                    <h3>Ventas por sucursal</h3>
                    <p className="dash-card-hint">Ventas del mes actual, de mayor a menor</p>
                    <HorizontalBarChart
                      data={ordenadaPorVentas.map((c) => ({
                        label: c.sucursalNombre,
                        value: c.totalVentasMesActual,
                        sublabel: `${c.cantidadVentasMesActual} ventas`,
                        colorVar: coloresSucursal[c.sucursalNombre],
                      }))}
                      valueFormatter={(v) => formatearMoneda(v)}
                    />
                  </>
                )}

                {tab === 'inventario' && (
                  <>
                    <h3>Valor del inventario por sucursal</h3>
                    <p className="dash-card-hint">Valor actual del inventario, de mayor a menor</p>
                    <HorizontalBarChart
                      data={comparativa.map((c) => ({
                        label: c.sucursalNombre,
                        value: c.valorInventarioActual,
                        colorVar: coloresSucursal[c.sucursalNombre],
                      }))}
                      valueFormatter={(v) => formatearMoneda(v)}
                    />
                  </>
                )}

                {tab === 'participacion' && (
                  <>
                    <h3>Participación de ventas por sucursal</h3>
                    <p className="dash-card-hint">Porcentaje del total de ventas que aporta cada sucursal</p>
                    <div className="doughnut-chart-wrap">
                      <DoughnutChart
                        data={comparativa.map((c) => ({
                          label: c.sucursalNombre,
                          value: c.totalVentasMesActual,
                          colorVar: coloresSucursal[c.sucursalNombre],
                        }))}
                        valueFormatter={(v) => formatearMoneda(v)}
                        centerValue={formatearMoneda(totalVentas)}
                        centerLabel="Ventas totales"
                      />
                      <ul className="doughnut-legend">
                        {ordenadaPorVentas.map((c) => (
                          <li key={c.sucursalId} className="doughnut-legend-item">
                            <span
                              className="doughnut-legend-dot"
                              style={{ backgroundColor: `var(${coloresSucursal[c.sucursalNombre]})` }}
                            />
                            <span className="doughnut-legend-nombre">{c.sucursalNombre}</span>
                            <span className="doughnut-legend-valor">
                              {totalVentas > 0 ? ((c.totalVentasMesActual / totalVentas) * 100).toFixed(1) : '0.0'}%
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                {tab === 'stockCritico' && (
                  <>
                    <h3>Productos bajo mínimo por sucursal</h3>
                    <p className="dash-card-hint">Sucursales con productos por debajo del stock mínimo</p>
                    <HorizontalBarChart
                      data={ordenadaPorBajoMinimo.map((c) => ({
                        label: c.sucursalNombre,
                        value: c.productosBajoMinimo,
                        colorVar: c.productosBajoMinimo > 0 ? '--status-critical' : '--chart-1',
                      }))}
                      valueFormatter={(v) => String(v)}
                    />
                  </>
                )}

                {tab === 'transferencias' && (
                  <>
                    <h3>Transferencias activas por sucursal</h3>
                    <p className="dash-card-hint">
                      Cantidad de transferencias activas en las que participa cada sucursal
                    </p>
                    <HorizontalBarChart
                      data={[...comparativa]
                        .sort((a, b) => b.transferenciasActivas - a.transferenciasActivas)
                        .map((c) => ({
                          label: c.sucursalNombre,
                          value: c.transferenciasActivas,
                          colorVar: coloresSucursal[c.sucursalNombre],
                        }))}
                      valueFormatter={(v) => String(v)}
                    />
                  </>
                )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
