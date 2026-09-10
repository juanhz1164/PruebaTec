import { useEffect, useState } from 'react'
import { Calendar } from 'lucide-react'
import { Modal } from './Modal'

const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function formatearEtiqueta(valorIso: string): string {
  const [anio, mes] = valorIso.split('-').map(Number)
  return `${NOMBRES_MES[mes - 1].toLowerCase()} de ${anio}`
}

// Selector de mes propio (reemplaza <input type="month">): el popup nativo
// de ese control lo dibuja el sistema operativo/navegador fuera del DOM de
// la página, así que no había forma de evitar que se cortara contra el
// borde de la ventana. Se resuelve con el Modal genérico de la app (mismo
// componente que usan el resto de los diálogos): overlay centrado, siempre
// completamente visible sin importar dónde esté el botón que lo abre.
export function MonthPicker({
  value,
  onChange,
  max,
  className,
}: {
  value: string
  onChange: (valor: string) => void
  max?: string
  className?: string
}) {
  const [abierto, setAbierto] = useState(false)
  const [anioMostrado, setAnioMostrado] = useState(() => Number(value.split('-')[0]))

  const [anioSeleccionado, mesSeleccionado] = value.split('-').map(Number)
  const [anioMax, mesMax] = max ? max.split('-').map(Number) : [Infinity, Infinity]

  useEffect(() => {
    if (abierto) setAnioMostrado(anioSeleccionado)
  }, [abierto, anioSeleccionado])

  const mesDeshabilitado = (mes: number) =>
    anioMostrado > anioMax || (anioMostrado === anioMax && mes > mesMax)

  return (
    <>
      <button
        type="button"
        className={`month-picker-trigger ${className ?? ''}`}
        aria-haspopup="dialog"
        onClick={() => setAbierto(true)}
      >
        <Calendar size={14} strokeWidth={2} />
        {formatearEtiqueta(value)}
      </button>

      {abierto && (
        <Modal title="Seleccionar mes" onClose={() => setAbierto(false)}>
          <div className="month-picker-anio">
            <button type="button" onClick={() => setAnioMostrado((a) => a - 1)} aria-label="Año anterior">
              ‹
            </button>
            <span>{anioMostrado}</span>
            <button
              type="button"
              onClick={() => setAnioMostrado((a) => a + 1)}
              disabled={anioMostrado >= anioMax}
              aria-label="Año siguiente"
            >
              ›
            </button>
          </div>

          <div className="month-picker-grid">
            {NOMBRES_MES.map((nombre, i) => {
              const mes = i + 1
              const esSeleccionado = anioMostrado === anioSeleccionado && mes === mesSeleccionado
              return (
                <button
                  key={nombre}
                  type="button"
                  className={`month-picker-mes ${esSeleccionado ? 'month-picker-mes--activo' : ''}`}
                  disabled={mesDeshabilitado(mes)}
                  onClick={() => {
                    onChange(`${anioMostrado}-${String(mes).padStart(2, '0')}`)
                    setAbierto(false)
                  }}
                >
                  {nombre}
                </button>
              )
            })}
          </div>
        </Modal>
      )}
    </>
  )
}
