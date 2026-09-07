import { useEffect, useState } from 'react'
import {
  getTiemposEnvio,
  getClasificacionRutas,
  getTransferenciasEnCurso,
  getCumplimientoPorSucursal,
} from '../api/logistica'
import type {
  ClasificacionRuta,
  Cumplimiento,
  TiempoEnvio,
  TransferenciaEnCurso,
} from '../types/logistica'
import { ESTADO_TRANSFERENCIA_LABEL, PRIORIDAD_TRANSFERENCIA_LABEL } from '../types/transferencia'
import { ApiError } from '../api/client'
import { formatearMoneda } from '../utils/format'

type Tab = 'enCurso' | 'tiempos' | 'rutas' | 'cumplimientoSucursal'

const TABS: { id: Tab; label: string }[] = [
  { id: 'enCurso', label: 'Transferencias en curso' },
  { id: 'tiempos', label: 'Tiempos estimados vs. reales' },
  { id: 'rutas', label: 'Clasificación de rutas' },
  { id: 'cumplimientoSucursal', label: 'Cumplimiento por sucursal' },
]

export function LogisticaPage() {
  const [tab, setTab] = useState<Tab>('enCurso')
  const [tiempos, setTiempos] = useState<TiempoEnvio[]>([])
  const [rutas, setRutas] = useState<ClasificacionRuta[]>([])
  const [enCurso, setEnCurso] = useState<TransferenciaEnCurso[]>([])
  const [cumplimientoSucursal, setCumplimientoSucursal] = useState<Cumplimiento[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    setError(null)
    Promise.all([
      getTiemposEnvio(),
      getClasificacionRutas(),
      getTransferenciasEnCurso(),
      getCumplimientoPorSucursal(),
    ])
      .then(([t, r, ec, cs]) => {
        setTiempos(t)
        setRutas(r)
        setEnCurso(ec)
        setCumplimientoSucursal(cs)
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar la información de logística')
      })
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="page page-fixed-header">
      <div className="page-header-sticky">
        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`tab-button ${tab === t.id ? 'tab-button--activo' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="page-scroll-body">
        {isLoading && <p>Cargando...</p>}
        {error && <p className="error-text">{error}</p>}

        {!isLoading && !error && (
          <div className="logistica-panel">
            {tab === 'enCurso' && (
              <MensajeVacio
                visible={enCurso.length === 0}
                texto="No hay transferencias en curso."
              >
                <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Origen</th>
                      <th>Destino</th>
                      <th>Estado</th>
                      <th>Transportista</th>
                      <th>Ruta</th>
                      <th>Est. llegada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enCurso.map((t) => (
                      <tr key={t.id}>
                        <td>{t.sucursalOrigenNombre}</td>
                        <td>{t.sucursalDestinoNombre}</td>
                        <td>
                          <span className={`estado-badge estado-transferencia-${t.estado}`}>
                            {ESTADO_TRANSFERENCIA_LABEL[t.estado as keyof typeof ESTADO_TRANSFERENCIA_LABEL]}
                          </span>
                        </td>
                        <td>{t.transportista ?? '—'}</td>
                        <td>{t.ruta ?? '—'}</td>
                        <td>
                          {t.fechaEstimadaLlegada ? new Date(t.fechaEstimadaLlegada).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </MensajeVacio>
            )}

            {tab === 'tiempos' && (
              <MensajeVacio visible={tiempos.length === 0} texto="No hay envíos registrados.">
                <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ruta</th>
                      <th>Origen → Destino</th>
                      <th>Días estimados</th>
                      <th>Días reales</th>
                      <th>Desviación</th>
                      <th>Cumplió</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tiempos.map((t) => (
                      <tr key={t.transferenciaId} className={t.cumplioTiempoEstimado === false ? 'row-alert' : undefined}>
                        <td>{t.ruta || '—'}</td>
                        <td>
                          {t.sucursalOrigenNombre} → {t.sucursalDestinoNombre}
                        </td>
                        <td>{t.diasEstimados?.toFixed(1) ?? '—'}</td>
                        <td>{t.diasReales?.toFixed(1) ?? '—'}</td>
                        <td>{t.desviacionDias?.toFixed(1) ?? '—'}</td>
                        <td>
                          {t.cumplioTiempoEstimado === null
                            ? '—'
                            : t.cumplioTiempoEstimado
                              ? 'Sí'
                              : 'No'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </MensajeVacio>
            )}

            {tab === 'rutas' && (
              <MensajeVacio visible={rutas.length === 0} texto="No hay rutas registradas.">
                <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ruta</th>
                      <th>Transferencias</th>
                      <th>Prioridad más frecuente</th>
                      <th>Costo promedio</th>
                      <th>Tiempo promedio (días)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rutas.map((r) => (
                      <tr key={r.ruta}>
                        <td>{r.ruta || '—'}</td>
                        <td>{r.cantidadTransferencias}</td>
                        <td>
                          {r.prioridadMasFrecuente !== null
                            ? PRIORIDAD_TRANSFERENCIA_LABEL[
                                r.prioridadMasFrecuente as keyof typeof PRIORIDAD_TRANSFERENCIA_LABEL
                              ]
                            : '—'}
                        </td>
                        <td>{r.costoPromedio ? formatearMoneda(r.costoPromedio) : '—'}</td>
                        <td>{r.tiempoPromedioDias?.toFixed(1) ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </MensajeVacio>
            )}

            {tab === 'cumplimientoSucursal' && <CumplimientoTable rows={cumplimientoSucursal} />}
          </div>
        )}
      </div>
    </div>
  )
}

// Cuando no hay datos, se muestra un mensaje simple centrado (y, si aplica,
// una guía de pasos para generar el primer dato) en vez de la tabla vacía
// con una sola fila — más limpio que forzar el layout de tabla a comportarse
// como un bloque centrado.
function MensajeVacio({
  visible,
  texto,
  ayuda,
  children,
}: {
  visible: boolean
  texto: string
  ayuda?: React.ReactNode
  children: React.ReactNode
}) {
  if (visible) {
    return (
      <div className="logistica-vacio">
        <p className="logistica-vacio-texto">{texto}</p>
        {ayuda}
      </div>
    )
  }
  return <>{children}</>
}

function CumplimientoTable({ rows }: { rows: Cumplimiento[] }) {
  return (
    <MensajeVacio visible={rows.length === 0} texto="Sin datos.">
      <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th></th>
            <th>Cerradas</th>
            <th>Completas</th>
            <th>Parciales</th>
            <th>% Completas</th>
            <th>% A tiempo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.agrupador}>
              <td>{row.agrupador}</td>
              <td>{row.totalTransferenciasCerradas}</td>
              <td>{row.recibidasCompletas}</td>
              <td>{row.recibidasParciales}</td>
              <td>{row.porcentajeCompletas}%</td>
              <td>{row.porcentajeATiempo}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </MensajeVacio>
  )
}
