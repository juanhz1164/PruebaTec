import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getVentas } from '../api/ventas'
import type { Venta } from '../types/venta'
import { ApiError } from '../api/client'
import { formatearMoneda } from '../utils/format'

function esMesActual(fechaIso: string) {
  const fecha = new Date(fechaIso)
  const ahora = new Date()
  return fecha.getFullYear() === ahora.getFullYear() && fecha.getMonth() === ahora.getMonth()
}

interface ResumenSucursal {
  sucursalId: number
  sucursalNombre: string
  cantidadVentas: number
  totalVendido: number
  ventas: Venta[]
}

function agruparPorSucursal(ventas: Venta[]): ResumenSucursal[] {
  const map = new Map<number, ResumenSucursal>()
  for (const venta of ventas) {
    const actual = map.get(venta.sucursalId)
    if (actual) {
      actual.cantidadVentas += 1
      actual.totalVendido += venta.total
      actual.ventas.push(venta)
    } else {
      map.set(venta.sucursalId, {
        sucursalId: venta.sucursalId,
        sucursalNombre: venta.sucursalNombre,
        cantidadVentas: 1,
        totalVendido: venta.total,
        ventas: [venta],
      })
    }
  }
  return Array.from(map.values()).sort((a, b) => b.totalVendido - a.totalVendido)
}

function TablaVentas({ ventas }: { ventas: Venta[] }) {
  const ordenadas = [...ventas].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
  )
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>Comprobante</th>
            <th>Fecha</th>
            <th>Responsable</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {ordenadas.length === 0 && (
            <tr>
              <td colSpan={4}>No hay ventas registradas este mes.</td>
            </tr>
          )}
          {ordenadas.map((v) => (
            <tr key={v.id}>
              <td>{v.numeroComprobante}</td>
              <td>{new Date(v.fecha).toLocaleString()}</td>
              <td>{v.usuarioNombre}</td>
              <td>{formatearMoneda(v.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ReportesPage() {
  const { usuario } = useAuth()
  const esAdmin = usuario?.rol === 'AdministradorGeneral'

  const [ventas, setVentas] = useState<Venta[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(() => {
    setIsLoading(true)
    setError(null)
    return getVentas()
      .then((data) => setVentas(data.filter((v) => esMesActual(v.fecha))))
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las ventas')
      })
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const ventasSucursalPropia = useMemo(
    () => ventas.filter((v) => v.sucursalId === usuario?.sucursalId),
    [ventas, usuario?.sucursalId],
  )

  const resumenPorSucursal = useMemo(() => agruparPorSucursal(ventas), [ventas])

  const nombreMes = new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })

  if (isLoading) {
    return (
      <div className="page">
        <h1>Reportes del mes</h1>
        <p>Cargando...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page">
        <h1>Reportes del mes</h1>
        <p className="error-text">{error}</p>
      </div>
    )
  }

  if (!esAdmin) {
    const totalMes = ventasSucursalPropia.reduce((sum, v) => sum + v.total, 0)
    return (
      <div className="page">
        <h1>Reportes del mes — {usuario?.sucursalNombre ?? 'Mi sucursal'}</h1>
        <p className="page-subtitle">Historial de ventas de {nombreMes}</p>

        <div className="kpi-row">
          <div className="kpi-tile">
            <span className="kpi-label">Ventas registradas</span>
            <span className="kpi-value">{ventasSucursalPropia.length}</span>
          </div>
          <div className="kpi-tile">
            <span className="kpi-label">Total vendido</span>
            <span className="kpi-value">{formatearMoneda(totalMes)}</span>
          </div>
        </div>

        <TablaVentas ventas={ventasSucursalPropia} />
      </div>
    )
  }

  const totalGeneral = ventas.reduce((sum, v) => sum + v.total, 0)

  return (
    <div className="page">
      <h1>Reportes del mes — Todas las sucursales</h1>
      <p className="page-subtitle">Historial de ventas de {nombreMes}</p>

      <div className="kpi-row">
        <div className="kpi-tile">
          <span className="kpi-label">Ventas registradas</span>
          <span className="kpi-value">{ventas.length}</span>
        </div>
        <div className="kpi-tile">
          <span className="kpi-label">Total vendido (red)</span>
          <span className="kpi-value">{formatearMoneda(totalGeneral)}</span>
        </div>
        <div className="kpi-tile">
          <span className="kpi-label">Sucursales con ventas</span>
          <span className="kpi-value">{resumenPorSucursal.length}</span>
        </div>
      </div>

      {resumenPorSucursal.length === 0 && <p>No hay ventas registradas este mes.</p>}

      {resumenPorSucursal.map((resumen) => (
        <section key={resumen.sucursalId} className="reporte-sucursal">
          <h2>
            {resumen.sucursalNombre}
            <span className="reporte-sucursal-total">
              {resumen.cantidadVentas} ventas — {formatearMoneda(resumen.totalVendido)}
            </span>
          </h2>
          <TablaVentas ventas={resumen.ventas} />
        </section>
      ))}
    </div>
  )
}
