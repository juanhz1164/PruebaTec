import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getVentas } from '../api/ventas'
import { getSucursales } from '../api/sucursales'
import type { Venta } from '../types/venta'
import type { Sucursal } from '../types/sucursal'
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

// Genera una entrada por CADA sucursal activa, aunque no tenga ninguna venta
// este mes (queda en 0), en vez de que su pestaña solo aparezca cuando se
// registre la primera venta.
function agruparPorSucursal(sucursales: Sucursal[], ventas: Venta[]): ResumenSucursal[] {
  const map = new Map<number, ResumenSucursal>()
  for (const sucursal of sucursales) {
    map.set(sucursal.id, {
      sucursalId: sucursal.id,
      sucursalNombre: sucursal.nombre,
      cantidadVentas: 0,
      totalVendido: 0,
      ventas: [],
    })
  }
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
  return Array.from(map.values()).sort((a, b) => a.sucursalNombre.localeCompare(b.sucursalNombre, 'es'))
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
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sucursalTabId, setSucursalTabId] = useState<number | null>(null)

  const cargar = useCallback(() => {
    setIsLoading(true)
    setError(null)
    return Promise.all([getVentas(), getSucursales()])
      .then(([data, sucs]) => {
        setVentas(data.filter((v) => esMesActual(v.fecha)))
        setSucursales(sucs.filter((s) => s.activa))
      })
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

  const resumenPorSucursal = useMemo(
    () => agruparPorSucursal(sucursales, ventas),
    [sucursales, ventas],
  )

  useEffect(() => {
    setSucursalTabId((current) => {
      if (current && resumenPorSucursal.some((r) => r.sucursalId === current)) return current
      return resumenPorSucursal[0]?.sucursalId ?? null
    })
  }, [resumenPorSucursal])

  const resumenActivo = resumenPorSucursal.find((r) => r.sucursalId === sucursalTabId)

  const nombreMes = new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })

  if (!esAdmin) {
    const totalMes = ventasSucursalPropia.reduce((sum, v) => sum + v.total, 0)
    return (
      <div className="page page-fixed-header">
        <div className="page-header-sticky">
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
        </div>

        <div className="page-scroll-body">
          {isLoading && <p>Cargando...</p>}
          {error && <p className="error-text">{error}</p>}
          {!isLoading && !error && <TablaVentas ventas={ventasSucursalPropia} />}
        </div>
      </div>
    )
  }

  const totalGeneral = ventas.reduce((sum, v) => sum + v.total, 0)

  return (
    <div className="page page-fixed-header">
      <div className="page-header-sticky">
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
            <span className="kpi-value">
              {resumenPorSucursal.filter((r) => r.cantidadVentas > 0).length}
            </span>
          </div>
        </div>
      </div>

      {!isLoading && !error && resumenPorSucursal.length > 0 && (
        <div className="tabs">
          {resumenPorSucursal.map((resumen) => (
            <button
              key={resumen.sucursalId}
              type="button"
              className={`tab-button ${sucursalTabId === resumen.sucursalId ? 'tab-button--activo' : ''}`}
              onClick={() => setSucursalTabId(resumen.sucursalId)}
            >
              {resumen.sucursalNombre}
            </button>
          ))}
        </div>
      )}

      <div className="page-scroll-body">
        {isLoading && <p>Cargando...</p>}
        {error && <p className="error-text">{error}</p>}

        {!isLoading && !error && resumenPorSucursal.length === 0 && (
          <p>No hay ventas registradas este mes.</p>
        )}

        {!isLoading && !error && resumenActivo && (
          <section className="reporte-sucursal">
            <h2>
              {resumenActivo.sucursalNombre}
              <span className="reporte-sucursal-total">
                {resumenActivo.cantidadVentas} ventas — {formatearMoneda(resumenActivo.totalVendido)}
              </span>
            </h2>
            <TablaVentas ventas={resumenActivo.ventas} />
          </section>
        )}
      </div>
    </div>
  )
}
