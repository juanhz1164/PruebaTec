import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getVentasPorMes, getTransferenciasActivas, getProductosProximosAgotarse } from '../api/dashboard'
import { BarChart } from '../components/BarChart'
import { KpiTile } from '../components/KpiTile'
import type { ProductoProximoAgotarse, TransferenciaActiva, VentasPorMes } from '../types/dashboard'
import { ApiError } from '../api/client'
import { formatearMoneda } from '../utils/format'

export function DashboardPage() {
  const { usuario } = useAuth()
  const esAdmin = usuario?.rol === 'AdministradorGeneral'

  const [ventasPorMes, setVentasPorMes] = useState<VentasPorMes[]>([])
  const [transferenciasActivas, setTransferenciasActivas] = useState<TransferenciaActiva[]>([])
  const [proximosAgotarse, setProximosAgotarse] = useState<ProductoProximoAgotarse[]>([])
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
    ])
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar el dashboard')
      })
      .finally(() => setIsLoading(false))
  }, [usuario?.sucursalId, esAdmin])

  if (isLoading) {
    return (
      <div className="page">
        <h1>Panel general</h1>
        <p>Cargando...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page">
        <h1>Panel general</h1>
        <p className="error-text">{error}</p>
      </div>
    )
  }

  const mesActual = ventasPorMes[ventasPorMes.length - 1]
  const totalEnTransito = transferenciasActivas.reduce(
    (sum, t) => sum + t.cantidadTotalEnTransito,
    0,
  )

  return (
    <div className="page">
      <h1>Panel general{usuario?.sucursalNombre ? ` — ${usuario.sucursalNombre}` : ''}</h1>

      <div className="kpi-row">
        <KpiTile
          icon="dinero"
          label="Ventas del mes"
          value={mesActual ? formatearMoneda(mesActual.totalVendido) : '0'}
          sublabel={mesActual ? `${mesActual.cantidadVentas} ventas` : undefined}
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

      {esAdmin && (
        <>
          <h2>Ventas: mes actual vs. anteriores</h2>
          <BarChart
            data={ventasPorMes.map((v) => ({ label: v.etiquetaMes, value: v.totalVendido }))}
            colorVar="--chart-3"
            valueFormatter={(v) => formatearMoneda(v)}
          />
        </>
      )}
    </div>
  )
}
