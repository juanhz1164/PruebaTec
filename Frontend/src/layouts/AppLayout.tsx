import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', roles: null },
  { to: '/inventario', label: 'Inventario', roles: null },
  { to: '/inventario/otras-sucursales', label: 'Otras sucursales', roles: null },
  { to: '/compras', label: 'Compras', roles: ['AdministradorGeneral', 'GerenteSucursal'] },
  { to: '/ventas', label: 'Ventas', roles: null },
  { to: '/transferencias', label: 'Transferencias', roles: null },
  { to: '/logistica', label: 'Logística', roles: null },
] as const

export function AppLayout() {
  const { usuario, logout } = useAuth()

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (usuario && (item.roles as readonly string[]).includes(usuario.rol)),
  )

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-title">Inventario Multi-Sucursal</span>
        <nav className="app-nav">
          {visibleItems.map((item) => (
            <NavLink key={item.to} to={item.to} end>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="app-user">
          <span>{usuario?.nombre}</span>
          <span className="app-user-role">{usuario?.rol}</span>
          <button type="button" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </header>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  )
}
