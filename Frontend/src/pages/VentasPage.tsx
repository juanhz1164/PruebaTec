import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getInventarioPorSucursal } from '../api/inventario'
import { getVentas, crearVenta } from '../api/ventas'
import type { InventarioItem } from '../types/inventario'
import type { CrearVentaLinea, Venta } from '../types/venta'
import { ApiError } from '../api/client'
import { formatearMoneda } from '../utils/format'

interface LineaForm {
  productoId: number | null
  cantidad: string
}

function nuevaLinea(): LineaForm {
  return { productoId: null, cantidad: '' }
}

// Descuento automático por volumen (unidad base), tope 15%. Debe coincidir con
// VentaService.CalcularDescuentoPorCantidad en el backend, que es quien realmente
// lo aplica: esto solo es para mostrarle al usuario una vista previa antes de enviar.
function calcularDescuento(cantidadBase: number): number {
  if (!Number.isFinite(cantidadBase)) return 0
  if (cantidadBase >= 40) return 15
  if (cantidadBase >= 30) return 10
  if (cantidadBase >= 20) return 5
  return 0
}

export function VentasPage() {
  const { usuario } = useAuth()
  const [inventario, setInventario] = useState<InventarioItem[]>([])
  const [ventas, setVentas] = useState<Venta[]>([])
  const [lineas, setLineas] = useState<LineaForm[]>([nuevaLinea()])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [ultimoComprobante, setUltimoComprobante] = useState<Venta | null>(null)

  const cargar = useCallback(() => {
    if (!usuario?.sucursalId) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    return Promise.all([getInventarioPorSucursal(usuario.sucursalId), getVentas()])
      .then(([inv, vts]) => {
        setInventario(inv)
        setVentas(vts.filter((v) => v.sucursalId === usuario.sucursalId))
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar la información')
      })
      .finally(() => setIsLoading(false))
  }, [usuario?.sucursalId])

  useEffect(() => {
    cargar()
  }, [cargar])

  const stockPorProducto = useMemo(() => {
    const map = new Map<number, InventarioItem>()
    for (const item of inventario) map.set(item.productoId, item)
    return map
  }, [inventario])

  const inventarioOrdenado = useMemo(
    () => [...inventario].sort((a, b) => a.productoNombre.localeCompare(b.productoNombre, 'es')),
    [inventario],
  )

  // Precio unitario estimado para la vista previa en vivo (costo promedio del
  // inventario). El precio real y definitivo lo calcula el backend al registrar la venta.
  const precioUnitarioEstimado = (productoId: number) => stockPorProducto.get(productoId)?.costoPromedio ?? 0

  const actualizarLinea = (index: number, cambios: Partial<LineaForm>) => {
    setLineas((prev) => prev.map((l, i) => (i === index ? { ...l, ...cambios } : l)))
  }

  const agregarLinea = () => setLineas((prev) => [...prev, nuevaLinea()])

  const totalEnVivo = useMemo(() => {
    return lineas.reduce((acc, linea) => {
      if (!linea.productoId) return acc
      const cantidad = Number(linea.cantidad)
      if (!Number.isFinite(cantidad) || cantidad <= 0) return acc
      const precioUnitario = precioUnitarioEstimado(linea.productoId)
      const descuento = calcularDescuento(cantidad)
      const subtotalLinea = cantidad * precioUnitario
      return acc + subtotalLinea * (1 - descuento / 100)
    }, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineas, inventario])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!usuario?.sucursalId) return

    const lineasValidas: CrearVentaLinea[] = []
    for (const linea of lineas) {
      if (!linea.productoId) continue
      const cantidad = Number(linea.cantidad)

      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        setError('Cada línea debe tener una cantidad entera mayor a cero')
        return
      }

      const stock = stockPorProducto.get(linea.productoId)
      if (!stock || cantidad > stock.cantidad) {
        setError(
          `Stock insuficiente para ${stock?.productoNombre ?? 'el producto seleccionado'}: disponible ${stock?.cantidad ?? 0}, solicitado ${cantidad}`,
        )
        return
      }

      lineasValidas.push({
        productoId: linea.productoId,
        cantidad,
      })
    }

    if (lineasValidas.length === 0) {
      setError('Agrega al menos una línea con producto')
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      const venta = await crearVenta({
        sucursalId: usuario.sucursalId,
        usuarioId: usuario.id,
        lineas: lineasValidas,
      })
      setUltimoComprobante(venta)
      setLineas([nuevaLinea()])
      cargar()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar la venta')
    } finally {
      setIsSubmitting(false)
    }
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
    <div className="page">
      <h1>Ventas — {usuario.sucursalNombre}</h1>

      <form className="orden-form" onSubmit={handleSubmit}>
        <h2>Registrar venta</h2>

        <table className="data-table lineas-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Stock disponible</th>
              <th>Cantidad</th>
              <th>Descuento %</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((linea, index) => {
              const stock = linea.productoId ? stockPorProducto.get(linea.productoId) : undefined
              const cantidadNum = Number(linea.cantidad)
              const excedeStock =
                stock && Number.isFinite(cantidadNum) && cantidadNum > stock.cantidad
              const descuento = calcularDescuento(cantidadNum)
              const precioUnitario = linea.productoId ? precioUnitarioEstimado(linea.productoId) : 0
              const subtotalLinea =
                linea.productoId && Number.isFinite(cantidadNum) && cantidadNum > 0
                  ? cantidadNum * precioUnitario * (1 - descuento / 100)
                  : 0
              return (
                <tr key={index}>
                  <td>
                    <select
                      value={linea.productoId ?? ''}
                      onChange={(e) =>
                        actualizarLinea(index, { productoId: Number(e.target.value) })
                      }
                    >
                      <option value="">Selecciona un producto</option>
                      {inventarioOrdenado.map((item) => (
                        <option key={item.productoId} value={item.productoId}>
                          {item.productoSku} — {item.productoNombre}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{stock ? `${stock.cantidad} ${stock.unidadMedidaAbreviatura}` : '—'}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={linea.cantidad}
                      onChange={(e) => {
                        const nuevaCantidad = e.target.value.replace(/[.,].*$/, '')
                        actualizarLinea(index, { cantidad: nuevaCantidad })
                      }}
                      onKeyDown={(e) => {
                        if (e.key === '.' || e.key === ',') e.preventDefault()
                      }}
                      className={excedeStock ? 'input-error' : undefined}
                    />
                  </td>
                  <td>
                    <span className={`descuento-badge ${descuento > 0 ? 'descuento-activo' : ''}`}>
                      {descuento}%
                    </span>
                    <span className="field-hint">
                      {descuento > 0 ? 'Descuento automático aplicado' : 'Desde 20 unidades'}
                    </span>
                  </td>
                  <td>{subtotalLinea > 0 ? formatearMoneda(subtotalLinea) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <button type="button" className="secondary-button" onClick={agregarLinea}>
          + Agregar producto
        </button>

        <p className="venta-total-vivo">
          Total: <strong>{formatearMoneda(totalEnVivo)}</strong>
        </p>

        {error && <p className="error-text">{error}</p>}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Registrando...' : 'Registrar venta'}
        </button>
      </form>

      {ultimoComprobante && (
        <div className="comprobante-box">
          <h2>Comprobante {ultimoComprobante.numeroComprobante}</h2>
          <p>Total: {formatearMoneda(ultimoComprobante.total)}</p>
          <ul>
            {ultimoComprobante.lineas.map((l) => (
              <li key={l.id}>
                {l.cantidad} {l.unidadMedidaAbreviatura} × {l.productoNombre} — {formatearMoneda(l.subtotal)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2>Ventas recientes</h2>
      {isLoading && <p>Cargando...</p>}
      {!isLoading && (
        <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Comprobante</th>
              <th>Fecha</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {ventas.length === 0 && (
              <tr>
                <td colSpan={3}>No hay ventas registradas en esta sucursal.</td>
              </tr>
            )}
            {ventas.map((v) => (
              <tr key={v.id}>
                <td>{v.numeroComprobante}</td>
                <td>{new Date(v.fecha).toLocaleString()}</td>
                <td>{formatearMoneda(v.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  )
}
