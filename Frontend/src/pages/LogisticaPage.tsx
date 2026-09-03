import { useEffect, useState } from 'react'
import {
  getTiemposEnvio,
  getClasificacionRutas,
  getTransferenciasEnCurso,
  getCumplimientoPorSucursal,
  getCumplimientoPorRuta,
} from '../api/logistica'
import type {
  ClasificacionRuta,
  Cumplimiento,
  TiempoEnvio,
  TransferenciaEnCurso,
} from '../types/logistica'
import { ESTADO_TRANSFERENCIA_LABEL, PRIORIDAD_TRANSFERENCIA_LABEL } from '../types/transferencia'
import { ApiError } from '../api/client'

export function LogisticaPage() {
  const [tiempos, setTiempos] = useState<TiempoEnvio[]>([])
  const [rutas, setRutas] = useState<ClasificacionRuta[]>([])
  const [enCurso, setEnCurso] = useState<TransferenciaEnCurso[]>([])
  const [cumplimientoSucursal, setCumplimientoSucursal] = useState<Cumplimiento[]>([])
  const [cumplimientoRuta, setCumplimientoRuta] = useState<Cumplimiento[]>([])
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
      getCumplimientoPorRuta(),
    ])
      .then(([t, r, ec, cs, cr]) => {
        setTiempos(t)
        setRutas(r)
        setEnCurso(ec)
        setCumplimientoSucursal(cs)
        setCumplimientoRuta(cr)
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar la información de logística')
      })
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) {
    return (
      <div className="page">
        <h1>Logística</h1>
        <p>Cargando...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page">
        <h1>Logística</h1>
        <p className="error-text">{error}</p>
      </div>
    )
  }

  return (
    <div className="page">
      <h1>Logística</h1>

      <h2>Transferencias en curso</h2>
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
          {enCurso.length === 0 && (
            <tr>
              <td colSpan={6}>No hay transferencias en curso.</td>
            </tr>
          )}
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

      <h2>Tiempos estimados vs. reales</h2>
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
          {tiempos.length === 0 && (
            <tr>
              <td colSpan={6}>No hay envíos registrados.</td>
            </tr>
          )}
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

      <h2>Clasificación de rutas</h2>
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
          {rutas.length === 0 && (
            <tr>
              <td colSpan={5}>No hay rutas registradas.</td>
            </tr>
          )}
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
              <td>{r.costoPromedio?.toFixed(2) ?? '—'}</td>
              <td>{r.tiempoPromedioDias?.toFixed(1) ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <h2>Cumplimiento por sucursal</h2>
      <CumplimientoTable rows={cumplimientoSucursal} />

      <h2>Cumplimiento por ruta</h2>
      <CumplimientoTable rows={cumplimientoRuta} />
    </div>
  )
}

function CumplimientoTable({ rows }: { rows: Cumplimiento[] }) {
  return (
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
        {rows.length === 0 && (
          <tr>
            <td colSpan={6}>Sin datos.</td>
          </tr>
        )}
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
  )
}
