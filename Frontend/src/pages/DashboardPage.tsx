import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import {
  getVentasPorMes,
  getTransferenciasActivas,
  getProductosProximosAgotarse,
  getRotacionInventario,
} from '../api/dashboard'
import { getFlujoPersonasPorDia, getFlujoPersonasPorMes } from '../api/visitas'
import { VentasPorMesChart } from '../components/VentasPorMesChart'
import { MonthPicker } from '../components/MonthPicker'
import { KpiTile } from '../components/KpiTile'
import type {
  ProductoProximoAgotarse,
  RotacionProducto,
  TransferenciaActiva,
  VentasPorMes,
} from '../types/dashboard'
import type { FlujoPersonasResumen } from '../types/visita'
import { ApiError } from '../api/client'
import { formatearMoneda } from '../utils/format'

// El backend filtra "el día" en hora de Colombia (ver ZonaHorariaColombia),
// así que "hoy" debe calcularse en hora local aquí también — toISOString()
// es UTC y desalinearía el día cerca de la medianoche.
function hoyIso(): string {
  const ahora = new Date()
  const anio = ahora.getFullYear()
  const mes = String(ahora.getMonth() + 1).padStart(2, '0')
  const dia = String(ahora.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

function mesActualIso(): string {
  return hoyIso().slice(0, 7)
}

// "2026-06" -> "jun. 2026": la etiqueta original ("YYYY-MM") se veía
// demasiado larga en el eje X del gráfico de Ventas por mes.
function formatearMesCorto(etiquetaIso: string): string {
  const [anio, mes] = etiquetaIso.split('-')
  const fecha = new Date(Number(anio), Number(mes) - 1, 1)
  return fecha.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })
}

function variacionPorcentual(actual: number, anterior: number): number | null {
  if (anterior === 0) return null
  return ((actual - anterior) / anterior) * 100
}

export function DashboardPage() {
  const { usuario } = useAuth()
  const esAdmin = usuario?.rol === 'AdministradorGeneral'
  const esGerente = usuario?.rol === 'GerenteSucursal'

  const [ventasPorMes, setVentasPorMes] = useState<VentasPorMes[]>([])
  const [mesVentasSeleccionado, setMesVentasSeleccionado] = useState(mesActualIso())
  const [transferenciasActivas, setTransferenciasActivas] = useState<TransferenciaActiva[]>([])
  const [proximosAgotarse, setProximosAgotarse] = useState<ProductoProximoAgotarse[]>([])
  const [rotacion, setRotacion] = useState<RotacionProducto[]>([])
  const [flujoHoy, setFlujoHoy] = useState<FlujoPersonasResumen | null>(null)
  const [flujoMes, setFlujoMes] = useState<FlujoPersonasResumen | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    setError(null)

    const sucursalId = usuario?.sucursalId ?? undefined
    const peticiones: Promise<unknown>[] = [
      getTransferenciasActivas().then(setTransferenciasActivas),
      getProductosProximosAgotarse(sucursalId).then(setProximosAgotarse),
      getRotacionInventario(sucursalId).then(setRotacion),
    ]

    // Solo el Gerente ve "Flujo de personas" en el Panel general (reemplaza
    // ahí a "Alertas de inventario"); Admin y Operador siguen viendo alertas.
    if (esGerente) {
      const ahora = new Date()
      peticiones.push(
        getFlujoPersonasPorDia(hoyIso()).then(setFlujoHoy),
        getFlujoPersonasPorMes(ahora.getFullYear(), ahora.getMonth() + 1).then(setFlujoMes),
      )
    }

    Promise.all(peticiones)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar el dashboard')
      })
      .finally(() => setIsLoading(false))
  }, [usuario?.sucursalId, esAdmin, esGerente])

  useEffect(() => {
    let cancelled = false
    const sucursalId = usuario?.sucursalId ?? undefined
    const anio = Number(mesVentasSeleccionado.slice(0, 4))
    const mes = Number(mesVentasSeleccionado.slice(5, 7))

    getVentasPorMes(sucursalId, anio, mes)
      .then((data) => {
        if (!cancelled) setVentasPorMes(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'No se pudo cargar las ventas por mes')
        }
      })

    return () => {
      cancelled = true
    }
  }, [usuario?.sucursalId, mesVentasSeleccionado])

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
    .slice(0, 3)
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
        </div>

        <div className="kpi-row kpi-row--compacta">
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

      <div className="page-scroll-body page-scroll-body--sin-scroll">
        <div className="dash-grid">
          <section className="dash-card dash-card--principal">
            <h2>Productos más vendidos</h2>
            <p className="dash-card-hint">Últimos 30 días</p>
            {masVendidos.length === 0 ? (
              <p className="chart-empty">Todavía no se ha vendido nada en este período.</p>
            ) : (
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
            )}
          </section>

          <section className="dash-card dash-card--secundaria">
            <div className="dash-card-header-row">
              <h2>Ventas por mes</h2>
              <MonthPicker
                className="dash-mes-selector"
                value={mesVentasSeleccionado}
                max={mesActualIso()}
                onChange={setMesVentasSeleccionado}
              />
            </div>
            <VentasPorMesChart
              data={ventasPorMes.map((v) => ({ label: formatearMesCorto(v.etiquetaMes), value: v.totalVendido }))}
              valueFormatter={(v) => formatearMoneda(v)}
            />
          </section>

          {esGerente ? (
            <section className="dash-card dash-card--lateral">
              <h2>Flujo de personas</h2>
              {!flujoHoy && !flujoMes ? (
                <p className="chart-empty">No hay datos disponibles para este período.</p>
              ) : (
                <div className="dash-flujo-personas">
                  <div className="dash-flujo-personas-item">
                    <span className="dash-flujo-personas-label">Hoy</span>
                    <span className="dash-flujo-personas-valor">
                      {flujoHoy?.totalPersonas ?? 0} personas
                    </span>
                    <span className="dash-flujo-personas-sub">
                      {flujoHoy?.totalVisitas ?? 0} visita{flujoHoy?.totalVisitas === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="dash-flujo-personas-item">
                    <span className="dash-flujo-personas-label">Este mes</span>
                    <span className="dash-flujo-personas-valor">
                      {flujoMes?.totalPersonas ?? 0} personas
                    </span>
                    <span className="dash-flujo-personas-sub">
                      {flujoMes?.totalVisitas ?? 0} visita{flujoMes?.totalVisitas === 1 ? '' : 's'} ·
                      promedio {(flujoMes?.promedioPersonasPorVisita ?? 0).toFixed(2)} por visita
                    </span>
                  </div>
                </div>
              )}
            </section>
          ) : (
            <section className="dash-card dash-card--lateral">
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
          )}
        </div>
      </div>
    </div>
  )
}
