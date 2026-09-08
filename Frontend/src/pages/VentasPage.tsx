import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getInventarioPorSucursal } from '../api/inventario'
import { getProductos } from '../api/productos'
import { getVentas } from '../api/ventas'
import { VentaForm } from '../components/VentaForm'
import { ActionsMenu } from '../components/ActionsMenu'
import { Modal } from '../components/Modal'
import { KpiTile } from '../components/KpiTile'
import type { InventarioItem } from '../types/inventario'
import type { Producto } from '../types/producto'
import type { Venta } from '../types/venta'
import { ApiError } from '../api/client'
import { formatearMoneda } from '../utils/format'

function esHoy(fechaIso: string): boolean {
  const fecha = new Date(fechaIso)
  const hoy = new Date()
  return (
    fecha.getFullYear() === hoy.getFullYear() &&
    fecha.getMonth() === hoy.getMonth() &&
    fecha.getDate() === hoy.getDate()
  )
}

function formatearFecha(fechaIso: string): string {
  return new Date(fechaIso).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatearHora(fechaIso: string): string {
  return new Date(fechaIso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

export function VentasPage() {
  const { usuario } = useAuth()
  const [inventario, setInventario] = useState<InventarioItem[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [ventas, setVentas] = useState<Venta[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [mostrarModalVenta, setMostrarModalVenta] = useState(false)
  const [ventaSeleccionada, setVentaSeleccionada] = useState<Venta | null>(null)
  const [busqueda, setBusqueda] = useState('')

  const cargar = useCallback(() => {
    if (!usuario?.sucursalId) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    return Promise.all([getInventarioPorSucursal(usuario.sucursalId), getVentas(), getProductos()])
      .then(([inv, vts, prods]) => {
        setInventario(inv)
        setVentas(
          vts
            .filter((v) => v.sucursalId === usuario.sucursalId)
            .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
        )
        setProductos(prods)
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar la información')
      })
      .finally(() => setIsLoading(false))
  }, [usuario?.sucursalId])

  useEffect(() => {
    cargar()
  }, [cargar])

  const ventasHoy = useMemo(() => ventas.filter((v) => esHoy(v.fecha)), [ventas])
  const totalVendidoHoy = useMemo(() => ventasHoy.reduce((acc, v) => acc + v.total, 0), [ventasHoy])
  const productosVendidosHoy = useMemo(
    () => ventasHoy.reduce((acc, v) => acc + v.lineas.reduce((s, l) => s + l.cantidad, 0), 0),
    [ventasHoy],
  )

  const ventasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return ventas
    return ventas.filter(
      (v) =>
        v.numeroComprobante.toLowerCase().includes(q) ||
        (v.clienteNombre ?? '').toLowerCase().includes(q),
    )
  }, [ventas, busqueda])

  const handleVentaCreada = (venta: Venta) => {
    setMostrarModalVenta(false)
    cargar()
    setVentaSeleccionada(venta)
  }

  if (!usuario?.sucursalId) {
    return (
      <div className="page">
        <h1>Ventas</h1>
        <p>Tu usuario no tiene una sucursal asignada.</p>
      </div>
    )
  }

  return (
    <div className="page page-fixed-header admin-page">
      <div className="page-header-sticky">
        <div className="kpi-row kpi-row--compacta">
          <KpiTile icon="ventas" label="Ventas de hoy" value={String(ventasHoy.length)} />
          <KpiTile icon="dinero" label="Total vendido hoy" value={formatearMoneda(totalVendidoHoy)} />
          <KpiTile icon="inventario" label="Productos vendidos hoy" value={String(productosVendidosHoy)} />
        </div>

        <div className="admin-section-header">
          <div className="admin-section-heading">
            <h2>Ventas — {usuario.sucursalNombre}</h2>
            <p className="admin-section-subtitle">Historial de ventas de la sucursal</p>
          </div>
          <button type="button" className="admin-cta-button" onClick={() => setMostrarModalVenta(true)}>
            + Nueva venta
          </button>
        </div>

        <input
          type="search"
          className="admin-search"
          placeholder="Buscar por comprobante o cliente..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        {error && <p className="error-text">{error}</p>}
      </div>

      <div className="page-scroll-body">
        {isLoading && <p>Cargando...</p>}

        {!isLoading && (
          <div className="admin-card admin-card--tabla">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Comprobante</th>
                    <th>Cliente</th>
                    <th>Fecha</th>
                    <th>Hora</th>
                    <th>Productos</th>
                    <th className="col-precio">Total</th>
                    <th className="table-actions-col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasFiltradas.length === 0 && (
                    <tr>
                      <td colSpan={7}>
                        {ventas.length === 0
                          ? 'No hay ventas registradas en esta sucursal.'
                          : 'No hay ventas que coincidan con la búsqueda.'}
                      </td>
                    </tr>
                  )}
                  {ventasFiltradas.map((v) => (
                    <tr key={v.id}>
                      <td className="celda-mono">{v.numeroComprobante}</td>
                      <td className="celda-principal">{v.clienteNombre ?? '—'}</td>
                      <td>{formatearFecha(v.fecha)}</td>
                      <td>{formatearHora(v.fecha)}</td>
                      <td>{v.lineas.length}</td>
                      <td className="col-precio">{formatearMoneda(v.total)}</td>
                      <td className="table-actions-cell">
                        <ActionsMenu
                          acciones={[{ label: 'Ver detalle', onSelect: () => setVentaSeleccionada(v) }]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {mostrarModalVenta && (
        <Modal title="Nueva venta" size="lg" onClose={() => setMostrarModalVenta(false)}>
          <VentaForm
            sucursalId={usuario.sucursalId}
            usuarioId={usuario.id}
            inventario={inventario}
            productos={productos}
            onCreada={handleVentaCreada}
          />
        </Modal>
      )}

      {ventaSeleccionada && (
        <Modal
          title={`Detalle de venta ${ventaSeleccionada.numeroComprobante}`}
          size="lg"
          onClose={() => setVentaSeleccionada(null)}
        >
          <div className="venta-detalle-cliente">
            <div>
              <span className="modal-producto-meta">Cliente</span>
              <p className="modal-producto-nombre">{ventaSeleccionada.clienteNombre ?? '—'}</p>
            </div>
            <div>
              <span className="modal-producto-meta">Correo</span>
              <p className="modal-producto-nombre">{ventaSeleccionada.clienteEmail ?? '—'}</p>
            </div>
            <div>
              <span className="modal-producto-meta">Teléfono</span>
              <p className="modal-producto-nombre">{ventaSeleccionada.clienteTelefono ?? '—'}</p>
            </div>
            <div>
              <span className="modal-producto-meta">Fecha</span>
              <p className="modal-producto-nombre">
                {formatearFecha(ventaSeleccionada.fecha)} · {formatearHora(ventaSeleccionada.fecha)}
              </p>
            </div>
          </div>

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Precio</th>
                  <th>Descuento</th>
                  <th className="col-precio">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {ventaSeleccionada.lineas.map((l) => (
                  <tr key={l.id}>
                    <td className="celda-principal">{l.productoNombre}</td>
                    <td>
                      {l.cantidad} {l.unidadMedidaAbreviatura}
                    </td>
                    <td>{formatearMoneda(l.precioUnitario)}</td>
                    <td>{l.descuento}%</td>
                    <td className="col-precio">{formatearMoneda(l.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="venta-form-resumen">
            <div className="venta-form-resumen-fila">
              <span>Subtotal</span>
              <span>{formatearMoneda(ventaSeleccionada.subtotal)}</span>
            </div>
            <div className="venta-form-resumen-fila">
              <span>Descuento</span>
              <span>
                {ventaSeleccionada.descuentoTotal > 0
                  ? `- ${formatearMoneda(ventaSeleccionada.descuentoTotal)}`
                  : formatearMoneda(0)}
              </span>
            </div>
            <div className="venta-form-resumen-fila venta-form-resumen-total">
              <span>Total</span>
              <span>{formatearMoneda(ventaSeleccionada.total)}</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
