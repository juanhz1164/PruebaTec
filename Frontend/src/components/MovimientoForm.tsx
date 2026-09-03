import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getProductos } from '../api/productos'
import { crearMovimiento } from '../api/movimientos'
import { TIPO_MOVIMIENTO, type TipoMovimiento } from '../types/movimiento'
import type { Producto } from '../types/producto'
import { ApiError } from '../api/client'

export function MovimientoForm({ onRegistrado }: { onRegistrado: () => void }) {
  const { usuario } = useAuth()
  const [productos, setProductos] = useState<Producto[]>([])
  const [productoId, setProductoId] = useState<number | null>(null)
  const [tipo, setTipo] = useState<TipoMovimiento>(TIPO_MOVIMIENTO.Ingreso)
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    getProductos()
      .then((data) => {
        setProductos(data)
        setProductoId((current) => current ?? data[0]?.id ?? null)
      })
      .catch(() => {
        setError('No se pudo cargar el catálogo de productos')
      })
  }, [])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!usuario?.sucursalId || !productoId) return

    const cantidadNum = Number(cantidad)
    if (!Number.isFinite(cantidadNum) || cantidadNum <= 0) {
      setError('La cantidad debe ser un número mayor a cero')
      return
    }
    if (!motivo.trim()) {
      setError('El motivo es obligatorio')
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      await crearMovimiento({
        productoId,
        sucursalId: usuario.sucursalId,
        usuarioId: usuario.id,
        tipo,
        cantidad: cantidadNum,
        motivo: motivo.trim(),
      })
      setCantidad('')
      setMotivo('')
      onRegistrado()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar el movimiento')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!usuario?.sucursalId) {
    return null
  }

  return (
    <form className="movimiento-form" onSubmit={handleSubmit}>
      <h2>Registrar ingreso / retiro</h2>

      <div className="form-row">
        <label htmlFor="mov-producto">Producto</label>
        <select
          id="mov-producto"
          value={productoId ?? ''}
          onChange={(e) => setProductoId(Number(e.target.value))}
        >
          {productos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.sku} — {p.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <label htmlFor="mov-tipo">Tipo</label>
        <select
          id="mov-tipo"
          value={tipo}
          onChange={(e) => setTipo(Number(e.target.value) as TipoMovimiento)}
        >
          <option value={TIPO_MOVIMIENTO.Ingreso}>Ingreso</option>
          <option value={TIPO_MOVIMIENTO.Retiro}>Retiro</option>
        </select>
      </div>

      <div className="form-row">
        <label htmlFor="mov-cantidad">Cantidad</label>
        <input
          id="mov-cantidad"
          type="number"
          min="0"
          step="any"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          required
        />
      </div>

      <div className="form-row">
        <label htmlFor="mov-motivo">Motivo</label>
        <input
          id="mov-motivo"
          type="text"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej. Ajuste por conteo físico"
          required
        />
      </div>

      {error && <p className="error-text">{error}</p>}

      <button type="submit" disabled={isSubmitting || !productoId}>
        {isSubmitting ? 'Registrando...' : 'Registrar movimiento'}
      </button>
    </form>
  )
}
