import { useEffect, useState } from 'react'
import { Calendar } from 'lucide-react'
import { Modal } from './Modal'

const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const DIAS_SEMANA = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']

function formatearEtiqueta(valorIso: string): string {
  const [anio, mes, dia] = valorIso.split('-').map(Number)
  return new Date(anio, mes - 1, dia).toLocaleDateString('es-CO', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

// Lunes=0 ... Domingo=6 (getDay() nativo es Domingo=0, se rota para que la
// grilla empiece en lunes, como el resto de calendarios en español).
function diaSemanaLunesPrimero(fecha: Date): number {
  return (fecha.getDay() + 6) % 7
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

// Selector de día propio (reemplaza <input type="date">): mismo motivo y
// mismo patrón que MonthPicker — el calendario nativo del navegador se
// dibuja fuera del DOM de la página y no puede controlarse con CSS/JS
// propios, así que se abre en el Modal genérico de la app en su lugar.
export function DatePicker({
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
  const [mesMostrado, setMesMostrado] = useState(() => Number(value.split('-')[1]) - 1)

  const [anioSel, mesSel, diaSel] = value.split('-').map(Number)
  const maxFecha = max ? new Date(`${max}T23:59:59`) : null

  useEffect(() => {
    if (!abierto) return
    setAnioMostrado(anioSel)
    setMesMostrado(mesSel - 1)
  }, [abierto, anioSel, mesSel])

  const cambiarMes = (delta: number) => {
    let m = mesMostrado + delta
    let a = anioMostrado
    if (m < 0) { m = 11; a -= 1 }
    if (m > 11) { m = 0; a += 1 }
    setMesMostrado(m)
    setAnioMostrado(a)
  }

  const primerDiaMes = new Date(anioMostrado, mesMostrado, 1)
  const diasEnMes = new Date(anioMostrado, mesMostrado + 1, 0).getDate()
  const espaciosVacios = diaSemanaLunesPrimero(primerDiaMes)

  const celdas: (number | null)[] = [
    ...Array(espaciosVacios).fill(null),
    ...Array.from({ length: diasEnMes }, (_, i) => i + 1),
  ]

  const diaDeshabilitado = (dia: number) => {
    if (!maxFecha) return false
    return new Date(anioMostrado, mesMostrado, dia) > maxFecha
  }

  const siguienteMesDeshabilitado = maxFecha
    ? anioMostrado > maxFecha.getFullYear() ||
      (anioMostrado === maxFecha.getFullYear() && mesMostrado >= maxFecha.getMonth())
    : false

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
        <Modal title="Seleccionar día" onClose={() => setAbierto(false)}>
          <div className="month-picker-anio">
            <button type="button" onClick={() => cambiarMes(-1)} aria-label="Mes anterior">
              ‹
            </button>
            <span>
              {NOMBRES_MES[mesMostrado]} {anioMostrado}
            </span>
            <button
              type="button"
              onClick={() => cambiarMes(1)}
              disabled={siguienteMesDeshabilitado}
              aria-label="Mes siguiente"
            >
              ›
            </button>
          </div>

          <div className="date-picker-dias-semana">
            {DIAS_SEMANA.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          <div className="date-picker-grid">
            {celdas.map((dia, i) => {
              if (dia === null) return <span key={`vacio-${i}`} />
              const esSeleccionado =
                anioMostrado === anioSel && mesMostrado === mesSel - 1 && dia === diaSel
              return (
                <button
                  key={dia}
                  type="button"
                  className={`date-picker-dia ${esSeleccionado ? 'date-picker-dia--activo' : ''}`}
                  disabled={diaDeshabilitado(dia)}
                  onClick={() => {
                    onChange(`${anioMostrado}-${pad(mesMostrado + 1)}-${pad(dia)}`)
                    setAbierto(false)
                  }}
                >
                  {dia}
                </button>
              )
            })}
          </div>
        </Modal>
      )}
    </>
  )
}
