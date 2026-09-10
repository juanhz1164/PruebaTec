import { type ReactNode } from 'react'
import { X } from 'lucide-react'

// Modal genérico reutilizado por todos los diálogos de la app: header con
// título + descripción opcional, cuerpo con scroll interno, y footer fijo
// para que los botones de acción nunca se muevan cuando el contenido crece.
export function Modal({
  title,
  description,
  onClose,
  children,
  size = 'md',
  footer,
}: {
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  size?: 'md' | 'lg' | 'xl'
  // Pie fijo fuera del área con scroll de .modal-body (p.ej. el botón de
  // enviar un formulario largo): evita el truco de position:sticky con
  // offsets negativos, que seguía sumando espacio fantasma al contenido y
  // disparaba un scroll incluso cuando todo cabía en pantalla.
  footer?: ReactNode
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-panel ${size === 'lg' ? 'modal-panel--ancho' : ''} ${size === 'xl' ? 'modal-panel--extra-ancho' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-header-text">
            <h2>{title}</h2>
            {description && <p className="modal-description">{description}</p>}
          </div>
          <button type="button" className="modal-close" aria-label="Cerrar" onClick={onClose}>
            <X size={16} strokeWidth={2} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}
