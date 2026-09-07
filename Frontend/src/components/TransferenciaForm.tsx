import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getProductos } from '../api/productos'
import { getSucursales } from '../api/sucursales'
import { getInventarioPorSucursal } from '../api/inventario'
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
  const esAdmin = usuario?.rol === 'AdministradorGeneral'
  const [productos, setProductos] = useState<Producto[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [sucursalOrigenId, setSucursalOrigenId] = useState<number | null>(null)
  const [sucursalDestinoId, setSucursalDestinoId] = useState<number | null>(null)
  const [lineas, setLineas] = useState<LineaForm[]>([nuevaLinea()])
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [stockOrigen, setStockOrigen] = useState<Record<number, number>>({})

  useEffect(() => {
    getProductos()
      .then(setProductos)
      .catch(() => setError('No se pudo cargar el catálogo de productos'))
    getSucursales()
      .then((data) => {
        if (esAdmin) {
          // El Administrador general no tiene sucursal propia: elige tanto
          // origen como destino entre todas las sucursales de la red.
          setSucursales(data)
          setSucursalOrigenId((current) => current ?? data[0]?.id ?? null)
          setSucursalDestinoId((current) => current ?? data[1]?.id ?? data[0]?.id ?? null)
          return
        }
        const otras = data.filter((s) => s.id !== usuario?.sucursalId)
        setSucursales(otras)
        setSucursalOrigenId(usuario?.sucursalId ?? null)
        setSucursalDestinoId((current) => current ?? otras[0]?.id ?? null)
      })
      .catch(() => setError('No se pudo cargar el listado de sucursales'))
  }, [usuario?.sucursalId, esAdmin])

  // Solo para mostrar el stock disponible junto a cada línea; no participa
  // en ninguna validación ni en el payload enviado al backend.
  useEffect(() => {
    if (!sucursalOrigenId) {
      setStockOrigen({})
      return
    }
    getInventarioPorSucursal(sucursalOrigenId)
      .then((items) => {
        setStockOrigen(Object.fromEntries(items.map((i) => [i.productoId, i.cantidad])))
      })
      .catch(() => setStockOrigen({}))
  }, [sucursalOrigenId])

  const sucursalesDestino = esAdmin
    ? sucursales.filter((s) => s.id !== sucursalOrigenId)
    : sucursales

  const sucursalOrigen = sucursales.find((s) => s.id === sucursalOrigenId) ?? null

  const actualizarLinea = (index: number, cambios: Partial<LineaForm>) => {
    setLineas((prev) => prev.map((l, i) => (i === index ? { ...l, ...cambios } : l)))
  }

  const agregarLinea = () => setLineas((prev) => [...prev, nuevaLinea()])

  const quitarLinea = (index: number) =>
    setLineas((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))

  const lineasConProducto = lineas.filter((l) => l.productoId !== null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!sucursalOrigenId || !sucursalDestinoId) return

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
        sucursalOrigenId,
        sucursalDestinoId,
        usuarioSolicitanteId: usuario!.id,
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

  if (!usuario?.sucursalId && !esAdmin) {
    return null
  }

  return (
    <form className="tr-form" onSubmit={handleSubmit}>
      <div className="tr-form-header">
        <h2>Nueva solicitud de transferencia</h2>
        <div className="tr-form-header-actions">
          {error && <p className="error-text tr-form-header-error">{error}</p>}
          <button type="submit" className="tr-submit-btn" disabled={isSubmitting || !sucursalDestinoId}>
            {isSubmitting ? 'Enviando...' : 'Solicitar transferencia'}
          </button>
        </div>
      </div>

      <div className="tr-ruta">
        <div className="tr-ruta-card tr-ruta-card--origen">
          <span className="tr-ruta-eyebrow">Origen</span>
          {esAdmin ? (
            <select
              className="tr-ruta-select"
              id="tr-origen"
              value={sucursalOrigenId ?? ''}
              onChange={(e) => setSucursalOrigenId(Number(e.target.value))}
            >
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          ) : (
            <span className="tr-ruta-nombre">{sucursalOrigen?.nombre ?? '—'}</span>
          )}
          <span className="tr-ruta-hint">Inventario de salida</span>
        </div>

        <div className="tr-ruta-flecha" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
            <path d="M13 6l6 6-6 6" />
          </svg>
        </div>

        <div className="tr-ruta-card tr-ruta-card--destino">
          <span className="tr-ruta-eyebrow">Destino</span>
          <select
            className="tr-ruta-select"
            id="tr-destino"
            value={sucursalDestinoId ?? ''}
            onChange={(e) => setSucursalDestinoId(Number(e.target.value))}
          >
            {sucursalesDestino.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
          <span className="tr-ruta-hint">Sucursal receptora</span>
        </div>
      </div>

      <section className="tr-productos-card">
        <div className="tr-productos-header">
          <h2>Productos a transferir</h2>
          {lineasConProducto.length > 0 && (
            <span className="tr-productos-contador">
              {lineasConProducto.length} producto{lineasConProducto.length === 1 ? '' : 's'}
            </span>
          )}
        </div>

        <div className="tr-productos-builder">
          <button type="button" className="secondary-button tr-agregar-btn" onClick={agregarLinea}>
            + Agregar producto
          </button>

          <div className="tr-lineas-scroll">
            {lineas.map((linea, index) => {
              const stock = linea.productoId !== null ? stockOrigen[linea.productoId] : undefined
              return (
                <div key={index} className="tr-linea-row">
                  <div className="form-row">
                    <label>Producto</label>
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
                  </div>
                  {linea.productoId !== null && (
                    <span className="tr-linea-stock">
                      Stock: {stock !== undefined ? stock : '—'}
                    </span>
                  )}
                  <div className="form-row form-row--compacto">
                    <label>Cantidad solicitada</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={linea.cantidadSolicitada}
                      onChange={(e) =>
                        actualizarLinea(index, { cantidadSolicitada: e.target.value })
                      }
                    />
                  </div>
                  <button
                    type="button"
                    className="danger-button tr-linea-quitar"
                    onClick={() => quitarLinea(index)}
                    disabled={lineas.length === 1}
                    aria-label="Quitar producto"
                    title="Quitar producto"
                  >
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </form>
  )
}
