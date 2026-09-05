import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import {
  getTransferencias,
  prepararTransferencia,
  registrarEnvioTransferencia,
  cancelarTransferencia,
} from '../api/transferencias'
import { TransferenciaForm } from '../components/TransferenciaForm'
import { RecepcionForm } from '../components/RecepcionForm'
import {
  ESTADO_TRANSFERENCIA,
  ESTADO_TRANSFERENCIA_LABEL,
} from '../types/transferencia'
import type { Transferencia } from '../types/transferencia'
import { ApiError } from '../api/client'

const PUEDE_APROBAR = ['AdministradorGeneral', 'GerenteSucursal']

export function TransferenciasPage() {
  const { usuario } = useAuth()
  const [transferencias, setTransferencias] = useState<Transferencia[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actualizandoId, setActualizandoId] = useState<number | null>(null)
  const [recepcionId, setRecepcionId] = useState<number | null>(null)

  const esAdmin = usuario?.rol === 'AdministradorGeneral'

  const cargar = useCallback(() => {
    setIsLoading(true)
    setError(null)
    return getTransferencias()
      .then((data) =>
        setTransferencias(
          // El Administrador general tiene visibilidad total y no está atado a
          // una sucursal propia: ve todas las transferencias de la red, no solo
          // las de "su" sucursal (que no tiene).
          esAdmin
            ? data
            : data.filter(
                (t) =>
                  t.sucursalOrigenId === usuario?.sucursalId ||
                  t.sucursalDestinoId === usuario?.sucursalId,
              ),
        ),
      )
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las transferencias')
      })
      .finally(() => setIsLoading(false))
  }, [usuario?.sucursalId, esAdmin])

  useEffect(() => {
    cargar()
  }, [cargar])

  const puedeAprobar = usuario ? PUEDE_APROBAR.includes(usuario.rol) : false

  const preparar = async (id: number) => {
    setActualizandoId(id)
    setError(null)
    try {
      await prepararTransferencia(id)
      await cargar()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar la preparación')
    } finally {
      setActualizandoId(null)
    }
  }

  const enviar = async (t: Transferencia) => {
    setActualizandoId(t.id)
    setError(null)
    try {
      await registrarEnvioTransferencia(t.id, {
        lineas: t.lineas.map((l) => ({
          transferenciaLineaId: l.id,
          cantidadEnviada: l.cantidadSolicitada,
        })),
      })
      await cargar()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar el envío')
    } finally {
      setActualizandoId(null)
    }
  }

  const cancelar = async (id: number) => {
    setActualizandoId(id)
    setError(null)
    try {
      await cancelarTransferencia(id)
      await cargar()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cancelar la transferencia')
    } finally {
      setActualizandoId(null)
    }
  }

  if (!usuario?.sucursalId && !esAdmin) {
    return (
      <div className="page">
        <h1>Transferencias</h1>
        <p>Tu usuario no tiene una sucursal asignada.</p>
      </div>
    )
  }

  return (
    <div className="page">
      <h1>Transferencias{usuario?.sucursalNombre ? ` — ${usuario.sucursalNombre}` : ' — Todas las sucursales'}</h1>

      <TransferenciaForm onCreada={cargar} />

      {recepcionId &&
        (() => {
          const transferencia = transferencias.find((t) => t.id === recepcionId)
          if (!transferencia) return null
          return (
            <RecepcionForm
              transferencia={transferencia}
              onConfirmada={() => {
                setRecepcionId(null)
                cargar()
              }}
              onCerrar={() => setRecepcionId(null)}
            />
          )
        })()}

      {isLoading && <p>Cargando...</p>}
      {error && <p className="error-text">{error}</p>}

      {!isLoading && (
        <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Origen</th>
              <th>Destino</th>
              <th>Estado</th>
              <th>Solicitada</th>
              <th>Faltantes</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {transferencias.length === 0 && (
              <tr>
                <td colSpan={6}>No hay transferencias para esta sucursal.</td>
              </tr>
            )}
            {transferencias.map((t) => {
              // El Administrador general puede actuar sobre cualquier
              // transferencia de la red, sin importar de qué sucursal sea.
              const esOrigen = esAdmin || t.sucursalOrigenId === usuario?.sucursalId
              const esDestino = esAdmin || t.sucursalDestinoId === usuario?.sucursalId
              const puedeCancelar =
                t.estado === ESTADO_TRANSFERENCIA.Solicitada ||
                t.estado === ESTADO_TRANSFERENCIA.EnPreparacion
              return (
                <tr key={t.id}>
                  <td>{t.sucursalOrigenNombre}</td>
                  <td>{t.sucursalDestinoNombre}</td>
                  <td>
                    <span className={`estado-badge estado-transferencia-${t.estado}`}>
                      {ESTADO_TRANSFERENCIA_LABEL[t.estado]}
                    </span>
                  </td>
                  <td>{new Date(t.fechaSolicitud).toLocaleDateString()}</td>
                  <td>
                    {t.estado === ESTADO_TRANSFERENCIA.RecibidaParcial && (
                      <ul className="faltantes-list">
                        {t.lineas
                          .filter((l) => l.faltante > 0)
                          .map((l) => (
                            <li key={l.id}>
                              {l.productoNombre}: faltan {l.faltante}
                            </li>
                          ))}
                      </ul>
                    )}
                  </td>
                  <td className="acciones-cell">
                    {esOrigen && puedeAprobar && t.estado === ESTADO_TRANSFERENCIA.Solicitada && (
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={actualizandoId === t.id}
                        onClick={() => preparar(t.id)}
                      >
                        Preparar
                      </button>
                    )}
                    {esOrigen && puedeAprobar && t.estado === ESTADO_TRANSFERENCIA.EnPreparacion && (
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={actualizandoId === t.id}
                        onClick={() => enviar(t)}
                      >
                        Registrar envío
                      </button>
                    )}
                    {esDestino && t.estado === ESTADO_TRANSFERENCIA.EnTransito && (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setRecepcionId(t.id)}
                      >
                        Confirmar recepción
                      </button>
                    )}
                    {esOrigen && puedeCancelar && (
                      <button
                        type="button"
                        className="link-button"
                        disabled={actualizandoId === t.id}
                        onClick={() => cancelar(t.id)}
                      >
                        Cancelar
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      )}
    </div>
  )
}
