import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { NavIcon, type NavIconName } from '../components/NavIcon'
import { ROL_LABEL } from '../types/auth'

const ROL_CLASS: Record<string, string> = {
  AdministradorGeneral: 'rol-admin',
  GerenteSucursal: 'rol-gerente',
  OperadorInventario: 'rol-operador',
}

const NAV_ITEMS: { to: string; label: string; icon: NavIconName; roles: readonly string[] | null }[] = [
  { to: '/', label: 'Panel general', icon: 'panel', roles: null },
  { to: '/inventario', label: 'Inventario', icon: 'inventario', roles: null },
  { to: '/inventario/otras-sucursales', label: 'Otras sucursales', icon: 'sucursales', roles: null },
  { to: '/compras', label: 'Compras', icon: 'compras', roles: ['AdministradorGeneral', 'GerenteSucursal'] },
  { to: '/ventas', label: 'Ventas', icon: 'ventas', roles: null },
  { to: '/transferencias', label: 'Transferencias', icon: 'transferencias', roles: null },
  { to: '/logistica', label: 'Logística', icon: 'logistica', roles: null },
  { to: '/reportes', label: 'Reportes del mes', icon: 'reportes', roles: null },
]

export function AppLayout() {
  const { usuario, logout } = useAuth()

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (usuario && item.roles.includes(usuario.rol)),
  )

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <span className="app-title">Inventario Multi-Sucursal</span>
        <nav className="app-nav">
          {visibleItems.map((item) => (
            <NavLink key={item.to} to={item.to} end>
              <NavIcon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="app-user">
          {usuario && (
            <span className={`app-user-role ${ROL_CLASS[usuario.rol]}`}>
              {ROL_LABEL[usuario.rol]}
            </span>
          )}
          <span className="app-user-name">{usuario?.nombre}</span>
          <button type="button" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </aside>
      <div className="app-main">
        <div className="app-topbar">
          {usuario && (
            <span className={`app-user-role ${ROL_CLASS[usuario.rol]}`}>
              {ROL_LABEL[usuario.rol]}
            </span>
          )}
          <span className="app-topbar-name">{usuario?.nombre}</span>
          {usuario?.sucursalNombre && (
            <span className="app-topbar-sucursal">· {usuario.sucursalNombre}</span>
          )}
        </div>
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
