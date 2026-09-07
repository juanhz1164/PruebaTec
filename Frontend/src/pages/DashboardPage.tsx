import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import {
  getVentasPorMes,
  getTransferenciasActivas,
  getProductosProximosAgotarse,
  getRotacionInventario,
} from '../api/dashboard'
import { LineChart } from '../components/LineChart'
import { KpiTile } from '../components/KpiTile'
import type {
  ProductoProximoAgotarse,
  RotacionProducto,
  TransferenciaActiva,
  VentasPorMes,
} from '../types/dashboard'
import { ApiError } from '../api/client'
import { formatearMoneda } from '../utils/format'

function variacionPorcentual(actual: number, anterior: number): number | null {
  if (anterior === 0) return null
  return ((actual - anterior) / anterior) * 100
}

export function DashboardPage() {
  const { usuario } = useAuth()
  const esAdmin = usuario?.rol === 'AdministradorGeneral'

  const [ventasPorMes, setVentasPorMes] = useState<VentasPorMes[]>([])
  const [transferenciasActivas, setTransferenciasActivas] = useState<TransferenciaActiva[]>([])
  const [proximosAgotarse, setProximosAgotarse] = useState<ProductoProximoAgotarse[]>([])
  const [rotacion, setRotacion] = useState<RotacionProducto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    setError(null)

    const sucursalId = usuario?.sucursalId ?? undefined
    Promise.all([
      getVentasPorMes(sucursalId).then(setVentasPorMes),
      getTransferenciasActivas().then(setTransferenciasActivas),
      getProductosProximosAgotarse(sucursalId).then(setProximosAgotarse),
      getRotacionInventario(sucursalId).then(setRotacion),
    ])
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar el dashboard')
      })
      .finally(() => setIsLoading(false))
  }, [usuario?.sucursalId, esAdmin])

  if (isLoading) {
    return (
      <div className="page page-fixed-header">
        <div className="page-scroll-body">
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page page-fixed-header">
        <div className="page-scroll-body">
          <p className="error-text">{error}</p>
        </div>
      </div>
    )
  }

  const mesActual = ventasPorMes[ventasPorMes.length - 1]
  const mesAnterior = ventasPorMes.length > 1 ? ventasPorMes[ventasPorMes.length - 2] : undefined
  const variacionVentas = mesActual && mesAnterior
    ? variacionPorcentual(mesActual.totalVendido, mesAnterior.totalVendido)
    : null

  const totalEnTransito = transferenciasActivas.reduce(
    (sum, t) => sum + t.cantidadTotalEnTransito,
    0,
  )

  const masVendidos = [...rotacion]
    .sort((a, b) => b.cantidadVendidaUltimos30Dias - a.cantidadVendidaUltimos30Dias)
    .filter((r) => r.cantidadVendidaUltimos30Dias > 0)
    .slice(0, 5)
  const maxVendido = masVendidos[0]?.cantidadVendidaUltimos30Dias ?? 1

  const alertasInventario = [...proximosAgotarse]
    .sort((a, b) => a.cantidad - b.cantidad)
    .slice(0, 6)

  return (
    <div className="page page-fixed-header">
      <div className="page-header-sticky">
        <div className="dash-header">
          <p className="page-subtitle">
            Resumen del estado del inventario y las ventas
            {esAdmin ? ' en todas las sucursales' : usuario?.sucursalNombre ? ` — ${usuario.sucursalNombre}` : ''}
          </p>
          <span className="dash-rol-chip">{esAdmin ? 'Admin General' : usuario?.sucursalNombre}</span>
        </div>

        <div className="kpi-row">
          <KpiTile
            icon="dinero"
            label="Ventas del mes"
            value={mesActual ? formatearMoneda(mesActual.totalVendido) : '0'}
            sublabel={
              mesActual
                ? `${mesActual.cantidadVentas} ventas${
                    variacionVentas !== null
                      ? ` · ${variacionVentas >= 0 ? '+' : ''}${variacionVentas.toFixed(1)}% vs. mes anterior`
                      : ''
                  }`
                : undefined
            }
          />
          <KpiTile
            icon="transferencias"
            label="Transferencias activas"
            value={String(transferenciasActivas.length)}
            sublabel={`${totalEnTransito} unidades en tránsito`}
          />
          <KpiTile
            icon="agotandose"
            label="Productos próximos a agotarse"
            value={String(proximosAgotarse.length)}
            tone={proximosAgotarse.length > 0 ? 'critical' : 'neutral'}
          />
        </div>
      </div>

      <div className="page-scroll-body">
        <div className="dash-grid">
          <section className="dash-card dash-card--wide">
            <h2>Ventas por mes</h2>
            <LineChart
              data={ventasPorMes.map((v) => ({ label: v.etiquetaMes, value: v.totalVendido }))}
              valueFormatter={(v) => formatearMoneda(v)}
              colorVar="--chart-3"
            />
          </section>

          <section className="dash-card">
            <h2>Alertas de inventario</h2>
            {alertasInventario.length === 0 ? (
              <p className="chart-empty">No hay productos próximos a agotarse.</p>
            ) : (
              <ul className="dash-alertas-list">
                {alertasInventario.map((p) => {
                  const critico = p.cantidad <= p.stockMinimo / 2
                  return (
                    <li key={`${p.productoId}-${p.sucursalId}`} className="dash-alerta-item">
                      <span className={`dash-alerta-dot ${critico ? 'dash-alerta-dot--critico' : 'dash-alerta-dot--alerta'}`} />
                      <div className="dash-alerta-info">
                        <span className="dash-alerta-nombre">{p.productoNombre}</span>
                        <span className="dash-alerta-detalle">
                          {p.sucursalNombre} · Stock: {p.cantidad} / Mínimo: {p.stockMinimo}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {masVendidos.length > 0 && (
            <section className="dash-card">
              <h2>Productos más vendidos</h2>
              <p className="dash-card-hint">Últimos 30 días</p>
              <ul className="dash-ranking-list">
                {masVendidos.map((p, i) => (
                  <li key={p.productoId} className="dash-ranking-item">
                    <span className="dash-ranking-pos">{i + 1}</span>
                    <div className="dash-ranking-bar-wrap">
                      <span className="dash-ranking-nombre">{p.productoNombre}</span>
                      <div className="dash-ranking-bar-track">
                        <div
                          className="dash-ranking-bar-fill"
                          style={{ width: `${(p.cantidadVendidaUltimos30Dias / maxVendido) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="dash-ranking-valor">
                      {p.cantidadVendidaUltimos30Dias.toFixed(0)} u.
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
