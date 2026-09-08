import { useCallback, useEffect, useMemo, useState } from 'react'
import { getUsuarios, actualizarUsuario, eliminarUsuario } from '../api/usuarios'
import { getSucursales, actualizarSucursal, eliminarSucursal } from '../api/sucursales'
import { getProductos, actualizarProducto, eliminarProducto } from '../api/productos'
import { UsuarioForm } from '../components/UsuarioForm'
import { SucursalForm } from '../components/SucursalForm'
import { ProductoForm } from '../components/ProductoForm'
import { ActionsMenu } from '../components/ActionsMenu'
import { Modal } from '../components/Modal'
import { KpiTile } from '../components/KpiTile'
import { ApiError } from '../api/client'
import { formatearMoneda } from '../utils/format'
import { ROL_LABEL, type Usuario } from '../types/auth'
import type { Sucursal } from '../types/sucursal'
import type { Producto } from '../types/producto'

type Tab = 'usuarios' | 'sucursales' | 'productos'

const TABS: { id: Tab; label: string }[] = [
  { id: 'sucursales', label: 'Sucursales' },
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'productos', label: 'Productos' },
]

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('sucursales')

  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [procesandoId, setProcesandoId] = useState<number | null>(null)
  const [precioEnEdicion, setPrecioEnEdicion] = useState<Record<number, string>>({})

  // Solo controla qué diálogo está abierto y sobre qué fila; no duplica ni
  // reemplaza el estado de negocio (precioEnEdicion, procesandoId, etc.).
  const [productoParaPrecio, setProductoParaPrecio] = useState<Producto | null>(null)
  const [productoParaDesactivar, setProductoParaDesactivar] = useState<Producto | null>(null)
  const [usuarioParaDesactivar, setUsuarioParaDesactivar] = useState<Usuario | null>(null)
  const [sucursalParaDesactivar, setSucursalParaDesactivar] = useState<Sucursal | null>(null)
  const [productoParaEliminar, setProductoParaEliminar] = useState<Producto | null>(null)
  const [usuarioParaEliminar, setUsuarioParaEliminar] = useState<Usuario | null>(null)
  const [sucursalParaEliminar, setSucursalParaEliminar] = useState<Sucursal | null>(null)

  // Los formularios de creación ya no están permanentemente visibles: viven
  // dentro de un modal que se abre con el botón "+ Nuevo ...".
  const [mostrarModalUsuario, setMostrarModalUsuario] = useState(false)
  const [mostrarModalSucursal, setMostrarModalSucursal] = useState(false)
  const [mostrarModalProducto, setMostrarModalProducto] = useState(false)

  // Filtrado puramente client-side sobre los datos ya cargados por
  // cargarTodo(); no dispara ninguna llamada nueva al backend.
  const [busquedaUsuarios, setBusquedaUsuarios] = useState('')
  const [busquedaSucursales, setBusquedaSucursales] = useState('')
  const [busquedaProductos, setBusquedaProductos] = useState('')

  const cargarTodo = useCallback(() => {
    setIsLoading(true)
    setError(null)
    return Promise.all([getUsuarios(), getSucursales(), getProductos()])
      .then(([u, s, p]) => {
        setUsuarios(u)
        setSucursales(s)
        setProductos(p)
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar la información')
      })
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    cargarTodo()
  }, [cargarTodo])

  const toggleUsuarioActivo = async (usuario: Usuario) => {
    setProcesandoId(usuario.id)
    setError(null)
    try {
      await actualizarUsuario(usuario.id, {
        sucursalId: usuario.sucursalId,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        activo: !usuario.activo,
      })
      setUsuarioParaDesactivar(null)
      await cargarTodo()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar el usuario')
    } finally {
      setProcesandoId(null)
    }
  }

  const toggleSucursalActiva = async (sucursal: Sucursal) => {
    setProcesandoId(sucursal.id)
    setError(null)
    try {
      await actualizarSucursal(sucursal.id, {
        nombre: sucursal.nombre,
        direccion: sucursal.direccion,
        ciudad: sucursal.ciudad,
        telefono: sucursal.telefono,
        activa: !sucursal.activa,
      })
      setSucursalParaDesactivar(null)
      await cargarTodo()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar la sucursal')
    } finally {
      setProcesandoId(null)
    }
  }

  const toggleProductoActivo = async (producto: Producto) => {
    setProcesandoId(producto.id)
    setError(null)
    try {
      await actualizarProducto(producto.id, {
        unidadMedidaId: producto.unidadMedidaId,
        proveedorId: producto.proveedorId,
        sku: producto.sku,
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        categoria: producto.categoria,
        activo: !producto.activo,
        precioVenta: producto.precioVenta,
        precioProveedor: producto.precioProveedor,
      })
      setProductoParaDesactivar(null)
      await cargarTodo()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar el producto')
    } finally {
      setProcesandoId(null)
    }
  }

  // Borrado físico e irreversible: a diferencia de Desactivar (que solo
  // marca activo=false), esto borra el registro de la base de datos. Si
  // tiene ventas/compras/movimientos/visitas asociados, esos quedan
  // borrados en cascada también — el modal correspondiente advierte de
  // esto antes de confirmar.
  const eliminarUsuarioDefinitivo = async (usuario: Usuario) => {
    setProcesandoId(usuario.id)
    setError(null)
    try {
      await eliminarUsuario(usuario.id)
      setUsuarioParaEliminar(null)
      await cargarTodo()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar el usuario')
    } finally {
      setProcesandoId(null)
    }
  }

  const eliminarSucursalDefinitiva = async (sucursal: Sucursal) => {
    setProcesandoId(sucursal.id)
    setError(null)
    try {
      await eliminarSucursal(sucursal.id)
      setSucursalParaEliminar(null)
      await cargarTodo()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar la sucursal')
    } finally {
      setProcesandoId(null)
    }
  }

  const eliminarProductoDefinitivo = async (producto: Producto) => {
    setProcesandoId(producto.id)
    setError(null)
    try {
      await eliminarProducto(producto.id)
      setProductoParaEliminar(null)
      await cargarTodo()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar el producto')
    } finally {
      setProcesandoId(null)
    }
  }

  const guardarPrecio = async (producto: Producto) => {
    const valor = Number(precioEnEdicion[producto.id])
    if (!Number.isFinite(valor) || valor < 0) {
      setError('El precio debe ser un número válido')
      return
    }

    setProcesandoId(producto.id)
    setError(null)
    try {
      await actualizarProducto(producto.id, {
        unidadMedidaId: producto.unidadMedidaId,
        proveedorId: producto.proveedorId,
        sku: producto.sku,
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        categoria: producto.categoria,
        activo: producto.activo,
        precioVenta: valor,
        precioProveedor: producto.precioProveedor,
      })
      setPrecioEnEdicion((prev) => {
        const { [producto.id]: _, ...resto } = prev
        return resto
      })
      setProductoParaPrecio(null)
      await cargarTodo()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar el precio')
    } finally {
      setProcesandoId(null)
    }
  }

  const abrirModalPrecio = (producto: Producto) => {
    setPrecioEnEdicion((prev) => ({ ...prev, [producto.id]: String(producto.precioVenta) }))
    setProductoParaPrecio(producto)
  }

  const cerrarModalPrecio = (productoId: number) => {
    setPrecioEnEdicion((prev) => {
      const { [productoId]: _, ...resto } = prev
      return resto
    })
    setProductoParaPrecio(null)
  }

  const usuariosActivos = useMemo(() => usuarios.filter((u) => u.activo).length, [usuarios])
  const sucursalesActivas = useMemo(() => sucursales.filter((s) => s.activa).length, [sucursales])
  const productosActivos = useMemo(() => productos.filter((p) => p.activo).length, [productos])

  const usuariosFiltrados = useMemo(() => {
    const q = busquedaUsuarios.trim().toLowerCase()
    if (!q) return usuarios
    return usuarios.filter(
      (u) => u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    )
  }, [usuarios, busquedaUsuarios])

  const sucursalesFiltradas = useMemo(() => {
    const q = busquedaSucursales.trim().toLowerCase()
    if (!q) return sucursales
    return sucursales.filter(
      (s) =>
        s.nombre.toLowerCase().includes(q) ||
        (s.ciudad ?? '').toLowerCase().includes(q) ||
        (s.direccion ?? '').toLowerCase().includes(q),
    )
  }, [sucursales, busquedaSucursales])

  const productosFiltrados = useMemo(() => {
    const q = busquedaProductos.trim().toLowerCase()
    if (!q) return productos
    return productos.filter(
      (p) =>
        p.sku.toLowerCase().includes(q) ||
        p.nombre.toLowerCase().includes(q) ||
        (p.categoria ?? '').toLowerCase().includes(q),
    )
  }, [productos, busquedaProductos])

  const handleUsuarioCreado = () => {
    setMostrarModalUsuario(false)
    return cargarTodo()
  }

  const handleSucursalCreada = () => {
    setMostrarModalSucursal(false)
    return cargarTodo()
  }

  const handleProductoCreado = () => {
    setMostrarModalProducto(false)
    return cargarTodo()
  }

  return (
    <div className="page page-fixed-header admin-page">
      <div className="page-header-sticky">
        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`tab-button ${tab === t.id ? 'tab-button--activo' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        {error && <p className="error-text">{error}</p>}

        {!isLoading && tab === 'usuarios' && (
          <>
            <div className="kpi-row kpi-row--compacta">
              <KpiTile icon="visitas" label="Total de usuarios" value={String(usuarios.length)} />
              <KpiTile icon="tendenciaSubida" label="Activos" value={String(usuariosActivos)} />
              <KpiTile
                icon="tendenciaBajada"
                label="Inactivos"
                value={String(usuarios.length - usuariosActivos)}
              />
            </div>

            <div className="admin-section-header">
              <div className="admin-section-heading">
                <h2>Usuarios</h2>
                <p className="admin-section-subtitle">Gestiona los usuarios y permisos del sistema</p>
              </div>
              <button
                type="button"
                className="admin-cta-button"
                onClick={() => setMostrarModalUsuario(true)}
              >
                + Nuevo usuario
              </button>
            </div>

            <input
              type="search"
              className="admin-search"
              placeholder="Buscar por nombre o email..."
              value={busquedaUsuarios}
              onChange={(e) => setBusquedaUsuarios(e.target.value)}
            />
          </>
        )}

        {!isLoading && tab === 'sucursales' && (
          <>
            <div className="kpi-row kpi-row--compacta">
              <KpiTile icon="sucursales" label="Total de sucursales" value={String(sucursales.length)} />
              <KpiTile icon="tendenciaSubida" label="Activas" value={String(sucursalesActivas)} />
              <KpiTile
                icon="tendenciaBajada"
                label="Inactivas"
                value={String(sucursales.length - sucursalesActivas)}
              />
            </div>

            <div className="admin-section-header">
              <div className="admin-section-heading">
                <h2>Sucursales</h2>
                <p className="admin-section-subtitle">Administra las sucursales de la organización</p>
              </div>
              <button
                type="button"
                className="admin-cta-button"
                onClick={() => setMostrarModalSucursal(true)}
              >
                + Nueva sucursal
              </button>
            </div>

            <input
              type="search"
              className="admin-search"
              placeholder="Buscar por nombre o ciudad..."
              value={busquedaSucursales}
              onChange={(e) => setBusquedaSucursales(e.target.value)}
            />
          </>
        )}

        {!isLoading && tab === 'productos' && (
          <>
            <div className="kpi-row kpi-row--compacta">
              <KpiTile icon="inventario" label="Total de productos" value={String(productos.length)} />
              <KpiTile icon="tendenciaSubida" label="Activos" value={String(productosActivos)} />
              <KpiTile
                icon="tendenciaBajada"
                label="Desactivados"
                value={String(productos.length - productosActivos)}
              />
            </div>

            <div className="admin-section-header">
              <div className="admin-section-heading">
                <h2>Productos</h2>
                <p className="admin-section-subtitle">Administra el catálogo de productos</p>
              </div>
              <button
                type="button"
                className="admin-cta-button"
                onClick={() => setMostrarModalProducto(true)}
              >
                + Nuevo producto
              </button>
            </div>

            <input
              type="search"
              className="admin-search"
              placeholder="Buscar por SKU, nombre o categoría..."
              value={busquedaProductos}
              onChange={(e) => setBusquedaProductos(e.target.value)}
            />
          </>
        )}
      </div>

      <div className="page-scroll-body">
        {isLoading && <p>Cargando...</p>}

        {!isLoading && tab === 'usuarios' && (
          <div className="admin-card admin-card--tabla">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Sucursal</th>
                    <th>Estado</th>
                    <th className="table-actions-col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={6}>No hay usuarios que coincidan con la búsqueda.</td>
                    </tr>
                  )}
                  {usuariosFiltrados.map((u) => (
                    <tr key={u.id}>
                      <td className="celda-principal">{u.nombre}</td>
                      <td>{u.email}</td>
                      <td>
                        <span className="badge-neutral">{ROL_LABEL[u.rol]}</span>
                      </td>
                      <td>{u.sucursalNombre ?? '—'}</td>
                      <td>
                        <span className={`estado-badge ${u.activo ? 'estado-badge-ok' : 'estado-badge estado-3'}`}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="table-actions-cell">
                        {u.rol !== 'AdministradorGeneral' && (
                          <ActionsMenu
                            acciones={[
                              u.activo
                                ? {
                                    label: 'Desactivar',
                                    tone: 'danger',
                                    onSelect: () => setUsuarioParaDesactivar(u),
                                  }
                                : {
                                    label: 'Reactivar',
                                    onSelect: () => toggleUsuarioActivo(u),
                                  },
                              {
                                label: 'Eliminar',
                                tone: 'danger',
                                onSelect: () => setUsuarioParaEliminar(u),
                              },
                            ]}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!isLoading && tab === 'sucursales' && (
          <div className="admin-card admin-card--tabla">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Ciudad</th>
                    <th>Dirección</th>
                    <th>Teléfono</th>
                    <th>Estado</th>
                    <th className="table-actions-col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sucursalesFiltradas.length === 0 && (
                    <tr>
                      <td colSpan={6}>No hay sucursales que coincidan con la búsqueda.</td>
                    </tr>
                  )}
                  {sucursalesFiltradas.map((s) => (
                    <tr key={s.id}>
                      <td className="celda-principal">{s.nombre}</td>
                      <td>{s.ciudad ?? '—'}</td>
                      <td>{s.direccion ?? '—'}</td>
                      <td>{s.telefono ?? '—'}</td>
                      <td>
                        <span className={`estado-badge ${s.activa ? 'estado-badge-ok' : 'estado-badge estado-3'}`}>
                          {s.activa ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="table-actions-cell">
                        <ActionsMenu
                          acciones={[
                            s.activa
                              ? {
                                  label: 'Desactivar',
                                  tone: 'danger',
                                  onSelect: () => setSucursalParaDesactivar(s),
                                }
                              : {
                                  label: 'Reactivar',
                                  onSelect: () => toggleSucursalActiva(s),
                                },
                            {
                              label: 'Eliminar',
                              tone: 'danger',
                              onSelect: () => setSucursalParaEliminar(s),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!isLoading && tab === 'productos' && (
          <div className="admin-card admin-card--tabla">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Nombre</th>
                    <th>Categoría</th>
                    <th className="col-precio">Precio de venta</th>
                    <th>Estado</th>
                    <th className="table-actions-col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {productosFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={6}>No hay productos que coincidan con la búsqueda.</td>
                    </tr>
                  )}
                  {productosFiltrados.map((p) => (
                    <tr key={p.id}>
                      <td className="celda-mono">{p.sku}</td>
                      <td className="celda-principal">{p.nombre}</td>
                      <td>{p.categoria ? <span className="badge-neutral">{p.categoria}</span> : '—'}</td>
                      <td className="col-precio">{formatearMoneda(p.precioVenta)}</td>
                      <td>
                        <span className={`estado-badge ${p.activo ? 'estado-badge-ok' : 'estado-badge estado-3'}`}>
                          {p.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="table-actions-cell">
                        <ActionsMenu
                          acciones={[
                            {
                              label: 'Editar precio',
                              onSelect: () => abrirModalPrecio(p),
                            },
                            p.activo
                              ? {
                                  label: 'Desactivar',
                                  tone: 'danger',
                                  onSelect: () => setProductoParaDesactivar(p),
                                }
                              : {
                                  label: 'Activar',
                                  onSelect: () => toggleProductoActivo(p),
                                },
                            {
                              label: 'Eliminar',
                              tone: 'danger',
                              onSelect: () => setProductoParaEliminar(p),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {mostrarModalUsuario && (
        <Modal title="Crear nuevo usuario" onClose={() => setMostrarModalUsuario(false)}>
          <UsuarioForm onCreado={handleUsuarioCreado} />
        </Modal>
      )}

      {mostrarModalSucursal && (
        <Modal title="Crear nueva sucursal" onClose={() => setMostrarModalSucursal(false)}>
          <SucursalForm onCreada={handleSucursalCreada} />
        </Modal>
      )}

      {mostrarModalProducto && (
        <Modal title="Crear nuevo producto" size="lg" onClose={() => setMostrarModalProducto(false)}>
          <ProductoForm onCreado={handleProductoCreado} />
        </Modal>
      )}

      {productoParaPrecio && (
        <Modal title="Editar precio" onClose={() => cerrarModalPrecio(productoParaPrecio.id)}>
          <div className="modal-producto-info">
            <span className="modal-producto-nombre">{productoParaPrecio.nombre}</span>
            <span className="modal-producto-meta">SKU: {productoParaPrecio.sku}</span>
            {productoParaPrecio.categoria && (
              <span className="modal-producto-meta">Categoría: {productoParaPrecio.categoria}</span>
            )}
          </div>

          <div className="form-row">
            <label htmlFor="modal-precio-venta">Precio de venta</label>
            <input
              id="modal-precio-venta"
              type="number"
              min="0"
              step="any"
              autoFocus
              value={precioEnEdicion[productoParaPrecio.id] ?? ''}
              onChange={(e) =>
                setPrecioEnEdicion((prev) => ({ ...prev, [productoParaPrecio.id]: e.target.value }))
              }
            />
          </div>

          {error && <p className="error-text">{error}</p>}

          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => cerrarModalPrecio(productoParaPrecio.id)}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={procesandoId === productoParaPrecio.id}
              onClick={() => guardarPrecio(productoParaPrecio)}
            >
              {procesandoId === productoParaPrecio.id ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </Modal>
      )}

      {productoParaDesactivar && (
        <Modal title="Desactivar producto" onClose={() => setProductoParaDesactivar(null)}>
          <p>¿Estás seguro de que deseas desactivar este producto?</p>
          <div className="modal-producto-info">
            <span className="modal-producto-nombre">{productoParaDesactivar.nombre}</span>
            <span className="modal-producto-meta">SKU: {productoParaDesactivar.sku}</span>
          </div>
          <p className="modal-warning">
            El producto dejará de aparecer en el inventario y catálogo de todas las sucursales.
          </p>

          {error && <p className="error-text">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={() => setProductoParaDesactivar(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className="danger-button"
              disabled={procesandoId === productoParaDesactivar.id}
              onClick={() => toggleProductoActivo(productoParaDesactivar)}
            >
              {procesandoId === productoParaDesactivar.id ? 'Desactivando...' : 'Desactivar producto'}
            </button>
          </div>
        </Modal>
      )}

      {usuarioParaDesactivar && (
        <Modal title="Desactivar usuario" onClose={() => setUsuarioParaDesactivar(null)}>
          <p>¿Estás seguro de que deseas desactivar este usuario?</p>
          <div className="modal-producto-info">
            <span className="modal-producto-nombre">{usuarioParaDesactivar.nombre}</span>
            <span className="modal-producto-meta">{usuarioParaDesactivar.email}</span>
          </div>
          <p className="modal-warning">El usuario no podrá volver a iniciar sesión mientras esté inactivo.</p>

          {error && <p className="error-text">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={() => setUsuarioParaDesactivar(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className="danger-button"
              disabled={procesandoId === usuarioParaDesactivar.id}
              onClick={() => toggleUsuarioActivo(usuarioParaDesactivar)}
            >
              {procesandoId === usuarioParaDesactivar.id ? 'Desactivando...' : 'Desactivar usuario'}
            </button>
          </div>
        </Modal>
      )}

      {sucursalParaDesactivar && (
        <Modal title="Desactivar sucursal" onClose={() => setSucursalParaDesactivar(null)}>
          <p>¿Estás seguro de que deseas desactivar esta sucursal?</p>
          <div className="modal-producto-info">
            <span className="modal-producto-nombre">{sucursalParaDesactivar.nombre}</span>
            {sucursalParaDesactivar.ciudad && (
              <span className="modal-producto-meta">{sucursalParaDesactivar.ciudad}</span>
            )}
          </div>

          {error && <p className="error-text">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={() => setSucursalParaDesactivar(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className="danger-button"
              disabled={procesandoId === sucursalParaDesactivar.id}
              onClick={() => toggleSucursalActiva(sucursalParaDesactivar)}
            >
              {procesandoId === sucursalParaDesactivar.id ? 'Desactivando...' : 'Desactivar sucursal'}
            </button>
          </div>
        </Modal>
      )}

      {usuarioParaEliminar && (
        <Modal title="Eliminar usuario" onClose={() => setUsuarioParaEliminar(null)}>
          <p>¿Estás seguro de que deseas eliminar este usuario de forma permanente?</p>
          <div className="modal-producto-info">
            <span className="modal-producto-nombre">{usuarioParaEliminar.nombre}</span>
            <span className="modal-producto-meta">{usuarioParaEliminar.email}</span>
          </div>
          <p className="modal-warning">
            Esta acción es irreversible. Si el usuario tiene ventas, compras, movimientos de
            inventario o visitas registradas, ese historial se eliminará también junto con él.
            Si solo quieres impedir que inicie sesión, usa "Desactivar" en su lugar.
          </p>

          {error && <p className="error-text">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={() => setUsuarioParaEliminar(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className="danger-button"
              disabled={procesandoId === usuarioParaEliminar.id}
              onClick={() => eliminarUsuarioDefinitivo(usuarioParaEliminar)}
            >
              {procesandoId === usuarioParaEliminar.id ? 'Eliminando...' : 'Eliminar usuario'}
            </button>
          </div>
        </Modal>
      )}

      {sucursalParaEliminar && (
        <Modal title="Eliminar sucursal" onClose={() => setSucursalParaEliminar(null)}>
          <p>¿Estás seguro de que deseas eliminar esta sucursal de forma permanente?</p>
          <div className="modal-producto-info">
            <span className="modal-producto-nombre">{sucursalParaEliminar.nombre}</span>
            {sucursalParaEliminar.ciudad && (
              <span className="modal-producto-meta">{sucursalParaEliminar.ciudad}</span>
            )}
          </div>
          <p className="modal-warning">
            Esta acción es irreversible. Se eliminará también todo el inventario, ventas, compras,
            transferencias, visitas y usuarios asociados a esta sucursal. Si solo quieres dejar de
            operarla, usa "Desactivar" en su lugar.
          </p>

          {error && <p className="error-text">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={() => setSucursalParaEliminar(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className="danger-button"
              disabled={procesandoId === sucursalParaEliminar.id}
              onClick={() => eliminarSucursalDefinitiva(sucursalParaEliminar)}
            >
              {procesandoId === sucursalParaEliminar.id ? 'Eliminando...' : 'Eliminar sucursal'}
            </button>
          </div>
        </Modal>
      )}

      {productoParaEliminar && (
        <Modal title="Eliminar producto" onClose={() => setProductoParaEliminar(null)}>
          <p>¿Estás seguro de que deseas eliminar este producto de forma permanente?</p>
          <div className="modal-producto-info">
            <span className="modal-producto-nombre">{productoParaEliminar.nombre}</span>
            <span className="modal-producto-meta">SKU: {productoParaEliminar.sku}</span>
          </div>
          <p className="modal-warning">
            Esta acción es irreversible. Si el producto tiene ventas, compras o movimientos de
            inventario registrados, ese historial se eliminará también junto con él. Si solo
            quieres sacarlo del catálogo, usa "Desactivar" en su lugar.
          </p>

          {error && <p className="error-text">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={() => setProductoParaEliminar(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className="danger-button"
              disabled={procesandoId === productoParaEliminar.id}
              onClick={() => eliminarProductoDefinitivo(productoParaEliminar)}
            >
              {procesandoId === productoParaEliminar.id ? 'Eliminando...' : 'Eliminar producto'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
