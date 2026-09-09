import { useCallback, useEffect, useMemo, useState } from 'react'
import { Building2, FileDown } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { getVentas } from '../api/ventas'
import { getSucursales } from '../api/sucursales'
import { KpiTile } from '../components/KpiTile'
import { Pagination } from '../components/Pagination'
import { usePaginacion } from '../hooks/usePaginacion'
import type { Venta } from '../types/venta'
import type { Sucursal } from '../types/sucursal'
import { ApiError } from '../api/client'
import { formatearMoneda } from '../utils/format'
import { exportarReporteVentasPdf } from '../utils/exportarReportePdf'

const VENTAS_POR_PAGINA = 15

// "2026-09" (valor de <input type="month">) -> límite de meses hacia el futuro.
function mesActualIso(): string {
  const ahora = new Date()
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`
}

function esDelMesSeleccionado(fechaIso: string, mesSeleccionado: string) {
  const fecha = new Date(fechaIso)
  const [anio, mes] = mesSeleccionado.split('-').map(Number)
  return fecha.getFullYear() === anio && fecha.getMonth() + 1 === mes
}

// "2026-09" -> "septiembre de 2026": construye la fecha manualmente (no
// new Date("2026-09")) para no interpretarla como UTC medianoche, que en
// zonas horarias negativas puede mostrar el mes anterior.
function nombreDeMes(mesIso: string): string {
  const [anio, mes] = mesIso.split('-').map(Number)
  return new Date(anio, mes - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
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

function TablaVentas({ ventas, mostrarSucursal }: { ventas: Venta[]; mostrarSucursal?: boolean }) {
  const ordenadas = useMemo(
    () => [...ventas].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
    [ventas],
  )
  const { pagina, setPagina, totalPaginas, itemsPagina } = usePaginacion(ordenadas, VENTAS_POR_PAGINA)

  return (
    <div className="admin-card admin-card--tabla">
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Comprobante</th>
              {mostrarSucursal && <th>Sucursal</th>}
              <th>Fecha</th>
              <th>Responsable</th>
              <th>Cliente</th>
              <th>Correo</th>
              <th>Teléfono</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {ordenadas.length === 0 && (
              <tr>
                <td colSpan={mostrarSucursal ? 8 : 7}>No hay ventas registradas este mes.</td>
              </tr>
            )}
            {itemsPagina.map((v) => (
              <tr key={v.id}>
                <td className="celda-mono">{v.numeroComprobante}</td>
                {mostrarSucursal && <td>{v.sucursalNombre}</td>}
                <td>{new Date(v.fecha).toLocaleString()}</td>
                <td>{v.usuarioNombre}</td>
                <td>{v.clienteNombre ?? '—'}</td>
                <td>{v.clienteEmail ?? '—'}</td>
                <td>{v.clienteTelefono ?? '—'}</td>
                <td className="col-precio">{formatearMoneda(v.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination paginaActual={pagina} totalPaginas={totalPaginas} onCambiarPagina={setPagina} />
    </div>
  )
}

const TODAS_LAS_SUCURSALES = 'todas'

export function ReportesPage() {
  const { usuario } = useAuth()
  const esAdmin = usuario?.rol === 'AdministradorGeneral'

  const [todasLasVentas, setTodasLasVentas] = useState<Venta[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState<number | typeof TODAS_LAS_SUCURSALES>(
    TODAS_LAS_SUCURSALES,
  )
  const [mesSeleccionado, setMesSeleccionado] = useState(mesActualIso())

  const cargar = useCallback(() => {
    setIsLoading(true)
    setError(null)
    return Promise.all([getVentas(), getSucursales()])
      .then(([data, sucs]) => {
        setTodasLasVentas(data)
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

  const ventas = useMemo(
    () => todasLasVentas.filter((v) => esDelMesSeleccionado(v.fecha, mesSeleccionado)),
    [todasLasVentas, mesSeleccionado],
  )

  const ventasSucursalPropia = useMemo(
    () => ventas.filter((v) => v.sucursalId === usuario?.sucursalId),
    [ventas, usuario?.sucursalId],
  )

  const resumenPorSucursal = useMemo(
    () => agruparPorSucursal(sucursales, ventas),
    [sucursales, ventas],
  )

  const resumenActivo =
    sucursalSeleccionada === TODAS_LAS_SUCURSALES
      ? null
      : resumenPorSucursal.find((r) => r.sucursalId === sucursalSeleccionada)

  const nombreMes = nombreDeMes(mesSeleccionado)

  if (!esAdmin) {
    const totalMes = ventasSucursalPropia.reduce((sum, v) => sum + v.total, 0)
    return (
      <div className="page page-fixed-header">
        <div className="page-header-sticky">
          <div className="dash-card-header-row">
            <h2>Reportes del mes</h2>
            <input
              type="month"
              className="dash-mes-selector"
              value={mesSeleccionado}
              max={mesActualIso()}
              onChange={(e) => setMesSeleccionado(e.target.value)}
            />
          </div>
          <p className="page-subtitle">Historial de ventas de {nombreMes}</p>

          <div className="kpi-row kpi-row--compacta">
            <KpiTile icon="reportes" label="Ventas registradas" value={String(ventasSucursalPropia.length)} />
            <KpiTile icon="dinero" label="Total vendido" value={formatearMoneda(totalMes)} />
          </div>
        </div>

        <div className="page-scroll-body page-scroll-body--tabla-fija">
          {isLoading && <p>Cargando...</p>}
          {error && <p className="error-text">{error}</p>}
          {!isLoading && !error && <TablaVentas ventas={ventasSucursalPropia} />}
        </div>
      </div>
    )
  }

  const totalGeneral = ventas.reduce((sum, v) => sum + v.total, 0)

  // Usa exactamente los mismos datos ya filtrados/agregados que se muestran
  // en pantalla para esta selección — sin volver a consultar el backend ni
  // recalcular nada distinto.
  const handleExportarPdf = () => {
    if (sucursalSeleccionada === TODAS_LAS_SUCURSALES) {
      exportarReporteVentasPdf({
        nombreMes,
        sucursalLabel: 'Todas',
        ventas,
        totalVentas: ventas.length,
        totalVendido: totalGeneral,
        mostrarColumnaSucursal: true,
      })
      return
    }

    if (resumenActivo) {
      exportarReporteVentasPdf({
        nombreMes,
        sucursalLabel: resumenActivo.sucursalNombre,
        ventas: resumenActivo.ventas,
        totalVentas: resumenActivo.cantidadVentas,
        totalVendido: resumenActivo.totalVendido,
        mostrarColumnaSucursal: false,
      })
    }
  }

  return (
    <div className="page page-fixed-header">
      <div className="page-header-sticky">
        <div className="admin-section-header">
          <div className="admin-section-heading">
            <h2>Reportes del mes</h2>
            <p className="admin-section-subtitle">Historial de ventas de {nombreMes}</p>
          </div>

          <div className="reporte-header-acciones">
            <input
              type="month"
              className="dash-mes-selector"
              value={mesSeleccionado}
              max={mesActualIso()}
              onChange={(e) => setMesSeleccionado(e.target.value)}
            />

            {!isLoading && !error && resumenPorSucursal.length > 0 && (
              <>
                <div className="inv-sucursal-selector">
                  <Building2 size={15} strokeWidth={2} />
                  <select
                    id="reporte-sucursal"
                    value={sucursalSeleccionada}
                    onChange={(e) =>
                      setSucursalSeleccionada(
                        e.target.value === TODAS_LAS_SUCURSALES ? TODAS_LAS_SUCURSALES : Number(e.target.value),
                      )
                    }
                  >
                    <option value={TODAS_LAS_SUCURSALES}>Todas las sucursales</option>
                    {resumenPorSucursal.map((resumen) => (
                      <option key={resumen.sucursalId} value={resumen.sucursalId}>
                        {resumen.sucursalNombre}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="button" className="secondary-button btn-sm" onClick={handleExportarPdf}>
                  <FileDown size={14} strokeWidth={2.2} />
                  Exportar PDF
                </button>
              </>
            )}
          </div>
        </div>

        <div className="kpi-row kpi-row--compacta">
          <KpiTile icon="reportes" label="Ventas registradas" value={String(ventas.length)} />
          <KpiTile icon="dinero" label="Total vendido (red)" value={formatearMoneda(totalGeneral)} />
          <KpiTile
            icon="sucursales"
            label="Sucursales con ventas"
            value={String(resumenPorSucursal.filter((r) => r.cantidadVentas > 0).length)}
          />
        </div>
      </div>

      <div className="page-scroll-body page-scroll-body--tabla-fija">
        {isLoading && <p>Cargando...</p>}
        {error && <p className="error-text">{error}</p>}

        {!isLoading && !error && resumenPorSucursal.length === 0 && (
          <p>No hay ventas registradas este mes.</p>
        )}

        {!isLoading && !error && sucursalSeleccionada === TODAS_LAS_SUCURSALES && (
          <div className="reporte-sucursal">
            <div className="reporte-sucursal-header">
              <h2>Todas las sucursales</h2>
              <span className="reporte-sucursal-total">
                {ventas.length} ventas — {formatearMoneda(totalGeneral)}
              </span>
            </div>
            <TablaVentas ventas={ventas} mostrarSucursal />
          </div>
        )}

        {!isLoading && !error && resumenActivo && (
          <div className="reporte-sucursal">
            <div className="reporte-sucursal-header">
              <h2>{resumenActivo.sucursalNombre}</h2>
              <span className="reporte-sucursal-total">
                {resumenActivo.cantidadVentas} ventas — {formatearMoneda(resumenActivo.totalVendido)}
              </span>
            </div>
            <TablaVentas ventas={resumenActivo.ventas} />
          </div>
        )}
      </div>
    </div>
  )
}
