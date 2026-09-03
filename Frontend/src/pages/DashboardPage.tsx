import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import {
  getVentasPorMes,
  getRotacionInventario,
  getTransferenciasActivas,
  getProductosProximosAgotarse,
  getComparativaSucursales,
} from '../api/dashboard'
import { BarChart } from '../components/BarChart'
import { KpiTile } from '../components/KpiTile'
import type {
  ComparativaSucursal,
  ProductoProximoAgotarse,
  RotacionProducto,
  TransferenciaActiva,
  VentasPorMes,
} from '../types/dashboard'
import { ApiError } from '../api/client'

export function DashboardPage() {
  const { usuario } = useAuth()
  const esAdmin = usuario?.rol === 'AdministradorGeneral'

  const [ventasPorMes, setVentasPorMes] = useState<VentasPorMes[]>([])
  const [rotacion, setRotacion] = useState<RotacionProducto[]>([])
  const [transferenciasActivas, setTransferenciasActivas] = useState<TransferenciaActiva[]>([])
  const [proximosAgotarse, setProximosAgotarse] = useState<ProductoProximoAgotarse[]>([])
  const [comparativa, setComparativa] = useState<ComparativaSucursal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    setError(null)

    const sucursalId = usuario?.sucursalId ?? undefined
    const peticiones: Promise<unknown>[] = [
      getVentasPorMes(sucursalId).then(setVentasPorMes),
      getRotacionInventario(sucursalId).then(setRotacion),
      getTransferenciasActivas().then(setTransferenciasActivas),
      getProductosProximosAgotarse(sucursalId).then(setProximosAgotarse),
    ]
    if (esAdmin) {
      peticiones.push(getComparativaSucursales().then(setComparativa))
    }

    Promise.all(peticiones)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar el dashboard')
      })
      .finally(() => setIsLoading(false))
  }, [usuario?.sucursalId, esAdmin])

  if (isLoading) {
    return (
      <div className="page">
        <h1>Dashboard</h1>
        <p>Cargando...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page">
        <h1>Dashboard</h1>
        <p className="error-text">{error}</p>
      </div>
    )
  }

  const mesActual = ventasPorMes[ventasPorMes.length - 1]
  const altaDemanda = rotacion.filter((r) => r.clasificacion === 'Alta demanda').length
  const bajaDemanda = rotacion.filter((r) => r.clasificacion === 'Baja demanda').length
  const totalEnTransito = transferenciasActivas.reduce(
    (sum, t) => sum + t.cantidadTotalEnTransito,
    0,
  )

  return (
    <div className="page">
      <h1>Dashboard{usuario?.sucursalNombre ? ` — ${usuario.sucursalNombre}` : ''}</h1>

      <div className="kpi-row">
        <KpiTile
          label="Ventas del mes"
          value={mesActual ? mesActual.totalVendido.toFixed(2) : '0'}
          sublabel={mesActual ? `${mesActual.cantidadVentas} ventas` : undefined}
        />
        <KpiTile label="Productos alta demanda" value={String(altaDemanda)} />
        <KpiTile
          label="Productos baja demanda"
          value={String(bajaDemanda)}
          tone={bajaDemanda > 0 ? 'warning' : 'neutral'}
        />
        <KpiTile
          label="Transferencias activas"
          value={String(transferenciasActivas.length)}
          sublabel={`${totalEnTransito} unidades en tránsito`}
        />
        <KpiTile
          label="Productos próximos a agotarse"
          value={String(proximosAgotarse.length)}
          tone={proximosAgotarse.length > 0 ? 'critical' : 'neutral'}
        />
      </div>

      <h2>Ventas: mes actual vs. anteriores</h2>
      <BarChart
        data={ventasPorMes.map((v) => ({ label: v.etiquetaMes, value: v.totalVendido }))}
        colorVar="--chart-1"
        valueFormatter={(v) => v.toFixed(0)}
      />

      <h2>Rotación de inventario</h2>
      <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Producto</th>
            <th>Vendido (30 días)</th>
            <th>Stock actual</th>
            <th>Índice de rotación</th>
            <th>Clasificación</th>
          </tr>
        </thead>
        <tbody>
          {rotacion.length === 0 && (
            <tr>
              <td colSpan={6}>Sin datos.</td>
            </tr>
          )}
          {rotacion.map((r) => (
            <tr key={r.productoId}>
              <td>{r.productoSku}</td>
              <td>{r.productoNombre}</td>
              <td>{r.cantidadVendidaUltimos30Dias}</td>
              <td>{r.stockActualTotal}</td>
              <td>{r.indiceRotacion?.toFixed(2) ?? '—'}</td>
              <td>
                <span
                  className={`estado-badge ${r.clasificacion === 'Alta demanda' ? 'estado-2' : r.clasificacion === 'Baja demanda' ? 'estado-warning' : ''}`}
                >
                  {r.clasificacion}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

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

      {esAdmin && (
        <>
          <h2>Comparativa entre sucursales</h2>
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
                  <td>{c.totalVentasMesActual.toFixed(2)}</td>
                  <td>{c.cantidadVentasMesActual}</td>
                  <td>{c.valorInventarioActual.toFixed(2)}</td>
                  <td>{c.productosBajoMinimo}</td>
                  <td>{c.transferenciasActivas}</td>
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
