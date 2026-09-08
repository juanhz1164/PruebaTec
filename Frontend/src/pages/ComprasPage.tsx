import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getOrdenesCompra, cambiarEstadoOrdenCompra } from '../api/ordenesCompra'
import { OrdenCompraForm } from '../components/OrdenCompraForm'
import { ActionsMenu, type AccionMenu } from '../components/ActionsMenu'
import { Modal } from '../components/Modal'
import { KpiTile } from '../components/KpiTile'
import { ESTADO_ORDEN_COMPRA, ESTADO_ORDEN_COMPRA_LABEL } from '../types/ordenCompra'
import type { EstadoOrdenCompra, OrdenCompra } from '../types/ordenCompra'
import { ApiError } from '../api/client'
import { formatearMoneda } from '../utils/format'

// Confirmar (Pendiente -> Confirmada) lo hace el Admin, que aprueba la compra
// a nivel de red. Marcar recibida (Confirmada -> Recibida) lo hace el Gerente
// de la sucursal a la que llega la orden, porque es quien ve llegar la
// mercancía de verdad — el Admin no tiene forma de saberlo.
const SIGUIENTE_ESTADO: Partial<Record<number, { estado: EstadoOrdenCompra; label: string }>> = {
  [ESTADO_ORDEN_COMPRA.Pendiente]: {
    estado: ESTADO_ORDEN_COMPRA.Confirmada,
    label: 'Confirmar',
  },
  [ESTADO_ORDEN_COMPRA.Confirmada]: {
    estado: ESTADO_ORDEN_COMPRA.Recibida,
    label: 'Marcar recibida',
  },
}

const FILTROS_ESTADO: { value: string; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: String(ESTADO_ORDEN_COMPRA.Pendiente), label: ESTADO_ORDEN_COMPRA_LABEL[ESTADO_ORDEN_COMPRA.Pendiente] },
  { value: String(ESTADO_ORDEN_COMPRA.Confirmada), label: ESTADO_ORDEN_COMPRA_LABEL[ESTADO_ORDEN_COMPRA.Confirmada] },
  { value: String(ESTADO_ORDEN_COMPRA.Recibida), label: ESTADO_ORDEN_COMPRA_LABEL[ESTADO_ORDEN_COMPRA.Recibida] },
  { value: String(ESTADO_ORDEN_COMPRA.Cancelada), label: ESTADO_ORDEN_COMPRA_LABEL[ESTADO_ORDEN_COMPRA.Cancelada] },
]

function formatearFecha(fechaIso: string): string {
  return new Date(fechaIso).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function ComprasPage() {
  const { usuario } = useAuth()
  const esAdmin = usuario?.rol === 'AdministradorGeneral'
  const esGerente = usuario?.rol === 'GerenteSucursal'
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actualizandoId, setActualizandoId] = useState<number | null>(null)

  const [mostrarModalOrden, setMostrarModalOrden] = useState(false)
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<OrdenCompra | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  const cargarOrdenes = useCallback(() => {
    setIsLoading(true)
    setError(null)
    return getOrdenesCompra()
      .then((data) => setOrdenes(data.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())))
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las órdenes')
      })
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    cargarOrdenes()
  }, [cargarOrdenes])

  const cambiarEstado = async (id: number, nuevoEstado: EstadoOrdenCompra) => {
    setActualizandoId(id)
    setError(null)
    try {
      await cambiarEstadoOrdenCompra(id, nuevoEstado)
      await cargarOrdenes()
      setOrdenSeleccionada((prev) => (prev && prev.id === id ? { ...prev, estado: nuevoEstado } : prev))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cambiar el estado')
    } finally {
      setActualizandoId(null)
    }
  }

  // El backend no filtra por sucursal en GET /api/OrdenesCompra (trae todas
  // las órdenes de la red); el Admin necesita verlas todas para aprobar
  // compras de cualquier sucursal, pero Gerente/Operador solo deben ver (y
  // contar en sus KPIs) las órdenes de su propia sucursal, igual que ya
  // ocurre en Ventas e Inventario.
  const ordenesVisibles = useMemo(
    () => (esAdmin ? ordenes : ordenes.filter((o) => o.sucursalId === usuario?.sucursalId)),
    [ordenes, esAdmin, usuario?.sucursalId],
  )

  const ordenesPendientes = useMemo(
    () => ordenesVisibles.filter((o) => o.estado === ESTADO_ORDEN_COMPRA.Pendiente).length,
    [ordenesVisibles],
  )
  const ordenesRecibidas = useMemo(
    () => ordenesVisibles.filter((o) => o.estado === ESTADO_ORDEN_COMPRA.Recibida).length,
    [ordenesVisibles],
  )
  const totalComprado = useMemo(
    () =>
      ordenesVisibles
        .filter((o) => o.estado !== ESTADO_ORDEN_COMPRA.Cancelada)
        .reduce((acc, o) => acc + o.total, 0),
    [ordenesVisibles],
  )

  const ordenesFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return ordenesVisibles.filter((o) => {
      const coincideBusqueda =
        !q || o.proveedorNombre.toLowerCase().includes(q) || `#${o.id}`.includes(q) || String(o.id).includes(q)
      const coincideEstado = filtroEstado === '' || String(o.estado) === filtroEstado
      return coincideBusqueda && coincideEstado
    })
  }, [ordenesVisibles, busqueda, filtroEstado])

  const handleOrdenCreada = (orden: OrdenCompra) => {
    setMostrarModalOrden(false)
    cargarOrdenes()
    setOrdenSeleccionada(orden)
  }

  // Puede recibir esta orden puntual: es Gerente Y su sucursal coincide con
  // la sucursal destino de la orden (es quien físicamente la recibe).
  const puedeRecibir = (orden: OrdenCompra) => esGerente && usuario?.sucursalId === orden.sucursalId

  const accionesDisponibles = (orden: OrdenCompra): AccionMenu[] => {
    const acciones: AccionMenu[] = [{ label: 'Ver detalle', onSelect: () => setOrdenSeleccionada(orden) }]

    const siguiente = SIGUIENTE_ESTADO[orden.estado]
    const puedeEjecutarSiguiente = siguiente?.estado === ESTADO_ORDEN_COMPRA.Recibida ? puedeRecibir(orden) : esAdmin
    if (siguiente && puedeEjecutarSiguiente) {
      acciones.push({
        label: siguiente.label,
        tone: 'success',
        disabled: actualizandoId === orden.id,
        onSelect: () => cambiarEstado(orden.id, siguiente.estado),
      })
    }

    const puedeCancelar =
      esAdmin &&
      (orden.estado === ESTADO_ORDEN_COMPRA.Pendiente || orden.estado === ESTADO_ORDEN_COMPRA.Confirmada)
    if (puedeCancelar) {
      acciones.push({
        label: 'Cancelar orden',
        tone: 'danger',
        disabled: actualizandoId === orden.id,
        onSelect: () => cambiarEstado(orden.id, ESTADO_ORDEN_COMPRA.Cancelada),
      })
    }

    return acciones
  }

  return (
    <div className="page page-fixed-header admin-page">
      <div className="page-header-sticky">
        <div className="kpi-row kpi-row--compacta">
          <KpiTile icon="compras" label="Órdenes pendientes" value={String(ordenesPendientes)} />
          <KpiTile icon="inventario" label="Órdenes recibidas" value={String(ordenesRecibidas)} />
          <KpiTile icon="dinero" label="Total comprado" value={formatearMoneda(totalComprado)} />
        </div>

        <div className="admin-section-header">
          <div className="admin-section-heading">
            <h2>Órdenes de compra</h2>
            <p className="admin-section-subtitle">Gestiona las órdenes de compra a proveedores</p>
          </div>
          <button type="button" className="admin-cta-button" onClick={() => setMostrarModalOrden(true)}>
            + Nueva orden de compra
          </button>
        </div>

        <div className="admin-filtros-row">
          <input
            type="search"
            className="admin-search"
            placeholder="Buscar por proveedor o número de orden..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <select
            className="admin-filtro-select"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            {FILTROS_ESTADO.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="error-text">{error}</p>}
      </div>

      <div className="page-scroll-body">
        {isLoading && <p>Cargando...</p>}

        {!isLoading && ordenes.length === 0 && (
          <div className="admin-estado-vacio">
            <p>Aún no hay órdenes de compra.</p>
            <button type="button" className="admin-cta-button" onClick={() => setMostrarModalOrden(true)}>
              + Nueva orden de compra
            </button>
          </div>
        )}

        {!isLoading && ordenes.length > 0 && (
          <div className="admin-card admin-card--tabla">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Orden</th>
                    <th>Proveedor</th>
                    <th>Sucursal</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                    <th>Productos</th>
                    <th className="col-precio">Total</th>
                    <th className="table-actions-col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenesFiltradas.length === 0 && (
                    <tr>
                      <td colSpan={8}>No hay órdenes que coincidan con la búsqueda.</td>
                    </tr>
                  )}
                  {ordenesFiltradas.map((orden) => (
                    <tr key={orden.id}>
                      <td className="celda-mono">#{String(orden.id).padStart(4, '0')}</td>
                      <td className="celda-principal">{orden.proveedorNombre}</td>
                      <td>{orden.sucursalNombre}</td>
                      <td>{formatearFecha(orden.fecha)}</td>
                      <td>
                        <span className={`estado-badge estado-${orden.estado}`}>
                          {ESTADO_ORDEN_COMPRA_LABEL[orden.estado]}
                        </span>
                      </td>
                      <td>{orden.lineas.length}</td>
                      <td className="col-precio">{formatearMoneda(orden.total)}</td>
                      <td className="table-actions-cell">
                        <ActionsMenu acciones={accionesDisponibles(orden)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {mostrarModalOrden && (
        <Modal title="Nueva orden de compra" size="lg" onClose={() => setMostrarModalOrden(false)}>
          <OrdenCompraForm onCreada={handleOrdenCreada} />
        </Modal>
      )}

      {ordenSeleccionada && (
        <Modal
          title={`Orden de compra #${String(ordenSeleccionada.id).padStart(4, '0')}`}
          size="lg"
          onClose={() => setOrdenSeleccionada(null)}
        >
          <div className="venta-detalle-cliente">
            <div>
              <span className="modal-producto-meta">Proveedor</span>
              <p className="modal-producto-nombre">{ordenSeleccionada.proveedorNombre}</p>
            </div>
            <div>
              <span className="modal-producto-meta">Sucursal</span>
              <p className="modal-producto-nombre">{ordenSeleccionada.sucursalNombre}</p>
            </div>
            <div>
              <span className="modal-producto-meta">Fecha</span>
              <p className="modal-producto-nombre">{formatearFecha(ordenSeleccionada.fecha)}</p>
            </div>
            <div>
              <span className="modal-producto-meta">Estado</span>
              <p className="modal-producto-nombre">
                <span className={`estado-badge estado-${ordenSeleccionada.estado}`}>
                  {ESTADO_ORDEN_COMPRA_LABEL[ordenSeleccionada.estado]}
                </span>
              </p>
            </div>
          </div>

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Precio unitario</th>
                  <th>Descuento</th>
                  <th className="col-precio">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {ordenSeleccionada.lineas.map((l) => (
                  <tr key={l.id}>
                    <td className="celda-principal">{l.productoNombre}</td>
                    <td>{l.cantidad}</td>
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
              <span>{formatearMoneda(ordenSeleccionada.lineas.reduce((a, l) => a + l.cantidad * l.precioUnitario, 0))}</span>
            </div>
            <div className="venta-form-resumen-fila">
              <span>Descuento</span>
              <span>
                {formatearMoneda(
                  ordenSeleccionada.lineas.reduce(
                    (a, l) => a + l.cantidad * l.precioUnitario * (l.descuento / 100),
                    0,
                  ),
                )}
              </span>
            </div>
            <div className="venta-form-resumen-fila venta-form-resumen-total">
              <span>Total</span>
              <span>{formatearMoneda(ordenSeleccionada.total)}</span>
            </div>
          </div>

          {(() => {
            const siguiente = SIGUIENTE_ESTADO[ordenSeleccionada.estado]
            const puedeEjecutarSiguiente = siguiente
              ? siguiente.estado === ESTADO_ORDEN_COMPRA.Recibida
                ? puedeRecibir(ordenSeleccionada)
                : esAdmin
              : false
            const puedeCancelar =
              esAdmin &&
              (ordenSeleccionada.estado === ESTADO_ORDEN_COMPRA.Pendiente ||
                ordenSeleccionada.estado === ESTADO_ORDEN_COMPRA.Confirmada)

            if (!puedeEjecutarSiguiente && !puedeCancelar) return null

            return (
              <div className="modal-actions">
                {siguiente && puedeEjecutarSiguiente && (
                  <button
                    type="button"
                    className="success-button"
                    disabled={actualizandoId === ordenSeleccionada.id}
                    onClick={() => cambiarEstado(ordenSeleccionada.id, siguiente.estado)}
                  >
                    {siguiente.label}
                  </button>
                )}
                {puedeCancelar && (
                  <button
                    type="button"
                    className="danger-button"
                    disabled={actualizandoId === ordenSeleccionada.id}
                    onClick={() => cambiarEstado(ordenSeleccionada.id, ESTADO_ORDEN_COMPRA.Cancelada)}
                  >
                    Cancelar orden
                  </button>
                )}
              </div>
            )
          })()}
        </Modal>
      )}
    </div>
  )
}
