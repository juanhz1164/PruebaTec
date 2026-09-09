import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Calendar } from 'lucide-react'

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
// la página, así que ningún CSS nuestro puede evitar que se corte contra el
// borde de la ventana ni agrandar su cuadrícula de meses. Este componente
// mantiene la misma API (value/max/onChange como string "YYYY-MM") pero el
// popup es HTML propio: tamaño y posición quedan bajo nuestro control.
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
  const [posicion, setPosicion] = useState({ top: 0, left: 0 })
  const contenedorRef = useRef<HTMLDivElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  const [anioSeleccionado, mesSeleccionado] = value.split('-').map(Number)
  const [anioMax, mesMax] = max ? max.split('-').map(Number) : [Infinity, Infinity]

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

  // position:fixed con coordenadas calculadas en JS (no absolute) — así el
  // popup nunca queda atrapado por el overflow:hidden de un ancestro (p. ej.
  // .dash-card, que recorta cualquier hijo absolute/relative que se salga de
  // su caja). Se calcula ANTES de pintar (useLayoutEffect, no useEffect)
  // para que el usuario no vea el popup "saltar" de posición tras abrirse.
  // Si abrirlo alineado a la izquierda del botón lo sacaría por el borde
  // derecho de la ventana, se alinea a la derecha del botón en su lugar
  // (el requisito de "voltear hacia la izquierda cerca del borde").
  useLayoutEffect(() => {
    if (!abierto || !contenedorRef.current) return
    const rect = contenedorRef.current.getBoundingClientRect()
    const anchoPopup = 300
    const margen = 12
    const seSaleAbajo = rect.bottom + 8 + 260 > window.innerHeight - margen
    const left = rect.left + anchoPopup > window.innerWidth - margen
      ? Math.max(margen, rect.right - anchoPopup)
      : rect.left
    const top = seSaleAbajo ? rect.top - 260 - 8 : rect.bottom + 8
    setPosicion({ top, left })
  }, [abierto])

  useEffect(() => {
    if (abierto) setAnioMostrado(anioSeleccionado)
  }, [abierto, anioSeleccionado])

  const mesDeshabilitado = (mes: number) =>
    anioMostrado > anioMax || (anioMostrado === anioMax && mes > mesMax)

  return (
    <div className={`month-picker ${className ?? ''}`} ref={contenedorRef}>
      <button
        type="button"
        className="month-picker-trigger"
        aria-haspopup="true"
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
      >
        <Calendar size={14} strokeWidth={2} />
        {formatearEtiqueta(value)}
      </button>

      {abierto && (
        <div
          ref={popupRef}
          className="month-picker-popup"
          style={{ top: posicion.top, left: posicion.left }}
          role="dialog"
          aria-label="Seleccionar mes"
        >
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
                  {nombre.slice(0, 3)}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
