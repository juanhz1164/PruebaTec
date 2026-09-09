import { useEffect, useState, type FormEvent } from 'react'
import { crearProducto } from '../api/productos'
import { getUnidadesMedida } from '../api/unidadesMedida'
import { getProveedores } from '../api/proveedores'
import { ApiError } from '../api/client'
import type { UnidadMedida } from '../types/unidadMedida'
import type { Proveedor } from '../types/proveedor'

export function ProductoForm({
  onCreado,
  onCancelar,
}: {
  onCreado: () => void
  onCancelar?: () => void
}) {
  const [unidades, setUnidades] = useState<UnidadMedida[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [unidadMedidaId, setUnidadMedidaId] = useState<number | null>(null)
  const [proveedorId, setProveedorId] = useState<number | null>(null)
  const [sku, setSku] = useState('')
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState('')
  const [precioVenta, setPrecioVenta] = useState('')
  const [precioProveedor, setPrecioProveedor] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    getUnidadesMedida()
      .then((data) => {
        setUnidades(data)
        setUnidadMedidaId((current) => current ?? data[0]?.id ?? null)
      })
      .catch(() => setError('No se pudo cargar el listado de unidades de medida'))
    getProveedores()
      .then(setProveedores)
      .catch(() => setError('No se pudo cargar el listado de proveedores'))
  }, [])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!unidadMedidaId) {
      setError('Selecciona una unidad de medida')
      return
    }

    const venta = Math.trunc(Number(precioVenta))
    const proveedor = Math.trunc(Number(precioProveedor || 0))
    if (!Number.isFinite(venta) || venta < 0) {
      setError('El precio de venta debe ser un número entero válido')
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      await crearProducto({
        unidadMedidaId,
        proveedorId,
        sku,
        nombre,
        descripcion: null,
        categoria: categoria || null,
        precioVenta: venta,
        precioProveedor: proveedor,
      })
      setSku('')
      setNombre('')
      setCategoria('')
      setPrecioVenta('')
      setPrecioProveedor('')
      onCreado()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear el producto')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="orden-form" onSubmit={handleSubmit}>
      <div className="form-row-inline">
        <div className="form-row">
          <label htmlFor="prod-sku">SKU</label>
          <input id="prod-sku" value={sku} onChange={(e) => setSku(e.target.value)} required />
        </div>
        <div className="form-row">
          <label htmlFor="prod-nombre">Nombre</label>
          <input
            id="prod-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
        </div>
        <div className="form-row">
          <label htmlFor="prod-categoria">Categoría</label>
          <input
            id="prod-categoria"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
          />
        </div>
        <div className="form-row">
          <label htmlFor="prod-unidad">Unidad de medida</label>
          <select
            id="prod-unidad"
            value={unidadMedidaId ?? ''}
            onChange={(e) => setUnidadMedidaId(Number(e.target.value))}
          >
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre} ({u.abreviatura})
              </option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <label htmlFor="prod-proveedor">Proveedor</label>
          <select
            id="prod-proveedor"
            value={proveedorId ?? ''}
            onChange={(e) => setProveedorId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Sin proveedor</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <label htmlFor="prod-precio-venta">Precio de venta</label>
          <input
            id="prod-precio-venta"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={precioVenta}
            onChange={(e) => setPrecioVenta(e.target.value.replace(/[^0-9]/g, ''))}
            onKeyDown={(e) => {
              if (e.key === '.' || e.key === ',') e.preventDefault()
            }}
            required
          />
        </div>
        <div className="form-row">
          <label htmlFor="prod-precio-proveedor">Precio de proveedor</label>
          <input
            id="prod-precio-proveedor"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={precioProveedor}
            onChange={(e) => setPrecioProveedor(e.target.value.replace(/[^0-9]/g, ''))}
            onKeyDown={(e) => {
              if (e.key === '.' || e.key === ',') e.preventDefault()
            }}
          />
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="modal-actions">
        {onCancelar && (
          <button type="button" className="danger-button" onClick={onCancelar}>
            Cancelar
          </button>
        )}
        <button type="submit" className="primary-button" disabled={isSubmitting}>
          {isSubmitting ? 'Creando...' : 'Crear producto'}
        </button>
      </div>
    </form>
  )
}
