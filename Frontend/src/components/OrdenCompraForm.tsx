import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getProductos } from '../api/productos'
import { getProveedores } from '../api/proveedores'
import { crearOrdenCompra } from '../api/ordenesCompra'
import type { Producto } from '../types/producto'
import type { Proveedor } from '../types/proveedor'
import type { CrearOrdenCompraLinea } from '../types/ordenCompra'
import { ApiError } from '../api/client'

interface LineaForm {
  productoId: number | null
  cantidad: string
  precioUnitario: string
  descuento: string
}

function nuevaLinea(): LineaForm {
  return { productoId: null, cantidad: '', precioUnitario: '', descuento: '0' }
}

export function OrdenCompraForm({ onCreada }: { onCreada: () => void }) {
  const { usuario } = useAuth()
  const [productos, setProductos] = useState<Producto[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [proveedorId, setProveedorId] = useState<number | null>(null)
  const [plazoPagoDias, setPlazoPagoDias] = useState('30')
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
  }, [])

  const actualizarLinea = (index: number, cambios: Partial<LineaForm>) => {
    setLineas((prev) => prev.map((l, i) => (i === index ? { ...l, ...cambios } : l)))
  }

  const agregarLinea = () => setLineas((prev) => [...prev, nuevaLinea()])

  const quitarLinea = (index: number) =>
    setLineas((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!usuario?.sucursalId || !proveedorId) return

    const lineasValidas: CrearOrdenCompraLinea[] = []
    for (const linea of lineas) {
      if (!linea.productoId) continue
      const cantidad = Number(linea.cantidad)
      const precioUnitario = Number(linea.precioUnitario)
      const descuento = Number(linea.descuento || '0')
      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        setError('Cada línea debe tener una cantidad mayor a cero')
        return
      }
      if (!Number.isFinite(precioUnitario) || precioUnitario < 0) {
        setError('Cada línea debe tener un precio unitario válido')
        return
      }
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

    const plazo = Number(plazoPagoDias)
    if (!Number.isFinite(plazo) || plazo < 0) {
      setError('El plazo de pago debe ser un número válido')
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      await crearOrdenCompra({
        proveedorId,
        sucursalId: usuario.sucursalId,
        usuarioId: usuario.id,
        plazoPagoDias: plazo,
        lineas: lineasValidas,
      })
      setLineas([nuevaLinea()])
      onCreada()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear la orden de compra')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!usuario?.sucursalId) {
    return null
  }

  return (
    <form className="orden-form" onSubmit={handleSubmit}>
      <h2>Nueva orden de compra</h2>

      <div className="form-row">
        <label htmlFor="oc-proveedor">Proveedor</label>
        <select
          id="oc-proveedor"
          value={proveedorId ?? ''}
          onChange={(e) => setProveedorId(Number(e.target.value))}
        >
          {proveedores.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <label htmlFor="oc-plazo">Plazo de pago (días)</label>
        <input
          id="oc-plazo"
          type="number"
          min="0"
          value={plazoPagoDias}
          onChange={(e) => setPlazoPagoDias(e.target.value)}
          required
        />
      </div>

      <table className="data-table lineas-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Cantidad</th>
            <th>Precio unitario</th>
            <th>Descuento %</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {lineas.map((linea, index) => (
            <tr key={index}>
              <td>
                <select
                  value={linea.productoId ?? ''}
                  onChange={(e) => actualizarLinea(index, { productoId: Number(e.target.value) })}
                >
                  <option value="">Selecciona un producto</option>
                  {productos.map((p) => (
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
                  step="any"
                  value={linea.cantidad}
                  onChange={(e) => actualizarLinea(index, { cantidad: e.target.value })}
                />
              </td>
              <td>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={linea.precioUnitario}
                  onChange={(e) => actualizarLinea(index, { precioUnitario: e.target.value })}
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
          ))}
        </tbody>
      </table>

      <button type="button" className="secondary-button" onClick={agregarLinea}>
        + Agregar línea
      </button>

      {error && <p className="error-text">{error}</p>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creando...' : 'Crear orden de compra'}
      </button>
    </form>
  )
}
