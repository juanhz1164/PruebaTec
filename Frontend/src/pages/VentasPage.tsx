import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getInventarioPorSucursal } from '../api/inventario'
import { getVentas, crearVenta } from '../api/ventas'
import type { InventarioItem } from '../types/inventario'
import type { CrearVentaLinea, Venta } from '../types/venta'
import { ApiError } from '../api/client'

interface LineaForm {
  productoId: number | null
  cantidad: string
  descuento: string
}

function nuevaLinea(): LineaForm {
  return { productoId: null, cantidad: '', descuento: '0' }
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

  const actualizarLinea = (index: number, cambios: Partial<LineaForm>) => {
    setLineas((prev) => prev.map((l, i) => (i === index ? { ...l, ...cambios } : l)))
  }

  const agregarLinea = () => setLineas((prev) => [...prev, nuevaLinea()])

  const quitarLinea = (index: number) =>
    setLineas((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!usuario?.sucursalId) return

    const lineasValidas: CrearVentaLinea[] = []
    for (const linea of lineas) {
      if (!linea.productoId) continue
      const cantidad = Number(linea.cantidad)
      const descuento = Number(linea.descuento || '0')

      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        setError('Cada línea debe tener una cantidad mayor a cero')
        return
      }

      const stock = stockPorProducto.get(linea.productoId)
      if (!stock || cantidad > stock.cantidad) {
        setError(
          `Stock insuficiente para ${stock?.productoNombre ?? 'el producto seleccionado'}: disponible ${stock?.cantidad ?? 0}, solicitado ${cantidad}`,
        )
        return
      }

      lineasValidas.push({ productoId: linea.productoId, cantidad, descuento })
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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((linea, index) => {
              const stock = linea.productoId ? stockPorProducto.get(linea.productoId) : undefined
              const cantidadNum = Number(linea.cantidad)
              const excedeStock =
                stock && Number.isFinite(cantidadNum) && cantidadNum > stock.cantidad
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
                      {inventario.map((item) => (
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
                      step="any"
                      value={linea.cantidad}
                      onChange={(e) => actualizarLinea(index, { cantidad: e.target.value })}
                      className={excedeStock ? 'input-error' : undefined}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      value={linea.descuento}
                      onChange={(e) => actualizarLinea(index, { descuento: e.target.value })}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => quitarLinea(index)}
                      disabled={lineas.length === 1}
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <button type="button" className="secondary-button" onClick={agregarLinea}>
          + Agregar línea
        </button>

        {error && <p className="error-text">{error}</p>}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Registrando...' : 'Registrar venta'}
        </button>
      </form>

      {ultimoComprobante && (
        <div className="comprobante-box">
          <h2>Comprobante {ultimoComprobante.numeroComprobante}</h2>
          <p>Total: {ultimoComprobante.total.toFixed(2)}</p>
          <ul>
            {ultimoComprobante.lineas.map((l) => (
              <li key={l.id}>
                {l.cantidad} × {l.productoNombre} — {l.subtotal.toFixed(2)}
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
                <td>{v.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  )
}
