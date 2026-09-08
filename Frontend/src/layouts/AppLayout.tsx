import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { NavIcon, type NavIconName } from '../components/NavIcon'
import { ThemeToggle } from '../components/ThemeToggle'

const ROL_CLASS: Record<string, string> = {
  AdministradorGeneral: 'rol-admin',
  GerenteSucursal: 'rol-gerente',
  OperadorInventario: 'rol-operador',
}

const NO_ADMIN_GENERAL = ['GerenteSucursal', 'OperadorInventario']

const NAV_ITEMS: { to: string; label: string; icon: NavIconName; roles: readonly string[] | null }[] = [
  { to: '/', label: 'Panel general', icon: 'panel', roles: null },
  {
    to: '/comparativa-sucursales',
    label: 'Comparativa de sucursales',
    icon: 'tendenciaSubida',
    roles: ['AdministradorGeneral'],
  },
  {
    to: '/administracion',
    label: 'Administración',
    icon: 'administracion',
    roles: ['AdministradorGeneral'],
  },
  { to: '/inventario', label: 'Inventario', icon: 'inventario', roles: NO_ADMIN_GENERAL },
  { to: '/inventario/otras-sucursales', label: 'Inventario de sucursales', icon: 'sucursales', roles: null },
  { to: '/visitas', label: 'Visitas', icon: 'visitas', roles: NO_ADMIN_GENERAL },
  { to: '/ventas', label: 'Ventas', icon: 'ventas', roles: NO_ADMIN_GENERAL },
  { to: '/compras', label: 'Compras', icon: 'compras', roles: null },
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
    <div className={`app-shell ${usuario ? ROL_CLASS[usuario.rol] : ''}`}>
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
          <button type="button" className="logout-button" onClick={logout}>
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
            Cerrar sesión
          </button>
        </div>
      </aside>
      <div className="app-main">
        <div className="app-topbar">
          <span className={`app-topbar-name ${usuario ? ROL_CLASS[usuario.rol] : ''}`}>
            {usuario?.nombre}
          </span>
          {usuario?.sucursalNombre && (
            <span className="app-topbar-sucursal">· {usuario.sucursalNombre}</span>
          )}
          <ThemeToggle />
        </div>
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
