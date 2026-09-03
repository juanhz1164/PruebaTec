import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getProductos } from '../api/productos'
import { getSucursales } from '../api/sucursales'
import { crearTransferencia } from '../api/transferencias'
import type { Producto } from '../types/producto'
import type { Sucursal } from '../types/sucursal'
import type { CrearTransferenciaLinea } from '../types/transferencia'
import { ApiError } from '../api/client'

interface LineaForm {
  productoId: number | null
  cantidadSolicitada: string
}

function nuevaLinea(): LineaForm {
  return { productoId: null, cantidadSolicitada: '' }
}

export function TransferenciaForm({ onCreada }: { onCreada: () => void }) {
  const { usuario } = useAuth()
  const [productos, setProductos] = useState<Producto[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [sucursalDestinoId, setSucursalDestinoId] = useState<number | null>(null)
  const [lineas, setLineas] = useState<LineaForm[]>([nuevaLinea()])
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    getProductos()
      .then(setProductos)
      .catch(() => setError('No se pudo cargar el catálogo de productos'))
    getSucursales()
      .then((data) => {
        const otras = data.filter((s) => s.id !== usuario?.sucursalId)
        setSucursales(otras)
        setSucursalDestinoId((current) => current ?? otras[0]?.id ?? null)
      })
      .catch(() => setError('No se pudo cargar el listado de sucursales'))
  }, [usuario?.sucursalId])

  const actualizarLinea = (index: number, cambios: Partial<LineaForm>) => {
    setLineas((prev) => prev.map((l, i) => (i === index ? { ...l, ...cambios } : l)))
  }

  const agregarLinea = () => setLineas((prev) => [...prev, nuevaLinea()])

  const quitarLinea = (index: number) =>
    setLineas((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!usuario?.sucursalId || !sucursalDestinoId) return

    const lineasValidas: CrearTransferenciaLinea[] = []
    for (const linea of lineas) {
      if (!linea.productoId) continue
      const cantidad = Number(linea.cantidadSolicitada)
      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        setError('Cada línea debe tener una cantidad solicitada mayor a cero')
        return
      }
      lineasValidas.push({ productoId: linea.productoId, cantidadSolicitada: cantidad })
    }

    if (lineasValidas.length === 0) {
      setError('Agrega al menos una línea con producto')
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      await crearTransferencia({
        sucursalOrigenId: usuario.sucursalId,
        sucursalDestinoId,
        usuarioSolicitanteId: usuario.id,
        lineas: lineasValidas,
      })
      setLineas([nuevaLinea()])
      onCreada()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear la solicitud')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!usuario?.sucursalId) {
    return null
  }

  return (
    <form className="orden-form" onSubmit={handleSubmit}>
      <h2>Solicitar transferencia</h2>

      <div className="form-row">
        <label htmlFor="tr-destino">Sucursal destino</label>
        <select
          id="tr-destino"
          value={sucursalDestinoId ?? ''}
          onChange={(e) => setSucursalDestinoId(Number(e.target.value))}
        >
          {sucursales.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </select>
      </div>

      <table className="data-table lineas-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Cantidad solicitada</th>
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
                  value={linea.cantidadSolicitada}
                  onChange={(e) =>
                    actualizarLinea(index, { cantidadSolicitada: e.target.value })
                  }
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

      <button type="submit" disabled={isSubmitting || !sucursalDestinoId}>
        {isSubmitting ? 'Enviando...' : 'Solicitar transferencia'}
      </button>
    </form>
  )
}
