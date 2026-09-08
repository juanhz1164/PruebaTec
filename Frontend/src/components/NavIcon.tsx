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

const PATHS: Record<NavIconName, React.ReactNode> = {
  panel: (
    <>
      <rect x="3" y="12" width="4" height="8" rx="1" />
      <rect x="10" y="8" width="4" height="12" rx="1" />
      <rect x="17" y="4" width="4" height="16" rx="1" />
    </>
  ),
  inventario: (
    <>
      <path d="M12 3 3 7.5v9L12 21l9-4.5v-9z" />
      <path d="M3 7.5 12 12l9-4.5M12 12v9" />
    </>
  ),
  sucursales: (
    <>
      <path d="M4 21V6a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v15" />
      <path d="M14 21v-9a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v9" />
      <path d="M2 21h20" />
      <path d="M7 9h1M7 13h1M7 17h1" />
    </>
  ),
  compras: (
    <>
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
      <path d="M2 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L21 7H6" />
    </>
  ),
  ventas: (
    <>
      <path d="M12 3 21 12l-9 9-9-9z" />
      <circle cx="8.5" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  transferencias: (
    <>
      <path d="M4 8h13" />
      <path d="M13 4l4 4-4 4" />
      <path d="M20 16H7" />
      <path d="M11 12l-4 4 4 4" />
    </>
  ),
  logistica: (
    <>
      <rect x="2" y="7" width="12" height="10" rx="1" />
      <path d="M14 10h4l4 3.5V17h-8z" />
      <circle cx="6" cy="19" r="1.6" />
      <circle cx="17" cy="19" r="1.6" />
    </>
  ),
  reportes: (
    <>
      <path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v5h5" />
      <path d="M8 13h3M8 16.5h8M8 9.5h2" />
    </>
  ),
  dinero: (
    <>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.8" />
      <path d="M5.5 9v0M18.5 15v0" />
    </>
  ),
  tendenciaSubida: (
    <>
      <path d="M3 17 10 10l4 4 7-7" />
      <path d="M15 6h6v6" />
    </>
  ),
  tendenciaBajada: (
    <>
      <path d="M3 7l7 7 4-4 7 7" />
      <path d="M15 18h6v-6" />
    </>
  ),
  agotandose: (
    <>
      <path d="M12 2v6" />
      <path d="M12 8c-3 2.5-5 5.5-5 8a5 5 0 0 0 10 0c0-2.5-2-5.5-5-8Z" />
    </>
  ),
  visitas: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="7" r="2.4" />
      <path d="M15.5 13.2c2.4.5 4.5 2.5 4.5 5.8" />
    </>
  ),
  administracion: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.96 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.96a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.04Z" />
    </>
  ),
}

export function NavIcon({ name }: { name: NavIconName }) {
  return (
    <svg
      className="nav-icon"
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
      {PATHS[name]}
    </svg>
  )
}
