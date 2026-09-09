import { useEffect, useState, type FormEvent } from 'react'
import { Plus, ArrowRight, Trash2, Send } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { getProductos } from '../api/productos'
import { getSucursales } from '../api/sucursales'
import { getInventarioPorSucursal } from '../api/inventario'
import { crearTransferencia } from '../api/transferencias'
import { Modal } from './Modal'
import type { Producto } from '../types/producto'
import type { Sucursal } from '../types/sucursal'
import type { CrearTransferenciaLinea } from '../types/transferencia'
import { PRIORIDAD_TRANSFERENCIA, PRIORIDAD_TRANSFERENCIA_LABEL, type PrioridadTransferencia } from '../types/transferencia'
import { ApiError } from '../api/client'

interface LineaForm {
  productoId: number | null
  cantidadSolicitada: string
}

// Modal "Agregar producto": SOLO producto + stock + cantidad. La prioridad
// pertenece a la transferencia completa (se define una vez, en el formulario
// principal), nunca a un producto individual — por eso este modal no la
// pide, igual que tampoco pide transportista/ruta/costo/fecha estimada
// (esos son datos del envío logístico, un paso posterior y distinto).
function AgregarProductoModal({
  productos,
  stockOrigen,
  yaAgregados,
  onAgregar,
  onClose,
}: {
  productos: Producto[]
  stockOrigen: Record<number, number>
  yaAgregados: Record<number, number>
  onAgregar: (linea: LineaForm) => void
  onClose: () => void
}) {
  const [productoId, setProductoId] = useState<number | null>(null)
  const [cantidadSolicitada, setCantidadSolicitada] = useState('')
  const [error, setError] = useState<string | null>(null)

  const stock = productoId !== null ? stockOrigen[productoId] : undefined
  const productoSeleccionado = productos.find((p) => p.id === productoId)
  const cantidadYaEnLista = productoId !== null ? (yaAgregados[productoId] ?? 0) : 0

  const handleAgregar = () => {
    if (!productoId) {
      setError('Selecciona un producto')
      return
    }
    const cantidad = Number(cantidadSolicitada)
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      setError('Ingresa una cantidad mayor a cero')
      return
    }
    if (stock !== undefined && cantidadYaEnLista + cantidad > stock) {
      setError(
        cantidadYaEnLista > 0
          ? `Ese producto ya tiene ${cantidadYaEnLista} un. en la solicitud — sumando esta cantidad superarías el stock disponible (${stock}).`
          : `La cantidad solicitada supera el stock disponible (${stock} unidades).`,
      )
      return
    }
    onAgregar({ productoId, cantidadSolicitada })
    onClose()
  }

  return (
    <Modal
      title="Agregar producto"
      description="Selecciona el producto y la cantidad que deseas transferir."
      onClose={onClose}
    >
      <div className="tr-agregar-form">
        <div className="form-row">
          <label htmlFor="tr-agregar-producto">Producto</label>
          <select
            id="tr-agregar-producto"
            value={productoId ?? ''}
            onChange={(e) => {
              setProductoId(Number(e.target.value))
              setError(null)
            }}
            autoFocus
          >
            <option value="">Selecciona un producto</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sku} — {p.nombre}
              </option>
            ))}
          </select>
        </div>

        {productoSeleccionado && cantidadYaEnLista > 0 && (
          <p className="tr-agregar-nota">
            Este producto ya está agregado ({cantidadYaEnLista} un.) — la cantidad que ingreses aquí se sumará.
          </p>
        )}

        <div className="tr-agregar-grid">
          <div className="tr-agregar-stock">
            <span>Stock disponible</span>
            <strong>{productoId !== null ? (stock !== undefined ? stock : '—') : '—'}</strong>
          </div>

          <div className="form-row">
            <label htmlFor="tr-agregar-cantidad">Cantidad</label>
            <input
              id="tr-agregar-cantidad"
              type="number"
              min="0"
              max={stock}
              step="1"
              inputMode="numeric"
              placeholder="0"
              value={cantidadSolicitada}
              disabled={!productoId}
              onChange={(e) => {
                setCantidadSolicitada(e.target.value.replace(/[^0-9]/g, ''))
                setError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === '.' || e.key === ',') e.preventDefault()
              }}
            />
          </div>
        </div>

        {error && <p className="error-text tr-agregar-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="danger-button" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="primary-button" onClick={handleAgregar} disabled={!productoId}>
            <Plus size={14} strokeWidth={2.3} />
            Agregar producto
          </button>
        </div>
      </div>
    </Modal>
  )
}

export function TransferenciaForm({ onCreada }: { onCreada: () => void }) {
  const { usuario } = useAuth()
  const esAdmin = usuario?.rol === 'AdministradorGeneral'
  const [productos, setProductos] = useState<Producto[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [sucursalOrigenId, setSucursalOrigenId] = useState<number | null>(null)
  const [sucursalDestinoId, setSucursalDestinoId] = useState<number | null>(null)
  const [lineas, setLineas] = useState<LineaForm[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [stockOrigen, setStockOrigen] = useState<Record<number, number>>({})
  const [mostrarAgregar, setMostrarAgregar] = useState(false)
  // La prioridad aplica a TODA la transferencia (no a cada producto): se
  // define una sola vez aquí, con Media como valor por defecto — coincide
  // con lo que el backend asume si no se envía (TransferenciaService.CrearAsync).
  const [prioridad, setPrioridad] = useState<PrioridadTransferencia>(PRIORIDAD_TRANSFERENCIA.Media)

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

  // Se muestra junto a cada línea y además se usa para validar que no se
  // solicite más de lo disponible (ver handleAgregar y handleSubmit); no
  // participa en el payload enviado al backend.
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

  // Para Gerente/Operador, la sucursal de origen es siempre la propia, que
  // queda deliberadamente excluida de la lista "sucursales" (esa lista es la
  // de posibles destinos): buscarla ahí nunca la encontraba y el nombre
  // quedaba en "—". El nombre ya viene en el propio usuario autenticado.
  const sucursalOrigenNombre = esAdmin
    ? (sucursales.find((s) => s.id === sucursalOrigenId)?.nombre ?? null)
    : (usuario?.sucursalNombre ?? null)

  // Si el producto ya está en la solicitud, se fusiona sumando la cantidad
  // a la línea existente en vez de crear una línea duplicada — evita que el
  // mismo producto aparezca dos veces por accidente.
  const agregarLinea = (linea: LineaForm) =>
    setLineas((prev) => {
      const existente = prev.findIndex((l) => l.productoId === linea.productoId)
      if (existente === -1) {
        return [...prev, linea]
      }
      const actualizadas = [...prev]
      const cantidadActual = Number(actualizadas[existente].cantidadSolicitada) || 0
      const cantidadNueva = Number(linea.cantidadSolicitada) || 0
      actualizadas[existente] = {
        ...actualizadas[existente],
        cantidadSolicitada: String(cantidadActual + cantidadNueva),
      }
      return actualizadas
    })

  // Cantidad ya solicitada por producto (para que el modal pueda validar
  // contra el stock incluyendo lo que ya está en la lista).
  const cantidadPorProductoEnLista = lineas.reduce<Record<number, number>>((acc, l) => {
    if (l.productoId === null) return acc
    acc[l.productoId] = (acc[l.productoId] ?? 0) + (Number(l.cantidadSolicitada) || 0)
    return acc
  }, {})

  const quitarLinea = (index: number) =>
    setLineas((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))

  const lineasConProducto = lineas.filter((l) => l.productoId !== null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!sucursalOrigenId || !sucursalDestinoId) return

    const lineasValidas: CrearTransferenciaLinea[] = []
    const cantidadPorProducto: Record<number, number> = {}
    for (const linea of lineas) {
      if (!linea.productoId) continue
      const cantidad = Number(linea.cantidadSolicitada)
      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        setError('Cada línea debe tener una cantidad solicitada mayor a cero')
        return
      }
      cantidadPorProducto[linea.productoId] = (cantidadPorProducto[linea.productoId] ?? 0) + cantidad
      lineasValidas.push({ productoId: linea.productoId, cantidadSolicitada: cantidad })
    }

    // Si el mismo producto aparece en varias líneas, se valida la SUMA
    // contra el stock disponible (agregar cada línea por separado no
    // detecta que, juntas, superan lo que hay en la sucursal de origen).
    for (const [productoIdStr, cantidadTotal] of Object.entries(cantidadPorProducto)) {
      const productoId = Number(productoIdStr)
      const stock = stockOrigen[productoId]
      if (stock !== undefined && cantidadTotal > stock) {
        const nombre = productos.find((p) => p.id === productoId)?.nombre ?? 'el producto seleccionado'
        setError(`No puedes solicitar más de lo disponible de ${nombre}: stock actual ${stock}`)
        return
      }
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
        prioridad,
        lineas: lineasValidas,
      })
      setLineas([])
      setPrioridad(PRIORIDAD_TRANSFERENCIA.Media)
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
            <Send size={14} strokeWidth={2.2} />
            {isSubmitting ? 'Enviando...' : 'Solicitar transferencia'}
          </button>
        </div>
      </div>

      <div className="tr-ruta">
        <div className="tr-ruta-card tr-ruta-card--origen">
          <span className="tr-ruta-eyebrow">Sucursal origen</span>
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
            <span className="tr-ruta-nombre">{sucursalOrigenNombre ?? '—'}</span>
          )}
          <span className="tr-ruta-hint">Inventario de salida</span>
        </div>

        <div className="tr-ruta-flecha" aria-hidden="true">
          <ArrowRight size={22} strokeWidth={2} />
        </div>

        <div className="tr-ruta-card tr-ruta-card--destino">
          <span className="tr-ruta-eyebrow">Sucursal destino</span>
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

      <div className="tr-prioridad">
        <span className="tr-prioridad-label">Prioridad de la transferencia</span>
        <div className="tr-prioridad-opciones" role="radiogroup" aria-label="Prioridad de la transferencia">
          {(Object.values(PRIORIDAD_TRANSFERENCIA) as PrioridadTransferencia[]).map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={prioridad === p}
              className={`tr-prioridad-chip tr-prioridad-chip--${p} ${prioridad === p ? 'tr-prioridad-chip--activa' : ''}`}
              onClick={() => setPrioridad(p)}
            >
              {PRIORIDAD_TRANSFERENCIA_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      <section className="tr-productos-card">
        <div className="tr-productos-header">
          <h2>Productos a transferir</h2>
          <div className="tr-productos-header-acciones">
            {lineasConProducto.length > 0 && (
              <span className="tr-productos-contador">
                {lineasConProducto.length} producto{lineasConProducto.length === 1 ? '' : 's'}
              </span>
            )}
            <button
              type="button"
              className="primary-button btn-sm tr-agregar-btn"
              onClick={() => setMostrarAgregar(true)}
            >
              <Plus size={14} strokeWidth={2.3} />
              Agregar producto
            </button>
          </div>
        </div>

        {lineas.length === 0 ? (
          <p className="tr-productos-vacio">Aún no has agregado productos a esta solicitud.</p>
        ) : (
          <div className="tr-lineas-scroll">
            {lineas.map((linea, index) => {
              const producto = productos.find((p) => p.id === linea.productoId)
              const stock = linea.productoId !== null ? stockOrigen[linea.productoId] : undefined
              return (
                <div key={index} className="tr-linea-row tr-linea-row--lectura">
                  <div className="tr-linea-info">
                    <span className="tr-linea-producto">
                      {producto ? `${producto.sku} — ${producto.nombre}` : '—'}
                    </span>
                    <span className="tr-linea-stock">Stock: {stock !== undefined ? stock : '—'}</span>
                  </div>
                  <span className="tr-linea-cantidad">{linea.cantidadSolicitada} un.</span>
                  <button
                    type="button"
                    className="danger-button btn-icon-only btn-sm tr-linea-quitar"
                    onClick={() => quitarLinea(index)}
                    disabled={lineas.length === 1}
                    aria-label="Quitar producto"
                    title="Quitar producto"
                  >
                    <Trash2 size={14} strokeWidth={2} />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {lineasConProducto.length > 0 && (
          <div className="tr-resumen">
            <span>
              Total de productos: <strong>{lineasConProducto.length}</strong>
            </span>
            <span>
              Total de unidades:{' '}
              <strong>
                {lineasConProducto.reduce((sum, l) => sum + (Number(l.cantidadSolicitada) || 0), 0)}
              </strong>
            </span>
          </div>
        )}
      </section>

      {mostrarAgregar && (
        <AgregarProductoModal
          productos={productos}
          stockOrigen={stockOrigen}
          yaAgregados={cantidadPorProductoEnLista}
          onAgregar={agregarLinea}
          onClose={() => setMostrarAgregar(false)}
        />
      )}
    </form>
  )
}
