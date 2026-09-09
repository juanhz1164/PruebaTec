import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { ChevronLeft, LogOut } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { NavIcon, type NavIconName } from '../components/NavIcon'
import { ThemeToggle } from '../components/ThemeToggle'

const SIDEBAR_COLAPSADO_KEY = 'sidebar.colapsado'

function leerSidebarColapsado(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLAPSADO_KEY) === 'true'
  } catch {
    return false
  }
}

const ROL_CLASS: Record<string, string> = {
  AdministradorGeneral: 'rol-admin',
  GerenteSucursal: 'rol-gerente',
  OperadorInventario: 'rol-operador',
}

const NO_ADMIN_GENERAL = ['GerenteSucursal', 'OperadorInventario']

const NAV_ITEMS: {
  to: string
  // Puede ser un texto fijo o una función que decide el label según el rol
  // (ej. "Inventarios" para Admin, que no tiene ítem de inventario propio,
  // vs. "Otras sucursales" para Gerente/Operador, que sí lo tienen y
  // "Inventarios" ahí se leía redundante junto a "Inventario").
  label: string | ((rol: string) => string)
  icon: NavIconName
  roles: readonly string[] | null
}[] = [
  { to: '/', label: 'Panel general', icon: 'panel', roles: null },
  {
    to: '/comparativa-sucursales',
    label: 'Comparación',
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
  {
    to: '/inventario/otras-sucursales',
    label: (rol) => (rol === 'AdministradorGeneral' ? 'Inventarios' : 'Otras sucursales'),
    icon: 'sucursales',
    roles: null,
  },
  { to: '/visitas', label: 'Visitas', icon: 'visitas', roles: NO_ADMIN_GENERAL },
  { to: '/ventas', label: 'Ventas', icon: 'ventas', roles: NO_ADMIN_GENERAL },
  { to: '/compras', label: 'Compras', icon: 'compras', roles: null },
  { to: '/transferencias', label: 'Transferencias', icon: 'transferencias', roles: null },
  { to: '/logistica', label: 'Logística', icon: 'logistica', roles: null },
  { to: '/reportes', label: 'Reportes del mes', icon: 'reportes', roles: null },
]

export function AppLayout() {
  const { usuario, logout } = useAuth()
  const [colapsado, setColapsado] = useState(leerSidebarColapsado)

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLAPSADO_KEY, String(colapsado))
    } catch {
      // localStorage no disponible (modo privado, etc.): el toggle sigue
      // funcionando en memoria durante la sesión, solo no persiste.
    }
  }, [colapsado])

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (usuario && item.roles.includes(usuario.rol)),
  )

  return (
    <div className={`app-shell ${usuario ? ROL_CLASS[usuario.rol] : ''}`}>
      <aside className={`app-sidebar ${colapsado ? 'app-sidebar--colapsado' : ''}`}>
        <div className="app-sidebar-header">
          <span className="app-title" title="Inventario Multi-Sucursal">
            Inventario
          </span>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setColapsado((v) => !v)}
            aria-label={colapsado ? 'Expandir menú' : 'Colapsar menú'}
            title={colapsado ? 'Expandir menú' : 'Colapsar menú'}
          >
            <ChevronLeft
              size={16}
              strokeWidth={2.2}
              style={{ transform: colapsado ? 'rotate(180deg)' : undefined, transition: 'transform 0.2s ease' }}
            />
          </button>
        </div>
        <nav className="app-nav">
          {visibleItems.map((item) => {
            const label =
              typeof item.label === 'function' ? item.label(usuario?.rol ?? '') : item.label
            return (
              <NavLink key={item.to} to={item.to} end title={colapsado ? label : undefined}>
                <NavIcon name={item.icon} />
                <span className="app-nav-label">{label}</span>
              </NavLink>
            )
          })}
        </nav>
        <div className="app-user">
          <button
            type="button"
            className="logout-button"
            onClick={logout}
            title={colapsado ? 'Cerrar sesión' : undefined}
          >
            <LogOut size={17} strokeWidth={1.8} />
            <span className="app-nav-label">Cerrar sesión</span>
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
