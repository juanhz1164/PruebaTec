import { useMemo, useState, type FormEvent } from 'react'
import { crearVenta } from '../api/ventas'
import { ApiError } from '../api/client'
import { formatearMoneda } from '../utils/format'
import type { InventarioItem } from '../types/inventario'
import type { Producto } from '../types/producto'
import type { CrearVentaLinea, Venta } from '../types/venta'

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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function VentaForm({
  sucursalId,
  usuarioId,
  inventario,
  productos,
  onCreada,
}: {
  sucursalId: number
  usuarioId: number
  inventario: InventarioItem[]
  productos: Producto[]
  onCreada: (venta: Venta) => void
}) {
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteEmail, setClienteEmail] = useState('')
  const [clienteTelefono, setClienteTelefono] = useState('')
  const [lineas, setLineas] = useState<LineaForm[]>([nuevaLinea()])
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  const quitarLinea = (index: number) =>
    setLineas((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))

  const esLineaCaja = (productoId: number | null) =>
    productoId !== null && stockPorProducto.get(productoId)?.productoSku === SKU_CAJA_LAPICEROS

  // Cantidad total de las líneas "normales" (todo excepto cajas de
  // lapiceros): define el % de descuento general que aplica a esas líneas.
  const cantidadTotalGeneral = useMemo(() => {
    return lineas.reduce((acc, linea) => {
      if (!linea.productoId || esLineaCaja(linea.productoId)) return acc
      const cantidad = Number(linea.cantidad)
      return Number.isFinite(cantidad) && cantidad > 0 ? acc + cantidad : acc
    }, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineas, inventario])

  const descuentoGeneral = calcularDescuentoGeneral(cantidadTotalGeneral)

  const resumen = useMemo(() => {
    return lineas.reduce(
      (acc, linea) => {
        if (!linea.productoId) return acc
        const cantidad = Number(linea.cantidad)
        if (!Number.isFinite(cantidad) || cantidad <= 0) return acc
        const precioUnitario = precioUnitarioEstimado(linea.productoId)
        const descuento = esLineaCaja(linea.productoId)
          ? calcularDescuentoPorCajas(cantidad)
          : descuentoGeneral
        const subtotalLinea = cantidad * precioUnitario
        const descuentoLinea = subtotalLinea * (descuento / 100)
        return {
          subtotal: acc.subtotal + subtotalLinea,
          descuento: acc.descuento + descuentoLinea,
          total: acc.total + (subtotalLinea - descuentoLinea),
        }
      },
      { subtotal: 0, descuento: 0, total: 0 },
      // eslint-disable-next-line react-hooks/exhaustive-deps
    )
  }, [lineas, inventario, descuentoGeneral])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    if (!clienteNombre.trim()) {
      setError('El nombre del cliente es obligatorio')
      return
    }

    if (clienteEmail.trim() && !EMAIL_REGEX.test(clienteEmail.trim())) {
      setError('El correo electrónico no tiene un formato válido')
      return
    }

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

      lineasValidas.push({ productoId: linea.productoId, cantidad })
    }

    if (lineasValidas.length === 0) {
      setError('Agrega al menos una línea con producto')
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      const venta = await crearVenta({
        sucursalId,
        usuarioId,
        clienteNombre: clienteNombre.trim(),
        clienteEmail: clienteEmail.trim() || null,
        clienteTelefono: clienteTelefono.trim() || null,
        lineas: lineasValidas,
      })
      onCreada(venta)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar la venta')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="venta-form venta-form--fija" onSubmit={handleSubmit}>
      <div className="venta-form-seccion venta-form-seccion--fija">
        <h3 className="venta-form-seccion-titulo">Datos del cliente</h3>
        <div className="form-row-inline">
          <div className="form-row">
            <label htmlFor="venta-cliente-nombre">Nombre completo</label>
            <input
              id="venta-cliente-nombre"
              value={clienteNombre}
              onChange={(e) => setClienteNombre(e.target.value)}
              placeholder="Nombre del cliente"
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="venta-cliente-email">Correo electrónico</label>
            <input
              id="venta-cliente-email"
              type="email"
              value={clienteEmail}
              onChange={(e) => setClienteEmail(e.target.value)}
              placeholder="cliente@correo.com"
            />
          </div>
          <div className="form-row">
            <label htmlFor="venta-cliente-telefono">Teléfono</label>
            <input
              id="venta-cliente-telefono"
              type="tel"
              inputMode="numeric"
              value={clienteTelefono}
              onChange={(e) => setClienteTelefono(e.target.value.replace(/\D/g, ''))}
              placeholder="3000000000"
            />
          </div>

          <div className="venta-form-resumen venta-form-resumen--compacto">
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

      <div className="venta-form-seccion venta-form-seccion--productos">
        <div className="venta-form-seccion-header venta-form-seccion--fija">
          <h3 className="venta-form-seccion-titulo">Productos</h3>
          <button type="button" className="secondary-button" onClick={agregarLinea}>
            + Agregar producto
          </button>
        </div>

        <div className="table-scroll venta-form-productos-scroll">
          <table className="data-table lineas-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Stock</th>
                <th>Cant.</th>
                <th>Precio</th>
                <th>Desc.</th>
                <th>Subtotal</th>
                <th></th>
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
                        onChange={(e) => actualizarLinea(index, { productoId: Number(e.target.value) })}
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
                    <td>{linea.productoId ? formatearMoneda(precioUnitario) : '—'}</td>
                    <td>
                      <span className={`descuento-badge ${descuento > 0 ? 'descuento-activo' : ''}`}>
                        {descuento}%
                      </span>
                    </td>
                    <td>{subtotalLinea > 0 ? formatearMoneda(subtotalLinea) : '—'}</td>
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
        </div>
      </div>

      <div className="venta-form-seccion--fija">
        {error && <p className="error-text">{error}</p>}

        <div className="modal-actions venta-form-acciones">
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Registrando...' : 'Registrar venta'}
          </button>
        </div>
      </div>
    </form>
  )
}
