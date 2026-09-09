import { useEffect, useState, type FormEvent } from 'react'
import { Truck, Pencil } from 'lucide-react'
import { Modal } from './Modal'
import { DatePicker } from './DatePicker'
import { PRIORIDAD_TRANSFERENCIA_LABEL, TRANSPORTISTA_POR_DEFECTO } from '../types/transferencia'
import type { RegistrarEnvio, RutaLogistica, Transferencia } from '../types/transferencia'
import { registrarEnvioTransferencia, getRutaLogistica } from '../api/transferencias'
import { ApiError } from '../api/client'

function hoyIso(): string {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
}

function sumarDiasIso(fechaIso: string, dias: number): string {
  const [anio, mes, dia] = fechaIso.split('-').map(Number)
  const fecha = new Date(anio, mes - 1, dia)
  fecha.setDate(fecha.getDate() + dias)
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`
}

// Modal "Enviar transferencia": distinto del modal "Agregar producto" (ese
// solo maneja producto+cantidad) y distinto de la solicitud (ahí se define
// la prioridad). Este modal captura EXCLUSIVAMENTE los datos del envío
// logístico: transportista, ruta, costo, fecha estimada de llegada — la
// prioridad ya quedó fija desde la solicitud y aquí solo se muestra como
// información de solo lectura, nunca se vuelve a pedir.
//
// Transportista y ruta NO son editables aquí: transportista es siempre
// TRANSPORTISTA_POR_DEFECTO ("Coordinadora", única fuente de verdad) y la
// ruta se genera automáticamente como "Origen → Destino" — nunca texto
// libre que el usuario pueda escribir mal. Costo y tiempo estimado se
// prellenan desde la configuración de la ruta (GET rutas-logisticas/
// origen/{}/destino/{}); el costo puede ajustarse manualmente para casos
// excepcionales ("Modificar costo"), pero el valor inicial siempre viene de
// la ruta configurada.
export function EnvioForm({
  transferencia,
  onEnviada,
  onCerrar,
}: {
  transferencia: Transferencia
  onEnviada: () => void
  onCerrar: () => void
}) {
  const hoy = hoyIso()
  const rutaTexto = `${transferencia.sucursalOrigenNombre} → ${transferencia.sucursalDestinoNombre}`
  const [ruta, setRuta] = useState<RutaLogistica | null>(null)
  const [cargandoRuta, setCargandoRuta] = useState(true)
  const [costoEnvio, setCostoEnvio] = useState('')
  const [editarCosto, setEditarCosto] = useState(false)
  const [fechaEstimada, setFechaEstimada] = useState(() => sumarDiasIso(hoy, 1))
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let cancelado = false
    setCargandoRuta(true)
    getRutaLogistica(transferencia.sucursalOrigenId, transferencia.sucursalDestinoId)
      .then((r) => {
        if (cancelado) return
        setRuta(r)
        if (r) {
          setCostoEnvio(String(r.costoEnvio))
          setFechaEstimada(sumarDiasIso(hoy, r.tiempoEstimadoDias))
        }
      })
      .finally(() => {
        if (!cancelado) setCargandoRuta(false)
      })
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transferencia.sucursalOrigenId, transferencia.sucursalDestinoId])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    const costo = costoEnvio.trim() === '' ? null : Number(costoEnvio)
    if (costo !== null && (!Number.isFinite(costo) || costo < 0)) {
      setError('El costo de transporte debe ser un número válido mayor o igual a cero.')
      return
    }

    if (fechaEstimada < hoy) {
      setError('La fecha estimada de llegada no puede ser anterior a hoy.')
      return
    }

    const dto: RegistrarEnvio = {
      transportista: TRANSPORTISTA_POR_DEFECTO,
      ruta: rutaTexto,
      costoEnvio: costo,
      fechaEstimadaLlegada: fechaEstimada ? `${fechaEstimada}T00:00:00` : null,
      lineas: transferencia.lineas.map((l) => ({
        transferenciaLineaId: l.id,
        cantidadEnviada: l.cantidadSolicitada,
      })),
    }

    setIsSubmitting(true)
    try {
      await registrarEnvioTransferencia(transferencia.id, dto)
      onEnviada()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar el envío')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      title="Enviar transferencia"
      description={`Transferencia #${transferencia.id} · ${transferencia.sucursalOrigenNombre} → ${transferencia.sucursalDestinoNombre}`}
      onClose={onCerrar}
    >
      <form className="tr-envio-form" onSubmit={handleSubmit}>
        {transferencia.prioridad !== null && (
          <div className="tr-envio-prioridad">
            <span>Prioridad</span>
            <strong className={`tr-prioridad-chip tr-prioridad-chip--activa tr-prioridad-chip--${transferencia.prioridad}`}>
              {PRIORIDAD_TRANSFERENCIA_LABEL[transferencia.prioridad]}
            </strong>
          </div>
        )}

        {!cargandoRuta && ruta === null && (
          <p className="tr-envio-sin-ruta">
            No hay un costo configurado para esta ruta — indícalo manualmente abajo.
          </p>
        )}

        <div className="tr-envio-fijo">
          <div className="tr-envio-fijo-item">
            <span className="tr-envio-fijo-label">Transportista</span>
            <span className="tr-envio-fijo-valor">{TRANSPORTISTA_POR_DEFECTO}</span>
          </div>
          <div className="tr-envio-fijo-item">
            <span className="tr-envio-fijo-label">Ruta</span>
            <span className="tr-envio-fijo-valor">{rutaTexto}</span>
          </div>
        </div>

        <div className="form-row-inline">
          <div className="form-row">
            <label htmlFor="envio-costo">
              Costo de transporte
              {ruta !== null && !editarCosto && (
                <button
                  type="button"
                  className="tr-envio-modificar-costo"
                  onClick={() => setEditarCosto(true)}
                >
                  <Pencil size={11} strokeWidth={2.3} />
                  Modificar costo
                </button>
              )}
            </label>
            <input
              id="envio-costo"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="0"
              value={costoEnvio}
              disabled={ruta !== null && !editarCosto}
              onChange={(e) => setCostoEnvio(e.target.value)}
            />
            {ruta !== null && (
              <span className="tr-envio-fuente">
                {editarCosto ? 'Costo ajustado manualmente' : `Costo de la ruta configurada (${ruta.tiempoEstimadoDias} día${ruta.tiempoEstimadoDias === 1 ? '' : 's'} estimado${ruta.tiempoEstimadoDias === 1 ? '' : 's'})`}
              </span>
            )}
          </div>

          <div className="form-row">
            <label htmlFor="envio-fecha">Fecha estimada de llegada</label>
            <DatePicker value={fechaEstimada} onChange={setFechaEstimada} min={hoy} className="tr-envio-fecha" />
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="danger-button" onClick={onCerrar} disabled={isSubmitting}>
            Cancelar
          </button>
          <button type="submit" className="primary-button" disabled={isSubmitting}>
            <Truck size={14} strokeWidth={2.3} />
            {isSubmitting ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
