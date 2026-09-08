import { useEffect, useRef, useState } from 'react'

export interface AccionMenu {
  label: string
  onSelect: () => void
  tone?: 'default' | 'danger' | 'success'
  disabled?: boolean
}

// Menú "⋮" reutilizable para filas de tabla: agrupa acciones que antes eran
// botones de texto sueltos en la celda. Se cierra solo al hacer clic fuera.
export function ActionsMenu({ acciones }: { acciones: AccionMenu[] }) {
  const [abierto, setAbierto] = useState(false)
  const contenedorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return

    const handleClickFuera = (event: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(event.target as Node)) {
        setAbierto(false)
      }
    }

    document.addEventListener('mousedown', handleClickFuera)
    return () => document.removeEventListener('mousedown', handleClickFuera)
  }, [abierto])

  return (
    <div className="actions-menu" ref={contenedorRef}>
      <button
        type="button"
        className="actions-menu-trigger"
        aria-label="Abrir acciones"
        aria-haspopup="true"
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
      >
        ⋮
      </button>
      {abierto && (
        <div className="actions-menu-dropdown" role="menu">
          {acciones.map((accion) => (
            <button
              key={accion.label}
              type="button"
              role="menuitem"
              className={`actions-menu-item ${
                accion.tone === 'danger'
                  ? 'actions-menu-item--danger'
                  : accion.tone === 'success'
                    ? 'actions-menu-item--success'
                    : ''
              }`}
              disabled={accion.disabled}
              onClick={() => {
                setAbierto(false)
                accion.onSelect()
              }}
            >
              {accion.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
