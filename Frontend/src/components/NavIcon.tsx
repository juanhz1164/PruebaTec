import {
  LayoutDashboard,
  Boxes,
  Building2,
  ShoppingCart,
  Receipt,
  ArrowLeftRight,
  Truck,
  FileBarChart,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Flame,
  Users,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export type NavIconName =
  | 'panel'
  | 'inventario'
  | 'sucursales'
  | 'compras'
  | 'ventas'
  | 'transferencias'
  | 'logistica'
  | 'reportes'
  | 'dinero'
  | 'tendenciaSubida'
  | 'tendenciaBajada'
  | 'agotandose'
  | 'visitas'
  | 'administracion'

const ICONS: Record<NavIconName, LucideIcon> = {
  panel: LayoutDashboard,
  inventario: Boxes,
  sucursales: Building2,
  compras: ShoppingCart,
  ventas: Receipt,
  transferencias: ArrowLeftRight,
  logistica: Truck,
  reportes: FileBarChart,
  dinero: DollarSign,
  tendenciaSubida: TrendingUp,
  tendenciaBajada: TrendingDown,
  agotandose: Flame,
  visitas: Users,
  administracion: Settings,
}

export function NavIcon({ name, size = 18 }: { name: NavIconName; size?: number }) {
  const Icon = ICONS[name]
  return <Icon className="nav-icon" width={size} height={size} strokeWidth={1.8} aria-hidden="true" />
}
