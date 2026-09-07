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

  // La pantalla siempre opera sobre "hoy": el usuario no elige fecha, y el
  // backend ya fija fecha/hora/sucursal/usuario automáticamente al registrar.
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
        <p className="page-subtitle">Control de ingreso de visitantes</p>

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
                <h2>Visitas registradas</h2>
                {totalVisitasHoy > 0 && (
                  <span className="tr-productos-contador">
                    {totalVisitasHoy} visita{totalVisitasHoy === 1 ? '' : 's'}
                  </span>
                )}
              </div>

              {visitas.length === 0 ? (
                <div className="visitas-vacio">
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="8" r="3" />
                    <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
                    <circle cx="17" cy="7" r="2.4" />
                    <path d="M15.5 13.2c2.4.5 4.5 2.5 4.5 5.8" />
                  </svg>
                  <p>No hay visitas registradas todavía</p>
                  <span>Registra la primera visita del día desde el panel de la izquierda</span>
                </div>
              ) : (
                <div className="visitas-grid">
                  {visitas.map((v, i) => (
                    <div key={v.id} className="visita-card">
                      <button
                        type="button"
                        className="visita-card-eliminar"
                        onClick={() => setConfirmandoId(v.id)}
                        aria-label="Eliminar visita"
                        title="Eliminar visita"
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18" />
                          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        </svg>
                      </button>

                      <div className="visita-card-personas">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="9" cy="8" r="3" />
                          <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
                          {v.cantidadPersonas > 1 && (
                            <>
                              <circle cx="17" cy="7" r="2.4" />
                              <path d="M15.5 13.2c2.4.5 4.5 2.5 4.5 5.8" />
                            </>
                          )}
                        </svg>
                        <span>
                          {v.cantidadPersonas} persona{v.cantidadPersonas === 1 ? '' : 's'}
                        </span>
                      </div>

                      <div className="visita-card-meta">
                        <span>
                          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" />
                            <path d="M16 2v4M8 2v4M3 10h18" />
                          </svg>
                          {formatearFecha(v.fechaHora)}
                        </span>
                        <span>
                          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 7v5l3 3" />
                          </svg>
                          {formatearHora(v.fechaHora)}
                        </span>
                      </div>

                      <div className="visita-card-footer">
                        <span className="visita-card-numero">Visita #{visitas.length - i}</span>
                        <span className="visita-card-usuario">{v.usuarioNombre}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

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
