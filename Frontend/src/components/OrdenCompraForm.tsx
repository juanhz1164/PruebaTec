import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { getProductos } from '../api/productos'
import { getProveedores } from '../api/proveedores'
import { getSucursales } from '../api/sucursales'
import { crearOrdenCompra } from '../api/ordenesCompra'
import type { Producto } from '../types/producto'
import type { Proveedor } from '../types/proveedor'
import type { Sucursal } from '../types/sucursal'
import type { CrearOrdenCompraLinea, OrdenCompra } from '../types/ordenCompra'
import { ApiError } from '../api/client'
import { formatearMoneda } from '../utils/format'

interface LineaForm {
  productoId: number | null
  cantidad: string
  precioUnitario: string
}

function nuevaLinea(): LineaForm {
  return { productoId: null, cantidad: '', precioUnitario: '' }
}

// % de cuánto más barato compra la tienda al proveedor que su propio precio
// de venta al público (ej. venta $1.000, proveedor $700 → 30%). Es solo
// informativo para quien arma la orden; no afecta el costo registrado.
function calcularDescuentoVsVenta(precioVenta: number, precioUnitario: number): number {
  if (!Number.isFinite(precioVenta) || precioVenta <= 0) return 0
  const descuento = ((precioVenta - precioUnitario) / precioVenta) * 100
  return Math.round(Math.max(0, descuento) * 10) / 10
}

export function OrdenCompraForm({
  onCreada,
  onCancelar,
}: {
  onCreada: (orden: OrdenCompra) => void
  onCancelar?: () => void
}) {
  const { usuario } = useAuth()
  const esAdmin = usuario?.rol === 'AdministradorGeneral'
  const [productos, setProductos] = useState<Producto[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [proveedorId, setProveedorId] = useState<number | null>(null)
  // El Admin no tiene sucursal propia: puede comprar para cualquier sucursal
  // de la red y elige explícitamente a cuál va la orden. Gerente/Operador
  // solo compran para su propia sucursal, como ya ocurría.
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [sucursalId, setSucursalId] = useState<number | null>(usuario?.sucursalId ?? null)
  // El backend requiere PlazoPagoDias en la orden, pero no se le muestra al
  // usuario un control para editarlo (no aporta valor en el flujo actual):
  // se envía siempre este valor fijo.
  const PLAZO_PAGO_DIAS_DEFECTO = 30
  const [lineas, setLineas] = useState<LineaForm[]>([nuevaLinea()])
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    getProductos()
      .then(setProductos)
      .catch(() => setError('No se pudo cargar el catálogo de productos'))
    getProveedores()
      .then((data) => {
        setProveedores(data)
        setProveedorId((current) => current ?? data[0]?.id ?? null)
      })
      .catch(() => setError('No se pudo cargar el listado de proveedores'))
    if (esAdmin) {
      getSucursales()
        .then((data) => {
          setSucursales(data)
          setSucursalId((current) => current ?? data[0]?.id ?? null)
        })
        .catch(() => setError('No se pudo cargar el listado de sucursales'))
    }
  }, [esAdmin])

  // Solo se ofrecen los productos que distribuye el proveedor elegido.
  const productosDelProveedor = useMemo(
    () => productos.filter((p) => p.proveedorId === proveedorId),
    [productos, proveedorId],
  )

  const actualizarLinea = (index: number, cambios: Partial<LineaForm>) => {
    setLineas((prev) => prev.map((l, i) => (i === index ? { ...l, ...cambios } : l)))
  }

  const agregarLinea = () => setLineas((prev) => [...prev, nuevaLinea()])

  // Al cambiar de proveedor, cualquier producto ya elegido que no sea de ese
  // proveedor deja de ser válido: se limpia para evitar enviar una línea con
  // un producto que no corresponde al proveedor de la orden.
  const cambiarProveedor = (nuevoProveedorId: number) => {
    setProveedorId(nuevoProveedorId)
    setLineas((prev) =>
      prev.map((l) => {
        const producto = productos.find((p) => p.id === l.productoId)
        return producto && producto.proveedorId !== nuevoProveedorId
          ? { ...l, productoId: null }
          : l
      }),
    )
  }

  const quitarLinea = (index: number) =>
    setLineas((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))

  const resumen = useMemo(() => {
    return lineas.reduce(
      (acc, linea) => {
        const cantidad = Number(linea.cantidad)
        const precioUnitario = Number(linea.precioUnitario)
        if (!linea.productoId || !Number.isFinite(cantidad) || !Number.isFinite(precioUnitario)) {
          return acc
        }
        const producto = productos.find((p) => p.id === linea.productoId)
        const descuentoPorcentaje = producto
          ? calcularDescuentoVsVenta(producto.precioVenta, precioUnitario)
          : 0
        const subtotalLinea = cantidad * precioUnitario
        const descuentoLinea = subtotalLinea * (descuentoPorcentaje / 100)
        return {
          subtotal: acc.subtotal + subtotalLinea,
          descuento: acc.descuento + descuentoLinea,
          total: acc.total + (subtotalLinea - descuentoLinea),
        }
      },
      { subtotal: 0, descuento: 0, total: 0 },
    )
  }, [lineas, productos])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!sucursalId || !proveedorId) return

    const lineasValidas: CrearOrdenCompraLinea[] = []
    for (const linea of lineas) {
      if (!linea.productoId) continue
      const cantidad = Number(linea.cantidad)
      const precioUnitario = Number(linea.precioUnitario)
      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        setError('Cada línea debe tener una cantidad mayor a cero')
        return
      }
      if (!Number.isFinite(precioUnitario) || precioUnitario < 0) {
        setError('Cada línea debe tener un precio unitario válido')
        return
      }
      const producto = productos.find((p) => p.id === linea.productoId)
      const descuento = producto ? calcularDescuentoVsVenta(producto.precioVenta, precioUnitario) : 0
      lineasValidas.push({
        productoId: linea.productoId,
        cantidad,
        precioUnitario,
        descuento,
      })
    }

    if (lineasValidas.length === 0) {
      setError('Agrega al menos una línea con producto')
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      const orden = await crearOrdenCompra({
        proveedorId,
        sucursalId,
        usuarioId: usuario!.id,
        plazoPagoDias: PLAZO_PAGO_DIAS_DEFECTO,
        lineas: lineasValidas,
      })
      onCreada(orden)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear la orden de compra')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!usuario || (!esAdmin && !usuario.sucursalId)) {
    return null
  }

  return (
    <form className="venta-form venta-form--fija" onSubmit={handleSubmit}>
      <div className="venta-form-seccion venta-form-seccion--fija">
        <h3 className="venta-form-seccion-titulo">Información general</h3>

        <div className="form-row-inline">
          {esAdmin && (
            <div className="form-row">
              <label htmlFor="oc-sucursal">Sucursal a la que se compra</label>
              <select
                id="oc-sucursal"
                value={sucursalId ?? ''}
                onChange={(e) => setSucursalId(Number(e.target.value))}
              >
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-row">
            <label htmlFor="oc-proveedor">Proveedor</label>
            <select
              id="oc-proveedor"
              value={proveedorId ?? ''}
              onChange={(e) => cambiarProveedor(Number(e.target.value))}
            >
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="venta-form-cuerpo">
        <div className="venta-form-seccion venta-form-seccion--productos">
          <div className="venta-form-seccion-header">
            <h3 className="venta-form-seccion-titulo">Productos</h3>
            <button type="button" className="secondary-button btn-sm" onClick={agregarLinea}>
              <Plus size={14} strokeWidth={2.3} />
              Agregar producto
            </button>
          </div>

          <div className="table-scroll venta-form-productos-scroll">
            <table className="data-table lineas-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Precio unitario</th>
                  <th>Descuento</th>
                  <th>Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lineas.map((linea, index) => {
                  const producto = productos.find((p) => p.id === linea.productoId)
                  const cantidadNum = Number(linea.cantidad)
                  const precioUnitarioNum = Number(linea.precioUnitario)
                  const descuentoVsVenta =
                    producto && Number.isFinite(precioUnitarioNum)
                      ? calcularDescuentoVsVenta(producto.precioVenta, precioUnitarioNum)
                      : 0
                  const subtotalLinea =
                    linea.productoId && Number.isFinite(cantidadNum) && Number.isFinite(precioUnitarioNum)
                      ? cantidadNum * precioUnitarioNum
                      : 0
                  return (
                    <tr key={index}>
                      <td>
                        <select
                          value={linea.productoId ?? ''}
                          onChange={(e) => {
                            const nuevoProductoId = Number(e.target.value)
                            const nuevoProducto = productos.find((p) => p.id === nuevoProductoId)
                            actualizarLinea(index, {
                              productoId: nuevoProductoId,
                              precioUnitario: nuevoProducto ? String(nuevoProducto.precioProveedor) : '',
                            })
                          }}
                        >
                          <option value="">Selecciona un producto</option>
                          {productosDelProveedor.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.sku} — {p.nombre}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          value={linea.cantidad}
                          onChange={(e) =>
                            actualizarLinea(index, { cantidad: e.target.value.replace(/[^0-9]/g, '') })
                          }
                          onKeyDown={(e) => {
                            if (e.key === '.' || e.key === ',') e.preventDefault()
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          value={linea.precioUnitario}
                          onChange={(e) =>
                            actualizarLinea(index, { precioUnitario: e.target.value.replace(/[^0-9]/g, '') })
                          }
                          onKeyDown={(e) => {
                            if (e.key === '.' || e.key === ',') e.preventDefault()
                          }}
                        />
                        {producto && (
                          <span className="field-hint">Venta al público: {formatearMoneda(producto.precioVenta)}</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`descuento-badge ${descuentoVsVenta > 0 ? 'descuento-activo' : ''}`}
                        >
                          {descuentoVsVenta}%
                        </span>
                      </td>
                      <td>{subtotalLinea > 0 ? formatearMoneda(subtotalLinea) : '—'}</td>
                      <td>
                        <button
                          type="button"
                          className="lineas-quitar-btn"
                          onClick={() => quitarLinea(index)}
                          disabled={lineas.length === 1}
                          aria-label="Quitar producto"
                          title="Quitar producto"
                        >
                          <Trash2 size={14} strokeWidth={2} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="venta-form-resumen-panel">
          <div className="venta-form-resumen">
            <h4 className="venta-form-resumen-titulo">Resumen de compra</h4>
            <div className="venta-form-resumen-fila">
              <span>Subtotal</span>
              <span>{formatearMoneda(resumen.subtotal)}</span>
            </div>
            <div className="venta-form-resumen-fila">
              <span>Descuento</span>
              <span>{resumen.descuento > 0 ? `- ${formatearMoneda(resumen.descuento)}` : formatearMoneda(0)}</span>
            </div>
            <div className="venta-form-resumen-fila venta-form-resumen-total">
              <span>Total</span>
              <span>{formatearMoneda(resumen.total)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="venta-form-seccion--fija">
        {error && <p className="error-text">{error}</p>}

        <div className="modal-actions venta-form-acciones">
          {onCancelar && (
            <button type="button" className="danger-button" onClick={onCancelar}>
              Cancelar
            </button>
          )}
          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? 'Creando...' : 'Crear orden de compra'}
          </button>
        </div>
      </div>
    </form>
  )
}
