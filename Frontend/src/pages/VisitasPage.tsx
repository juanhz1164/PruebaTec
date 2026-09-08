import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import {
  getVisitas,
  getResumenVisitas,
  getResumenVisitasPorSucursal,
  registrarVisita,
  eliminarVisita,
} from '../api/visitas'
import { KpiTile } from '../components/KpiTile'
import { Modal } from '../components/Modal'
import type { ResumenVisitas, Visita, VisitasPorSucursal } from '../types/visita'
import { ApiError } from '../api/client'

// El backend guarda fecha_hora en UTC pero filtra "el día" en hora de
// Colombia (ver ZonaHorariaColombia / VisitaRepository), así que "hoy" debe
// calcularse en hora local aquí también — usar getters UTC (o toISOString,
// que es UTC) desalinearía el día mostrado con el que el backend considera
// "hoy" cerca de la medianoche.
function hoyIso(): string {
  const ahora = new Date()
  const anio = ahora.getFullYear()
  const mes = String(ahora.getMonth() + 1).padStart(2, '0')
  const dia = String(ahora.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

function formatearHora(fechaIso: string): string {
  return new Date(fechaIso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

function formatearFecha(fechaIso: string): string {
  return new Date(fechaIso).toLocaleDateString('es-CO')
}

function formatearFechaLarga(fechaIso: string): string {
  // fechaIso viene como "YYYY-MM-DD" (del input date); construir la fecha
  // manualmente evita que new Date("YYYY-MM-DD") la interprete como UTC
  // medianoche y muestre el día anterior en zonas horarias negativas.
  const [anio, mes, dia] = fechaIso.split('-').map(Number)
  return new Date(anio, mes - 1, dia).toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function VisitaCard({ visita, numero, onEliminar }: { visita: Visita; numero: number; onEliminar?: (id: number) => void }) {
  return (
    <div className="visita-card">
      {onEliminar && (
        <button
          type="button"
          className="visita-card-eliminar"
          onClick={() => onEliminar(visita.id)}
          aria-label="Eliminar visita"
          title="Eliminar visita"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          </svg>
        </button>
      )}

      <div className="visita-card-personas">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="8" r="3" />
          <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
          {visita.cantidadPersonas > 1 && (
            <>
              <circle cx="17" cy="7" r="2.4" />
              <path d="M15.5 13.2c2.4.5 4.5 2.5 4.5 5.8" />
            </>
          )}
        </svg>
        <span>
          {visita.cantidadPersonas} persona{visita.cantidadPersonas === 1 ? '' : 's'}
        </span>
      </div>

      <div className="visita-card-meta">
        <span>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          {formatearFecha(visita.fechaHora)}
        </span>
        <span>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 3" />
          </svg>
          {formatearHora(visita.fechaHora)}
        </span>
      </div>

      <div className="visita-card-footer">
        <span className="visita-card-numero">Visita #{numero}</span>
        <span className="visita-card-usuario">{visita.usuarioNombre}</span>
      </div>
    </div>
  )
}

function EstadoVacioVisitas({ titulo, hint }: { titulo: string; hint: string }) {
  return (
    <div className="visitas-vacio">
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        <circle cx="17" cy="7" r="2.4" />
        <path d="M15.5 13.2c2.4.5 4.5 2.5 4.5 5.8" />
      </svg>
      <p>{titulo}</p>
      <span>{hint}</span>
    </div>
  )
}

function HistorialVisitasModal({ onClose }: { onClose: () => void }) {
  const [fecha, setFecha] = useState(hoyIso())
  const [visitas, setVisitas] = useState<Visita[]>([])
  const [resumen, setResumen] = useState<ResumenVisitas | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    setError(null)
    Promise.all([getVisitas(fecha).then(setVisitas), getResumenVisitas(fecha).then(setResumen)])
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar el historial de visitas')
      })
      .finally(() => setIsLoading(false))
  }, [fecha])

  return (
    <Modal title="Historial de visitas" onClose={onClose} size="lg">
      <div className="visitas-historial">
        <p className="admin-section-subtitle">Consulta las visitas registradas en días anteriores.</p>

        <div className="visitas-historial-selector">
          <label htmlFor="visitas-historial-fecha">Fecha</label>
          <input
            id="visitas-historial-fecha"
            type="date"
            value={fecha}
            max={hoyIso()}
            onChange={(e) => setFecha(e.target.value)}
          />
        </div>

        <p className="visitas-historial-fecha-larga">{formatearFechaLarga(fecha)}</p>

        {error && <p className="error-text">{error}</p>}

        <div className="kpi-row kpi-row--compacta">
          <KpiTile icon="visitas" label="Visitas" value={resumen ? String(resumen.totalVisitas) : '0'} />
          <KpiTile icon="ventas" label="Personas" value={resumen ? String(resumen.totalPersonas) : '0'} />
        </div>

        <div className="visitas-historial-listado">
          {isLoading ? (
            <p>Cargando...</p>
          ) : visitas.length === 0 ? (
            <EstadoVacioVisitas
              titulo="No hay visitas registradas"
              hint="En esta fecha no se registraron visitantes."
            />
          ) : (
            <div className="visitas-grid">
              {visitas.map((v, i) => (
                <VisitaCard key={v.id} visita={v} numero={visitas.length - i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

export function VisitasPage() {
  const { usuario } = useAuth()
  const esGerente = usuario?.rol === 'GerenteSucursal'

  const [visitas, setVisitas] = useState<Visita[]>([])
  const [resumen, setResumen] = useState<ResumenVisitas | null>(null)
  const [porSucursal, setPorSucursal] = useState<VisitasPorSucursal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [cantidad, setCantidad] = useState(1)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [confirmandoId, setConfirmandoId] = useState<number | null>(null)
  const [eliminandoId, setEliminandoId] = useState<number | null>(null)
  const [mostrarHistorial, setMostrarHistorial] = useState(false)

  // La pantalla principal siempre opera sobre "hoy": el "reinicio" de cada
  // nuevo día es solo visual (una nueva consulta con la fecha de hoy), nunca
  // un borrado — el historial completo sigue intacto en la base de datos y
  // es accesible desde el modal de historial.
  const cargar = useCallback(() => {
    setIsLoading(true)
    setError(null)
    const fecha = hoyIso()
    const peticiones: Promise<unknown>[] = [
      getVisitas(fecha).then(setVisitas),
      getResumenVisitas(fecha).then(setResumen),
    ]
    if (esGerente) {
      peticiones.push(getResumenVisitasPorSucursal(fecha).then(setPorSucursal))
    }
    return Promise.all(peticiones)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las visitas')
      })
      .finally(() => setIsLoading(false))
  }, [esGerente])

  useEffect(() => {
    cargar()
  }, [cargar])

  const ajustarCantidad = (delta: number) => {
    setCantidad((prev) => Math.max(1, prev + delta))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      setErrorForm('Ingresa un número entero de personas, mayor o igual a 1.')
      return
    }

    setErrorForm(null)
    setIsSubmitting(true)
    try {
      await registrarVisita({ cantidadPersonas: cantidad })
      setCantidad(1)
      await cargar()
    } catch (err) {
      setErrorForm(err instanceof ApiError ? err.message : 'No se pudo registrar la visita')
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmarEliminar = async (id: number) => {
    setEliminandoId(id)
    setError(null)
    try {
      await eliminarVisita(id)
      setConfirmandoId(null)
      await cargar()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar la visita')
    } finally {
      setEliminandoId(null)
    }
  }

  const visitaAEliminar = visitas.find((v) => v.id === confirmandoId)
  const totalVisitasHoy = visitas.length

  return (
    <div className="page page-fixed-header">
      <div className="page-header-sticky">
        <div className="admin-section-heading">
          <h1>Control de ingreso de visitantes</h1>
          <p className="admin-section-subtitle">{formatearFechaLarga(hoyIso())}</p>
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="kpi-row kpi-row--compacta">
          <KpiTile
            icon="visitas"
            label="Visitas"
            value={resumen ? String(resumen.totalVisitas) : '0'}
          />
          <KpiTile
            icon="ventas"
            label="Personas"
            value={resumen ? String(resumen.totalPersonas) : '0'}
          />
          <KpiTile
            icon="tendenciaSubida"
            label="Promedio por visita"
            value={resumen ? resumen.promedioPersonasPorVisita.toFixed(2) : '0.00'}
          />
        </div>
      </div>

      <div className="page-scroll-body">
        {isLoading && <p>Cargando...</p>}

        {!isLoading && (
          <div className="visitas-layout">
            <section className="visitas-registro-card">
              <h2>Registrar visita</h2>
              <p className="dash-card-hint">¿Cuántas personas ingresan?</p>

              <form onSubmit={handleSubmit} className="visitas-registro-form">
                <div className="visitas-stepper">
                  <button type="button" onClick={() => ajustarCantidad(-1)} aria-label="Restar persona">
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={cantidad}
                    onChange={(e) => setCantidad(Math.max(1, Math.trunc(Number(e.target.value)) || 1))}
                  />
                  <button type="button" onClick={() => ajustarCantidad(1)} aria-label="Sumar persona">
                    +
                  </button>
                </div>

                {errorForm && <p className="error-text">{errorForm}</p>}

                <button type="submit" className="visitas-registrar-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Registrando...' : 'Registrar visita'}
                </button>
              </form>

              {esGerente && porSucursal.length > 0 && (
                <div className="visitas-por-sucursal">
                  <h3>Visitas por sucursal</h3>
                  <ul>
                    {[...porSucursal]
                      .sort((a, b) => b.cantidadVisitas - a.cantidadVisitas)
                      .map((s) => (
                        <li key={s.sucursalId}>
                          <span className="visitas-por-sucursal-nombre">{s.sucursalNombre}</span>
                          <span className="visitas-por-sucursal-valor">
                            {s.cantidadVisitas} visita{s.cantidadVisitas === 1 ? '' : 's'} · {s.cantidadPersonas} pers.
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </section>

            <section className="visitas-listado">
              <div className="visitas-listado-header">
                <h2>Visitas de hoy</h2>
                <div className="visitas-listado-header-acciones">
                  {totalVisitasHoy > 0 && (
                    <span className="tr-productos-contador">
                      {totalVisitasHoy} visita{totalVisitasHoy === 1 ? '' : 's'}
                    </span>
                  )}
                  <button type="button" className="secondary-button" onClick={() => setMostrarHistorial(true)}>
                    📅 Ver historial
                  </button>
                </div>
              </div>

              {visitas.length === 0 ? (
                <EstadoVacioVisitas
                  titulo="No hay visitas registradas todavía"
                  hint="Registra la primera visita del día desde el panel de la izquierda"
                />
              ) : (
                <div className="visitas-grid">
                  {visitas.map((v, i) => (
                    <VisitaCard
                      key={v.id}
                      visita={v}
                      numero={visitas.length - i}
                      onEliminar={setConfirmandoId}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {mostrarHistorial && <HistorialVisitasModal onClose={() => setMostrarHistorial(false)} />}

      {visitaAEliminar && (
        <div className="confirm-overlay" role="dialog" aria-modal="true">
          <div className="confirm-dialog">
            <h3>¿Eliminar esta visita?</h3>
            <p>
              Se eliminará el registro de {visitaAEliminar.cantidadPersonas} persona
              {visitaAEliminar.cantidadPersonas === 1 ? '' : 's'} realizado a las{' '}
              {formatearHora(visitaAEliminar.fechaHora)}.
            </p>
            <div className="acciones-cell">
              <button
                type="button"
                className="link-button"
                onClick={() => setConfirmandoId(null)}
                disabled={eliminandoId === visitaAEliminar.id}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="danger-button"
                onClick={() => confirmarEliminar(visitaAEliminar.id)}
                disabled={eliminandoId === visitaAEliminar.id}
              >
                {eliminandoId === visitaAEliminar.id ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
