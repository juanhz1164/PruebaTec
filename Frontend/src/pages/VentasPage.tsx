import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getInventarioPorSucursal } from '../api/inventario'
import { getProductos } from '../api/productos'
import { getVentas, crearVenta } from '../api/ventas'
import type { InventarioItem } from '../types/inventario'
import type { Producto } from '../types/producto'
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

const SKU_CAJA_LAPICEROS = 'PROD-009'

// Descuento automático por volumen, tope 15%. Debe coincidir con
// VentaService.CalcularDescuentoPorCantidad en el backend, que es quien
// realmente lo aplica: esto solo es para la vista previa antes de enviar.
// Se calcula sobre la SUMA de unidades de todos los productos "normales" de
// la venta (no por línea individual), excepto "Caja de lapiceros", que usa
// su propia escala (ver calcularDescuentoPorCajas).
function calcularDescuentoGeneral(cantidadTotal: number): number {
  if (!Number.isFinite(cantidadTotal)) return 0
  if (cantidadTotal >= 40) return 15
  if (cantidadTotal >= 30) return 10
  if (cantidadTotal >= 20) return 5
  return 0
}

// Descuento por cantidad de CAJAS de lapiceros (no de lapiceros sueltos), ya
// que cada caja ya trae 12. Debe coincidir con VentaService.CalcularDescuentoPorCajas.
function calcularDescuentoPorCajas(cantidadCajas: number): number {
  if (!Number.isFinite(cantidadCajas)) return 0
  if (cantidadCajas >= 8) return 15
  if (cantidadCajas >= 5) return 10
  if (cantidadCajas >= 2) return 5
  return 0
}

export function VentasPage() {
  const { usuario } = useAuth()
  const [inventario, setInventario] = useState<InventarioItem[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
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
    return Promise.all([getInventarioPorSucursal(usuario.sucursalId), getVentas(), getProductos()])
      .then(([inv, vts, prods]) => {
        setInventario(inv)
        setVentas(vts.filter((v) => v.sucursalId === usuario.sucursalId))
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

  const stockPorProducto = useMemo(() => {
    const map = new Map<number, InventarioItem>()
    for (const item of inventario) map.set(item.productoId, item)
    return map
  }, [inventario])

  const inventarioOrdenado = useMemo(
    () => [...inventario].sort((a, b) => a.productoNombre.localeCompare(b.productoNombre, 'es')),
    [inventario],
  )

  const productoPorId = useMemo(() => {
    const map = new Map<number, Producto>()
    for (const p of productos) map.set(p.id, p)
    return map
  }, [productos])

  // Precio unitario estimado para la vista previa en vivo: el precio de venta
  // fijo del producto (el mismo que usa el backend por defecto al registrar
  // la venta), no el costo promedio de inventario.
  const precioUnitarioEstimado = (productoId: number) => productoPorId.get(productoId)?.precioVenta ?? 0

  const actualizarLinea = (index: number, cambios: Partial<LineaForm>) => {
    setLineas((prev) => prev.map((l, i) => (i === index ? { ...l, ...cambios } : l)))
  }

  const agregarLinea = () => setLineas((prev) => [...prev, nuevaLinea()])

  const esLineaCaja = (productoId: number | null) =>
    productoId !== null && stockPorProducto.get(productoId)?.productoSku === SKU_CAJA_LAPICEROS

  // Cantidad total de las líneas "normales" (todo excepto cajas de
  // lapiceros): define el % de descuento general que aplica a esas líneas.
  const cantidadTotalGeneral = useMemo(() => {
    return lineas.reduce((acc, linea) => {
      if (!linea.productoId || esLineaCaja(linea.productoId)) return acc
      const cantidad = Number(linea.cantidad)
      return Number.isFinite(cantidad) && cantidad > 0 ? acc + cantidad : acc
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineas, inventario])

  const descuentoGeneral = calcularDescuentoGeneral(cantidadTotalGeneral)

  const totalEnVivo = useMemo(() => {
    return lineas.reduce((acc, linea) => {
      if (!linea.productoId) return acc
      const cantidad = Number(linea.cantidad)
      if (!Number.isFinite(cantidad) || cantidad <= 0) return acc
      const precioUnitario = precioUnitarioEstimado(linea.productoId)
      const descuento = esLineaCaja(linea.productoId)
        ? calcularDescuentoPorCajas(cantidad)
        : descuentoGeneral
      const subtotalLinea = cantidad * precioUnitario
      return acc + subtotalLinea * (1 - descuento / 100)
    }, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineas, inventario, descuentoGeneral])

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
              const descuento = esLineaCaja(linea.productoId)
                ? calcularDescuentoPorCajas(cantidadNum)
                : descuentoGeneral
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
                      {descuento > 0
                        ? 'Descuento automático aplicado'
                        : esLineaCaja(linea.productoId)
                          ? 'Desde 2 cajas'
                          : 'Desde 20 unidades entre todos los productos'}
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
