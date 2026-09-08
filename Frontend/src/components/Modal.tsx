import { type ReactNode } from 'react'

// Modal genérico mínimo: overlay + panel centrado. No trae lógica de negocio,
// solo estructura visual reutilizada por los distintos diálogos de Administración.
export function Modal({
  title,
  onClose,
  children,
  size = 'md',
  footer,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  size?: 'md' | 'lg'
  // Pie fijo fuera del área con scroll de .modal-body (p.ej. el botón de
  // enviar un formulario largo): evita el truco de position:sticky con
  // offsets negativos, que seguía sumando espacio fantasma al contenido y
  // disparaba un scroll incluso cuando todo cabía en pantalla.
  footer?: ReactNode
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-panel ${size === 'lg' ? 'modal-panel--ancho' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="modal-close" aria-label="Cerrar" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}
